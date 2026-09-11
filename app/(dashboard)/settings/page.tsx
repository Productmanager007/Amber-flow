import { Settings as SettingsIcon, Bell, Shield, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import WhatsAppIntegration from './whatsapp-integration'
import { updateProfile } from './actions'

export const metadata = {
  title: 'Settings | POAI'
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let fullName = "Manu Sharma"
  const userEmail = user?.email || "manu@amberstudent.com"
  
  if (userEmail) {
    const { supabase: globalSupabase } = await import('@/lib/supabase');
    const { data: teamMember } = await globalSupabase.from('team_members').select('name').eq('email', userEmail).single()
    if (teamMember?.name) {
      fullName = teamMember.name
    }
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage your account settings and global preferences.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button className="px-6 py-4 text-sm font-semibold text-indigo-600 border-b-2 border-indigo-600 flex items-center gap-2 bg-indigo-50/50">
            <User className="w-4 h-4" /> Account
          </button>
          <button type="button" title="Notifications feature is coming in V2!" className="px-6 py-4 text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-2 transition-colors cursor-not-allowed">
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button type="button" title="Security settings are managed globally by the workspace administrator." className="px-6 py-4 text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-2 transition-colors cursor-not-allowed">
            <Shield className="w-4 h-4" /> Security
          </button>
        </div>

        <form action={updateProfile} className="p-8 space-y-8">
          <div className="max-w-md space-y-4">
            <h3 className="font-semibold text-slate-900">Profile Information</h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Full Name</label>
              <input 
                name="fullName"
                type="text" 
                defaultValue={fullName} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                defaultValue={user?.email || "manu@amberstudent.com"} 
                disabled
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500"
              />
              <input type="hidden" name="email" value={userEmail} />
              <p className="text-xs text-slate-400">Email cannot be changed due to security domain restrictions.</p>
            </div>
          </div>
          
          <hr className="border-slate-100" />
          
          <div className="flex justify-end">
            <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {user?.id && (
        <WhatsAppIntegration kamId={user.id} />
      )}
    </div>
  )
}

