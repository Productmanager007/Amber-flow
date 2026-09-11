'use client'

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { addTeamMember } from './actions';

export function TeamForm() {
  const [role, setRole] = useState('KAM');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setError('');
    setIsSubmitting(true);
    
    try {
      const result = await addTeamMember(formData);
      if (result && !result.success) {
        setError(result.error || 'An error occurred.');
      } else {
        // Clear form on success
        const form = document.getElementById('team-form') as HTMLFormElement;
        form?.reset();
        setRole('KAM');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="team-form" action={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg border border-rose-100">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input 
            name="name" 
            required 
            placeholder="Manu S Nair"
            className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input 
            name="email" 
            type="email"
            required 
            placeholder="name@amberstudent.com"
            className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Slack ID {role === 'KAM' ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
          </label>
          <input 
            name="slack_id" 
            placeholder="U083G34P8P3"
            required={role === 'KAM'}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <select 
            name="role" 
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="KAM">KAM</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 h-[38px] disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {isSubmitting ? 'Adding...' : 'Add Member'}
        </button>
      </div>
    </form>
  );
}
