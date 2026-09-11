'use client'

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp } from './actions';
import { Smartphone, RefreshCw, LogOut } from 'lucide-react';

export default function WhatsAppIntegration({ kamId }: { kamId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'connected' | 'disconnected'>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    const res = await getWhatsAppStatus(kamId);
    if (res.error) {
      setError(res.error);
      setStatus('disconnected');
    } else {
      if (res.isReady) {
        setStatus('connected');
        setQrCode(null);
      } else if (res.qr) {
        setStatus('disconnected');
        setQrCode(res.qr);
      } else {
        setStatus('disconnected');
      }
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 5 seconds if not connected
    const interval = setInterval(() => {
      if (status !== 'connected') {
        fetchStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [kamId, status]);

  const handleConnect = async () => {
    setStatus('loading');
    setError(null);
    const res = await connectWhatsApp(kamId);
    if (res.error) {
      setError(res.error);
      setStatus('disconnected');
    }
    // The polling will pick up the QR code shortly
  };

  const handleDisconnect = async () => {
    setStatus('loading');
    await disconnectWhatsApp(kamId);
    setQrCode(null);
    setStatus('disconnected');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-8 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-500" />
            WhatsApp Connection
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Link your personal WhatsApp number to send messages to your assigned partners automatically.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {status === 'connected' && (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium text-green-800">Connected & Ready</span>
            </div>
            <button 
              onClick={handleDisconnect}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Disconnect
            </button>
          </div>
        )}

        {status !== 'connected' && (
          <div className="space-y-6">
            {!qrCode ? (
              <button 
                onClick={handleConnect}
                disabled={status === 'loading'}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {status === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                Generate QR Code
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
                  <QRCodeSVG value={qrCode} size={250} level="H" />
                </div>
                <h4 className="font-semibold text-slate-900 text-lg">Scan to link your device</h4>
                <ol className="text-sm text-slate-600 mt-3 space-y-2 max-w-sm text-left list-decimal list-inside">
                  <li>Open WhatsApp on your phone</li>
                  <li>Tap Menu <strong>⋮</strong> or Settings <strong>⚙️</strong></li>
                  <li>Tap <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong> and point your phone at this screen</li>
                </ol>
                <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Waiting for connection...
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
