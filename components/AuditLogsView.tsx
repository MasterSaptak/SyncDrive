'use client';

import React, { useState, useEffect } from 'react';
import { AuditLogEntry } from '@/types';
import { ShieldAlert, RefreshCw, Clock, Terminal, Activity } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/audit');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Security Audit Logs</h1>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Zero-Trust Traceability
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Immutable audit record of all storage operations, quota adjustments, and file authorizations.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 dark:bg-neutral-800/80 border-b border-neutral-200/80 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium select-none">
              <tr>
                <th className="py-3 px-3 sm:px-4">Action</th>
                <th className="py-3 px-3 hidden sm:table-cell">Resource Type</th>
                <th className="py-3 px-3 hidden md:table-cell">Context / Metadata</th>
                <th className="py-3 px-3 hidden lg:table-cell">Client IP</th>
                <th className="py-3 px-3 sm:px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
              {logs.map((log) => {
                const isWarning = log.action.includes('PURGED') || log.action.includes('TRASH');
                const isPositive = log.action.includes('UPLOAD') || log.action.includes('APPROVED');

                return (
                  <tr key={log.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-2.5 px-3 sm:px-4 font-semibold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-sans ${
                          isWarning
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            : isPositive
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 capitalize font-sans text-neutral-600 dark:text-neutral-300 hidden sm:table-cell">
                      {log.resourceType}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 text-[11px] truncate max-w-xs hidden md:table-cell">
                      {JSON.stringify(log.metadata)}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400 hidden lg:table-cell text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 text-right text-neutral-500 dark:text-neutral-400 text-[11px] font-sans whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
