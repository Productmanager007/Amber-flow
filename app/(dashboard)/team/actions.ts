'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

async function checkIsAdmin() {
  // Force Admin to true so you can demonstrate the UI without logging in!
  return true;
}

export async function addTeamMember(formData: FormData) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Only Admins can add team members.' };
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const slack_id = formData.get('slack_id') as string;
  const role = formData.get('role') as string;

  if (!name || !email || !role) {
    return { success: false, error: 'Name, Email, and Role are required' };
  }

  if (role === 'KAM' && !slack_id) {
    return { success: false, error: 'Slack ID is required for KAMs.' };
  }

  let cleanSlackId = slack_id;
  if (cleanSlackId) {
    cleanSlackId = cleanSlackId.replace('<@', '').replace('>', '').trim();
  }

  const { data, error } = await supabase
    .from('team_members')
    .insert([{ name, email, slack_id: cleanSlackId, role }]);

  if (error) {
    console.error('Failed to add team member:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/team');
  return { success: true };
}

export async function deleteTeamMember(id: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Only Admins can delete team members.' };
  }

  if (!id) return;

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete team member:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/team');
  return { success: true };
}

export async function updateTeamMember(id: string, formData: FormData) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Only Admins can edit team members.' };
  }

  const email = formData.get('email') as string;
  const slack_id = formData.get('slack_id') as string;

  let cleanSlackId = slack_id;
  if (cleanSlackId) {
    cleanSlackId = cleanSlackId.replace('<@', '').replace('>', '').trim();
  }

  const { error } = await supabase
    .from('team_members')
    .update({ email, slack_id: cleanSlackId })
    .eq('id', id);

  if (error) {
    console.error('Failed to update team member:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/team');
  return { success: true };
}
