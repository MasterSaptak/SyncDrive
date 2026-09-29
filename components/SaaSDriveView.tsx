'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, LogicalQuota, PublicFileItem, ShareLink } from '@/types';
import { Navbar } from '@/components/Navbar';
import { Sidebar, ActiveTab } from '@/components/Sidebar';
import { Breadcrumbs, BreadcrumbItem } from '@/components/FileManager/Breadcrumbs';
import { Toolbar } from '@/components/FileManager/Toolbar';
import { FileGrid } from '@/components/FileManager/FileGrid';
import { FileList } from '@/components/FileManager/FileList';
import { NewFolderModal } from '@/components/Modals/NewFolderModal';
import { RenameModal } from '@/components/Modals/RenameModal';
import { MoveModal } from '@/components/Modals/MoveModal';
import { ShareModal } from '@/components/Modals/ShareModal';
import { FilePreviewModal } from '@/components/Modals/FilePreviewModal';
import { FileDetailsModal } from '@/components/Modals/FileDetailsModal';
import { ResumableUploadModal } from '@/components/Modals/ResumableUploadModal';
import { PlansAndBilling } from '@/components/PlansAndBilling';
import { AuditLogsView } from '@/components/AuditLogsView';
import { SettingsView } from '@/components/SettingsView';
import { AuthModal } from '@/components/Modals/AuthModal';
import { AccountSwitcherModal } from '@/components/Modals/AccountSwitcherModal';
import { Loader2, UploadCloud, AlertCircle, Folder, Clock, Star, Plus, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { deviceSocket } from '@/lib/auth/device-socket';

export function SaaSDriveView() {
  const { user: authUser, logout } = useAuth();

  // Global App State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [quota, setQuota] = useState<LogicalQuota | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('files');
  const [files, setFiles] = useState<PublicFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // File Manager Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [renameTargetFile, setRenameTargetFile] = useState<PublicFileItem | null>(null);
  const [moveTargetFile, setMoveTargetFile] = useState<PublicFileItem | null>(null);
  const [shareTargetFile, setShareTargetFile] = useState<PublicFileItem | null>(null);
  const [previewTargetFile, setPreviewTargetFile] = useState<PublicFileItem | null>(null);
  const [detailsTargetFile, setDetailsTargetFile] = useState<PublicFileItem | null>(null);
  const [isResumableUploadOpen, setIsResumableUploadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);

  // Drag & drop upload state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initial Load: User session & Quota
  const loadSessionAndQuota = useCallback(async (preferredUserId?: string) => {
    try {
      const activeId = preferredUserId || authUser?.id;
      const headers: Record<string, string> = {};
      if (activeId) {
        headers['x-user-id'] = activeId;
      }
      const res = await fetch('/api/auth/session', { headers });
      if (res.ok) {
        const data = await res.json();
        const preferredName = authUser?.fullName || authUser?.name || data.user.fullName || data.user.name;
        const mergedUser = {
          ...data.user,
          fullName: preferredName,
          name: preferredName,
          email: authUser?.email || data.user.email,
        };
        setUser(mergedUser);
        setQuota(data.quota);
      }
    } catch (e) {
      console.error('Failed to load user session', e);
    }
  }, [authUser]);

  // Fetch current folder files or trash
  const loadFiles = useCallback(async () => {
    try {
      setLoadingFiles(true);
      const isTrash = activeTab === 'trash';
      let url = `/api/files?isTrash=${isTrash}`;

      if (!isTrash) {
        if (searchQuery.trim()) {
          url += `&search=${encodeURIComponent(searchQuery.trim())}`;
        } else if (currentFolderId) {
          url += `&parentId=${encodeURIComponent(currentFolderId)}`;
        }
      }

      const activeId = authUser?.id;
      const headers: Record<string, string> = {};
      if (activeId) {
        headers['x-user-id'] = activeId;
      }

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }

      // Check trash count
      const trashRes = await fetch('/api/files?isTrash=true', { headers });
      if (trashRes.ok) {
        const tData = await trashRes.json();
        setTrashCount((tData.files || []).length);
      }
    } catch (e) {
      console.error('Failed to load files', e);
    } finally {
      setLoadingFiles(false);
    }
  }, [activeTab, currentFolderId, searchQuery, authUser]);

  useEffect(() => {
    if (authUser) {
      setUser((prev) => ({
        ...(prev || ({} as any)),
        ...authUser,
        fullName: authUser.fullName || authUser.name,
      }));
    }
  }, [authUser]);

  useEffect(() => {
    loadSessionAndQuota(authUser?.id);
  }, [authUser?.id, loadSessionAndQuota]);

  useEffect(() => {
    if (activeTab === 'files') {
      deviceSocket.setAction(currentFolderId ? 'Browsing directory' : 'Browsing My Files');
    } else if (activeTab === 'trash') {
      deviceSocket.setAction('Viewing Recycle Bin');
    } else if (activeTab === 'subscription') {
      deviceSocket.setAction('Managing Storage Subscription');
    } else if (activeTab === 'settings') {
      deviceSocket.setAction('Configuring Account Settings');
    } else if (activeTab === 'audit') {
      deviceSocket.setAction('Reviewing Security Audit Logs');
    }
  }, [activeTab, currentFolderId]);

  useEffect(() => {
    if (previewTargetFile) {
      deviceSocket.setAction(`Previewing file: ${previewTargetFile.name}`);
    }
  }, [previewTargetFile]);

  useEffect(() => {
    if (searchQuery.trim()) {
      deviceSocket.setAction(`Searching files: "${searchQuery.trim()}"`);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab === 'files' || activeTab === 'trash') {
      loadFiles();
    }
  }, [activeTab, loadFiles]);

  // Navigate folder hierarchy
  const handleOpenFolder = (folder: PublicFileItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    deviceSocket.setAction(`Browsing folder: ${folder.name}`);
  };

  const handleNavigateBreadcrumb = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    if (!folderId) {
      setBreadcrumbs([]);
      deviceSocket.setAction('Browsing My Files');
    } else {
      const index = breadcrumbs.findIndex((b) => b.id === folderId);
      if (index !== -1) {
        const item = breadcrumbs[index];
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
        deviceSocket.setAction(`Browsing folder: ${item?.name || 'Folder'}`);
      }
    }
  };

  // File Operations Handlers
  const handleCreateFolder = async (folderName: string) => {
    deviceSocket.setAction(`Creating folder: ${folderName}`);
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName, parentId: currentFolderId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create folder');
    }
    await loadFiles();
    deviceSocket.setAction(`Created folder: ${folderName}`);
  };

  const handleRename = async (fileId: string, newName: string) => {
    deviceSocket.setAction(`Renaming item to: ${newName}`);
    const res = await fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to rename item');
    }
    await loadFiles();
    deviceSocket.setAction(`Renamed item to: ${newName}`);
  };

  const handleMove = async (fileId: string, targetFolderId: string | null) => {
    deviceSocket.setAction('Moving item');
    const res = await fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: targetFolderId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to move item');
    }
    await loadFiles();
    deviceSocket.setAction('Moved item successfully');
  };

  const handleCopy = async (file: PublicFileItem) => {
    try {
      deviceSocket.setAction(`Duplicating: ${file.name}`);
      const res = await fetch(`/api/files/${file.id}/copy`, {
        method: 'POST',
      });
      if (res.ok) {
        await loadFiles();
        await loadSessionAndQuota();
        deviceSocket.setAction(`Duplicated: ${file.name}`);
      }
    } catch (e) {
      console.error('Failed to duplicate item', e);
    }
  };

  const handleTrash = async (file: PublicFileItem) => {
    try {
      deviceSocket.setAction(`Moving to trash: ${file.name}`);
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadFiles();
        await loadSessionAndQuota();
        deviceSocket.setAction(`Moved to trash: ${file.name}`);
      }
    } catch (e) {
      console.error('Failed to move to trash', e);
    }
  };

  const handleRestore = async (file: PublicFileItem) => {
    try {
      deviceSocket.setAction(`Restoring from trash: ${file.name}`);
      const res = await fetch(`/api/files/${file.id}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        await loadFiles();
        await loadSessionAndQuota();
        deviceSocket.setAction(`Restored: ${file.name}`);
      }
    } catch (e) {
      console.error('Failed to restore item', e);
    }
  };

  const handlePurge = async (file: PublicFileItem) => {
    try {
      deviceSocket.setAction(`Permanently deleting: ${file.name}`);
      const res = await fetch(`/api/files/${file.id}/purge`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadFiles();
        await loadSessionAndQuota();
        deviceSocket.setAction(`Deleted permanently: ${file.name}`);
      }
    } catch (e) {
      console.error('Failed to permanently delete item', e);
    }
  };

  const handleDownload = (file: PublicFileItem) => {
    deviceSocket.setAction(`Downloading: ${file.name}`);
    window.open(`/api/files/${file.id}/download`, '_blank');
  };

  const handleCreateShareLink = async (
    fileId: string,
    accessType: 'view' | 'download' | 'edit',
    expiresInDays?: number
  ): Promise<ShareLink> => {
    deviceSocket.setAction('Generating secure share link');
    const res = await fetch(`/api/files/${fileId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessType, expiresInDays }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate share link');
    }
    const data = await res.json();
    deviceSocket.setAction('Shared file link generated');
    return data.shareLink;
  };

  // Direct File Upload
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    await uploadFileDirect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFileDirect = async (file: File) => {
    try {
      setUploadError(null);
      deviceSocket.setAction(`Uploading file: ${file.name}`);
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) {
        formData.append('parentId', currentFolderId);
      }

      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      await loadFiles();
      await loadSessionAndQuota();
      deviceSocket.setAction(`Upload complete: ${file.name}`);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file');
      deviceSocket.setAction(`Upload failed: ${file.name}`);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (activeTab === 'files') setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (activeTab !== 'files') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadFileDirect(file);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <div
      className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans antialiased"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for single click upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDirectFileUpload}
        className="hidden"
      />

      {/* Top Navbar */}
      <Navbar
        user={user}
        quota={quota}
        searchFilters={{ query: searchQuery, mimeType: 'all', sizeRange: 'all', dateRange: 'all' }}
        onSearchChange={(f) => setSearchQuery(f.query || '')}
        onClearSearch={() => setSearchQuery('')}
        onNewFolder={() => setIsNewFolderOpen(true)}
        onUploadClick={() => fileInputRef.current?.click()}
        onResumableUploadClick={() => setIsResumableUploadOpen(true)}
        onOpenUpgrade={() => setActiveTab('subscription')}
        onOpenSettings={() => setActiveTab('settings')}
        onRefreshQuota={loadSessionAndQuota}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSwitchAccount={() => setIsAccountSwitcherOpen(true)}
        onSignOut={handleSignOut}
        onToggleMobileMenu={() => setMobileMenuOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Desktop persistent + Mobile slide-over drawer) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
          quota={quota}
          trashCount={trashCount}
          onRefreshQuota={loadSessionAndQuota}
          onOpenUpgrade={() => {
            setActiveTab('subscription');
            setMobileMenuOpen(false);
          }}
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Dynamic Center Work Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          {/* Top Status Bar */}
          <div className="mb-4 flex flex-col xs:flex-row xs:items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
              <span className="truncate">Encrypted Storage Pool Active</span>
            </div>
            <div className="text-xs text-neutral-400 truncate">
              Logged in as <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate">{(user?.fullName || authUser?.fullName || authUser?.name || (user as any)?.name ? `${user?.fullName || authUser?.fullName || authUser?.name || (user as any)?.name} (${user?.email || authUser?.email})` : (user?.email || authUser?.email || 'demo@syncdrive.io'))}</span>
            </div>
          </div>

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button
                onClick={() => setUploadError(null)}
                className="text-xs font-semibold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Tab 1 & 2: My Files & Recycle Bin */}
          {(activeTab === 'files' || activeTab === 'trash') && (
            <div className="space-y-4">
              {/* Navigation Breadcrumbs (Files View Only) */}
              {activeTab === 'files' && (
                <div className="flex items-center justify-between gap-2">
                  <Breadcrumbs
                    items={breadcrumbs}
                    onNavigate={handleNavigateBreadcrumb}
                  />
                  <span className="text-[11px] text-neutral-400 font-medium">
                    {files.length} {files.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              )}

              {/* Recycle Bin Header Notice */}
              {activeTab === 'trash' && (
                <div className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200/90 rounded-2xl text-xs text-neutral-600">
                  <div>
                    <span className="font-semibold text-neutral-900">Recycle Bin</span> • Deleted items remain available for restoration until purged.
                  </div>
                  <span className="text-neutral-500 font-medium">{files.length} items in trash</span>
                </div>
              )}

              {/* Toolbar */}
              <Toolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onNewFolder={() => setIsNewFolderOpen(true)}
                onUploadClick={() => fileInputRef.current?.click()}
                onResumableUploadClick={() => setIsResumableUploadOpen(true)}
                onRefresh={() => {
                  loadFiles();
                  loadSessionAndQuota();
                }}
                isTrashView={activeTab === 'trash'}
              />

              {/* Drag and drop overlay banner */}
              {isDragging && activeTab === 'files' && (
                <div className="py-12 border-2 border-dashed border-neutral-900 bg-neutral-50/80 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                  <UploadCloud className="w-8 h-8 text-neutral-900 animate-bounce" />
                  <div className="text-sm font-bold text-neutral-900">Drop files here to upload</div>
                  <div className="text-xs text-neutral-500">Logical quota will be reserved and verified.</div>
                </div>
              )}

              {/* Content Grid or List */}
              {loadingFiles ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2 text-xs text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
                  <span>Loading files...</span>
                </div>
              ) : viewMode === 'grid' ? (
                <FileGrid
                  files={files}
                  onOpenFile={handleOpenFolder}
                  onPreview={(f) => setPreviewTargetFile(f)}
                  onDownload={handleDownload}
                  onShare={(f) => setShareTargetFile(f)}
                  onRename={(f) => setRenameTargetFile(f)}
                  onMove={(f) => setMoveTargetFile(f)}
                  onCopy={handleCopy}
                  onTrash={handleTrash}
                  onRestore={handleRestore}
                  onPurge={handlePurge}
                  onShowDetails={(f) => setDetailsTargetFile(f)}
                  isTrashView={activeTab === 'trash'}
                />
              ) : (
                <FileList
                  files={files}
                  onOpenFile={handleOpenFolder}
                  onPreview={(f) => setPreviewTargetFile(f)}
                  onDownload={handleDownload}
                  onShare={(f) => setShareTargetFile(f)}
                  onRename={(f) => setRenameTargetFile(f)}
                  onMove={(f) => setMoveTargetFile(f)}
                  onCopy={handleCopy}
                  onTrash={handleTrash}
                  onRestore={handleRestore}
                  onPurge={handlePurge}
                  onShowDetails={(f) => setDetailsTargetFile(f)}
                  isTrashView={activeTab === 'trash'}
                />
              )}
            </div>
          )}

          {/* Tab 3: Storage Plans & UPI Billing */}
          {activeTab === 'subscription' && (
            <PlansAndBilling
              currentQuota={quota}
              onPlanUpgraded={async () => {
                await loadSessionAndQuota();
                await loadFiles();
              }}
            />
          )}

          {/* Tab 4: Security Audit Logs */}
          {activeTab === 'audit' && <AuditLogsView />}

          {/* Tab 5: Comprehensive Settings */}
          {activeTab === 'settings' && (
            <SettingsView
              user={user}
              quota={quota}
              onOpenUpgrade={() => setActiveTab('subscription')}
              onUserUpdate={(updated) => setUser(updated)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Phone viewports) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 px-3 py-1.5 flex items-center justify-around shadow-lg"
      >
        <button
          onClick={() => setActiveTab('files')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
            activeTab === 'files'
              ? 'text-neutral-900 dark:text-white font-bold'
              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Folder className={`w-5 h-5 mb-0.5 ${activeTab === 'files' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span>Files</span>
        </button>

        <button
          onClick={() => setActiveTab('recent')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
            activeTab === 'recent'
              ? 'text-neutral-900 dark:text-white font-bold'
              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Clock className={`w-5 h-5 mb-0.5 ${activeTab === 'recent' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span>Recent</span>
        </button>

        {/* Floating Upload Action Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload file"
          aria-label="Upload file"
          className="relative -top-3 w-12 h-12 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        <button
          onClick={() => setActiveTab('starred')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
            activeTab === 'starred'
              ? 'text-neutral-900 dark:text-white font-bold'
              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Star className={`w-5 h-5 mb-0.5 ${activeTab === 'starred' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span>Starred</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          title="More options"
          aria-label="Open navigation drawer"
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5 mb-0.5 stroke-[1.75]" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Modals & Slide-overs */}
      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      <RenameModal
        isOpen={Boolean(renameTargetFile)}
        file={renameTargetFile}
        onClose={() => setRenameTargetFile(null)}
        onRename={handleRename}
      />

      <MoveModal
        isOpen={Boolean(moveTargetFile)}
        file={moveTargetFile}
        availableFolders={files.filter((f) => f.isFolder)}
        onClose={() => setMoveTargetFile(null)}
        onMove={handleMove}
      />

      <ShareModal
        isOpen={Boolean(shareTargetFile)}
        file={shareTargetFile}
        onClose={() => setShareTargetFile(null)}
        onCreateShareLink={handleCreateShareLink}
      />

      <FilePreviewModal
        isOpen={Boolean(previewTargetFile)}
        file={previewTargetFile}
        onClose={() => setPreviewTargetFile(null)}
        onDownload={handleDownload}
      />

      <FileDetailsModal
        isOpen={Boolean(detailsTargetFile)}
        file={detailsTargetFile}
        onClose={() => setDetailsTargetFile(null)}
      />

      <ResumableUploadModal
        isOpen={isResumableUploadOpen}
        parentId={currentFolderId}
        onClose={() => setIsResumableUploadOpen(false)}
        onUploadSuccess={async () => {
          await loadFiles();
          await loadSessionAndQuota();
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        onUserChanged={async (updatedUser) => {
          setUser(updatedUser);
          await loadSessionAndQuota(updatedUser.id);
          await loadFiles();
        }}
      />

      <AccountSwitcherModal
        isOpen={isAccountSwitcherOpen}
        onClose={() => setIsAccountSwitcherOpen(false)}
        currentUser={user}
        onAccountSwitched={async (switchedUser) => {
          setUser(switchedUser);
          await loadSessionAndQuota(switchedUser.id);
          await loadFiles();
        }}
      />
    </div>
  );
}
