import { supabase } from '@/lib/supabase';
import { ListChecks } from 'lucide-react';
import { QueueItem } from '@/components/queue/queue-item';
import { KamFilter } from '@/components/queue/kam-filter';
import { handleApproveOnly, handleSendToWhatsApp, handleReject, handleCreateWaGroup, handleDnpQuickAction, handleEditMessage, handleGenerateDraft, handleReplyToSlackThread, handleIgnoreFollowup } from '../queue/actions';

export const dynamic = 'force-dynamic';

export default async function IgnoredPage({ searchParams }: { searchParams: { kam?: string } }) {
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
    .eq('status', 'ignored')
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-slate-400" />
            Ignored Messages
          </h1>
          <p className="text-slate-500 text-sm mt-1">Review Slack messages that were automatically ignored (e.g. multiple links detected).</p>
        </div>
        
        {/* KAM Filter */}
        <KamFilter teamMembers={teamMembers || []} selectedKam={selectedKam} />
      </div>

      <div className="grid gap-4">
        {approvals?.map((approval: any) => {
          const partner = approval.students?.partners;
          const waGroupId = partner?.whatsapp_group_id || partner?.whatsapp_number || '';
          
          return (
            <QueueItem 
              key={approval.id} 
              approval={approval} 
              waGroupId={waGroupId}
              handleApproveOnly={handleApproveOnly}
              handleSendToWhatsApp={handleSendToWhatsApp}
              handleReject={handleReject}
              handleCreateWaGroup={handleCreateWaGroup}
              handleDnpQuickAction={handleDnpQuickAction}
              handleEditMessage={handleEditMessage}
              handleGenerateDraft={handleGenerateDraft}
              handleReplyToSlackThread={handleReplyToSlackThread}
              handleIgnoreFollowup={handleIgnoreFollowup}
            />
          );

        })}
        
        {(!approvals || approvals.length === 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <ListChecks className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No ignored messages</h3>
            <p className="text-slate-500">There are no auto-ignored messages at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
