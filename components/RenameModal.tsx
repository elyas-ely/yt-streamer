
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
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isLoading && name.trim() && name !== currentName) {
      onConfirm(name.trim());
    } else if (name === currentName) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-2">Rename {type === 'folder' ? 'Folder' : 'File'}</h2>
        <p className="text-slate-400 text-sm mb-6">Enter a new name for your {type}.</p>
        
        <form onSubmit={handleSubmit}>
          <input 
            autoFocus
            disabled={isLoading}
            type="text"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-6 transition-all disabled:opacity-50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          
          <div className="flex gap-3">
            <button 
              type="button"
              disabled={isLoading}
              onClick={onClose} 
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white"></div>
                  <span>Renaming...</span>
                </>
              ) : (
                <span>Rename</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
