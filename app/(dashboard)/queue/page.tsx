import { supabase } from '@/lib/supabase';
import { QueueTabs } from '@/components/queue/queue-tabs';
import { KamFilter } from '@/components/queue/kam-filter';
import { handleApproveOnly, handleSendToWhatsApp, handleReject, handleCreateWaGroup, handleDnpQuickAction, handleEditMessage, handleGenerateDraft, handleReplyToSlackThread, handleIgnoreFollowup } from './actions';

export const dynamic = 'force-dynamic';

export default async function QueuePage({ searchParams }: { searchParams: { kam?: string } }) {
  const selectedKam = searchParams?.kam || 'all';

  const { data: rawApprovals, error: approvalsError } = await supabase
    .from('approvals')
    .select(`
      *, 
      students(*, partners(*), team_members(*)),
      slack_threads (
        id, slack_channel_id, slack_thread_ts,
        approvals (
          id, raw_slack_context, message, status, is_followup, followup_number, created_at, approved_by
        )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (approvalsError) {
    console.error("Error fetching approvals:", approvalsError);
  }

  // Fetch counsellors separately
  const partnerIds = [...new Set(rawApprovals?.map(a => a.students?.partners?.id).filter(Boolean))];
  let allCounsellors: any[] = [];
  
  if (partnerIds.length > 0) {
    const { data: counsellorsData } = await supabase
      .from('counsellors')
      .select('*')
      .in('partner_id', partnerIds);
      
    allCounsellors = counsellorsData || [];
  }

  // Attach counsellors and filter by KAM
  let approvals = rawApprovals?.map(approval => {
    const partner = approval.students?.partners;
    if (partner) {
      partner.counsellors = allCounsellors.filter(c => c.partner_id === partner.id);
    }
    return approval;
  });

  if (selectedKam !== 'all' && selectedKam !== 'unassigned') {
    approvals = approvals?.filter(a => a.students?.team_members?.id === selectedKam);
  } else if (selectedKam === 'unassigned') {
    approvals = approvals?.filter(a => !a.students?.team_members);
  }

  // Fetch all team members for the dropdown filter
  const { data: teamMembers } = await supabase.from('team_members').select('*').order('name');

  const newApprovals = approvals?.filter(a => !a.is_followup) || [];
  const followupApprovals = approvals?.filter(a => a.is_followup) || [];

  const actions = {
    handleApproveOnly, handleSendToWhatsApp, handleReject, handleCreateWaGroup, 
    handleDnpQuickAction, handleEditMessage, handleGenerateDraft, 
    handleReplyToSlackThread, handleIgnoreFollowup
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approval Queue</h1>
          <p className="text-slate-500 text-sm mt-1">Review Slack messages and approve them to be sent to the Partner's WhatsApp group.</p>
        </div>
        
        {/* KAM Filter */}
        <KamFilter teamMembers={teamMembers || []} selectedKam={selectedKam} />
      </div>

      <QueueTabs 
        newApprovals={newApprovals} 
        followupApprovals={followupApprovals} 
        actions={actions} 
      />
    </div>
  );
}
