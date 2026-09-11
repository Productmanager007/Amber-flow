'use client'

import { Calendar, Bell } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { LiveNotifications } from './live-notifications';
import { DateRangePicker } from './date-range-picker';

export function Header({ userName = "Manu Sharma" }: { userName?: string }) {
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    const now = new Date();
    setDateStr(now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
    
    const hour = now.getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const firstName = userName.split(' ')[0] || 'Manu';
  const initial = firstName.charAt(0).toUpperCase() || 'M';

  return (
    <header className="h-24 px-8 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          {greeting}, {firstName} <span className="text-2xl wave">👋</span>
        </h2>
        <p className="text-slate-500 mt-1 text-sm font-medium">Here&apos;s what&apos;s happening with your partnerships today.</p>
      </div>

      <div className="flex items-center gap-6">
        <Suspense fallback={<div className="h-9 w-32 bg-slate-100 animate-pulse rounded-lg"></div>}>
          <DateRangePicker />
        </Suspense>
        
        <LiveNotifications />

        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
            {initial}
          </div>
          <span className="font-medium text-slate-700">{firstName}</span>
        </div>
      </div>
    </header>
  );
}
