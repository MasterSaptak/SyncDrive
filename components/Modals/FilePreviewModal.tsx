'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Image as ImageIcon, Code, ExternalLink, Loader2 } from 'lucide-react';
import { PublicFileItem } from '@/types';
import { formatBytes, getFileCategory } from '@/lib/formatters';

interface FilePreviewModalProps {
  isOpen: boolean;
  file: PublicFileItem | null;
  onClose: () => void;
  onDownload: (file: PublicFileItem) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  file,
  onClose,
  onDownload,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = file ? getFileCategory(file.mimeType, file.name) : 'other';
  const downloadUrl = file ? `/api/files/${file.id}/download?inline=true` : '';

  useEffect(() => {
    if (isOpen && file && (category === 'text' || file.mimeType.startsWith('text/'))) {
      setLoading(true);
      setError(null);
      fetch(`/api/files/${file.id}/download?inline=true`)
        .then((res) => {
          if (!res.ok) throw new Error('Could not fetch file contents');
          return res.text();
        })
        .then((text) => setTextContent(text))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setTextContent(null);
      setError(null);
    }
  }, [isOpen, file, category]);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="w-full max-w-3xl max-h-[92vh] sm:max-h-[85vh] bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/70">
          <div className="flex items-center gap-2 truncate max-w-[150px] xs:max-w-xs sm:max-w-md">
            <span className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white truncate">{file.name}</span>
            <span className="text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-500 font-medium px-1.5 sm:px-2 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 rounded-md shrink-0">
              {formatBytes(file.sizeBytes)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 flex items-center justify-center bg-neutral-900/5 dark:bg-neutral-950/60 min-h-[220px] sm:min-h-[360px]">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-700 dark:text-neutral-300" />
              <span>Streaming file from storage backend...</span>
            </div>
          ) : category === 'image' ? (
            <div className="relative max-h-[70vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={downloadUrl}
                alt={file.name}
                className="max-h-[65vh] max-w-full rounded-lg shadow-md object-contain"
              />
            </div>
          ) : category === 'text' ? (
            <div className="w-full h-full max-h-[65vh] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 sm:p-4 overflow-auto font-mono text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap select-text">
              {error ? (
                <div className="text-rose-600 dark:text-rose-400">{error}</div>
              ) : (
                textContent || 'Empty file'
              )}
            </div>
          ) : category === 'pdf' ? (
            <div className="w-full h-[65vh] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <iframe
                src={downloadUrl}
                title={file.name}
                className="w-full h-full border-none"
              />
            </div>
          ) : category === 'audio' ? (
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-md text-center">
              <div className="font-semibold text-sm mb-4 text-neutral-900 dark:text-white truncate">{file.name}</div>
              <audio controls className="w-full" src={downloadUrl}>
                Your browser does not support the audio element.
              </audio>
            </div>
          ) : category === 'video' ? (
            <div className="max-w-2xl max-h-[65vh] rounded-xl overflow-hidden shadow-lg bg-black">
              <video controls className="w-full h-full" src={downloadUrl}>
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="text-center p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs max-w-md">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-400 mx-auto mb-3" />
              <div className="font-semibold text-sm text-neutral-900 dark:text-white mb-1 truncate">{file.name}</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Preview not directly supported in-browser for {file.mimeType}. You can download the file to open it with desktop software.
              </p>
              <button
                onClick={() => onDownload(file)}
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-xl transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download {formatBytes(file.sizeBytes)}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
