'use client';

import React from 'react';
import {
  Search,
  FolderPlus,
  UploadCloud,
  LayoutGrid,
  List,
  RefreshCw,
  SlidersHorizontal,
  Layers
} from 'lucide-react';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onNewFolder: () => void;
  onUploadClick: () => void;
  onResumableUploadClick: () => void;
  onRefresh: () => void;
  isTrashView?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onNewFolder,
  onUploadClick,
  onResumableUploadClick,
  onRefresh,
  isTrashView = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pb-3 sm:pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
      {/* Search Input */}
      <div className="relative flex-1 max-w-full sm:max-w-md">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={isTrashView ? 'Search in Recycle Bin...' : 'Search files and folders...'}
          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-8 py-2 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 focus:border-neutral-900 dark:focus:border-neutral-700 transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Action Controls - Horizontally scrollable on mobile without wrapping */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto shrink-0 flex-nowrap sm:flex-wrap">
        {!isTrashView && (
          <>
            <button
              onClick={onNewFolder}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-neutral-500" />
              <span className="whitespace-nowrap">New Folder</span>
            </button>

            <button
              onClick={onResumableUploadClick}
              title="Demonstrate chunked resumable upload with quota reservation"
              className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/80 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="whitespace-nowrap">Resumable</span>
            </button>

            <button
              onClick={onUploadClick}
              className="flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Upload</span>
            </button>
          </>
        )}

        {/* View Toggle */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700 shrink-0">
          <button
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
            className={`p-1.5 sm:p-1 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            title="List view"
            className={`p-1.5 sm:p-1 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          title="Refresh view"
          className="p-2 sm:p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800 transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
