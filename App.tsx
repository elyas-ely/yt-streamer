
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { FileExplorer } from './components/FileExplorer';
import { CORSHelp } from './components/CORSHelp';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { RenameModal } from './components/RenameModal';
import { UploadManager } from './components/UploadManager';
import { DownloadManager } from './components/DownloadManager';
import { LocalFiles } from './components/LocalFiles';
import { saveToLocal } from './services/localService';
import {
  getBuckets,
  listObjects,
  createFolder,
  deleteObjects,
  uploadFileWithProgress,
  downloadObject,
  renameObject,
  getBucketStats,
  listAllRecursive
} from './services/r2Service';
import { Bucket, R2Object, ViewMode, UploadTask, DownloadTask } from './types';

const App: React.FC = () => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [currentBucket, setCurrentBucket] = useState<Bucket | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [objects, setObjects] = useState<R2Object[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('Syncing...');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [storageView, setStorageView] = useState<'r2' | 'local'>('r2');

  // Selection State
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Upload Queue State
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  // Download Queue State
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([]);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; keys: string[]; isFolder: boolean; }>({
    isOpen: false, keys: [], isFolder: false
  });

  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; object: R2Object | null; }>({
    isOpen: false, object: null
  });

  useEffect(() => {
    if (window.innerWidth >= 768) setIsSidebarOpen(true);
  }, []);

  const refreshStorageStats = useCallback(async () => {
    if (!currentBucket) return;
    try {
      const stats = await getBucketStats(currentBucket.name);
      setBuckets(prev => prev.map(b => b.name === currentBucket.name ? { ...b, ...stats } : b));
      setCurrentBucket(prev => prev ? { ...prev, ...stats } : null);
    } catch (e) {
      console.error("Failed to refresh stats", e);
    }
  }, [currentBucket?.name]);

  const fetchObjects = useCallback(async () => {
    if (!currentBucket) return;
    setIsLoading(true);
    setSyncStatus('Fetching objects...');
    setConnectionError(null);
    try {
      const data = await listObjects(currentPath);
      setObjects(data);
      setSelectedKeys([]); // Clear selection on navigate
    } catch (error: any) {
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        setConnectionError('CORS_ERROR');
      } else {
        alert(`Error: ${error.message || 'Connection failed'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentBucket, currentPath]);

  useEffect(() => {
    getBuckets().then(b => {
      setBuckets(b);
      if (b.length > 0) setCurrentBucket(b[0]);
    });
  }, []);

  useEffect(() => {
    setObjects([]);
    fetchObjects();
  }, [currentPath, currentBucket, fetchObjects]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const executeUploadTask = useCallback(async (task: UploadTask) => {
    setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'uploading', startTime: Date.now() } : t));

    try {
      // Use webkitRelativePath for folder structure preservation
      const uploadPath = task.webkitRelativePath
        ? `${currentPath}${task.webkitRelativePath.split('/').slice(0, -1).join('/')}/`.replace(/\/+/g, '/')
        : currentPath;

      await uploadFileWithProgress(task.file, uploadPath, (loaded, total) => {
        setUploadTasks(prev => prev.map(t => {
          if (t.id !== task.id) return t;

          const progress = (loaded / total) * 100;
          const now = Date.now();
          const elapsed = (now - (t.startTime || now)) / 1000;
          const speed = loaded / Math.max(0.1, elapsed); // bytes per second
          const remainingBytes = total - loaded;
          const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0;

          return {
            ...t,
            progress,
            loaded,
            total,
            estimatedTimeRemaining
          };
        }));
      });

      setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', progress: 100, loaded: t.total } : t));
      fetchObjects();
      refreshStorageStats();
    } catch (err: any) {
      console.error(`Upload failed for ${task.file.name}`, err);
      setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed', error: err.message } : t));
    }
  }, [fetchObjects, refreshStorageStats, currentPath]);

  const handleUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newTasks: UploadTask[] = fileArray.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      path: currentPath,
      progress: 0,
      status: 'pending',
      loaded: 0,
      total: file.size,
      webkitRelativePath: (file as any).webkitRelativePath
    }));

    setUploadTasks(prev => [...prev, ...newTasks]);

    for (const task of newTasks) {
      executeUploadTask(task);
    }
  };

  const handleRetryUpload = (id: string) => {
    const task = uploadTasks.find(t => t.id === id);
    if (task) executeUploadTask(task);
  };

  const handleRemoveTask = (id: string) => {
    setUploadTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleClearCompleted = () => {
    setUploadTasks(prev => prev.filter(t => t.status !== 'completed'));
  };

  const handleClearAllTasks = () => {
    setUploadTasks([]);
  };

  const handleCreateFolderAction = async (name: string) => {
    setIsLoading(true);
    setSyncStatus('Creating folder...');
    try {
      await createFolder(`${currentPath}${name}/`);
      await fetchObjects();
      await refreshStorageStats();
    } finally { setIsLoading(false); }
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    setSyncStatus('Deleting...');
    try {
      await deleteObjects(deleteModal.keys);
      await fetchObjects();
      await refreshStorageStats();
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      setSelectedKeys([]);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally { setIsLoading(false); }
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!renameModal.object) return;
    setIsLoading(true);
    setSyncStatus('Renaming...');
    try {
      const baseKey = renameModal.object.key.endsWith('/')
        ? renameModal.object.key.slice(0, -1).split('/').slice(0, -1).join('/')
        : renameModal.object.key.split('/').slice(0, -1).join('/');

      const prefix = baseKey ? baseKey + '/' : '';
      const finalNewKey = renameModal.object.type === 'folder' ? `${prefix}${newName}/` : `${prefix}${newName}`;

      await renameObject(renameModal.object.key, finalNewKey);
      await fetchObjects();
      await refreshStorageStats();
      setRenameModal({ isOpen: false, object: null });
    } catch (err: any) {
      alert(`Rename failed: ${err.message}`);
    } finally { setIsLoading(false); }
  };

  const executeDownloadTask = useCallback(async (task: DownloadTask) => {
    setDownloadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'downloading', startTime: Date.now() } : t));

    try {
      await downloadObject(task.key, (loaded, total) => {
        setDownloadTasks(prev => prev.map(t => {
          if (t.id !== task.id) return t;

          const progress = total > 0 ? (loaded / total) * 100 : 0;
          const now = Date.now();
          const elapsed = (now - (t.startTime || now)) / 1000;
          const speed = loaded / Math.max(0.1, elapsed);
          const remainingBytes = total - loaded;
          const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0;

          return {
            ...t,
            progress,
            loaded,
            total,
            estimatedTimeRemaining
          };
        }));
      });

      setDownloadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', progress: 100, loaded: t.total } : t));
    } catch (err: any) {
      console.error(`Download failed for ${task.name}`, err);
      setDownloadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed', error: err.message } : t));
    }
  }, []);

  const handleDownload = async (key: string) => {
    const name = key.split('/').pop() || 'download';
    const newTask: DownloadTask = {
      id: Math.random().toString(36).substring(7),
      name,
      key,
      progress: 0,
      status: 'pending',
      loaded: 0,
      total: 0 // Will be updated during download start
    };

    setDownloadTasks(prev => [...prev, newTask]);
    await executeDownloadTask(newTask);
  };

  const handleDownloadFolder = async (prefix: string) => {
    setIsLoading(true);
    setSyncStatus('Preparing files...');
    try {
      const allKeys = await listAllRecursive(prefix);
      const fileKeys = allKeys.filter(key => !key.endsWith('/'));

      const newTasks: DownloadTask[] = fileKeys.map(key => ({
        id: Math.random().toString(36).substring(7),
        name: key.split('/').pop() || 'download',
        key,
        progress: 0,
        status: 'pending',
        loaded: 0,
        total: 0
      }));

      setDownloadTasks(prev => [...prev, ...newTasks]);

      // Download one by one
      for (const task of newTasks) {
        await executeDownloadTask(task);
        // Small delay to ensure browser handles multiple downloads
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err: any) {
      alert(`Download folder failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToLocal = async (key: string) => {
    setIsLoading(true);
    setSyncStatus('Saving to /public folder...');
    try {
      const result = await saveToLocal(key);
      alert(`${result.message}: ${result.fileName}`);
    } catch (err: any) {
      alert(`Failed to save to local: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedKeys.length === 0) return;
    setIsLoading(true);
    setSyncStatus('Preparing downloads...');
    try {
      const keysToDownload: string[] = [];

      for (const key of selectedKeys) {
        const obj = objects.find(o => o.key === key);
        if (!obj) continue;

        if (obj.type === 'folder') {
          const nested = await listAllRecursive(key);
          nested.filter(nk => !nk.endsWith('/')).forEach(nk => keysToDownload.push(nk));
        } else {
          keysToDownload.push(key);
        }
      }

      const newTasks: DownloadTask[] = keysToDownload.map(key => ({
        id: Math.random().toString(36).substring(7),
        name: key.split('/').pop() || 'download',
        key,
        progress: 0,
        status: 'pending',
        loaded: 0,
        total: 0
      }));

      setDownloadTasks(prev => [...prev, ...newTasks]);

      for (const task of newTasks) {
        await executeDownloadTask(task);
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err: any) {
      alert(`Batch download failed: ${err.message}`);
    } finally {
      setIsLoading(false);
      setSelectedKeys([]);
    }
  };

  const filteredObjects = useMemo(() =>
    objects.filter(obj => obj.key.toLowerCase().includes(searchQuery.toLowerCase())),
    [objects, searchQuery]);

  const handleSelectAll = useCallback(() => {
    setSelectedKeys(filteredObjects.map(o => o.key));
  }, [filteredObjects]);

  const handleClearSelection = useCallback(() => {
    setSelectedKeys([]);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden relative">
      {connectionError === 'CORS_ERROR' && <CORSHelp onRetry={fetchObjects} />}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(p => ({ ...p, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        itemsCount={deleteModal.keys.length}
        isFolder={deleteModal.isFolder}
        isLoading={isLoading}
      />

      <RenameModal
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, object: null })}
        onConfirm={handleRenameConfirm}
        currentName={renameModal.object ? (renameModal.object.key.endsWith('/') ? renameModal.object.key.split('/').filter(Boolean).pop() : renameModal.object.key.split('/').pop()) || '' : ''}
        type={renameModal.object?.type || 'file'}
        isLoading={isLoading}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        buckets={buckets}
        currentBucket={currentBucket}
        onSelectBucket={setCurrentBucket}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        storageView={storageView}
        onSetStorageView={setStorageView}
      />

      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        <TopBar
          currentPath={currentPath}
          onNavigate={handleNavigate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onUpload={handleUpload}
          onCreateFolder={handleCreateFolderAction}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          uploadTasks={uploadTasks}
          isLoading={isLoading}
          selectedCount={selectedKeys.length}
          onDeleteSelected={() => setDeleteModal({ isOpen: true, keys: selectedKeys, isFolder: selectedKeys.some(k => k.endsWith('/')) })}
          onDownloadSelected={handleDownloadSelected}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          totalCount={filteredObjects.length}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-8 custom-scrollbar">
          {storageView === 'local' ? (
            <LocalFiles searchQuery={searchQuery} viewMode={viewMode} />
          ) : (
            <FileExplorer
              objects={filteredObjects}
              isLoading={isLoading && objects.length === 0}
              currentPath={currentPath}
              viewMode={viewMode}
              onNavigate={handleNavigate}
              onDelete={(keys) => setDeleteModal({ isOpen: true, keys, isFolder: keys.some(k => k.endsWith('/')) })}
              onDownload={handleDownload}
              onDownloadFolder={handleDownloadFolder}
              onRename={(obj) => setRenameModal({ isOpen: true, object: obj })}
              onSaveToLocal={handleSaveToLocal}
              selectedKeys={selectedKeys}
              onToggleSelection={(key) => setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
            />
          )}
        </div>

        <UploadManager
          tasks={uploadTasks}
          onRetry={handleRetryUpload}
          onRemove={handleRemoveTask}
          onClearCompleted={handleClearCompleted}
          onClearAll={handleClearAllTasks}
        />

        <DownloadManager
          tasks={downloadTasks}
          onRemove={(id) => setDownloadTasks(prev => prev.filter(t => t.id !== id))}
          onClearCompleted={() => setDownloadTasks(prev => prev.filter(t => t.status !== 'completed'))}
          onClearAll={() => setDownloadTasks([])}
        />

        {isLoading && (
          <div className="fixed bottom-6 left-6 bg-indigo-600 border border-indigo-400 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-[0_8px_32_rgba(79,70,229,0.4)] backdrop-blur-xl z-[60] animate-in slide-in-from-bottom-4">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white"></div>
            <span className="text-xs font-black text-white tracking-widest uppercase">{syncStatus}</span>
          </div>
        )}
      </main>
      <style>{`@keyframes loading { 0% { transform: translateX(-100%); width: 30%; } 50% { transform: translateX(50%); width: 60%; } 100% { transform: translateX(100%); width: 30%; } }`}</style>
    </div>
  );
};

export default App;
