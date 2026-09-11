'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getWhatsAppStatus(kamId: string) {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;
  if (!instanceId || !token) return { error: 'Gateway not configured' };

  try {
    const cleanInstanceId = instanceId.replace(/\/+$/, '');
    const baseUrl = cleanInstanceId.startsWith('http') ? cleanInstanceId : `https://api.ultramsg.com/${cleanInstanceId}`;
    
    const response = await fetch(`${baseUrl}/sessions/status?kamId=${kamId}&token=${token}`, { cache: 'no-store' });
    if (!response.ok) return { error: 'Gateway offline' };
    return await response.json();
  } catch (error) {
    return { error: 'Failed to connect to gateway' };
  }
}

export async function connectWhatsApp(kamId: string) {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;
  if (!instanceId || !token) return { error: 'Gateway not configured' };

  try {
    const cleanInstanceId = instanceId.replace(/\/+$/, '');
    const baseUrl = cleanInstanceId.startsWith('http') ? cleanInstanceId : `https://api.ultramsg.com/${cleanInstanceId}`;
    
    const params = new URLSearchParams({ token, kamId });
    const response = await fetch(`${baseUrl}/sessions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    return await response.json();
  } catch (error) {
    return { error: 'Failed to connect to gateway' };
  }
}

export async function disconnectWhatsApp(kamId: string) {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;
  if (!instanceId || !token) return { error: 'Gateway not configured' };

  try {
    const cleanInstanceId = instanceId.replace(/\/+$/, '');
    const baseUrl = cleanInstanceId.startsWith('http') ? cleanInstanceId : `https://api.ultramsg.com/${cleanInstanceId}`;
    
    const params = new URLSearchParams({ token, kamId });
    const response = await fetch(`${baseUrl}/sessions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    return await response.json();
  } catch (error) {
    return { error: 'Failed to connect to gateway' };
  }
}

export async function updateProfile(formData: FormData) {
  const fullName = formData.get('fullName') as string;
  const email = formData.get('email') as string;
  
  if (!fullName || !email) return;

  await supabase.from('team_members').update({ name: fullName }).eq('email', email);
  
  // Revalidate the entire layout so the Header updates
  revalidatePath('/', 'layout');
}
