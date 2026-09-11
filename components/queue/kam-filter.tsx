'use client'

import { useRouter, useSearchParams } from 'next/navigation';

export function KamFilter({ teamMembers, selectedKam }: { teamMembers: any[], selectedKam: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <form className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
      <span className="text-sm font-medium text-slate-600">View Queue:</span>
      <select 
        name="kam"
        value={selectedKam}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value === 'all') {
            params.delete('kam');
          } else {
            params.set('kam', e.target.value);
          }
          router.push(`?${params.toString()}`);
        }}
        className="text-sm border-none bg-slate-50 rounded px-2 py-1 focus:ring-0 outline-none text-slate-900 font-medium cursor-pointer"
      >
        <option value="all">All KAMs</option>
        <option value="unassigned">Unassigned</option>
        {teamMembers?.map(member => (
          <option key={member.id} value={member.id}>{member.name}</option>
        ))}
      </select>
    </form>
  );
}
