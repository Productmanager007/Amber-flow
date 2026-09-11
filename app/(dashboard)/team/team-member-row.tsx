'use client'

import { useState } from 'react';
import { Trash2, ShieldAlert, Edit3, Save, X } from 'lucide-react';
import { deleteTeamMember, updateTeamMember } from './actions';

export function TeamMemberRow({ member, isAdmin }: { member: any, isAdmin: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(member.email || '');
  const [slackId, setSlackId] = useState(member.slack_id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setIsSaving(true);
    
    const formData = new FormData();
    formData.append('email', email);
    formData.append('slack_id', slackId);

    const result = await updateTeamMember(member.id, formData);
    
    if (result && !result.success) {
      setError(result.error || 'Failed to update member');
    } else {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  if (isEditing) {
    return (
      <tr className="bg-indigo-50/50">
        <td className="px-6 py-4 font-medium text-slate-900">{member.name}</td>
        <td className="px-6 py-4">
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full text-sm p-1.5 border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-500" 
          />
        </td>
        <td className="px-6 py-4">
          <input 
            type="text" 
            value={slackId} 
            onChange={(e) => setSlackId(e.target.value)} 
            className="w-full text-sm p-1.5 border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-500 font-mono" 
          />
          {error && <p className="text-[10px] text-rose-500 mt-1">{error}</p>}
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            member.role === 'Admin' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {member.role === 'Admin' && <ShieldAlert className="w-3 h-3 mr-1" />}
            {member.role}
          </span>
        </td>
        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
          <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 p-1" disabled={isSaving}>
            <X className="w-4 h-4" />
          </button>
          <button onClick={handleSave} className="text-indigo-600 hover:text-indigo-700 p-1" disabled={isSaving}>
            <Save className="w-4 h-4" />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4 font-medium text-slate-900">{member.name}</td>
      <td className="px-6 py-4 text-slate-600">{member.email}</td>
      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{member.slack_id || '-'}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          member.role === 'Admin' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {member.role === 'Admin' && <ShieldAlert className="w-3 h-3 mr-1" />}
          {member.role}
        </span>
      </td>
      {isAdmin && (
        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
          <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Edit Member">
            <Edit3 className="w-4 h-4" />
          </button>
          <form action={async () => {
            await deleteTeamMember(member.id);
          }}>
            <button type="submit" className="text-slate-400 hover:text-rose-500 transition-colors p-1" title="Remove Member">
              <Trash2 className="w-4 h-4" />
            </button>
          </form>
        </td>
      )}
    </tr>
  );
}
