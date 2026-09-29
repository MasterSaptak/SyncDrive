'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatBytes } from '@/lib/formatters';
import {
  X,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
  Clock,
  Loader2,
} from 'lucide-react';

export type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface UploadTask {
  id: string;
  file?: File;
  filename: string;
  sizeBytes: number;
  uploadedBytes: number;
  progressPercentage: number;
  speedBytesPerSec: number;
  status: UploadStatus;
  errorMessage?: string;
  sessionToken?: string;
  parentId: string | null;
  startedAt?: number;
  lastChunkTime?: number;
  lastChunkBytes?: number;
  abortController?: AbortController;
}

interface SavedUploadSession {
  id: string;
  filename: string;
  sizeBytes: number;
  uploadedBytes: number;
  sessionToken: string;
  parentId: string | null;
  createdAt: number;
}

interface UploadManagerProps {
  tasks: UploadTask[];
  onUpdateTasks: React.Dispatch<React.SetStateAction<UploadTask[]>>;
  onUploadSuccess?: () => void;
  onFileSelectForResume?: (taskId: string) => void;
}

const MAX_CONCURRENT_UPLOADS = 2;
const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB per chunk
const STORAGE_KEY = 'syncdrive_saved_upload_sessions';

export const UploadManager: React.FC<UploadManagerProps> = ({
  tasks,
  onUpdateTasks,
  onUploadSuccess,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const activeCountRef = useRef(0);
  const tasksRef = useRef(tasks);
  const processQueueRef = useRef<() => void>(() => {});

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Save resumable active sessions to localStorage
  useEffect(() => {
    try {
      const activeSessions: SavedUploadSession[] = tasks
        .filter((t) => t.sessionToken && (t.status === 'uploading' || t.status === 'paused' || t.status === 'queued'))
        .map((t) => ({
          id: t.id,
          filename: t.filename,
          sizeBytes: t.sizeBytes,
          uploadedBytes: t.uploadedBytes,
          sessionToken: t.sessionToken!,
          parentId: t.parentId,
          createdAt: Date.now(),
        }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeSessions));
    } catch {
      // ignore storage errors
    }
  }, [tasks]);

  // Load saved sessions from localStorage on initial mount if tasks is empty
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && tasks.length === 0) {
        const saved: SavedUploadSession[] = JSON.parse(raw);
        if (saved.length > 0) {
          const restored: UploadTask[] = saved.map((s) => ({
            id: s.id,
            filename: s.filename,
            sizeBytes: s.sizeBytes,
            uploadedBytes: s.uploadedBytes,
            progressPercentage: Math.round((s.uploadedBytes / (s.sizeBytes || 1)) * 100),
            speedBytesPerSec: 0,
            status: 'paused',
            sessionToken: s.sessionToken,
            parentId: s.parentId,
            errorMessage: 'Session restored from browser storage. Select file to resume.',
          }));
          onUpdateTasks(restored);
        }
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<UploadTask>) => {
    onUpdateTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, [onUpdateTasks]);

  // Execute chunk upload for a task
  const runUpload = useCallback(async (task: UploadTask) => {
    let sessionToken = task.sessionToken;
    const file = task.file;
    if (!file) return;

    const abortController = new AbortController();
    updateTask(task.id, { status: 'uploading', abortController });

    try {
      // 1. Initialize session if not existing
      let currentOffset = task.uploadedBytes || 0;

      if (!sessionToken) {
        const initRes = await fetch('/api/files/upload/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            expectedSizeBytes: file.size,
            mimeType: file.type || 'application/octet-stream',
            parentId: task.parentId,
          }),
          signal: abortController.signal,
        });

        if (!initRes.ok) {
          const err = await initRes.json();
          throw new Error(err.error || 'Failed to initialize upload session');
        }

        const initData = await initRes.json();
        sessionToken = initData.sessionToken;
        updateTask(task.id, { sessionToken });
      } else {
        // Query server for verified next byte offset
        try {
          const queryRes = await fetch(
            `/api/files/upload/chunk?sessionToken=${encodeURIComponent(sessionToken)}`,
            { signal: abortController.signal }
          );
          if (queryRes.ok) {
            const queryData = await queryRes.json();
            currentOffset = queryData.nextByteOffset || 0;
            updateTask(task.id, {
              uploadedBytes: currentOffset,
              progressPercentage: Math.round((currentOffset / (file.size || 1)) * 100),
            });
          }
        } catch {
          // fallback to currentOffset
        }
      }

      // 2. Stream Chunks
      const totalBytes = file.size;
      let lastTime = Date.now();
      let lastBytes = currentOffset;

      while (currentOffset < totalBytes) {
        // Check if task was aborted or paused
        if (abortController.signal.aborted) {
          return;
        }

        const chunkEnd = Math.min(currentOffset + CHUNK_SIZE, totalBytes);
        const chunkBlob = file.slice(currentOffset, chunkEnd);
        const chunkBuffer = await chunkBlob.arrayBuffer();

        const chunkRes = await fetch('/api/files/upload/chunk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-session-token': sessionToken!,
            'Content-Range': `bytes ${currentOffset}-${chunkEnd - 1}/${totalBytes}`,
          },
          body: chunkBuffer,
          signal: abortController.signal,
        });

        if (!chunkRes.ok && chunkRes.status !== 308) {
          const errData = await chunkRes.json().catch(() => ({ error: 'Upload chunk failed' }));
          throw new Error(errData.error || 'Chunk upload failed');
        }

        currentOffset = chunkEnd;
        const now = Date.now();
        const durationSec = (now - lastTime) / 1000;
        let speed = 0;
        if (durationSec > 0.3) {
          speed = Math.round((currentOffset - lastBytes) / durationSec);
          lastTime = now;
          lastBytes = currentOffset;
        }

        const progress = Math.round((currentOffset / totalBytes) * 100);
        updateTask(task.id, {
          uploadedBytes: currentOffset,
          progressPercentage: progress,
          speedBytesPerSec: speed,
        });
      }

      // 3. Finalize upload
      const completeRes = await fetch('/api/files/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
        signal: abortController.signal,
      });

      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.error || 'Failed to finalize upload');
      }

      updateTask(task.id, {
        status: 'completed',
        progressPercentage: 100,
        uploadedBytes: totalBytes,
        speedBytesPerSec: 0,
      });

      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Paused or Cancelled
      } else {
        updateTask(task.id, {
          status: 'failed',
          errorMessage: err.message || 'Upload failed',
          speedBytesPerSec: 0,
        });
      }
    } finally {
      activeCountRef.current = Math.max(0, activeCountRef.current - 1);
      processQueueRef.current();
    }
  }, [updateTask, onUploadSuccess]);

  // Queue orchestrator with strict concurrency
  const processQueue = useCallback(() => {
    const currentTasks = tasksRef.current;
    const activeUploading = currentTasks.filter((t) => t.status === 'uploading').length;
    activeCountRef.current = activeUploading;

    if (activeUploading >= MAX_CONCURRENT_UPLOADS) return;

    const nextTask = currentTasks.find((t) => t.status === 'queued' && t.file);
    if (nextTask) {
      activeCountRef.current++;
      runUpload(nextTask);
    }
  }, [runUpload]);

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  useEffect(() => {
    processQueue();
  }, [tasks, processQueue]);

  // Pause task
  const handlePause = (task: UploadTask) => {
    if (task.abortController) {
      task.abortController.abort();
    }
    updateTask(task.id, { status: 'paused', speedBytesPerSec: 0 });
  };

  // Resume task
  const handleResume = (task: UploadTask) => {
    if (!task.file) {
      // Trigger native file picker to reconnect file object
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          updateTask(task.id, { file, status: 'queued', errorMessage: undefined });
        }
      };
      input.click();
      return;
    }
    updateTask(task.id, { status: 'queued', errorMessage: undefined });
  };

  // Retry task
  const handleRetry = (task: UploadTask) => {
    updateTask(task.id, { status: 'queued', errorMessage: undefined });
  };

  // Cancel task
  const handleCancel = async (task: UploadTask) => {
    if (task.abortController) {
      task.abortController.abort();
    }
    if (task.sessionToken) {
      try {
        await fetch(
          `/api/files/upload/chunk?sessionToken=${encodeURIComponent(task.sessionToken)}`,
          { method: 'DELETE' }
        );
      } catch {
        // ignore
      }
    }
    onUpdateTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  if (tasks.length === 0) return null;

  const activeUploads = tasks.filter((t) => t.status === 'uploading');
  const completedUploads = tasks.filter((t) => t.status === 'completed');
  const failedUploads = tasks.filter((t) => t.status === 'failed');

  return (
    <div className="fixed bottom-4 right-4 z-50 w-88 sm:w-96 bg-white border border-neutral-200/90 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-3 duration-200 text-xs">
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 text-white select-none">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-neutral-300" />
          <span className="font-semibold text-xs">
            {activeUploads.length > 0
              ? `Uploading ${activeUploads.length} ${activeUploads.length === 1 ? 'file' : 'files'}...`
              : `${completedUploads.length} of ${tasks.length} uploaded`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onUpdateTasks([])}
            title="Dismiss completed"
            className="p-1 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Upload Tasks List */}
      {!isMinimized && (
        <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 p-2">
          {tasks.map((task) => {
            const isUploading = task.status === 'uploading';
            const isCompleted = task.status === 'completed';
            const isFailed = task.status === 'failed';
            const isPaused = task.status === 'paused';

            return (
              <div key={task.id} className="p-2.5 rounded-xl hover:bg-neutral-50/80 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="truncate font-semibold text-neutral-900 max-w-[200px]" title={task.filename}>
                    {task.filename}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Status Badge */}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Done
                      </span>
                    )}
                    {isUploading && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        {task.progressPercentage}%
                      </span>
                    )}
                    {isPaused && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        <Pause className="w-3 h-3 text-amber-600" />
                        Paused
                      </span>
                    )}
                    {isFailed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        Failed
                      </span>
                    )}

                    {/* Task Actions */}
                    {isUploading && (
                      <button
                        onClick={() => handlePause(task)}
                        title="Pause upload"
                        className="p-1 rounded hover:bg-neutral-200 text-neutral-600"
                      >
                        <Pause className="w-3 h-3" />
                      </button>
                    )}
                    {isPaused && (
                      <button
                        onClick={() => handleResume(task)}
                        title="Resume upload"
                        className="p-1 rounded hover:bg-neutral-200 text-neutral-800"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    {isFailed && (
                      <button
                        onClick={() => handleRetry(task)}
                        title="Retry upload"
                        className="p-1 rounded hover:bg-neutral-200 text-neutral-800"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(task)}
                      title="Cancel upload"
                      className="p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden mb-1">
                  <div
                    className={`h-full transition-all duration-200 rounded-full ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isFailed
                        ? 'bg-rose-500'
                        : isPaused
                        ? 'bg-amber-400'
                        : 'bg-neutral-900'
                    }`}
                    style={{ width: `${task.progressPercentage}%` }}
                  />
                </div>

                {/* Details: Uploaded / Total + Speed */}
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>
                    {formatBytes(task.uploadedBytes)} of {formatBytes(task.sizeBytes)}
                  </span>
                  <span>
                    {isUploading && task.speedBytesPerSec > 0 && (
                      <span>{formatBytes(task.speedBytesPerSec)}/s</span>
                    )}
                    {task.errorMessage && (
                      <span className="text-rose-600 truncate max-w-[140px]" title={task.errorMessage}>
                        {task.errorMessage}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
