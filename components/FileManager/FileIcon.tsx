'use client';

import React from 'react';
import {
  Folder,
  FileText,
  FileCode,
  Image as ImageIcon,
  FileArchive,
  Music,
  Video,
  File,
} from 'lucide-react';
import { getFileCategory } from '@/lib/formatters';

interface FileIconProps {
  mimeType: string;
  filename: string;
  isFolder: boolean;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({
  mimeType,
  filename,
  isFolder,
  className = 'w-5 h-5',
}) => {
  if (isFolder) {
    return <Folder className={`${className} text-amber-500 fill-amber-100/60`} />;
  }

  const category = getFileCategory(mimeType, filename);

  switch (category) {
    case 'image':
      return <ImageIcon className={`${className} text-emerald-600`} />;
    case 'pdf':
      return <FileText className={`${className} text-rose-600`} />;
    case 'text':
      return filename.endsWith('.json') || filename.endsWith('.ts') || filename.endsWith('.js') ? (
        <FileCode className={`${className} text-indigo-600`} />
      ) : (
        <FileText className={`${className} text-blue-600`} />
      );
    case 'archive':
      return <FileArchive className={`${className} text-orange-600`} />;
    case 'audio':
      return <Music className={`${className} text-violet-600`} />;
    case 'video':
      return <Video className={`${className} text-pink-600`} />;
    default:
      return <File className={`${className} text-neutral-500`} />;
  }
};
