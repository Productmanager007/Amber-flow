import Link from 'next/link';
import { 
  Home, 
  ListChecks, 
  Settings,
  HelpCircle,
  Network,
  Bot,
  Users
} from 'lucide-react';

export function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col justify-between py-6">
      <div>
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Bot className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-tight">POAI</h1>
            <p className="text-[10px] text-slate-500 font-medium">Partnership Operations<br/>MVP</p>
          </div>
        </div>

        <nav className="space-y-1 px-3">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          
          <Link href="/queue" className="flex items-center justify-between px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <div className="flex items-center gap-3">
              <ListChecks className="w-5 h-5" />
              <span>Approval Queue</span>
            </div>
          </Link>

          <Link href="/mappings" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Network className="w-5 h-5" />
            <span>Channel Mappings</span>
          </Link>

          <Link href="/ignored" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <ListChecks className="w-5 h-5 opacity-60" />
            <span>Ignored Messages</span>
          </Link>

          <Link href="/team" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Users className="w-5 h-5" />
            <span>Team Settings</span>
          </Link>

          <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </nav>
      </div>

      <div className="px-6 space-y-6">
        <button className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">
          <HelpCircle className="w-4 h-4" /> Need Help?
        </button>
      </div>
    </div>
  );
}
