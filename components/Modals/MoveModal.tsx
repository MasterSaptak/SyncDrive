'use client';

import React, { useState } from 'react';
import { X, Move, Folder, Home } from 'lucide-react';
import { PublicFileItem } from '@/types';

interface MoveModalProps {
  isOpen: boolean;
  file: PublicFileItem | null;
  availableFolders: PublicFileItem[];
  onClose: () => void;
  onMove: (fileId: string, targetParentId: string | null) => Promise<void>;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  isOpen,
  file,
  availableFolders,
  onClose,
  onMove,
}) => {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !file) return null;

  // Filter out the file itself and subfolders to avoid cyclic moves
  const validFolders = availableFolders.filter((f) => f.id !== file.id && !f.isTrash);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      await onMove(file.id, selectedParentId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-2xs">
      <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900">
            <Move className="w-4 h-4 text-neutral-700" />
            <span>Move &ldquo;{file.name}&rdquo;</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-xs text-neutral-600 font-medium">Select destination folder:</div>

          <div className="max-h-60 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-100 p-1">
            {/* Root Option */}
            <div
              onClick={() => setSelectedParentId(null)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                selectedParentId === null
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Root Directory (Home)</span>
            </div>

            {/* Folder Options */}
            {validFolders.map((folder) => {
              const isSelected = selectedParentId === folder.id;
              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedParentId(folder.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Folder className="w-4 h-4 text-amber-500" />
                  <span className="truncate">{folder.name}</span>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
            >
              {loading ? 'Moving...' : 'Move Here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
