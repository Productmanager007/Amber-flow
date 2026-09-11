'use server'

import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  
  if (!email || !email.endsWith('@amberstudent.com')) {
    return { error: 'Invalid email domain. Must be @amberstudent.com' }
  }

  const supabase = await createClient()

  // STRICT LOGIN LOCKDOWN: Only allow users that exist in team_members
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('id, role')
    .eq('email', email)
    .single()

  if (memberError || !member) {
    return { error: 'Access Denied: Your email has not been registered by an Admin.' }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://amber-flow-virid.vercel.app';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function verify(email: string, token: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  
  if (error) {
    return { error: error.message }
  }
  
  return { error: null }
}
