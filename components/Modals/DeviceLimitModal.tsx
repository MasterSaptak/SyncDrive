'use client';

import React, { useState } from 'react';
import { DeviceSession, DeviceSessionState } from '@/types/session';
import { Laptop, Smartphone, AlertTriangle, ShieldAlert, ArrowRightLeft, LogOut, CheckCircle2, RefreshCw } from 'lucide-react';

interface DeviceLimitModalProps {
  state: DeviceSessionState;
  onUseHere: (evictDeviceId?: string) => Promise<boolean>;
  onLogout: () => void;
}

function formatTimeAgo(timestamp: number) {
  const diffSec = Math.max(1, Math.floor((new Date().getTime() - timestamp) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export function DeviceLimitModal({ state, onUseHere, onLogout }: DeviceLimitModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedEvictId, setSelectedEvictId] = useState<string | null>(null);

  if (state.isAllowed && !state.reason) {
    return null;
  }

  const isEvicted = state.reason === 'session_evicted';

  const handleUseHere = async () => {
    setIsProcessing(true);
    await onUseHere(selectedEvictId || undefined);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-slate-900 text-white shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className={`p-3.5 rounded-2xl shrink-0 border ${isEvicted ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
            {isEvicted ? <ShieldAlert className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {isEvicted ? 'Session Transferred to Another Device' : 'Device Limit Reached'}
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Max 2 Devices
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isEvicted
                ? 'Your session on this device was paused because "Use Here" was activated from another computer or mobile browser.'
                : 'Your account is actively logged into 2 devices right now. To continue on this device, click "Use Here" to transfer the session slot.'}
            </p>
          </div>
        </div>

        {/* Active Devices List */}
        {!isEvicted && state.activeSessions.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span>Active Connected Devices ({state.activeSessions.length}/{state.maxDevices})</span>
              <span className="text-[11px] text-amber-400">Select one to replace</span>
            </div>

            <div className="space-y-2">
              {state.activeSessions.map((session, idx) => {
                const isSelected = selectedEvictId === session.deviceId || (!selectedEvictId && idx === 0);
                const isPhone = session.os.toLowerCase().includes('android') || session.os.toLowerCase().includes('ios');

                return (
                  <div
                    key={session.id || session.deviceId}
                    onClick={() => setSelectedEvictId(session.deviceId)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm ring-1 ring-amber-500/40'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                        {isPhone ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold">{session.deviceName || session.browser}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {session.os} • Heartbeat {formatTimeAgo(session.lastHeartbeat)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {isSelected ? (
                        <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/20 px-2 py-1 rounded-md border border-amber-500/30">
                          Will Disconnect
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 hover:text-slate-300">
                          Click to swap
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {/* THE "USE HERE" BUTTON */}
          <button
            onClick={handleUseHere}
            disabled={isProcessing}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Transferring Session Slot...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4" />
                <span>Use Here</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
            <span className="text-[11px] text-slate-500">
              Only 2 concurrent devices per account
            </span>

            <button
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out on this device</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
