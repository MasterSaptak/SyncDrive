export interface CloudFile {
  id: string;
  name: string;
  type: string; // e.g. "application/pdf", "image/png", "folder", "video/mp4"
  size: number; // bytes (0 for folder)
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  isFolder: boolean;
  starred?: boolean;
  sharedWith?: {
    email: string;
    permission: "viewer" | "editor";
  }[];
  previewUrl?: string;
  url?: string;
  extension?: string;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: "pending" | "uploading" | "paused" | "completed" | "error";
  error?: string;
}
