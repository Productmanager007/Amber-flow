'use client'

import { useState, useTransition } from 'react'
import { updateMapping, deletePartner, updatePartnerName } from './actions'
import { Check, Save, Trash2, Edit2, X, Phone, Users, Settings } from 'lucide-react'
import Link from 'next/link'

export function MappingForm({ 
  partner 
}: { 
  partner: any 
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [partnerName, setPartnerName] = useState(partner.name)
  const [isPending, startTransition] = useTransition()
  const [whatsapp, setWhatsapp] = useState(partner.whatsapp_number || '')
  const [whatsappGroup, setWhatsappGroup] = useState(partner.whatsapp_group_id || '')
  const [mappingType, setMappingType] = useState<'individual' | 'group'>(
    partner.whatsapp_group_id ? 'group' : 'individual'
  )
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    setSaved(false)
    
    // Clear the unused field based on the selected type
    const numToSave = mappingType === 'individual' ? whatsapp : null;
    const groupToSave = mappingType === 'group' ? whatsappGroup : null;
    
    // Update mapping
    await updateMapping(partner.id, numToSave, groupToSave)
    
    // Update name if changed
    if (partnerName !== partner.name) {
      await updatePartnerName(partner.id, partnerName)
    }
    
    setLoading(false)
    setIsEditing(false)
  }

  const handleCancel = () => {
    // Reset state
    setPartnerName(partner.name)
    setWhatsapp(partner.whatsapp_number || '')
    setWhatsappGroup(partner.whatsapp_group_id || '')
    setMappingType(partner.whatsapp_group_id ? 'group' : 'individual')
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${partner.name}?`)) {
      startTransition(() => {
        deletePartner(partner.id)
      })
    }
  }

  const isDirty = 
    whatsapp !== (partner.whatsapp_number || '') || 
    whatsappGroup !== (partner.whatsapp_group_id || '') ||
    mappingType !== (partner.whatsapp_group_id ? 'group' : 'individual') ||
    partnerName !== partner.name

  const currentDestination = partner.whatsapp_group_id || partner.whatsapp_number || 'Not configured'
  const isGroup = !!partner.whatsapp_group_id

  if (!isEditing) {
    return (
      <div className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="col-span-3 font-medium text-slate-900 truncate pr-2">
          {partner.name}
        </div>
        
        <div className="col-span-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isGroup ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {isGroup ? <Users className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            {isGroup ? 'WA Group' : 'Individual'}
          </span>
        </div>

        <div className="col-span-4 text-sm text-slate-600 truncate pr-2">
          {currentDestination}
        </div>

        <div className="col-span-2 text-right flex items-center justify-end gap-1">
          {isGroup && (
            <Link 
              href={`/mappings/${partner.id}`}
              className="inline-flex items-center justify-center p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Manage Counsellors"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit Partner"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Partner"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-12 gap-4 p-4 items-center bg-indigo-50/30 transition-colors ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="col-span-3">
        <input
          type="text"
          value={partnerName}
          onChange={(e) => setPartnerName(e.target.value)}
          className="w-full text-sm px-2 py-1.5 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          autoFocus
          placeholder="Partner Name"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
      </div>
      
      <div className="col-span-3">
        <div className="flex bg-slate-200/50 p-1 rounded-lg">
          <button
            onClick={() => setMappingType('individual')}
            className={`flex-1 text-xs font-medium py-1 rounded-md transition-colors ${mappingType === 'individual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Individual
          </button>
          <button
            onClick={() => setMappingType('group')}
            className={`flex-1 text-xs font-medium py-1 rounded-md transition-colors ${mappingType === 'group' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            WA Group
          </button>
        </div>
      </div>

      <div className="col-span-4">
        {mappingType === 'individual' ? (
          <input
            type="text"
            placeholder="Phone Number (+123...)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        ) : (
          <input
            type="text"
            placeholder="Group Invite Link or ID (e.g., 1234@g.us)..."
            value={whatsappGroup}
            onChange={(e) => setWhatsappGroup(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        )}
      </div>

      <div className="col-span-2 text-right flex items-center justify-end gap-1">
        <button
          onClick={handleCancel}
          className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !isDirty}
          className="inline-flex items-center justify-center p-1.5 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 rounded-lg transition-colors"
          title="Save Changes"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
