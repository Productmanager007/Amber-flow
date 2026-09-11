'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCounsellor(partnerId: string, name: string, contactNumber: string, branch?: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('counsellors')
    .insert([
      { partner_id: partnerId, name, contact_number: contactNumber, branch: branch || null }
    ])
    .select()

  if (error) {
    console.error('Error adding counsellor:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/mappings/${partnerId}`)
  return { success: true, data }
}

export async function batchAddCounsellors(partnerId: string, counsellors: { name: string, contactNumber: string, branch?: string }[]) {
  const supabase = await createClient()
  
  const formattedCounsellors = counsellors.map(c => ({
    partner_id: partnerId,
    name: c.name,
    contact_number: c.contactNumber,
    branch: c.branch || null
  }))

  const { data, error } = await supabase
    .from('counsellors')
    .insert(formattedCounsellors)
    .select()

  if (error) {
    console.error('Error batch adding counsellors:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/mappings/${partnerId}`)
  return { success: true, data }
}

export async function deleteCounsellor(counsellorId: string, partnerId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('counsellors')
    .delete()
    .eq('id', counsellorId)

  if (error) {
    console.error('Error deleting counsellor:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/mappings/${partnerId}`)
  return { success: true }
}

export async function updateCounsellor(counsellorId: string, partnerId: string, name: string, contactNumber: string, branch?: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('counsellors')
    .update({ name, contact_number: contactNumber, branch: branch || null })
    .eq('id', counsellorId)

  if (error) {
    console.error('Error updating counsellor:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/mappings/${partnerId}`)
  return { success: true }
}
