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

interface FileListProps {
  files: PublicFileItem[];
  selectedFileIds?: string[];
  onToggleSelect?: (fileId: string, e: React.MouseEvent) => void;
  onToggleSelectAll?: () => void;
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

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFileIds = [],
  onToggleSelect,
  onToggleSelectAll,
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

  const allSelected = files.length > 0 && files.every((f) => selectedFileIds.includes(f.id));
  const someSelected = files.some((f) => selectedFileIds.includes(f.id));

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
    if (mime.includes('pdf')) return 'PDF Document';
    if (mime.startsWith('image/')) return `${mime.split('/')[1]?.toUpperCase() || 'Image'} File`;
    if (mime.startsWith('video/')) return 'Video';
    if (mime.startsWith('audio/')) return 'Audio';
    if (mime.includes('word') || mime.includes('document')) return 'Word Document';
    if (mime.includes('sheet') || mime.includes('excel')) return 'Spreadsheet';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'Presentation';
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('compressed')) return 'Archive';
    if (mime.startsWith('text/')) return 'Text File';
    return file.mimeType.split('/')[1]?.toUpperCase() || 'Document';
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs" role="table" aria-label="Files list">
          <thead className="bg-neutral-50/80 dark:bg-neutral-800/80 border-b border-neutral-200/80 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium select-none">
            <tr>
              {/* Select All Checkbox */}
              <th className="py-2.5 pl-3 sm:pl-4 pr-1 sm:pr-2 w-7 sm:w-8">
                <button
                  onClick={onToggleSelectAll}
                  aria-label={allSelected ? 'Deselect all files' : 'Select all files'}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    allSelected
                      ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900'
                      : someSelected
                      ? 'bg-neutral-200 dark:bg-neutral-700 border-neutral-400 text-neutral-900 dark:text-white'
                      : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 bg-white dark:bg-neutral-800'
                  }`}
                >
                  {allSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  {!allSelected && someSelected && <div className="w-2 h-0.5 bg-neutral-900 dark:bg-white" />}
                </button>
              </th>
              <th className="py-2.5 px-2 sm:px-3">Name</th>
              <th className="py-2.5 px-3 hidden sm:table-cell">Type</th>
              <th className="py-2.5 px-3 hidden sm:table-cell">Size</th>
              <th className="py-2.5 px-3 hidden md:table-cell">Owner</th>
              <th className="py-2.5 px-3 hidden lg:table-cell">Modified</th>
              <th className="py-2.5 px-2 sm:px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {files.map((file) => {
              const isSelected = selectedFileIds.includes(file.id);
              const isMenuOpen = openMenuId === file.id;

              return (
                <tr
                  key={file.id}
                  className={`transition-colors group cursor-pointer ${
                    isSelected ? 'bg-neutral-100/70 dark:bg-neutral-800/70' : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40'
                  }`}
                  onClick={() => {
                    if (file.isFolder) onOpenFile(file);
                    else onPreview(file);
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
                  tabIndex={0}
                  role="row"
                  aria-selected={isSelected}
                >
                  {/* Row Checkbox */}
                  <td
                    className="py-2.5 sm:py-3 pl-3 sm:pl-4 pr-1 sm:pr-2 w-7 sm:w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleSelect) onToggleSelect(file.id, e);
                    }}
                  >
                    <button
                      type="button"
                      aria-label={`Select ${file.name}`}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900'
                          : 'border-neutral-300 dark:border-neutral-600 group-hover:border-neutral-400 bg-white dark:bg-neutral-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  </td>

                  {/* Name with icon, mobile subtitle & Star button */}
                  <td className="py-2.5 sm:py-3 px-2 sm:px-3">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <FileIcon
                        mimeType={file.mimeType}
                        filename={file.name}
                        isFolder={file.isFolder}
                        className="w-4 h-4 shrink-0"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-950 dark:group-hover:text-white truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
                          {file.name}
                        </span>
                        {/* Mobile metadata subtitle */}
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 sm:hidden flex items-center gap-1.5 mt-0.5 truncate">
                          <span>{getFriendlyType(file)}</span>
                          <span>•</span>
                          <span>{file.isFolder ? 'Folder' : formatBytes(file.sizeBytes)}</span>
                        </span>
                      </div>

                      {/* Star Button */}
                      {!isTrashView && onToggleStar && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStar(file);
                          }}
                          title={file.isStarred ? 'Unstar file' : 'Star file'}
                          className={`p-1 rounded-md transition-colors shrink-0 ${
                            file.isStarred
                              ? 'text-amber-400 hover:text-amber-500'
                              : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-400 opacity-0 group-hover:opacity-100 sm:opacity-0'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-amber-400' : ''}`} />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap hidden sm:table-cell">
                    {getFriendlyType(file)}
                  </td>

                  {/* Size */}
                  <td className="py-3 px-3 text-neutral-600 dark:text-neutral-300 whitespace-nowrap hidden sm:table-cell">
                    {file.isFolder ? '—' : formatBytes(file.sizeBytes)}
                  </td>

                  {/* Owner */}
                  <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 hidden md:table-cell whitespace-nowrap">
                    Me
                  </td>

                  {/* Modified Date */}
                  <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 hidden lg:table-cell whitespace-nowrap">
                    {formatDate(file.updatedAt || file.createdAt)}
                  </td>

                  {/* Action Menu */}
                  <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => setOpenMenuId(isMenuOpen ? null : file.id)}
                        aria-label={`Actions for ${file.name}`}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg z-50 py-1 text-xs text-neutral-700 dark:text-neutral-300 animate-in fade-in zoom-in-95 duration-100">
                            {!isTrashView ? (
                              <>
                                {!file.isFolder && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        onPreview(file);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-neutral-500" />
                                      <span>Preview</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        onDownload(file);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                    >
                                      <Download className="w-3.5 h-3.5 text-neutral-500" />
                                      <span>Download</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        onShare(file);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                    >
                                      <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                                      <span>Share</span>
                                    </button>
                                  </>
                                )}

                                {onToggleStar && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      onToggleStar(file);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                  >
                                    <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'text-amber-500 fill-amber-500' : 'text-neutral-500'}`} />
                                    <span>{file.isStarred ? 'Unstar' : 'Add to Starred'}</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onRename(file);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                                  <span>Rename</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onMove(file);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                >
                                  <Move className="w-3.5 h-3.5 text-neutral-500" />
                                  <span>Move to...</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onCopy(file);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                >
                                  <Copy className="w-3.5 h-3.5 text-neutral-500" />
                                  <span>Make a copy</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onShowDetails(file);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                >
                                  <Info className="w-3.5 h-3.5 text-neutral-500" />
                                  <span>File details</span>
                                </button>
                                <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onTrash(file);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onRestore(file);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restore</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onPurge(file);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2"
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
