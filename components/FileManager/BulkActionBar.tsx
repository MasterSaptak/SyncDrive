'use client';

import React from 'react';
import {
  X,
  Star,
  Move,
  Copy,
  Download,
  Trash2,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStar: (isStarred: boolean) => void;
  onBulkMove: () => void;
  onBulkCopy: () => void;
  onBulkDownload: () => void;
  onBulkTrash: () => void;
  onBulkRestore: () => void;
  onBulkPurge: () => void;
  isTrashView?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkStar,
  onBulkMove,
  onBulkCopy,
  onBulkDownload,
  onBulkTrash,
  onBulkRestore,
  onBulkPurge,
  isTrashView = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-20 z-20 flex items-center justify-between gap-3 p-3 bg-neutral-900 text-white rounded-2xl shadow-xl animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onClearSelection}
          aria-label="Clear selection"
          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <CheckSquare className="w-4 h-4 text-emerald-400" />
          <span>
            {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {!isTrashView ? (
          <>
            <button
              onClick={() => onBulkStar(true)}
              title="Add star"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="hidden sm:inline">Star</span>
            </button>

            <button
              onClick={onBulkMove}
              title="Move items"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <Move className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Move</span>
            </button>

            <button
              onClick={onBulkCopy}
              title="Duplicate items"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </button>

            <button
              onClick={onBulkDownload}
              title="Download selected files"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={onBulkTrash}
              title="Move to trash"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-950/50 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onBulkRestore}
              title="Restore from trash"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/50 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>

            <button
              onClick={onBulkPurge}
              title="Permanently delete from storage"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-950/50 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Forever</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
