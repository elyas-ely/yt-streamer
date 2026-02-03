
import React, { useState, useMemo, useRef } from 'react';
import { ViewMode, UploadTask } from '../types';
import {
  IconUpload,
  IconPlus,
  IconSearch,
  IconGrid,
  IconList,
  IconChevronRight,
  IconArrowLeft,
  IconRefresh,
  IconTrash,
  IconFolder,
  IconClose,
  IconDownload
} from './Icons';

interface TopBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onUpload: (files: FileList) => void;
  onCreateFolder: (name: string) => void;
  onToggleSidebar: () => void;
  uploadTasks: UploadTask[];
  isLoading: boolean;
  selectedCount?: number;
  onDeleteSelected?: () => void;
  onDownloadSelected?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  totalCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPath,
  onNavigate,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  onUpload,
  onCreateFolder,
  onToggleSidebar,
  uploadTasks,
  isLoading,
  selectedCount = 0,
  onDeleteSelected,
  onDownloadSelected,
  onSelectAll,
  onClearSelection,
  totalCount
}) => {
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  const activeUploads = useMemo(() =>
    uploadTasks.filter(t => t.status === 'uploading' || t.status === 'pending'),
    [uploadTasks]);

  const totalProgress = useMemo(() => {
    if (activeUploads.length === 0) return 0;
    const total = activeUploads.reduce((sum, t) => sum + t.total, 0);
    const loaded = activeUploads.reduce((sum, t) => sum + t.loaded, 0);
    return total > 0 ? (loaded / total) * 100 : 0;
  }, [activeUploads]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  const handleGoBack = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.length > 0 ? parts.join('/') + '/' : '';
    onNavigate(newPath);
  };

  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 px-4 md:px-8 py-4 sticky top-0 z-30 transition-all overflow-hidden">
      {/* Global Progress Bar */}
      {(activeUploads.length > 0 || isLoading) && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500/10 z-50 overflow-hidden">
          <div
            className={`h-full bg-indigo-500 transition-all duration-300 ease-out ${activeUploads.length === 0 ? 'animate-[loading_1.5s_infinite_ease-in-out]' : ''}`}
            style={{ width: activeUploads.length > 0 ? `${totalProgress}%` : '30%' }}
          ></div>
        </div>
      )}

      <div className="flex flex-col gap-5 max-w-full overflow-hidden">
        {/* Main Row */}
        <div className="flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 active:scale-95 transition-all shadow-lg shrink-0"
            >
              <IconList className="w-5 h-5" />
            </button>

            <button
              disabled={!currentPath}
              onClick={handleGoBack}
              className={`p-2 rounded-xl border border-slate-700 transition-all shadow-sm shrink-0 ${!currentPath
                  ? 'opacity-30 cursor-not-allowed bg-slate-800/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-90'
                }`}
              title="Go Back"
            >
              <IconArrowLeft className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap pr-2">
              <button
                onClick={() => onNavigate('')}
                className="text-slate-400 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-widest"
              >
                Root
              </button>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <IconChevronRight className="w-3 h-3 text-slate-700 flex-shrink-0" />
                  <button
                    onClick={() => onNavigate(breadcrumbs.slice(0, idx + 1).join('/') + '/')}
                    className="text-slate-400 hover:text-indigo-400 transition-colors font-bold text-xs uppercase tracking-widest max-w-[120px] md:max-w-[200px] truncate"
                  >
                    {crumb}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 mr-2 animate-in slide-in-from-right-2">
                <button
                  onClick={onClearSelection}
                  className="group flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all"
                >
                  <IconClose className="w-3 h-3" />
                  <span>Deselect ({selectedCount})</span>
                </button>
                <button
                  onClick={onDownloadSelected}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-[10px] font-black text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all ml-2"
                >
                  <IconDownload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={onDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600/10 border border-red-500/20 rounded-xl text-[10px] font-black text-red-500 hover:bg-red-600 hover:text-white transition-all ml-2"
                >
                  <IconTrash className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setIsAddingFolder(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black text-slate-300 hover:bg-slate-700 hover:text-white transition-all uppercase tracking-widest shadow-lg active:scale-95"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Folder</span>
            </button>

            <div className="flex items-center bg-indigo-600 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(79,70,229,0.3)]">
              <label className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black text-white hover:bg-indigo-500 transition-all active:scale-95 uppercase tracking-widest border-r border-indigo-400/20">
                <IconUpload className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && onUpload(e.target.files)}
                />
              </label>
              <button
                onClick={() => folderInputRef.current?.click()}
                className="px-2.5 hover:bg-indigo-500 transition-all group"
                title="Upload Folder"
              >
                <IconFolder className="w-3.5 h-3.5 text-white/70 group-hover:text-white" />
                <input
                  ref={folderInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files && onUpload(e.target.files)}
                  {...({ webkitdirectory: "", directory: "" } as any)}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Search & Selection Row */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex-1 group overflow-hidden">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Filter storage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800/40 border border-slate-700/50 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all w-full"
            />
          </div>

          <div className="flex items-center bg-slate-800/50 rounded-2xl p-1 border border-slate-700/50 shrink-0 shadow-inner">
            <button
              onClick={() => allSelected ? onClearSelection?.() : onSelectAll?.()}
              title={allSelected ? "Unselect All" : "Select All"}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-transparent ${allSelected ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:border-slate-700'}`}
            >
              <div className={`w-3.5 h-3.5 rounded-md border-2 transition-all flex items-center justify-center ${allSelected ? 'bg-white border-white' : 'border-slate-600'}`}>
                {allSelected && <div className="w-2 h-2 bg-indigo-600 rounded-sm"></div>}
              </div>
              <span className="hidden md:inline">{allSelected ? 'Deselect' : 'Select'} All</span>
            </button>

            <div className="w-px h-4 bg-slate-700 mx-1"></div>

            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <IconGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <IconList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isAddingFolder && (
        <div className="mt-5 p-4 sm:p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden">
          <form onSubmit={handleCreateFolder} className="flex flex-col sm:flex-row gap-3">
            <input
              autoFocus
              type="text"
              placeholder="Folder name..."
              className="flex-1 bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-w-0"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-lg active:scale-95 whitespace-nowrap"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsAddingFolder(false)}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-slate-300 transition-all rounded-xl whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
