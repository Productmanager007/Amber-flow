'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filter = searchParams.get('filter') || 'today';
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Start and End for custom range
  const [rangeStart, setRangeStart] = useState<Date | null>(startParam ? new Date(startParam) : null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(endParam ? new Date(endParam) : null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const onDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    clickedDate.setHours(0,0,0,0);
    
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(clickedDate);
      setRangeEnd(null);
    } else if (clickedDate < rangeStart) {
      setRangeStart(clickedDate);
      setRangeEnd(rangeStart);
    } else {
      setRangeEnd(clickedDate);
      
      // Auto apply when end date is selected
      applyCustomRange(rangeStart, clickedDate);
    }
  };

  const applyCustomRange = (start: Date, end: Date) => {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    router.push(`${pathname}?start=${startStr}&end=${endStr}`);
    setIsOpen(false);
  };

  const applyShortcut = (f: string) => {
    router.push(`${pathname}?filter=${f}`);
    setIsOpen(false);
    setRangeStart(null);
    setRangeEnd(null);
  };

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(pathname);
    setIsOpen(false);
    setRangeStart(null);
    setRangeEnd(null);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      date.setHours(0,0,0,0);
      
      let isSelected = false;
      let isInRange = false;

      if (rangeStart && date.getTime() === rangeStart.getTime()) isSelected = true;
      if (rangeEnd && date.getTime() === rangeEnd.getTime()) isSelected = true;
      if (rangeStart && rangeEnd && date > rangeStart && date < rangeEnd) isInRange = true;

      days.push(
        <button
          key={i}
          onClick={() => onDateClick(i)}
          className={`w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors
            ${isSelected ? 'bg-indigo-600 text-white font-bold' : ''}
            ${isInRange && !isSelected ? 'bg-indigo-50 text-indigo-700' : ''}
            ${!isSelected && !isInRange ? 'hover:bg-slate-100 text-slate-700' : ''}
          `}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="p-3">
        <div className="flex justify-between items-center mb-4 px-1">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="font-semibold text-sm text-slate-800">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map(day => (
            <div key={day} className="w-8 text-center text-[10px] font-bold text-slate-400">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  let displayLabel = '';
  if (startParam && endParam) {
    displayLabel = `${new Date(startParam).toLocaleDateString()} - ${new Date(endParam).toLocaleDateString()}`;
  } else if (filter === 'all') {
    displayLabel = 'All Time';
  } else {
    // If today, show the actual date string to match previous header
    if (filter === 'today') {
      displayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } else {
      displayLabel = filter.charAt(0).toUpperCase() + filter.slice(1);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <CalendarIcon className="w-4 h-4 text-slate-500" />
        <span suppressHydrationWarning>{displayLabel}</span>
        {(startParam || filter !== 'today') && (
          <div 
            onClick={(e) => { e.stopPropagation(); applyShortcut('today'); }}
            className="ml-1 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            title="Reset to Today"
          >
            <X className="w-3.5 h-3.5" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {renderCalendar()}
          
          <div className="p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
            {['today', 'week', 'month', 'year'].map((f) => (
              <button 
                key={f}
                onClick={() => applyShortcut(f)}
                className={`py-1.5 px-3 text-xs font-bold rounded-md capitalize transition-colors border
                  ${(!startParam && filter === f) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}
                `}
              >
                {f}
              </button>
            ))}
            <button 
              onClick={() => applyShortcut('all')}
              className={`col-span-2 py-1.5 px-3 text-xs font-bold rounded-md transition-colors border
                ${(!startParam && filter === 'all') ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}
              `}
            >
              Show All Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
