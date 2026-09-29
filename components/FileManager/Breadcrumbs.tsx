'use client';

import React from 'react';
import { ChevronRight, Home, Folder } from 'lucide-react';

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 overflow-x-auto no-scrollbar py-1 max-w-full">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium text-neutral-800 dark:text-neutral-200 transition-colors shrink-0"
      >
        <Home className="w-3.5 h-3.5 text-neutral-500" />
        <span>Root</span>
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.id || index}>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <button
              onClick={() => !isLast && onNavigate(item.id)}
              disabled={isLast}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors shrink-0 ${
                isLast
                  ? 'font-semibold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 cursor-default'
                  : 'font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-neutral-400" />
              <span className="truncate max-w-[120px] sm:max-w-none">{item.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
