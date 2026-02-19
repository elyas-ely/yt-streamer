
import React, { useState, useEffect } from 'react';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  currentName: string;
  type: 'file' | 'folder';
  isLoading: boolean;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentName,
  type,
  isLoading
}) => {
  // Separate basename and extension for files
  const { basename: initialBasename, extension } = React.useMemo(() => {
    if (type === 'folder' || !currentName.includes('.')) {
      return { basename: currentName, extension: '' };
    }
    const lastDotIndex = currentName.lastIndexOf('.');
    return {
      basename: currentName.substring(0, lastDotIndex),
      extension: currentName.substring(lastDotIndex)
    };
  }, [currentName, type]);

  const [basename, setBasename] = useState(initialBasename);

  useEffect(() => {
    if (isOpen) {
      setBasename(initialBasename);
    }
  }, [isOpen, initialBasename]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const finalName = `${basename.trim()}${extension}`;
    if (!isLoading && basename.trim() && finalName !== currentName) {
      onConfirm(finalName);
    } else if (finalName === currentName) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Rename {type === 'folder' ? 'Folder' : 'File'}</h2>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-6">Enter a new name for your {type}.</p>

        <form onSubmit={handleSubmit}>
          <div className="relative group mb-6">
            <div className="flex bg-slate-950 border border-slate-700/50 rounded-2xl items-center focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 overflow-hidden transition-all shadow-inner">
              <input
                autoFocus
                disabled={isLoading}
                type="text"
                className="w-full bg-transparent px-4 py-4 text-sm font-black text-slate-200 focus:outline-none placeholder:text-slate-700"
                placeholder="Filename"
                value={basename}
                onChange={(e) => setBasename(e.target.value)}
              />
              {extension && (
                <span className="px-4 py-4 bg-slate-900/50 text-indigo-400/60 text-sm font-black border-l border-white/5 select-none uppercase tracking-tighter">
                  {extension}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="flex-1 py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !basename.trim()}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-t-transparent border-white"></div>
                  <span>Renaming...</span>
                </>
              ) : (
                <span>Save Name</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
