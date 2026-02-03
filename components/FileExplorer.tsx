
import React, { useState, useEffect, useRef } from 'react';
import { R2Object, ViewMode } from '../types';
import {
  IconFolder,
  IconFile,
  IconTrash,
  IconDownload,
  IconMore,
  IconEdit,
  IconVideo,
  IconImage,
  IconAudio,
  IconCode,
  IconArchive,
  IconDocument,
  IconStorage
} from './Icons';

interface FileExplorerProps {
  objects: R2Object[];
  isLoading?: boolean;
  currentPath: string;
  viewMode: ViewMode;
  onNavigate: (path: string) => void;
  onDelete: (keys: string[]) => void;
  onDownload: (key: string) => void;
  onDownloadFolder: (prefix: string) => void;
  onRename: (obj: R2Object) => void;
  onSaveToLocal: (key: string) => void;
  selectedKeys: string[];
  onToggleSelection: (key: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

interface AssetStyle {
  icon: (className: string) => React.ReactNode;
  colorClass: string;
  glowClass: string;
}

const getAssetStyle = (key: string, type: 'file' | 'folder'): AssetStyle => {
  if (type === 'folder') {
    return {
      icon: (cls) => <IconFolder className={cls} />,
      colorClass: 'text-indigo-400 bg-indigo-500/10',
      glowClass: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]'
    };
  }

  const ext = key.split('.').pop()?.toLowerCase() || '';

  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'].includes(ext)) {
    return {
      icon: (cls) => <IconVideo className={cls} />,
      colorClass: 'text-pink-400 bg-pink-500/10',
      glowClass: 'shadow-[0_0_20px_rgba(244,114,182,0.15)]'
    };
  }

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext)) {
    return {
      icon: (cls) => <IconImage className={cls} />,
      colorClass: 'text-emerald-400 bg-emerald-500/10',
      glowClass: 'shadow-[0_0_20px_rgba(52,211,153,0.15)]'
    };
  }

  if (['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma'].includes(ext)) {
    return {
      icon: (cls) => <IconAudio className={cls} />,
      colorClass: 'text-cyan-400 bg-cyan-500/10',
      glowClass: 'shadow-[0_0_20px_rgba(34,211,238,0.15)]'
    };
  }

  if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'py', 'php', 'rb', 'go', 'rs', 'cpp', 'c', 'sql'].includes(ext)) {
    return {
      icon: (cls) => <IconCode className={cls} />,
      colorClass: 'text-violet-400 bg-violet-500/10',
      glowClass: 'shadow-[0_0_20px_rgba(167,139,250,0.15)]'
    };
  }

  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return {
      icon: (cls) => <IconArchive className={cls} />,
      colorClass: 'text-amber-400 bg-amber-500/10',
      glowClass: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]'
    };
  }

  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages'].includes(ext)) {
    return {
      icon: (cls) => <IconDocument className={cls} />,
      colorClass: 'text-rose-400 bg-rose-500/10',
      glowClass: 'shadow-[0_0_20px_rgba(251,113,133,0.15)]'
    };
  }

  return {
    icon: (cls) => <IconFile className={cls} />,
    colorClass: 'text-slate-400 bg-slate-500/10',
    glowClass: ''
  };
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
};

const SkeletonItem: React.FC<{ viewMode: ViewMode }> = ({ viewMode }) => {
  if (viewMode === 'list') {
    return (
      <div className="bg-slate-900/20 rounded-2xl p-4 flex items-center gap-4 mb-3">
        <div className="w-5 h-5 bg-slate-800 rounded"></div>
        <div className="w-10 h-10 bg-slate-800 rounded-xl"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
          <div className="h-3 bg-slate-800 rounded w-1/4"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-slate-900/40 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-800/50 flex flex-col items-center gap-4 md:gap-5">
      <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-800 rounded-[1.25rem] md:rounded-[2rem]"></div>
      <div className="h-4 bg-slate-800 rounded w-3/4"></div>
      <div className="h-2 bg-slate-800 rounded w-1/2"></div>
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  objects,
  isLoading = false,
  viewMode,
  onNavigate,
  onDelete,
  onDownload,
  onDownloadFolder,
  onRename,
  onSaveToLocal,
  selectedKeys,
  onToggleSelection,
  onSelectAll,
  onClearSelection
}) => {
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<R2Object | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({ top: 0, left: 0, placement: 'bottom' });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuKey(null);
        setSelectedObject(null);
      }
    };
    if (openMenuKey) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuKey]);

  const getFileName = (key: string) => (key.endsWith('/') ? key.split('/').filter(Boolean).pop() : key.split('/').pop()) || key;

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setOpenMenuKey(null);
    setSelectedObject(null);
  };

  const toggleMenu = (e: React.MouseEvent, obj: R2Object) => {
    e.stopPropagation();
    if (openMenuKey === obj.key) {
      setOpenMenuKey(null);
      setSelectedObject(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 220;

    if (spaceBelow < menuHeight && rect.top > menuHeight) {
      setMenuCoords({ top: rect.top - 12, left: rect.right, placement: 'top' });
    } else {
      setMenuCoords({ top: rect.bottom + 12, left: rect.right, placement: 'bottom' });
    }

    setSelectedObject(obj);
    setOpenMenuKey(obj.key);
  };

  const ActionMenu = ({ obj }: { obj: R2Object }) => (
    <div
      ref={menuRef}
      className="fixed z-[150]"
      style={{
        top: menuCoords.placement === 'top' ? 'auto' : `${menuCoords.top}px`,
        bottom: menuCoords.placement === 'top' ? `${window.innerHeight - menuCoords.top}px` : 'auto',
        left: `${menuCoords.left}px`,
        transform: 'translateX(-100%)'
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-[1.5rem] shadow-[0_24px_48px_rgba(0,0,0,0.8)] py-3 min-w-[200px] overflow-hidden backdrop-blur-2xl">
        <button
          onClick={(e) => handleMenuAction(e, () => onRename(obj))}
          className="w-full flex items-center gap-3 px-5 py-3 text-xs font-black text-slate-300 hover:bg-slate-800 hover:text-white uppercase tracking-widest"
        >
          <IconEdit className="w-4 h-4" />
          <span>Rename</span>
        </button>
        <button
          onClick={(e) => handleMenuAction(e, () => obj.type === 'file' ? onDownload(obj.key) : onDownloadFolder(obj.key))}
          className="w-full flex items-center gap-3 px-5 py-3 text-xs font-black text-slate-300 hover:bg-slate-800 hover:text-white uppercase tracking-widest"
        >
          <IconDownload className="w-4 h-4" />
          <span>Download</span>
        </button>
        {obj.type === 'file' && (
          <button
            onClick={(e) => handleMenuAction(e, () => onSaveToLocal(obj.key))}
            className="w-full flex items-center gap-3 px-5 py-3 text-xs font-black text-indigo-400 hover:bg-indigo-500/10 uppercase tracking-widest"
          >
            <IconStorage className="w-4 h-4" />
            <span>Save to Local</span>
          </button>
        )}
        <div className="h-px bg-slate-800 mx-4 my-1.5 opacity-50"></div>
        <button
          onClick={(e) => handleMenuAction(e, () => onDelete([obj.key]))}
          className="w-full flex items-center gap-3 px-5 py-3 text-xs font-black text-red-500 hover:bg-red-500/10 uppercase tracking-widest"
        >
          <IconTrash className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );

  const allSelected = objects.length > 0 && selectedKeys.length === objects.length;
  const isSelectionMode = selectedKeys.length > 0;

  if (isLoading && objects.length === 0) {
    return viewMode === 'list'
      ? <div className="w-full space-y-3">{[...Array(6)].map((_, i) => <SkeletonItem key={i} viewMode="list" />)}</div>
      : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-8">{[...Array(10)].map((_, i) => <SkeletonItem key={i} viewMode="grid" />)}</div>;
  }

  if (objects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 md:py-40 px-6 text-center">
        <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-900/40 rounded-[3rem] flex items-center justify-center mb-10 border border-slate-800/40 shadow-inner relative group">
          <div className="absolute inset-0 bg-indigo-500/10 rounded-[3rem] blur-2xl group-hover:bg-indigo-500/20"></div>
          <IconFolder className="w-16 h-16 md:w-20 md:h-20 text-indigo-500 opacity-20 relative" />
        </div>
        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">Your vault is empty</h3>
        <p className="text-sm md:text-base text-slate-500 mt-4 max-w-sm font-medium leading-relaxed uppercase tracking-widest">
          Drop files here or use the upload button
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-full overflow-hidden">
        {viewMode === 'list' ? (
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center px-4 py-2 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="w-10 shrink-0 flex justify-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded-md border-2 border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer appearance-none checked:bg-indigo-600 checked:border-indigo-600 relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[4px] after:top-[1px] after:w-[4px] after:h-[8px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45"
                  checked={allSelected}
                  onChange={() => allSelected ? onClearSelection() : onSelectAll()}
                />
              </div>
              <div className="flex-1 px-4">Asset Details</div>
              <div className="hidden sm:block sm:w-32 text-center">Size</div>
              <div className="hidden md:block md:w-40 text-right">Modified</div>
              <div className="w-12 shrink-0 text-right">Actions</div>
            </div>

            {objects.map(obj => {
              const isSelected = selectedKeys.includes(obj.key);
              const style = getAssetStyle(obj.key, obj.type);

              return (
                <div
                  key={obj.key}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.action-btn')) return;
                    // If in selection mode, any click toggles selection.
                    // If not in selection mode, folder click navigates, file click toggles (starts selection).
                    if (isSelectionMode || obj.type === 'file') {
                      onToggleSelection(obj.key);
                    } else {
                      onNavigate(obj.key);
                    }
                  }}
                  className={`group flex items-center bg-slate-900/40 hover:bg-slate-900 border-2 p-3 sm:p-4 rounded-2xl sm:rounded-[2rem] cursor-pointer overflow-hidden ${isSelected
                    ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'border-slate-800/60 hover:border-indigo-500/40'
                    }`}
                >
                  <div className="w-10 shrink-0 flex justify-center action-btn">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded-md border-2 border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer appearance-none checked:bg-indigo-600 checked:border-indigo-600 relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[1px] after:w-[6px] after:h-[10px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45"
                      checked={isSelected}
                      onChange={() => onToggleSelection(obj.key)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="flex-1 flex items-center gap-4 sm:gap-6 px-2 sm:px-4 min-w-0">
                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl shrink-0 shadow-lg ${style.colorClass} ${style.glowClass}`}>
                      {style.icon("w-6 h-6 sm:w-7 sm:h-7")}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-sm sm:text-base font-black truncate group-hover:text-white ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                        {getFileName(obj.key)}
                      </span>
                      <div className="flex items-center gap-2 mt-1 sm:hidden">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {obj.type === 'file' ? formatSize(obj.size) : 'COLLECTION'}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                        <span className="text-[10px] font-bold text-slate-600">
                          {new Date(obj.lastModified).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:block sm:w-32 text-center text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {obj.type === 'file' ? formatSize(obj.size) : 'COLLECTION'}
                  </div>
                  <div className="hidden md:block md:w-40 text-right text-[11px] font-bold text-slate-600 uppercase">
                    {new Date(obj.lastModified).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  <div className="w-12 shrink-0 text-right action-btn">
                    <button
                      onClick={(e) => toggleMenu(e, obj)}
                      className={`p-2 rounded-xl shadow-sm ${openMenuKey === obj.key ? 'text-white bg-indigo-600' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                    >
                      <IconMore className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-8">
            {objects.map(obj => {
              const isSelected = selectedKeys.includes(obj.key);
              const style = getAssetStyle(obj.key, obj.type);

              return (
                <div
                  key={obj.key}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.action-btn')) return;
                    // If in selection mode, any click toggles selection.
                    // If not in selection mode, folder click navigates, file click toggles (starts selection).
                    if (isSelectionMode || obj.type === 'file') {
                      onToggleSelection(obj.key);
                    } else {
                      onNavigate(obj.key);
                    }
                  }}
                  className={`group relative bg-slate-900/40 hover:bg-slate-950 border-2 p-4 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[3rem] cursor-pointer flex flex-col items-center text-center gap-3 md:gap-6 min-w-0 ${isSelected
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                    : 'border-slate-800/60 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]'
                    }`}
                >
                  <div className={`absolute top-2 left-2 md:top-6 md:left-6 z-30 action-btn ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <input
                      type="checkbox"
                      className="w-5 h-5 md:w-6 md:h-6 rounded-md border-2 border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer appearance-none checked:bg-indigo-600 checked:border-indigo-600 relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] md:after:left-[7px] after:top-[1px] md:after:top-[2px] after:w-[6px] md:after:w-[8px] after:h-[10px] md:after:h-[12px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45"
                      checked={isSelected}
                      onChange={() => onToggleSelection(obj.key)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="absolute top-2 right-2 md:top-6 md:right-6 z-30 action-btn">
                    <button
                      onClick={(e) => toggleMenu(e, obj)}
                      className={`p-1.5 md:p-2 backdrop-blur-xl border border-white/5 rounded-lg md:rounded-xl shadow-2xl ${openMenuKey === obj.key ? 'bg-indigo-600 text-white' : 'bg-slate-900/60 hover:bg-slate-800 text-slate-500 hover:text-white'}`}
                    >
                      <IconMore className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>

                  <div className={`w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 flex items-center justify-center rounded-[1rem] sm:rounded-[1.5rem] md:rounded-[2.5rem] shrink-0 shadow-2xl ${style.colorClass} ${style.glowClass}`}>
                    {style.icon("w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14")}
                  </div>

                  <div className="w-full min-w-0 px-0.5">
                    <p className={`text-xs sm:text-sm md:text-base font-black truncate group-hover:text-white leading-snug ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                      {getFileName(obj.key)}
                    </p>
                    <div className="flex flex-col items-center gap-1 mt-1.5 md:mt-2.5 overflow-hidden">
                      <span className={`text-[10px] md:text-xs font-black uppercase tracking-tight md:tracking-[0.2em] truncate max-w-full ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`}>
                        {obj.type === 'file' ? formatSize(obj.size) : 'COLLECTION'}
                      </span>
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tight text-slate-700 truncate max-w-full italic opacity-60">
                        {new Date(obj.lastModified).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {openMenuKey && selectedObject && (
        <ActionMenu obj={selectedObject} />
      )}
    </>
  );
};
