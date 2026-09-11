'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, Users, Plus, Trash2, Edit2, X, Check, FileSpreadsheet } from 'lucide-react'
import { addCounsellor, batchAddCounsellors, deleteCounsellor, updateCounsellor } from './actions'
import Papa from 'papaparse'

export function CounsellorManager({ partnerId, initialCounsellors }: { partnerId: string, initialCounsellors: any[] }) {
  const [activeTab, setActiveTab] = useState<'view' | 'upload'>('view')
  
  return (
    <div>
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => setActiveTab('view')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'view' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
        >
          <Users className="w-4 h-4" /> Existing Counsellors ({initialCounsellors.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
        >
          <Upload className="w-4 h-4" /> Upload Contacts
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'view' ? (
          <CounsellorsList partnerId={partnerId} counsellors={initialCounsellors} />
        ) : (
          <UploadContacts partnerId={partnerId} onSuccess={() => setActiveTab('view')} />
        )}
      </div>
    </div>
  )
}

function CounsellorsList({ partnerId, counsellors }: { partnerId: string, counsellors: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editContact, setEditContact] = useState('')
  const [editBranch, setEditBranch] = useState('')
  const [isPending, startTransition] = useTransition()

  const startEdit = (c: any) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditContact(c.contact_number)
    setEditBranch(c.branch || '')
  }

  const handleSave = async (id: string) => {
    startTransition(async () => {
      await updateCounsellor(id, partnerId, editName, editContact, editBranch)
      setEditingId(null)
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this counsellor?')) {
      startTransition(async () => {
        await deleteCounsellor(id, partnerId)
      })
    }
  }

  if (counsellors.length === 0) {
    return <div className="text-center py-12 text-slate-500">No counsellors found. Switch to the Upload tab to add some.</div>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 rounded-lg">
        <div className="col-span-4">Name</div>
        <div className="col-span-4">Contact Number</div>
        <div className="col-span-3">Branch</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>
      
      <div className="divide-y divide-slate-100">
        {counsellors.map(c => {
          const isEditing = editingId === c.id
          return (
            <div key={c.id} className={`grid grid-cols-12 gap-4 p-4 items-center rounded-lg transition-colors ${isEditing ? 'bg-indigo-50/50' : 'hover:bg-slate-50'} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
              {isEditing ? (
                <>
                  <div className="col-span-4">
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full text-sm px-2 py-1 border rounded" placeholder="Name" />
                  </div>
                  <div className="col-span-4">
                    <input type="text" value={editContact} onChange={e => setEditContact(e.target.value)} className="w-full text-sm px-2 py-1 border rounded" placeholder="Contact" />
                  </div>
                  <div className="col-span-3">
                    <input type="text" value={editBranch} onChange={e => setEditBranch(e.target.value)} className="w-full text-sm px-2 py-1 border rounded" placeholder="Branch" />
                  </div>
                  <div className="col-span-1 flex justify-end gap-1">
                    <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
                    <button onClick={() => handleSave(c.id)} className="p-1 text-white bg-indigo-600 rounded"><Check className="w-4 h-4"/></button>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-4 font-medium text-slate-900">{c.name}</div>
                  <div className="col-span-4 text-slate-600">{c.contact_number}</div>
                  <div className="col-span-3 text-slate-500">{c.branch || '-'}</div>
                  <div className="col-span-1 flex justify-end gap-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded shadow-sm border"><Edit2 className="w-3.5 h-3.5"/></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white rounded shadow-sm border"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UploadContacts({ partnerId, onSuccess }: { partnerId: string, onSuccess: () => void }) {
  const [manualName, setManualName] = useState('')
  const [manualContact, setManualContact] = useState('')
  const [manualBranch, setManualBranch] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualName || !manualContact) return
    
    startTransition(async () => {
      const res = await addCounsellor(partnerId, manualName, manualContact, manualBranch)
      if (res.success) {
        setManualName('')
        setManualContact('')
        setManualBranch('')
        onSuccess()
      } else {
        alert(res.error)
      }
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData: { name: string, contactNumber: string, branch: string }[] = []
        for (const row of results.data as any[]) {
          // Normalize keys (handle Name/name, Contact/contact, Branch/branch)
          const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('name'))
          const contactKey = Object.keys(row).find(k => k.toLowerCase().includes('contact'))
          const branchKey = Object.keys(row).find(k => k.toLowerCase().includes('branch'))
          
          const name = nameKey ? row[nameKey] : (row[0] || '')
          const contact = contactKey ? row[contactKey] : (row[1] || '')
          const branch = branchKey ? row[branchKey] : (row[2] || '')
          
          if (name && contact) {
            parsedData.push({ name: name.trim(), contactNumber: contact.trim(), branch: branch.trim() })
          }
        }

        if (parsedData.length > 0) {
          startTransition(async () => {
            const res = await batchAddCounsellors(partnerId, parsedData)
            if (res.success) {
              alert(`Successfully added ${parsedData.length} counsellors!`)
              onSuccess()
            } else {
              alert(res.error)
            }
          })
        } else {
          alert("No valid rows found. Ensure format is: Name,Contact,Branch")
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error)
        alert("Failed to parse CSV file.")
      }
    })
  }

  return (
    <div className="grid md:grid-cols-2 gap-12">
      {/* Manual Form */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-500" />
          Add Single Counsellor
        </h3>
        <form onSubmit={handleManualAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input type="text" value={manualName} onChange={e=>setManualName(e.target.value)} required className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
            <input type="text" value={manualContact} onChange={e=>setManualContact(e.target.value)} required className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch (Optional)</label>
            <input type="text" value={manualBranch} onChange={e=>setManualBranch(e.target.value)} className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button type="submit" disabled={isPending || !manualName || !manualContact} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {isPending ? 'Adding...' : 'Save Counsellor'}
          </button>
        </form>
      </div>

      {/* CSV Upload */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
          Bulk Upload via CSV
        </h3>
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 mb-1">Upload a CSV file</p>
          <p className="text-xs text-slate-500 mb-4">Format: Name, Contact, Branch</p>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isPending ? 'Processing...' : 'Select CSV File'}
          </button>
        </div>
      </div>
    </div>
  )
}
