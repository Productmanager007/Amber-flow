'use client';

import { useState } from 'react';
import { Check, MessageSquarePlus, MessageCircleReply } from 'lucide-react';
import { QueueItem } from '@/components/queue/queue-item';

interface QueueTabsProps {
  newApprovals: any[];
  followupApprovals: any[];
  actions: any;
}

export function QueueTabs({ newApprovals, followupApprovals, actions }: QueueTabsProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'followup'>('new');

  const activeApprovals = activeTab === 'new' ? newApprovals : followupApprovals;

  return (
    <div className="space-y-6">
      {/* Tabs / Dropdown Section Selectors */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('new')}
          className={`pb-4 flex items-center gap-2 px-2 border-b-2 font-medium transition-colors ${
            activeTab === 'new'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <MessageSquarePlus className="w-4 h-4" />
          New Tags
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
            activeTab === 'new' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {newApprovals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('followup')}
          className={`pb-4 flex items-center gap-2 px-2 border-b-2 font-medium transition-colors ${
            activeTab === 'followup'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <MessageCircleReply className="w-4 h-4" />
          Follow-up Messages
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
            activeTab === 'followup' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {followupApprovals.length}
          </span>
        </button>
      </div>

      {/* List Content */}
      <div className="grid gap-4">
        {activeApprovals.map((approval) => {
          const partner = approval.students?.partners;
          const waGroupId = partner?.whatsapp_group_id || partner?.whatsapp_number || '';
          
          return (
            <QueueItem 
              key={approval.id} 
              approval={approval} 
              waGroupId={waGroupId}
              {...actions}
            />
          );
        })}
        
        {activeApprovals.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <Check className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
            <p className="text-slate-500">
              There are no {activeTab === 'new' ? 'new tags' : 'follow-up messages'} waiting for your approval.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
