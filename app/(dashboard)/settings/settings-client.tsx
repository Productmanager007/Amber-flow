'use client'

import { useState } from 'react'
import { Bell, Shield, User, Edit2, Check, X } from 'lucide-react'
import { updateProfile } from './actions'

export function SettingsClient({ initialName, email }: { initialName: string, email: string }) {
  const [activeTab, setActiveTab] = useState('Security')
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(initialName)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('Account')}
          className={`px-6 py-4 text-sm font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'Account' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4" /> Account
        </button>
        <button 
          onClick={() => setActiveTab('Notifications')}
          className={`px-6 py-4 text-sm font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'Notifications' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Bell className="w-4 h-4" /> Notifications
        </button>
        <button 
          onClick={() => setActiveTab('Security')}
          className={`px-6 py-4 text-sm font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'Security' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" /> Security
        </button>
      </div>

      {activeTab === 'Security' && (
        <form action={updateProfile} className="p-8 space-y-8">
          <div className="max-w-md space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900">Security & Profile</h3>
              <p className="text-sm text-slate-500 mt-1">Manage your identity and authentication details.</p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Full Name</label>
              <div className="flex items-center gap-3">
                <input 
                  name="fullName"
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
                    isEditing 
                      ? 'border-indigo-300 bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900' 
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                />
                
                {!isEditing ? (
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit Name"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button 
                      type="submit" 
                      onClick={() => setIsEditing(false)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Save Changes"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsEditing(false);
                        setName(initialName);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                defaultValue={email} 
                disabled
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500"
              />
              <input type="hidden" name="email" value={email} />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed due to security domain restrictions.</p>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'Account' && (
        <div className="p-8">
          <p className="text-slate-500">Your account preferences will appear here.</p>
        </div>
      )}

      {activeTab === 'Notifications' && (
        <div className="p-8">
          <p className="text-slate-500">Your notification settings will appear here.</p>
        </div>
      )}
    </div>
  )
}
