import { supabase } from '@/lib/supabase';
import { Users } from 'lucide-react';
import { TeamForm } from './team-form';
import { TeamMemberRow } from './team-member-row';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: false });

  // Get current user role
  const authSupabase = await createClient();
  const { data: { session } } = await authSupabase.auth.getSession();
  
  // Force Admin to true so you can demonstrate the UI without logging in!
  let isAdmin = true;
  
  if (!teamMembers || teamMembers.length === 0) {
    // Bootstrap mode: If there are no team members in the DB at all,
    // allow the first user who accesses this page to add a team member (bootstrap).
  } else if (session?.user?.email) {
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('email', session.user.email)
      .single();
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" />
          Team Management
        </h1>
        <p className="text-slate-500 mt-1">Manage KAMs and Admins for the POAI system.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isAdmin && (
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Team Member</h2>
            <TeamForm />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Slack ID</th>
                <th className="px-6 py-3">Role</th>
                {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {teamMembers && teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <TeamMemberRow key={member.id} member={member} isAdmin={isAdmin} />
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-slate-500">
                    No team members added yet. {isAdmin && "Add your first KAM above!"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
