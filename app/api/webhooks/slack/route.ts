import { NextResponse } from 'next/server';
import { groq } from '@/lib/groq';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headers = req.headers;
    
    // 1. Signature Validation
    const slackSignature = headers.get('x-slack-signature');
    const slackTimestamp = headers.get('x-slack-request-timestamp');
    const secret = process.env.SLACK_SIGNING_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("Bypassing SLACK_SIGNING_SECRET check in development mode");
      } else {
        console.error("Missing SLACK_SIGNING_SECRET");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
    }

    if (secret) {
      if (!slackSignature || !slackTimestamp) {
        return NextResponse.json({ error: "Unauthorized: Missing Slack signature headers" }, { status: 401 });
      }

      const time = Math.floor(Date.now() / 1000);
      if (Math.abs(time - parseInt(slackTimestamp, 10)) > 300) {
        return NextResponse.json({ error: "Request too old" }, { status: 400 });
      }

      const sigBaseString = `v0:${slackTimestamp}:${rawBody}`;
      const mySignature = 'v0=' + crypto.createHmac('sha256', secret).update(sigBaseString).digest('hex');

      // Prevent timing attacks
      if (mySignature.length !== slackSignature.length || !crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'))) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // Prevent timing attacks handled above

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch(e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // 2. Handle Slack Retries
    if (headers.get('x-slack-retry-num')) {
      // Acknowledge retries to prevent duplicate processing since Slack expects < 3s response
      return NextResponse.json({ status: 'ignored_retry' });
    }

    // 3. Handle Slack URL Verification Challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // 4. Ignore non-message events or bot messages
    if (body.type !== 'event_callback' || body.event?.type !== 'message' || body.event?.bot_id) {
      return NextResponse.json({ status: 'ignored' });
    }

    let text = body.event.text;
    if (body.event.subtype === 'message_changed') {
      text = body.event.message?.text;
    }

    if (!text) {
      console.log("Ignored: Missing text payload");
      return NextResponse.json({ error: "Missing text payload" }, { status: 400 });
    }

    console.log("--- NEW SLACK MESSAGE RECEIVED ---");
    console.log("Raw Text:", text);

    // 5. Verify the Official User was Tagged (Eavesdrop Logic)
    // The bot listens to all messages in the channel (message.channels event)
    // but ONLY processes it if YOUR official Slack ID is tagged in the text.
    const mySlackId = process.env.MY_SLACK_USER_ID; 
    
    // If the environment variable is set, enforce the filtering rule
    // if (mySlackId && !text.includes(`<@${mySlackId}>`)) {
    //    // Ignore the message because you were not tagged
    //    return NextResponse.json({ status: 'ignored_not_tagged' });
    // }

    const threadTs = body.event?.thread_ts || (body.event.subtype === 'message_changed' ? body.event.message?.ts : body.event?.ts);
    const channelId = body.event?.channel;

    // Check if this thread already exists (Follow-up Check)
    const { data: existingThread } = await supabase
      .from('slack_threads')
      .select('*')
      .eq('slack_thread_ts', threadTs)
      .maybeSingle();

    let studentId;
    let isFollowup = false;
    let followupNumber = 0;
    let slackThreadId;
    let extractionText = text;
    let extracted: any = {};
    
    if (existingThread) {
      console.log("Existing thread found, creating follow-up.");
      isFollowup = true;
      followupNumber = (existingThread.followup_count || 0) + 1;
      studentId = existingThread.student_id;
      slackThreadId = existingThread.id;

      // Update the thread count
      await supabase
        .from('slack_threads')
        .update({ followup_count: followupNumber })
        .eq('id', slackThreadId);
    } else {
      console.log("New thread, running AI extraction...");

      // If this is a reply to an untracked thread (e.g. original was rejected), fetch full history for context
      if (body.event?.thread_ts && process.env.SLACK_BOT_TOKEN) {
        console.log("Untracked thread detected. Fetching full history for context...");
        try {
          const historyRes = await fetch(`https://slack.com/api/conversations.replies?channel=${channelId}&ts=${threadTs}`, {
            headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` }
          });
          const historyData = await historyRes.json();
          if (historyData.ok && historyData.messages) {
            extractionText = historyData.messages.map((m: any) => m.text).join('\n---\n');
          }
        } catch(e) {
          console.error("Failed to fetch thread history:", e);
        }
      }
      
      // AI Extraction (using Groq)
      const extractionPrompt = `
        Extract the following information from the message below and output ONLY valid JSON.
        Required keys: "prospect_id" (extract from the URL if present), "student_name", "partner_name", "status", "notes", "tagged_users", "context", "action_type".
        If you can't find a value, use null.
        Important: The partner name is usually indicated by "Partner: [Name]". 
        For example in "Partner: Manu . DNP/", the partner name is "Manu" and the notes are "DNP". Ignore trailing punctuation on the partner name.
        Crucial: "tagged_users" must contain the raw Slack ID tag (e.g. "<@U12345678>") if present in the message. Do not remove the brackets or @ symbol.
        Message: "${extractionText}"
      `;

      console.log("Sending to Groq AI...");
      const extractCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are a JSON-only data extraction bot." },
          { role: "user", content: extractionPrompt }
        ],
        model: "groq/compound-mini",
        response_format: { type: "json_object" }
      });

      const extractedStr = extractCompletion.choices[0]?.message?.content || '{}';
      console.log("AI Extraction Result:", extractedStr);
      
      try {
        extracted = JSON.parse(extractedStr);
      } catch(e) {
        console.error("AI Output parsing failed:", extractedStr);
        return NextResponse.json({ error: "Failed to parse AI output" }, { status: 500 });
      }

      // Smart Filter: Ignore random conversational messages
      if (!extracted.partner_name || extracted.partner_name === 'null') {
        console.log("Ignored by Smart Filter: Message does not contain a partner name.");
        return NextResponse.json({ status: 'ignored_not_a_lead' });
      }

      console.log("Smart Filter Passed. Resolving Partner ID...");
      let partnerId = null;
      if (extracted.partner_name) {
        const { data: partnerData } = await supabase
          .from('partners')
          .select('id')
          .ilike('name', `%${extracted.partner_name}%`)
          .limit(1);
        
        if (partnerData && partnerData.length > 0) {
          partnerId = partnerData[0].id;
        } else {
           console.log("Partner not found. Sending Slack notification and ignoring.");
           
           // Notify Slack that the partner does not exist
           if (process.env.SLACK_BOT_TOKEN && channelId && threadTs) {
             await fetch('https://slack.com/api/chat.postMessage', {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
               },
               body: JSON.stringify({
                 channel: channelId,
                 thread_ts: threadTs,
                 text: `⚠️ *POAI Alert:* I couldn't find a partner named "${extracted.partner_name}" in the dashboard. Please make sure they are added in the Mappings page before I can process this lead.`
               })
             }).catch(err => console.error('Failed to send slack message:', err));
           }

           return NextResponse.json({ status: 'ignored_partner_not_found' });
        }
      }

      const prospect_id = extracted.prospect_id || Math.floor(100000 + Math.random() * 900000).toString();

      console.log("New thread, creating student and thread record.");
      
      // Look up KAM from tagged_users
      let kamId = null;
      if (extracted.tagged_users) {
        // Handle cases where the model might return a string array or comma separated string
        const tagRaw = Array.isArray(extracted.tagged_users) ? extracted.tagged_users[0] : extracted.tagged_users;
        const cleanTag = tagRaw?.replace('<@', '').replace('>', '').trim();
        
        if (cleanTag) {
          console.log("Looking up KAM with Slack ID:", cleanTag);
          const { data: kamData } = await supabase
            .from('team_members')
            .select('id')
            .eq('slack_id', cleanTag)
            .single();
            
          if (kamData) {
            kamId = kamData.id;
            console.log("Assigned KAM ID:", kamId);
          }
        }
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .upsert(
          {
            prospect_id,
            name: extracted.student_name || 'Unknown Lead',
            partner_id: partnerId,
            kam_id: kamId,
            status: extracted.status || 'New',
            notes: extracted.notes
          },
          { onConflict: 'prospect_id' }
        )
        .select('id')
        .single();

      if (studentError || !student) {
        console.error("Student upsert failed:", studentError);
        return NextResponse.json({ error: "Failed to upsert student" }, { status: 500 });
      }
      studentId = student.id;

      // Create new thread
      const { data: newThread, error: threadError } = await supabase
        .from('slack_threads')
        .insert({
          student_id: studentId,
          slack_channel_id: channelId,
          slack_thread_ts: threadTs,
          status: 'open',
          followup_count: 0
        })
        .select('id')
        .single();
      
      if (threadError || !newThread) {
        console.error("Failed to create thread:", threadError);
        return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
      }
      slackThreadId = newThread.id;

      // If this was an untracked thread (e.g. a user replying to fix a broken partner name),
      // we should send a confirmation message to Slack so they know it worked.
      if (body.event?.thread_ts && process.env.SLACK_BOT_TOKEN) {
         try {
           await fetch('https://slack.com/api/chat.postMessage', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
             },
             body: JSON.stringify({
               channel: channelId,
               thread_ts: threadTs,
               text: `✅ Partner "${extracted.partner_name}" found! The lead has been added to the POAI Approval Queue.`
             })
           });
         } catch(e) {
           console.error("Failed to send success confirmation to Slack:", e);
         }
      }
    }

    // 8. Draft Generation (using Groq)
    // Skipped per user request - drafts are now generated on-demand via the Queue UI
    const draftedMessage = '';

    // Detect multiple links
    const urlRegex = /https?:\/\/[^\s>\|]+/g;
    const links = text.match(urlRegex) || [];
    // Slack adds links like <http://...|Text>
    const uniqueLinks = Array.from(new Set(links));
    const isMultiLink = uniqueLinks.length > 1;

    // 9. Insert Approval Queue with raw slack context
    const teamId = body.team_id;
    const ts = body.event?.ts;
    // Use the full thread history (extractionText) if it was a reply, otherwise just the text
    let rawContext = (typeof extractionText !== 'undefined' ? extractionText : text) || text;
    if (teamId && channelId && ts) {
      rawContext += `\n\nSLACK_URL:https://slack.com/archives/${channelId}/p${ts.replace('.', '')}`;
    }

    const approvalStatus = isMultiLink ? 'ignored' : 'pending';

    const { error: approvalError } = await supabase.from('approvals').insert({
      student_id: studentId,
      slack_thread_id: slackThreadId,
      raw_slack_context: rawContext,
      structured_context: extracted.context || null,
      action_type: extracted.action_type || null,
      message: draftedMessage,
      status: approvalStatus,
      is_followup: isFollowup,
      followup_number: isFollowup ? followupNumber : null,
      slack_received_at: new Date(parseInt(slackTimestamp || String(Date.now() / 1000)) * 1000).toISOString(),
      draft_ready_at: new Date().toISOString()
    });
    
    if (approvalError) {
      console.error("Approval insert failed:", approvalError);
    }

    // 10. Log Activity
    const { error: activityError } = await supabase.from('activities').insert({
      student_id: studentId,
      action: isFollowup ? `Followup #${followupNumber} added to queue` : 'Lead extracted from Slack & Added to Queue',
      status: 'New'
    });

    if (activityError) {
      console.error("Activity insert failed:", activityError);
    }

    return NextResponse.json({ success: true, studentId, draftedMessage, approvalError, activityError });

  } catch (error: any) {
    console.error("Webhook unexpected error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

