'use client';

import React, { useState } from 'react';
import { X, Layers, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { formatBytes } from '@/lib/formatters';

interface ResumableUploadModalProps {
  isOpen: boolean;
  parentId: string | null;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const ResumableUploadModal: React.FC<ResumableUploadModalProps> = ({
  isOpen,
  parentId,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<'idle' | 'reserving' | 'chunking' | 'committing' | 'done'>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [bytesUploaded, setBytesUploaded] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [chunkRangeText, setChunkRangeText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setStep('idle');
      setProgressPercent(0);
    }
  };

  const startResumableUpload = async () => {
    if (!selectedFile) return;

    try {
      setError(null);
      setTotalBytes(selectedFile.size);

      // STEP 1: Quota Reservation & Session Initialization
      setStep('reserving');
      const initRes = await fetch('/api/files/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          sizeBytes: selectedFile.size,
          mimeType: selectedFile.type || 'application/octet-stream',
          parentId,
        }),
      });

      if (!initRes.ok) {
        const errJson = await initRes.json();
        throw new Error(errJson.error || 'Quota reservation failed');
      }

      const { internalFileId, reservationId, sessionToken } = await initRes.json();

      // STEP 2: Chunked Upload Loop (256 KB chunks)
      setStep('chunking');
      const chunkSize = 256 * 1024; // 256 KB chunk
      const arrayBuffer = await selectedFile.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);
      let offset = 0;
      let lastResult: any = null;

      while (offset < fileBytes.byteLength) {
        const endByte = Math.min(offset + chunkSize, fileBytes.byteLength);
        const chunk = fileBytes.subarray(offset, endByte);

        setChunkRangeText(`Sending bytes ${offset.toLocaleString()}–${endByte.toLocaleString()} of ${fileBytes.byteLength.toLocaleString()}`);

        const chunkUrl = `/api/files/upload/chunk?sessionToken=${encodeURIComponent(
          sessionToken
        )}&startByte=${offset}&totalBytes=${fileBytes.byteLength}`;

        const chunkRes = await fetch(chunkUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: chunk as any,
        });

        if (!chunkRes.ok) {
          const err = await chunkRes.json();
          throw new Error(err.error || 'Chunk upload failed');
        }

        lastResult = await chunkRes.json();
        offset = endByte;
        setBytesUploaded(offset);
        setProgressPercent(Math.round((offset / fileBytes.byteLength) * 100));

        // Small delay to make chunk progress visible in UI
        await new Promise((r) => setTimeout(r, 60));
      }

      // STEP 3: Quota Commit & Finalize
      setStep('committing');
      const commitRes = await fetch('/api/files/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internalFileId,
          reservationId,
          storageObjectId: lastResult?.storageObjectId || `obj_${internalFileId}`,
          checksumSha256: lastResult?.checksumSha256,
        }),
      });

      if (!commitRes.ok) {
        const err = await commitRes.json();
        throw new Error(err.error || 'Failed to commit reservation');
      }

      setStep('done');
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message || 'Resumable upload encountered an error');
      setStep('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/40 backdrop-blur-2xs">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900 truncate">
            <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">Resumable Chunked Upload Engine</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs text-neutral-600 space-y-1">
            <div className="font-semibold text-neutral-800">Concurrency & Quota Principles:</div>
            <p>
              1. <strong>Pre-reservation:</strong> Available bytes are decremented upfront to prevent concurrent uploads from exceeding user quota.
            </p>
            <p>
              2. <strong>Chunk stream:</strong> Data is written sequentially to the backend storage provider.
            </p>
            <p>
              3. <strong>Commit:</strong> Quota moves from <code>reserved_bytes</code> to <code>used_bytes</code> upon completion.
            </p>
          </div>

          {/* File Selector */}
          {step === 'idle' && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Choose file for chunked upload
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full text-xs text-neutral-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 cursor-pointer"
              />

              {selectedFile && (
                <div className="mt-3 p-3 bg-neutral-100/70 rounded-xl text-xs text-neutral-800 flex justify-between items-center gap-2">
                  <span className="font-medium truncate max-w-[160px] xs:max-w-[220px] sm:max-w-[280px]">{selectedFile.name}</span>
                  <span className="font-semibold text-neutral-600 shrink-0">{formatBytes(selectedFile.size)}</span>
                </div>
              )}
            </div>
          )}

          {/* Progress Animation */}
          {step !== 'idle' && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-700 capitalize">
                  {step === 'reserving' && 'Step 1: Reserving Logical Quota...'}
                  {step === 'chunking' && 'Step 2: Uploading Chunks to Storage Provider...'}
                  {step === 'committing' && 'Step 3: Committing Reservation & Checksum...'}
                  {step === 'done' && 'Upload Complete & Verified!'}
                </span>
                <span className="font-semibold text-neutral-900">{progressPercent}%</span>
              </div>

              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden border border-neutral-200">
                <div
                  className={`h-full transition-all duration-150 ${
                    step === 'done' ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {chunkRangeText && step === 'chunking' && (
                <div className="text-[11px] font-mono text-neutral-500 truncate">
                  {chunkRangeText}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'done' && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>File successfully stored and logical quota updated!</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {step === 'done' ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={step !== 'idle'}
                  className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startResumableUpload}
                  disabled={!selectedFile || step !== 'idle'}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  {step !== 'idle' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Chunk Upload</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
