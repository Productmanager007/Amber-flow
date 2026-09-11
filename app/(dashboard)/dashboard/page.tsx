import { supabase } from '@/lib/supabase';
import { Users, ListChecks, CheckCircle, Clock, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { SimulateWebhook } from '@/components/simulate-webhook';
import { draftDnpFollowUp } from './actions';

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string, start?: string, end?: string }> }) {
  const params = await searchParams;
  const filter = params.filter || 'today';
  const startParam = params.start;
  const endParam = params.end;
  
  // Date math
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  if (startParam && endParam) {
    startDate = new Date(startParam);
    endDate = new Date(endParam);
    endDate.setHours(23, 59, 59, 999);
  } else {
    if (filter === 'today') startDate.setHours(0,0,0,0);
    if (filter === 'week') startDate.setDate(now.getDate() - 7);
    if (filter === 'month') startDate.setMonth(now.getMonth() - 1);
    if (filter === 'year') startDate.setFullYear(now.getFullYear() - 1);
    if (filter === 'all') startDate = new Date(0); // Fetch all records
  }

  const isoStart = startDate.toISOString();
  const isoEnd = endDate.toISOString();

  // Fetch data filtered by time
  const { count: taggedLeads } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', isoStart)
    .lte('created_at', isoEnd);
    
  const { count: pendingApprovals } = await supabase
    .from('approvals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending'); // Usually approvals are current state, not just time-filtered, but could be filtered

  const { data: pendingItems } = await supabase
    .from('approvals')
    .select('id, is_followup, followup_number, created_at, students(name, prospect_id, partners(name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(8);

  const { data: recentCompletedActivities } = await supabase
    .from('activities')
    .select('id, action, status, timestamp, students(name, prospect_id, partners(name), approvals(raw_slack_context))')
    .in('status', ['Approved', 'Message Sent', 'Rejected', 'DNP Handled', 'Responded', 'Ignored'])
    .gte('timestamp', isoStart)
    .lte('timestamp', isoEnd)
    .order('timestamp', { ascending: false })
    .limit(8);

  // Calculate Average Response Time
  const { data: metricsData } = await supabase
    .from('students')
    .select('created_at, activities(timestamp, status)')
    .gte('created_at', isoStart)
    .lte('created_at', isoEnd);

  let totalMs = 0;
  let resolvedCount = 0;

  metricsData?.forEach(student => {
    // Find the first activity that indicates an action was taken
    const actionActivities = student.activities?.filter((a: any) => 
      ['Approved', 'Message Sent', 'Rejected', 'DNP Handled', 'Responded', 'Ignored'].includes(a.status)
    ).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (actionActivities && actionActivities.length > 0) {
      const firstAction = actionActivities[0];
      const diffMs = new Date(firstAction.timestamp).getTime() - new Date(student.created_at).getTime();
      if (diffMs > 0) {
        totalMs += diffMs;
        resolvedCount++;
      }
    }
  });

  let avgResponseTime = '0h';
  if (resolvedCount > 0) {
    const avgMs = totalMs / resolvedCount;
    const hours = avgMs / (1000 * 60 * 60);
    if (hours < 1) {
      avgResponseTime = `${Math.round(hours * 60)}m`;
    } else {
      avgResponseTime = `${hours.toFixed(1)}h`;
    }
  } else {
    avgResponseTime = 'N/A';
  }

  return (
    <div className="space-y-8 w-full">
      
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of leads you&apos;ve been tagged in.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Tagged Leads" 
          value={taggedLeads || 0} 
          icon={Users} 
          color="bg-indigo-50 text-indigo-600" 
          trend={startParam ? "Selected custom range" : `In the last ${filter}`} 
        />
        <KPICard 
          title="Pending Actions" 
          value={pendingApprovals || 0} 
          icon={ListChecks} 
          color="bg-amber-50 text-amber-600" 
          trend="Requires attention" 
        />
        <KPICard 
          title="Avg Response" 
          value={avgResponseTime} 
          icon={Clock} 
          color="bg-emerald-50 text-emerald-600" 
          trend={avgResponseTime === 'N/A' ? "No actions yet" : "Time to act"} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Pending Actions</h3>
          <div className="space-y-4 flex-1">
            {pendingItems?.map((item: any) => {
              const student = item.students || {};
              const partner = student.partners || {};
              const displayName = student.name === 'Unknown Lead' && student.prospect_id 
                ? `Lead #${student.prospect_id}` 
                : student.name;
              
              const pendingLabel = item.is_followup 
                ? `Follow-up #${item.followup_number} pending`
                : `Initial Lead pending`;

              return (
                <Link key={item.id} href={`/queue#approval-${item.id}`} className="group flex flex-col justify-center p-4 rounded-xl bg-amber-50/50 hover:bg-amber-50 border border-amber-100 transition-all hover:shadow-sm relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex justify-between items-start mb-1 pr-6">
                    <p className="font-bold text-slate-900 truncate">{displayName}</p>
                    <span className="shrink-0 text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{partner.name || 'Unknown Partner'}</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-md">
                      {pendingLabel}
                    </span>
                  </div>
                </Link>
              );
            })}
            {(!pendingItems || pendingItems.length === 0) && (
              <p className="text-center text-slate-500 py-8 text-sm">No pending actions!</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Recently Completed</h3>
          <div className="space-y-4 flex-1">
            {recentCompletedActivities?.map((act: any) => {
              const student = act.students || {};
              const partner = student.partners || {};
              const displayName = student.name === 'Unknown Lead' && student.prospect_id 
                ? `Lead #${student.prospect_id}` 
                : student.name;

              let slackUrl = '';
              if (student.approvals && Array.isArray(student.approvals)) {
                const approvalWithUrl = student.approvals.find((a: any) => a.raw_slack_context?.includes('SLACK_URL:'));
                if (approvalWithUrl) {
                  const rawUrl = approvalWithUrl.raw_slack_context.split('SLACK_URL:')[1].trim();
                  // Convert client URLs to archives URLs which handle precise message deep linking better
                  if (rawUrl.includes('app.slack.com/client')) {
                    const parts = rawUrl.split('/');
                    const channelId = parts[parts.length - 2];
                    const ts = parts[parts.length - 1];
                    slackUrl = `https://slack.com/archives/${channelId}/${ts}`;
                  } else {
                    slackUrl = rawUrl;
                  }
                }
              }

              const InnerContent = (
                <>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex justify-between items-start mb-1 pr-6">
                    <p className="font-bold text-slate-900 truncate">{displayName}</p>
                    <span className="shrink-0 text-xs text-slate-400">{new Date(act.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{partner.name || 'Unknown Partner'}</p>
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 leading-snug">
                      {act.action}
                    </span>
                  </div>
                </>
              );

              return slackUrl ? (
                <a key={act.id} href={slackUrl} target="_blank" rel="noopener noreferrer" className="group relative flex flex-col justify-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all hover:shadow-sm">
                  {InnerContent}
                </a>
              ) : (
                <div key={act.id} className="flex flex-col justify-center p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-slate-900 truncate">{displayName}</p>
                    <span className="shrink-0 text-xs text-slate-400">{new Date(act.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{partner.name || 'Unknown Partner'}</p>
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 leading-snug">
                      {act.action}
                    </span>
                  </div>
                </div>
              );
            })}
            {(!recentCompletedActivities || recentCompletedActivities.length === 0) && (
              <p className="text-center text-slate-500 py-8 text-sm">No recent activity found.</p>
            )}
          </div>
        </div>
        
        <div>
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <SimulateWebhook />
              <Link href="/queue" className="block w-full text-center px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition-colors">
                View Approval Queue
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-xs font-medium text-slate-400 mt-4">{trend}</p>
    </div>
  );
}
