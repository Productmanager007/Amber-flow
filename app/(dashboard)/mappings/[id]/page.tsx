import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Building2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { CounsellorManager } from './counsellor-manager'

export default async function PartnerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const resolvedParams = await params

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (!partner) {
    notFound()
  }

  const { data: counsellors } = await supabase
    .from('counsellors')
    .select('*')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/mappings" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            {partner.name}
          </h1>
          <p className="text-slate-500 mt-1">
            {partner.whatsapp_group_id ? `WhatsApp Group: ${partner.whatsapp_group_id}` : `Individual: ${partner.whatsapp_number}`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <CounsellorManager partnerId={partner.id} initialCounsellors={counsellors || []} />
      </div>
    </div>
  )
}
