
import React from 'react';
import { Bucket } from '../types';
import { IconStorage, IconChevronRight, IconGrid, IconRefresh } from './Icons';

interface SidebarProps {
  buckets: Bucket[];
  currentBucket: Bucket | null;
  onSelectBucket: (bucket: Bucket) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  storageView: 'r2' | 'local';
  onSetStorageView: (view: 'r2' | 'local') => void;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const Sidebar: React.FC<SidebarProps> = ({
  buckets,
  currentBucket,
  onSelectBucket,
  isOpen,
  toggleSidebar,
  storageView,
  onSetStorageView
}) => {
  const TOTAL_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB limit for display
  const usedBytes = currentBucket?.storageUsed || 0;
  const usedPercent = Math.min(100, Math.max(0.5, (usedBytes / TOTAL_QUOTA_BYTES) * 100));

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 md:relative md:z-auto
      transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
      ${isOpen ? 'w-80 translate-x-0' : 'w-80 -translate-x-full md:w-0 md:-translate-x-full'}
      border-r border-slate-800/60 bg-slate-900 flex flex-col overflow-hidden shadow-2xl
    `}>
      <div className="p-8 flex items-center justify-between border-b border-slate-800/40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_8px_32px_rgba(79,70,229,0.4)]">
            <IconStorage className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter text-white uppercase italic">Navid Vault</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest -mt-1">Enterprise R2</span>
          </div>
        </div>
        <button onClick={toggleSidebar} className="md:hidden p-2 text-slate-500 hover:text-white transition-colors">
          <IconChevronRight className="w-6 h-6 rotate-180" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar flex flex-col">
        <div>
          <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center justify-between">
            Your Storage
          </h3>
          <div className="space-y-4">
            {buckets.map((bucket) => (
              <button
                key={bucket.name}
                onClick={() => {
                  onSelectBucket(bucket);
                  onSetStorageView('r2');
                }}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${storageView === 'r2' && currentBucket?.name === bucket.name
                    ? 'bg-indigo-600/10 text-white border border-indigo-500/30 shadow-[inset_0_0_12px_rgba(79,70,229,0.1)]'
                    : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                  }`}
              >
                <IconStorage className={`w-4 h-4 ${storageView === 'r2' && currentBucket?.name === bucket.name ? 'text-indigo-400' : ''}`} />
                <span className="flex-1 text-left truncate text-xs font-black uppercase tracking-widest">R2 Storage</span>
                {storageView === 'r2' && currentBucket?.name === bucket.name && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.6)]"></div>}
              </button>
            ))}

            <button
              onClick={() => onSetStorageView('local')}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${storageView === 'local'
                  ? 'bg-indigo-600/10 text-white border border-indigo-500/30 shadow-[inset_0_0_12px_rgba(79,70,229,0.1)]'
                  : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
            >
              <IconGrid className={`w-4 h-4 ${storageView === 'local' ? 'text-indigo-400' : ''}`} />
              <span className="flex-1 text-left truncate text-xs font-black uppercase tracking-widest">Local Drive</span>
              {storageView === 'local' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.6)]"></div>}
            </button>
          </div>
        </div>

        <div>
          <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center justify-between">
            Library
          </h3>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-4 px-5 py-3 rounded-2xl text-slate-500 hover:bg-slate-800/60 hover:text-slate-200 transition-all">
              <IconGrid className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">All Assets</span>
            </button>
            <button className="w-full flex items-center gap-4 px-5 py-3 rounded-2xl text-slate-500 hover:bg-slate-800/60 hover:text-slate-200 transition-all opacity-50 cursor-not-allowed">
              <IconRefresh className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Recents</span>
            </button>
          </div>
        </div>

        <div className="px-4 py-8 mt-auto">
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-[2rem] p-6 border border-slate-700/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
              <IconStorage className="w-16 h-16" />
            </div>

            <div className="flex justify-between items-center mb-4 relative z-10">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Usage</span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">{usedPercent.toFixed(1)}%</span>
            </div>

            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden mb-5 relative z-10">
              <div
                className="h-full bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.6)] transition-all duration-1000 ease-out"
                style={{ width: `${usedPercent}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-baseline mb-2 relative z-10">
              <span className="text-sm font-black text-white tracking-tighter">{formatSize(usedBytes)}</span>
              <span className="text-[10px] font-bold text-slate-600 uppercase">Limit: {formatSize(TOTAL_QUOTA_BYTES)}</span>
            </div>

            <p className="text-[9px] text-slate-500 leading-relaxed font-bold uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">
              Calculated from {currentBucket?.objectCount || 0} objects
            </p>
          </div>
        </div>
      </nav>
    </aside>
  );
};
