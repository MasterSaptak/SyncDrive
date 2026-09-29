'use client';

import React from 'react';
import { X, Info, ShieldCheck, Copy, Check } from 'lucide-react';
import { PublicFileItem } from '@/types';
import { formatBytes, formatDate } from '@/lib/formatters';

interface FileDetailsModalProps {
  isOpen: boolean;
  file: PublicFileItem | null;
  onClose: () => void;
}

export const FileDetailsModal: React.FC<FileDetailsModalProps> = ({
  isOpen,
  file,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen || !file) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-2xs">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900">
            <Info className="w-4 h-4 text-neutral-700" />
            <span>File Metadata & Properties</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Backend Physical Isolation:</span> The SaaS platform maintains internal metadata. Underlying Google Drive account emails, folder IDs, and OAuth tokens are strictly decoupled.
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 font-medium">Filename</span>
              <span className="font-semibold text-neutral-900 truncate max-w-[280px]">{file.name}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 font-medium">Internal Object ID</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-800">
                <span>{file.id}</span>
                <button
                  onClick={() => copyToClipboard(file.id, 'id')}
                  className="text-neutral-400 hover:text-neutral-700 p-0.5"
                >
                  {copiedKey === 'id' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 font-medium">Exact Logical Size</span>
              <span className="font-semibold text-neutral-900">
                {formatBytes(file.sizeBytes)} ({file.sizeBytes.toLocaleString()} bytes)
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 font-medium">MIME Type</span>
              <span className="font-mono text-[11px] text-neutral-800">{file.mimeType}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 font-medium">SHA-256 Checksum</span>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-700 max-w-[260px] truncate">
                <span className="truncate">{file.checksumSha256 || 'Pending verification'}</span>
                {file.checksumSha256 && (
                  <button
                    onClick={() => copyToClipboard(file.checksumSha256!, 'checksum')}
                    className="text-neutral-400 hover:text-neutral-700 p-0.5 shrink-0"
                  >
                    {copiedKey === 'checksum' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 font-medium">Upload Status</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold uppercase">
                {file.uploadStatus}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 font-medium">Version</span>
              <span className="font-semibold text-neutral-900">v{file.version}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 font-medium">Created Timestamp</span>
              <span className="text-neutral-700">{formatDate(file.createdAt)}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-neutral-500 font-medium">Last Modified</span>
              <span className="text-neutral-700">{formatDate(file.updatedAt)}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
