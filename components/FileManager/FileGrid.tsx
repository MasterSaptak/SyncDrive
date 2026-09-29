'use client';

import React, { useState } from 'react';
import { PublicFileItem } from '@/types';
import { formatBytes, formatDate } from '@/lib/formatters';
import { FileIcon } from './FileIcon';
import {
  MoreVertical,
  Download,
  Eye,
  Share2,
  Edit2,
  Move,
  Copy,
  Trash2,
  RotateCcw,
  Info,
  Folder,
  Star,
  Check,
} from 'lucide-react';

interface FileGridProps {
  files: PublicFileItem[];
  selectedFileIds?: string[];
  onToggleSelect?: (fileId: string, e: React.MouseEvent) => void;
  onOpenFile: (file: PublicFileItem) => void;
  onPreview: (file: PublicFileItem) => void;
  onDownload: (file: PublicFileItem) => void;
  onShare: (file: PublicFileItem) => void;
  onRename: (file: PublicFileItem) => void;
  onMove: (file: PublicFileItem) => void;
  onCopy: (file: PublicFileItem) => void;
  onTrash: (file: PublicFileItem) => void;
  onRestore: (file: PublicFileItem) => void;
  onPurge: (file: PublicFileItem) => void;
  onShowDetails: (file: PublicFileItem) => void;
  onToggleStar?: (file: PublicFileItem) => void;
  isTrashView?: boolean;
}

export const FileGrid: React.FC<FileGridProps> = ({
  files,
  selectedFileIds = [],
  onToggleSelect,
  onOpenFile,
  onPreview,
  onDownload,
  onShare,
  onRename,
  onMove,
  onCopy,
  onTrash,
  onRestore,
  onPurge,
  onShowDetails,
  onToggleStar,
  isTrashView = false,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (files.length === 0) {
    return (
      <div className="py-16 text-center border-2 border-dashed border-neutral-200 rounded-2xl p-6 bg-neutral-50/50">
        <Folder className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
        <div className="text-sm font-semibold text-neutral-700">
          {isTrashView ? 'Trash is empty' : 'No files found'}
        </div>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
          {isTrashView
            ? 'Deleted files and folders will appear here for recovery.'
            : 'Drag and drop files here, or use the Upload button to get started.'}
        </p>
      </div>
    );
  }

  const getFriendlyType = (file: PublicFileItem) => {
    if (file.isFolder) return 'Folder';
    const mime = file.mimeType.toLowerCase();
    if (mime.includes('pdf')) return 'PDF';
    if (mime.startsWith('image/')) return mime.split('/')[1]?.toUpperCase() || 'Image';
    if (mime.startsWith('video/')) return 'Video';
    if (mime.startsWith('audio/')) return 'Audio';
    if (mime.startsWith('text/')) return 'Text';
    return file.name.split('.').pop()?.toUpperCase() || 'File';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
      {files.map((file) => {
        const isSelected = selectedFileIds.includes(file.id);
        const isMenuOpen = openMenuId === file.id;

        return (
          <div
            key={file.id}
            tabIndex={0}
            role="checkbox"
            aria-checked={isSelected}
            aria-label={`${file.name}, ${getFriendlyType(file)}`}
            className={`group relative bg-white dark:bg-neutral-900 border rounded-xl p-2.5 sm:p-3.5 transition-all hover:shadow-xs flex flex-col justify-between select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:outline-hidden ${
              isSelected
                ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800/80 ring-1 ring-neutral-900 dark:ring-white'
                : 'border-neutral-200/90 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
            }`}
            onClick={(e) => {
              if (e.shiftKey || e.metaKey || e.ctrlKey) {
                if (onToggleSelect) onToggleSelect(file.id, e);
              } else {
                if (file.isFolder) {
                  onOpenFile(file);
                } else {
                  onPreview(file);
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (file.isFolder) onOpenFile(file);
                else onPreview(file);
              } else if (e.key === ' ' && onToggleSelect) {
                e.preventDefault();
                onToggleSelect(file.id, e as any);
              }
            }}
          >
            {/* Top row: Checkbox, Icon, Star, and More Menu */}
            <div className="flex items-start justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                {/* Select Checkbox */}
                <button
                  type="button"
                  aria-label={`Select ${file.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleSelect) onToggleSelect(file.id, e);
                  }}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-neutral-900 border-neutral-900 text-white'
                      : 'border-neutral-300 bg-white hover:border-neutral-400 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                {/* File Icon */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (file.isFolder) onOpenFile(file);
                    else onPreview(file);
                  }}
                  className="p-1.5 rounded-lg bg-neutral-50 group-hover:bg-neutral-100/80 transition-colors"
                >
                  <FileIcon
                    mimeType={file.mimeType}
                    filename={file.name}
                    isFolder={file.isFolder}
                    className="w-5 h-5"
                  />
                </div>
              </div>

              {/* Star + Context Menu */}
              <div className="flex items-center gap-0.5">
                {!isTrashView && onToggleStar && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(file);
                    }}
                    title={file.isStarred ? 'Unstar file' : 'Star file'}
                    className={`p-1 rounded-md transition-colors ${
                      file.isStarred
                        ? 'text-amber-400 hover:text-amber-500'
                        : 'text-neutral-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-amber-400' : ''}`} />
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(isMenuOpen ? null : file.id);
                    }}
                    aria-label={`Options for ${file.name}`}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                        }}
                      />
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 py-1 text-xs text-neutral-700 animate-in fade-in zoom-in-95 duration-100">
                        {!isTrashView ? (
                          <>
                            {!file.isFolder && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    onPreview(file);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-neutral-500" />
                                  <span>Preview</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    onDownload(file);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                                >
                                  <Download className="w-3.5 h-3.5 text-neutral-500" />
                                  <span>Download</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    onShare(file);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                                  <span>Share</span>
                                </button>
                              </>
                            )}

                            {onToggleStar && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  onToggleStar(file);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                              >
                                <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'text-amber-500 fill-amber-500' : 'text-neutral-500'}`} />
                                <span>{file.isStarred ? 'Unstar' : 'Add to Starred'}</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onRename(file);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onMove(file);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                            >
                              <Move className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Move to...</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onCopy(file);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Make a copy</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onShowDetails(file);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex items-center gap-2"
                            >
                              <Info className="w-3.5 h-3.5 text-neutral-500" />
                              <span>File details</span>
                            </button>
                            <div className="border-t border-neutral-100 my-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onTrash(file);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onRestore(file);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-700 flex items-center gap-2"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onPurge(file);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete forever</span>
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: File Name */}
            <div className="mb-2">
              <div
                title={file.name}
                className="font-semibold text-xs text-neutral-900 group-hover:text-neutral-950 truncate"
              >
                {file.name}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {getFriendlyType(file)} • {file.isFolder ? 'Folder' : formatBytes(file.sizeBytes)}
              </div>
            </div>

            {/* Bottom Metadata: Modified date & Owner */}
            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-2 border-t border-neutral-100">
              <span>{formatDate(file.updatedAt || file.createdAt)}</span>
              <span>Me</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
