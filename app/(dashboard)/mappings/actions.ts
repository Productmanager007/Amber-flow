'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateMapping(partnerId: string, whatsappNumber: string, whatsappGroupId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('partners')
    .update({ 
      whatsapp_number: whatsappNumber || null,
      whatsapp_group_id: whatsappGroupId || null
    })
    .eq('id', partnerId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mappings')
  return { success: true }
}

export async function createPartner(name: string, mappingType: 'individual' | 'group', destination: string) {
  const supabase = await createClient()

  const whatsapp_number = mappingType === 'individual' ? destination : null;
  const whatsapp_group_id = mappingType === 'group' ? destination : null;

  const { error } = await supabase
    .from('partners')
    .insert([{ name, whatsapp_number, whatsapp_group_id }])

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/mappings')
  return { success: true }
}

export async function deletePartner(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('partners').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/mappings')
  return { success: true }
}

export async function updatePartnerName(id: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('partners').update({ name }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/mappings')
  return { success: true }
}

export async function fetchWhatsAppGroups() {
  try {
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    
    if (!instanceId || !token) {
      return { groups: [], error: 'Gateway credentials missing' };
    }

    const cleanInstanceId = instanceId.replace(/\/+$/, '');
    const baseUrl = cleanInstanceId.startsWith('http') ? cleanInstanceId : `https://api.ultramsg.com/${cleanInstanceId}`;
    
    const response = await fetch(`${baseUrl}/groups?token=${token}`, { cache: 'no-store' });
    
    if (!response.ok) {
      return { groups: [], error: 'Failed to fetch from Gateway' };
    }

    const groups = await response.json();
    return { groups, error: null };
  } catch (error) {
    console.error('Failed to fetch WhatsApp groups:', error);
    return { groups: [], error: 'Failed to connect to WhatsApp bot' };
  }
}
