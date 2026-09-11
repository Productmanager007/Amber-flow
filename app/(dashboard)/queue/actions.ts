'use server'

import { supabase } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { groq } from '@/lib/groq';

export async function handleGenerateDraft(formData: FormData) {
  const approvalId = formData.get('approvalId') as string;
  if (!approvalId) return;

  const { data: approval } = await supabase
    .from('approvals')
    .select('raw_slack_context, students(id, name, notes)')
    .eq('id', approvalId)
    .single();

  if (!approval) return;

  const studentName = (approval.students as any)?.name || 'Unknown Lead';
  const notes = (approval.students as any)?.notes || '';
  
  const draftPrompt = `
      Write a short, professional WhatsApp follow-up message to the partner regarding this lead based on the notes. Do not include subject lines or formal email signatures.
      Student: ${studentName}
      Notes: ${notes}
  `;

  try {
    const draftCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful partnership operations assistant drafting WhatsApp messages." },
        { role: "user", content: draftPrompt }
      ],
      model: "groq/compound-mini",
    });
    
    const draftedMessage = draftCompletion.choices[0]?.message?.content || '';
    
    if (draftedMessage) {
      await supabase.from('approvals').update({ message: draftedMessage }).eq('id', approvalId);
      await supabase.from('activities').insert({
        student_id: (approval.students as any)?.id,
        action: 'AI generated a WhatsApp draft message',
        status: 'Drafted'
      });
      revalidatePath('/queue');
    }
  } catch(e) {
    console.error("Draft generation failed:", e);
  }
}

export async function handleApproveOnly(formData: FormData) {
  const approvalId = formData.get('approvalId') as string;
  if (!approvalId) return;

  const { data: approval } = await supabase
    .from('approvals')
    .update({ status: 'approved' })
    .eq('id', approvalId)
    .select('student_id, slack_threads(slack_channel_id, slack_thread_ts)')
    .single();

  if (approval) {
    const slackThread = approval.slack_threads as any;
    if (slackThread?.slack_thread_ts && process.env.SLACK_BOT_TOKEN) {
      const replyText = `✅ Approved! (Manual check)`;
      try {
        const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: slackThread.slack_channel_id,
            thread_ts: slackThread.slack_thread_ts,
            text: replyText
          })
        });
        const data = await slackRes.json();
        if (!data.ok) console.error('Slack API error in handleApproveOnly:', data.error);
      } catch (err) {
        console.error('Failed to send Slack reply:', err);
      }
    }

    await supabase.from('activities').insert({
      student_id: approval.student_id,
      action: `Message approved (Manual check)`,
      status: 'Approved'
    });
  }

  revalidatePath('/queue');
}

export async function handleSendToWhatsApp(formData: FormData) {
  const approvalId = formData.get('approvalId') as string;
  const waGroupId = formData.get('waGroupId') as string;
  if (!approvalId) return;

  const { data: approval } = await supabase
    .from('approvals')
    .update({ status: 'approved' })
    .eq('id', approvalId)
    .select('student_id, message, slack_threads(slack_channel_id, slack_thread_ts)')
    .single();

  if (approval) {
    let finalMessage = formData.get('messageOverride') as string;
    if (!finalMessage) {
      finalMessage = approval.message;
    }

    if (!finalMessage || finalMessage.trim() === '') {
       console.error("Cannot send empty message to WhatsApp");
       return { success: false, error: "Cannot send an empty message. Please type a message or generate a draft." };
    }

    // Send message via UltraMsg
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    
    if (instanceId && token && waGroupId) {
      try {
        let destination = waGroupId.replace('+', '').trim();
        
        if (!destination.includes('@')) {
          if (destination.includes('-') || destination.length > 16) {
             destination += '@g.us';
          } else {
             destination += '@c.us';
          }
        }

        const authSupabase = await createClient();
        const { data: { user } } = await authSupabase.auth.getUser();
        
        // FEATURE FLAG: Change to false to force all messages through the single-tenant "default" connection
        const ENABLE_MULTI_TENANT = false; 
        const kamId = ENABLE_MULTI_TENANT ? (user?.id || 'default') : 'default';

        const params = new URLSearchParams({
          token: token,
          to: destination,
          body: finalMessage,
          kamId: kamId
        });

        const cleanInstanceId = instanceId.replace(/\/+$/, '');
        const baseUrl = cleanInstanceId.startsWith('http') ? cleanInstanceId : `https://api.ultramsg.com/${cleanInstanceId}`;
        const response = await fetch(`${baseUrl}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        if (!response.ok) {
          console.error('UltraMsg failed to send message:', await response.text());
        }
      } catch (e) {
        console.error('Failed to connect to UltraMsg:', e);
      }
    } else {
      console.error('UltraMsg credentials or destination missing.');
    }

    const slackThread = approval.slack_threads as any;
    if (slackThread?.slack_thread_ts) {
      const replyText = `✅ Approved! Message forwarded to partner WhatsApp group.`;
      console.log(`[SLACK AUTO-REPLY] Thread ${slackThread.slack_thread_ts}: ${replyText}`);
      
      if (process.env.SLACK_BOT_TOKEN) {
        try {
          const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              channel: slackThread.slack_channel_id,
              thread_ts: slackThread.slack_thread_ts,
              text: replyText
            })
          });
          const data = await slackRes.json();
          if (!data.ok) console.error('Slack API error in handleSendToWhatsApp:', data.error);
        } catch (err) {
          console.error('Failed to send Slack reply:', err);
        }
      }
    }

    await supabase.from('activities').insert({
      student_id: approval.student_id,
      action: `Message approved & sent to WhatsApp ${waGroupId ? `(${waGroupId})` : ''}`,
      status: 'Message Sent'
    });
  }

  revalidatePath('/queue');
}

export async function handleReject(formData: FormData) {
  const approvalId = formData.get('approvalId') as string;
  const reason = formData.get('reason') as string || 'No reason provided';
  if (!approvalId) return;

  const { data: approval } = await supabase
    .from('approvals')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', approvalId)
    .select('student_id, slack_threads(slack_channel_id, slack_thread_ts)')
    .single();

  if (approval) {
    const slackThread = approval.slack_threads as any;
    if (slackThread?.slack_thread_ts) {
      const replyText = `❌ Message Rejected.\n*Reason:* ${reason}`;
      console.log(`[SLACK AUTO-REPLY] Thread ${slackThread.slack_thread_ts}: ${replyText}`);
      
      if (process.env.SLACK_BOT_TOKEN) {
        try {
          const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              channel: slackThread.slack_channel_id,
              thread_ts: slackThread.slack_thread_ts,
              text: replyText
            })
          });
          const data = await slackRes.json();
          if (!data.ok) console.error('Slack API error in handleReject:', data.error);
        } catch (err) {
          console.error('Failed to send Slack reply:', err);
        }
      }
    }
    await supabase.from('activities').insert({
      student_id: approval.student_id,
      action: `Follow-up message rejected (Reason: ${reason})`,
      status: 'Rejected'
    });
  }

  revalidatePath('/queue');
}

export async function handleCreateWaGroup(formData: FormData) {
  const studentId = formData.get('studentId') as string;
  const studentName = formData.get('studentName') as string || 'New Lead';
  const groupName = formData.get('groupName') as string || `${studentName} || [University Name] || amber accommodation`;
  const groupNumbers = formData.get('groupNumbers') as string;
  const groupMessage = formData.get('groupMessage') as string;
  
  if (!studentId || !groupNumbers) return { success: false, error: 'Missing information' };

  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (instanceId && token) {
    try {
      // Clean and format contacts
      const numberArray = groupNumbers.split(',').map(n => n.replace('+', '').trim()).filter(n => n);
      const cleanContacts = numberArray.join(',');
      
      const authSupabase = await createClient();
      const { data: { user } } = await authSupabase.auth.getUser();
      
      // FEATURE FLAG: Change to false to force all messages through the single-tenant "default" connection
      const ENABLE_MULTI_TENANT = false; 
      const kamId = ENABLE_MULTI_TENANT ? (user?.id || 'default') : 'default';

      const createParams = new URLSearchParams({
        token: token,
        group_name: groupName,
        contacts: cleanContacts,
        kamId: kamId
      });

      const cleanInstanceId = instanceId.replace(/\/+$/, '');
      const baseUrl = cleanInstanceId.startsWith('http') ? cleanInstanceId : `https://api.ultramsg.com/${cleanInstanceId}`;
      const createResponse = await fetch(`${baseUrl}/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: createParams.toString()
      });

      const createData = await createResponse.json();
      if (!createResponse.ok || createData.error) {
        console.error('UltraMsg failed to create group:', createData);
        return { success: false, error: 'Failed to create group via UltraMsg. Ensure numbers include the country code (e.g., 91 for India).' };
      }

      const createdGroupId = createData.message || createData.id;
      
      if (groupMessage && groupMessage.trim() !== '' && createdGroupId) {
         const msgParams = new URLSearchParams({
           token: token,
           to: createdGroupId,
           body: groupMessage,
           kamId: kamId
         });

         const msgResponse = await fetch(`${baseUrl}/messages/chat`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
           body: msgParams.toString()
         });
         
         if (!msgResponse.ok) {
           console.error("Failed to send intro message to the new group:", await msgResponse.text());
         }
      }
    } catch (e) {
      console.error('Failed to connect to UltraMsg for group creation:', e);
      return { success: false, error: 'Network error connecting to UltraMsg.' };
    }
  } else {
    return { success: false, error: 'UltraMsg credentials missing in environment variables.' };
  }

  await supabase.from('activities').insert({
    student_id: studentId,
    action: `WhatsApp Group "${groupName}" created`,
    status: 'Group Created'
  });

  revalidatePath('/queue');
  return { success: true };
}

export async function handleDnpQuickAction(formData: FormData) {
  const approvalId = formData.get('approvalId') as string;
  const waGroupId = formData.get('waGroupId') as string;
  if (!approvalId) return;

  const { data: approval } = await supabase
    .from('approvals')
    .update({ status: 'rejected' })
    .eq('id', approvalId)
    .select('student_id, students(name)')
    .single();

  if (approval) {
    const studentName = (approval.students as any)?.name || 'the student';
    const dnpMessage = `Hi Team, we attempted to contact ${studentName} but they did not pick up (DNP). We will attempt to follow up again later.`;

    // Send DNP message via UltraMsg
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    
    if (instanceId && token && waGroupId) {
      try {
        let destination = waGroupId.replace('+', '').trim();
        
        if (!destination.includes('@')) {
          if (destination.includes('-') || destination.length > 16) {
             destination += '@g.us';
          } else {
             destination += '@c.us';
          }
        }

        const params = new URLSearchParams({
          token: token,
          to: destination,
          body: dnpMessage
        });

        const cleanInstanceId = instanceId.replace(/\/+$/, '');
        const baseUrl = cleanInstanceId.startsWith('http') ? cleanInstanceId : `https://api.ultramsg.com/${cleanInstanceId}`;
        const response = await fetch(`${baseUrl}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        if (!response.ok) {
          console.error('UltraMsg failed to send DNP message:', await response.text());
        }
      } catch (e) {
        console.error('Failed to connect to UltraMsg:', e);
      }
    } else {
      console.error('UltraMsg credentials or destination missing.');
    }

    await supabase.from('activities').insert({
      student_id: approval.student_id,
      action: `DNP Quick Action sent to WhatsApp`,
      status: 'DNP Handled'
    });
  }

  revalidatePath('/queue');
}

export async function handleEditMessage(approvalId: string, newMessage: string) {
  if (!approvalId || !newMessage) return { success: false, error: 'Missing parameters' };

  const { error } = await supabase
    .from('approvals')
    .update({ message: newMessage })
    .eq('id', approvalId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/queue');
  return { success: true };
}

export async function handleReplyToSlackThread(formData: FormData) {
  const approvalId = formData.get('approvalId') as string;
  const replyMessage = formData.get('replyMessage') as string;
  
  if (!approvalId || !replyMessage) return;

  const { data: approval } = await supabase
    .from('approvals')
    .select('student_id, slack_threads(slack_channel_id, slack_thread_ts)')
    .eq('id', approvalId)
    .single();

  if (approval) {
    const slackThread = approval.slack_threads as any;
    
    if (slackThread?.slack_thread_ts) {
      if (!process.env.SLACK_BOT_TOKEN) {
        return { success: false, error: "SLACK_BOT_TOKEN environment variable is missing. Cannot post to Slack." };
      }
      
      try {
        const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: slackThread.slack_channel_id,
            thread_ts: slackThread.slack_thread_ts,
            text: replyMessage
          })
        });
        
        const data = await slackRes.json();
        if (!data.ok) {
           console.error('Slack API error:', data.error);
           return { success: false, error: `Slack API error: ${data.error}` };
        }
      } catch (err: any) {
        console.error('Failed to send Slack reply:', err);
        return { success: false, error: err.message };
      }
    }

    // Mark as approved (resolved)
    await supabase.from('approvals').update({ status: 'approved' }).eq('id', approvalId);
    
    await supabase.from('activities').insert({
      student_id: approval.student_id,
      action: `Sent response to Slack thread`,
      status: 'Responded'
    });
  }

  revalidatePath('/queue');
  return { success: true };
}

export async function handleIgnoreFollowup(formData: FormData) {
  const approvalId = formData.get('approvalId') as string;
  if (!approvalId) return { success: false, error: 'Missing approvalId' };

  const { data: approval } = await supabase
    .from('approvals')
    .select('student_id, slack_threads(slack_channel_id, slack_thread_ts)')
    .eq('id', approvalId)
    .single();

  if (approval) {
    const slackThread = approval.slack_threads as any;
    
    if (slackThread?.slack_thread_ts) {
      if (!process.env.SLACK_BOT_TOKEN) {
        return { success: false, error: "SLACK_BOT_TOKEN environment variable is missing. Cannot post to Slack." };
      }
      
      try {
        const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: slackThread.slack_channel_id,
            thread_ts: slackThread.slack_thread_ts,
            text: "👍"
          })
        });
        
        const data = await slackRes.json();
        if (!data.ok) {
           console.error('Slack API error:', data.error);
           return { success: false, error: `Slack API error: ${data.error}` };
        }
      } catch (err: any) {
        console.error('Failed to send Slack reply:', err);
        return { success: false, error: err.message };
      }
    }

    // Mark as approved (resolved)
    await supabase.from('approvals').update({ status: 'approved' }).eq('id', approvalId);
    
    await supabase.from('activities').insert({
      student_id: approval.student_id,
      action: `Ignored follow-up (Sent 👍)`,
      status: 'Ignored'
    });
  }

  revalidatePath('/queue');
  return { success: true };
}
