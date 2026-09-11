'use client'

import { useState } from 'react';
import { X, Edit3, MessageSquareWarning, Slack, Phone, Check, Save, Sparkles, RefreshCw, ExternalLink, Send, ThumbsUp, Users } from 'lucide-react';

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  )
}

export function QueueItem({ 
  approval, 
  waGroupId,
  handleApproveOnly,
  handleSendToWhatsApp,
  handleReject,
  handleCreateWaGroup,
  handleDnpQuickAction,
  handleEditMessage,
  handleGenerateDraft,
  handleReplyToSlackThread,
  handleIgnoreFollowup
}: { 
  approval: any, 
  waGroupId: string,
  handleApproveOnly: (formData: FormData) => void,
  handleSendToWhatsApp: (formData: FormData) => void,
  handleReject: (formData: FormData) => void,
  handleCreateWaGroup: (formData: FormData) => Promise<{ success: boolean, error?: string } | void>,
  handleDnpQuickAction: (formData: FormData) => void,
  handleEditMessage: (id: string, msg: string) => Promise<{success: boolean, error?: string}>,
  handleGenerateDraft: (formData: FormData) => Promise<void>,
  handleReplyToSlackThread?: (formData: FormData) => Promise<{ success: boolean, error?: string } | void>,
  handleIgnoreFollowup?: (formData: FormData) => Promise<{ success: boolean, error?: string } | void>
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState(approval.message);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  
  const defaultGroupName = `${approval.students?.name || 'Student Name'} || [University Name] || amber accommodation`;
  const defaultGroupMessage = `Hello! This group has been created to coordinate for the student lead: ${approval.students?.name || 'New Lead'}`;
  
  const [groupName, setGroupName] = useState(defaultGroupName);
  const [groupNumbers, setGroupNumbers] = useState("");
  const [groupMessage, setGroupMessage] = useState(defaultGroupMessage);
  
  const partner = approval.students?.partners;
  const threadHistory = approval.is_followup && approval.slack_threads?.approvals 
    ? [...approval.slack_threads.approvals].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : [];

  const [selectedWaDestination, setSelectedWaDestination] = useState(waGroupId);

  const onReply = async (formData: FormData) => {
    if (!handleReplyToSlackThread) return;
    setIsReplying(true);
    try {
      const result = await handleReplyToSlackThread(formData);
      if (result && !result.success) {
        alert(result.error || "Failed to send response to Slack.");
      } else {
        setIsResolved(true);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsReplying(false);
    }
  };

  const onIgnore = async (formData: FormData) => {
    if (!handleIgnoreFollowup) return;
    setIsReplying(true);
    try {
      const result = await handleIgnoreFollowup(formData);
      if (result && !result.success) {
        alert(result.error || "Failed to ignore thread on Slack.");
      } else {
        setIsResolved(true);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsReplying(false);
    }
  };

  const onSaveEdit = async () => {
    setIsSaving(true);
    await handleEditMessage(approval.id, message);
    setIsSaving(false);
    setIsEditing(false);
  };

  const onGenerate = async (formData: FormData) => {
    setIsGenerating(true);
    try {
      await handleGenerateDraft(formData);
    } finally {
      setIsGenerating(false);
    }
  }

  const wrapAction = (actionFn: (formData: FormData) => any) => async (formData: FormData) => {
    setIsReplying(true);
    try {
      const result = await actionFn(formData);
      if (result && result.success === false) {
        alert(result.error || "An error occurred");
      } else {
        setIsResolved(true);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
      setIsReplying(false);
    }
  };

  const onCreateWaGroup = async (formData: FormData) => {
    setIsReplying(true);
    try {
      const result = await handleCreateWaGroup(formData);
      if (result && result.success === false) {
        alert(result.error || "Failed to create group.");
      } else {
        alert("WhatsApp Group created successfully!");
        setShowCreateGroup(false);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsReplying(false);
    }
  };



  if (isResolved) return null;

  return (
    <div id={`approval-${approval.id}`} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col lg:flex-row gap-6 scroll-mt-6">
      {/* Student Info */}
      <div className="lg:w-1/4 border-b lg:border-b-0 lg:border-r border-slate-200 pb-4 lg:pb-0 lg:pr-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            {approval.students?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{approval.students?.name || 'Unknown Lead'}</h3>
            <p className="text-xs text-slate-500">{approval.students?.prospect_id}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <p><span className="font-medium text-slate-900">Partner:</span> {partner?.name || 'Unknown'}</p>
          <p><span className="font-medium text-slate-900">Status:</span> {approval.students?.status}</p>
          
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold border border-indigo-100">
              <Users className="w-3 h-3" /> 
              KAM: {approval.students?.team_members?.name || 'Unassigned'}
            </span>
          </div>

          {/* Follow up Metric requested by user */}
          {approval.is_followup && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-semibold mt-2 border border-amber-200">
              <ClockIcon /> Follow-up #{approval.followup_number}
            </div>
          )}
        </div>

        {/* Create WA Group Action */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button 
            type="button" 
            onClick={() => setShowCreateGroup(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-sm font-bold rounded-lg transition-colors border border-[#25D366]/20">
            <Phone className="w-4 h-4" /> Create WA Group
          </button>
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 flex flex-col gap-4">
        
        {/* Raw Slack Context */}
        {approval.raw_slack_context && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col max-h-[300px]">
            <div className="flex items-center justify-between mb-3 shrink-0">
               <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Slack className="w-4 h-4 text-[#E01E5A]" />
                {approval.is_followup ? "Thread History" : "Extracted from Slack"}
              </div>
              {approval.raw_slack_context.includes('SLACK_URL:') && (
                <a 
                  href={approval.raw_slack_context.split('SLACK_URL:')[1].trim()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline flex items-center gap-1"
                >
                  Go to Slack message <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {approval.is_followup && threadHistory.length > 0 ? (
                threadHistory.map((item: any) => (
                  <div key={item.id} className={`p-3 rounded-lg border text-sm ${item.id === approval.id ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-500">
                        {item.is_followup ? `Follow-up #${item.followup_number}` : 'Initial Message'}
                        {item.id === approval.id && <span className="ml-2 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">CURRENT</span>}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="text-slate-700 font-medium whitespace-pre-wrap">
                      {item.raw_slack_context?.split('SLACK_URL:')[0].trim()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-700 text-sm font-medium p-3 bg-white rounded border border-slate-100 shadow-sm whitespace-pre-wrap">
                  {approval.raw_slack_context.split('SLACK_URL:')[0].trim()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Draft / Manual Message Input - Hidden for followups */}
        {!approval.is_followup && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                <MessageSquareWarning className="w-4 h-4" />
                WhatsApp Message (AI Draft or Manual)
              </div>
              <form action={onGenerate}>
                <input type="hidden" name="approvalId" value={approval.id} />
                <button 
                  type="submit" 
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded transition-colors shadow-sm disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {isGenerating ? 'Generating...' : 'Generate AI Draft'}
                </button>
              </form>
            </div>
            
            <div className="flex flex-col gap-2 flex-1">
              <textarea 
                value={message || ''}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your WhatsApp message manually, or click 'Generate AI Draft'..."
                className="w-full flex-1 min-h-[120px] p-3 text-sm text-slate-700 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none bg-white shadow-inner"
              />
              {message !== approval.message && (
                <div className="flex justify-end mt-1">
                  <button 
                    onClick={onSaveEdit}
                    className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-sm"
                    disabled={isSaving}
                    type="button"
                  >
                    <Save className="w-3 h-3" /> {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-row lg:flex-col gap-3 justify-center">
        {approval.is_followup ? (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-col gap-2">
              <form action={onReply} className="flex flex-col gap-2">
                <input type="hidden" name="approvalId" value={approval.id} />
                <textarea 
                  name="replyMessage"
                  placeholder="Type your response here..."
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 resize-none min-h-[100px]"
                />
                <button 
                  type="submit" 
                  disabled={isReplying || !replyText.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isReplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isReplying ? 'Sending...' : 'Send Response'}
                </button>
              </form>

              <form action={onIgnore}>
                <input type="hidden" name="approvalId" value={approval.id} />
                <button 
                  type="submit" 
                  disabled={isReplying}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors border border-slate-200 shadow-sm disabled:opacity-50"
                >
                  <ThumbsUp className="w-4 h-4" /> Ignore & Acknowledge
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {partner?.whatsapp_group_id && partner?.counsellors && partner.counsellors.length > 0 && (
              <div className="flex flex-col gap-1 w-full bg-slate-50 p-2 rounded-lg border border-slate-200">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Destination</label>
                <select 
                  className="w-full bg-white text-sm border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-[#25D366] text-slate-700"
                  value={selectedWaDestination}
                  onChange={(e) => setSelectedWaDestination(e.target.value)}
                >
                  <option value={waGroupId}>WhatsApp Group ({partner.name})</option>
                  {partner.counsellors.map((c: any) => (
                    <option key={c.id} value={c.contact_number}>
                      Counsellor: {c.name} ({c.contact_number})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <form action={wrapAction(handleSendToWhatsApp)}>
              <input type="hidden" name="approvalId" value={approval.id} />
              <input type="hidden" name="waGroupId" value={selectedWaDestination} />
              <input type="hidden" name="messageOverride" value={message || ''} />
              <button type="submit" disabled={isReplying || !message || message.trim() === ''} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                <Phone className="w-4 h-4" /> Send to WA
              </button>
            </form>

            <form action={wrapAction(handleApproveOnly)}>
              <input type="hidden" name="approvalId" value={approval.id} />
              <button type="submit" disabled={isReplying} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap disabled:opacity-50">
                <Check className="w-4 h-4" /> Approve (Manual)
              </button>
            </form>

            {approval.students?.status === 'DNP' && (
              <form action={wrapAction(handleDnpQuickAction)}>
                <input type="hidden" name="approvalId" value={approval.id} />
                <input type="hidden" name="waGroupId" value={waGroupId} />
                <button type="submit" disabled={isReplying} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap disabled:opacity-50">
                  <MessageSquareWarning className="w-4 h-4" /> DNP Quick Action
                </button>
              </form>
            )}

            {!showRejectInput ? (
              <button 
                type="button" 
                onClick={() => setShowRejectInput(true)} 
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-medium rounded-lg transition-colors"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            ) : (
              <form action={wrapAction(handleReject)} className="flex flex-col gap-2 bg-rose-50 p-3 rounded-lg border border-rose-100">
                <input type="hidden" name="approvalId" value={approval.id} />
                <input 
                  type="text" 
                  name="reason" 
                  placeholder="Reason for rejection..." 
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full text-sm p-2 rounded border border-rose-200 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 text-slate-800"
                />
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowRejectInput(false);
                      setRejectReason("");
                    }}
                    className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isReplying}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded disabled:opacity-50"
                  >
                    <X className="w-3 h-3" /> Confirm
                  </button>
                </div>
              </form>
            )}

          </div>
        )}
      </div>

      {/* WA Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 flex flex-col gap-4 relative">
            <button 
              onClick={() => setShowCreateGroup(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#25D366]" /> Create WhatsApp Group
            </h2>
            <form action={onCreateWaGroup} className="flex flex-col gap-4 mt-2">
              <input type="hidden" name="studentId" value={approval.students?.id} />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Group Name</label>
                <input 
                  type="text" 
                  name="groupName" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Participants (Comma-separated numbers)</label>
                <input 
                  type="text" 
                  name="groupNumbers" 
                  value={groupNumbers}
                  onChange={(e) => setGroupNumbers(e.target.value)}
                  placeholder="e.g. 919876543210, 919876543211"
                  required
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]"
                />
                <p className="text-[10px] text-slate-500">Ensure numbers include the country code without the '+' (e.g. 91 for India).</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Introductory Message</label>
                <textarea 
                  name="groupMessage" 
                  value={groupMessage}
                  onChange={(e) => setGroupMessage(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] min-h-[80px] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isReplying || !groupName || !groupNumbers}
                  className="px-6 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isReplying && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Create & Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
