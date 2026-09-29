'use client';

import React from 'react';
import { X, Server, ShieldCheck, Terminal, HardDrive, Key } from 'lucide-react';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-2xs">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900">
            <Server className="w-4 h-4 text-neutral-700" />
            <span>Developer API & Desktop/SFTP Architecture</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-neutral-700 leading-relaxed">
          {/* Storage Isolation Callout */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Storage Provider Abstraction Layer</span>
            </div>
            <p>
              Clients interface only with logical files and logical quota numbers. The physical storage backend (pooled personal Google Drive accounts) operates behind the server-side <code>StorageProvider</code> interface. No Google access tokens, folder IDs, or email addresses are ever sent to client applications.
            </p>
          </div>

          {/* Desktop Client Ready REST API */}
          <div>
            <h3 className="font-bold text-sm text-neutral-900 mb-2">Desktop Client Synchronization API</h3>
            <p className="text-neutral-500 mb-3">
              A future Electron or native macOS/Windows sync client interacts with standard stateless REST endpoints:
            </p>
            <div className="bg-neutral-900 text-neutral-100 rounded-xl p-3.5 font-mono text-[11px] space-y-1.5">
              <div><span className="text-emerald-400">GET</span> /api/files?parentId=null <span className="text-neutral-400">{'// List files in directory'}</span></div>
              <div><span className="text-amber-400">POST</span> /api/files/upload/init <span className="text-neutral-400">{'// Pre-reserve quota & get session'}</span></div>
              <div><span className="text-amber-400">POST</span> /api/files/upload/chunk <span className="text-neutral-400">{'// Resumable byte ranges'}</span></div>
              <div><span className="text-amber-400">POST</span> /api/files/upload/complete <span className="text-neutral-400">{'// Commit used bytes & checksum'}</span></div>
              <div><span className="text-emerald-400">GET</span> /api/files/:id/download <span className="text-neutral-400">{'// Stream file contents'}</span></div>
              <div><span className="text-sky-400">PATCH</span> /api/files/:id <span className="text-neutral-400">{'// Rename / Move'}</span></div>
              <div><span className="text-rose-400">DELETE</span> /api/files/:id <span className="text-neutral-400">{'// Soft-trash or purge'}</span></div>
            </div>
          </div>

          {/* SFTP Ready Architecture */}
          <div>
            <h3 className="font-bold text-sm text-neutral-900 mb-2">SFTP Bridge Readiness</h3>
            <p className="text-neutral-500 mb-2">
              The service layer (`FileService` & `QuotaService`) separates logical POSIX hierarchy from object persistence:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>Stateless file handle resolution with internal UUIDs</li>
              <li>Virtual POSIX permissions and timestamps mapped to <code>files_metadata</code></li>
              <li>Direct chunk streaming ready for SSH/SFTP data channels</li>
            </ul>
          </div>

          {/* Infrastructure Architecture */}
          <div>
            <h3 className="font-bold text-sm text-neutral-900 mb-2">Storage Infrastructure Foundations</h3>
            <p className="text-neutral-500">
              Database schema includes <code>storage_providers_pool</code>, <code>manual_upi_payments</code>, <code>audit_logs</code>, and tenant isolation, allowing modular management of multi-account drive pools without exposing internal nodes to users.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-100 flex justify-end bg-neutral-50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
