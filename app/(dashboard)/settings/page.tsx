import { Settings as SettingsIcon, Bell, Shield, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import WhatsAppIntegration from './whatsapp-integration'
import { updateProfile } from './actions'
import { SettingsClient } from './settings-client'

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

      <SettingsClient initialName={fullName} email={userEmail} />

      {user?.id && (
        <WhatsAppIntegration kamId={user.id} />
      )}
    </div>
  )
}

