import { supabase } from '@/lib/supabase';
import { QueueTabs } from '@/components/queue/queue-tabs';
import { handleApproveOnly, handleSendToWhatsApp, handleReject, handleCreateWaGroup, handleDnpQuickAction, handleEditMessage, handleGenerateDraft, handleReplyToSlackThread, handleIgnoreFollowup } from './actions';

export const dynamic = 'force-dynamic';

export default async function QueuePage() {
  const { data: approvals } = await supabase
    .from('approvals')
    .select(`
      *, 
      students(*, partners(*)),
      slack_threads (
        id, slack_channel_id, slack_thread_ts,
        approvals (
          id, raw_slack_context, message, status, is_followup, followup_number, created_at, approved_by
        )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const newApprovals = approvals?.filter(a => !a.is_followup) || [];
  const followupApprovals = approvals?.filter(a => a.is_followup) || [];

  const actions = {
    handleApproveOnly, handleSendToWhatsApp, handleReject, handleCreateWaGroup, 
    handleDnpQuickAction, handleEditMessage, handleGenerateDraft, 
    handleReplyToSlackThread, handleIgnoreFollowup
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Approval Queue</h1>
        <p className="text-slate-500 text-sm mt-1">Review Slack messages and approve them to be sent to the Partner's WhatsApp group.</p>
      </div>

      <QueueTabs 
        newApprovals={newApprovals} 
        followupApprovals={followupApprovals} 
        actions={actions} 
      />
    </div>
  );
}
