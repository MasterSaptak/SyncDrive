'use client';

import React, { useState } from 'react';
import { X, Share2, Copy, Check, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { PublicFileItem, ShareLink } from '@/types';

interface ShareModalProps {
  isOpen: boolean;
  file: PublicFileItem | null;
  onClose: () => void;
  onCreateShareLink: (fileId: string, accessType: 'view' | 'download', expiresInDays?: number) => Promise<ShareLink>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  file,
  onClose,
  onCreateShareLink,
}) => {
  const [accessType, setAccessType] = useState<'view' | 'download'>('view');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !file) return null;

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const link = await onCreateShareLink(file.id, accessType, expiresInDays > 0 ? expiresInDays : undefined);
      setShareLink(link);
    } catch (err: any) {
      setError(err.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const fullShareUrl = shareLink
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/share/${shareLink.token}${
        shareLink.accessType === 'download' ? '?download=true' : ''
      }`
    : '';

  const handleCopy = () => {
    if (fullShareUrl) {
      navigator.clipboard.writeText(fullShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-2xs">
      <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900">
            <Share2 className="w-4 h-4 text-neutral-700" />
            <span>Share &ldquo;{file.name}&rdquo;</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-start gap-2.5 text-xs text-neutral-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Shared links use time-limited cryptographic tokens. The recipient accesses the file through the SaaS proxy without exposure to backend storage accounts.
            </p>
          </div>

          {!shareLink ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Access Permission
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccessType('view')}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-colors text-center ${
                      accessType === 'view'
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    View Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccessType('download')}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-colors text-center ${
                      accessType === 'download'
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    Allow Download
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Link Expiration
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900"
                >
                  <option value={1}>Expires in 24 hours</option>
                  <option value={7}>Expires in 7 days</option>
                  <option value={30}>Expires in 30 days</option>
                  <option value={0}>Never expires</option>
                </select>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs"
                >
                  {loading ? 'Creating Link...' : 'Generate Shareable Link'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in">
              <div className="text-xs font-medium text-neutral-700">Public Link Ready</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-mono truncate select-all">
                  {fullShareUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-[11px] text-neutral-500 pt-1">
                Permission: <strong className="capitalize">{shareLink.accessType}</strong>
                {shareLink.expiresAt && ` • Expires ${new Date(shareLink.expiresAt).toLocaleDateString()}`}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setShareLink(null)}
                  className="text-xs text-neutral-500 hover:text-neutral-900"
                >
                  Create another link
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
