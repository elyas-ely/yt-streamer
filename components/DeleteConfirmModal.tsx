
import React from 'react';
import { IconTrash, IconStorage } from './Icons';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemsCount: number;
  isFolder: boolean;
  isLoading: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemsCount,
  isFolder,
  isLoading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <IconTrash className="w-32 h-32 text-red-500" />
        </div>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
            <IconTrash className="w-8 h-8 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Confirm Deletion</h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            {isFolder ? (
              <>
                You are about to delete a <span className="text-red-400 font-semibold">folder</span> and all of its contents. This action is permanent and cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete <span className="text-indigo-400 font-semibold">{itemsCount} item{itemsCount > 1 ? 's' : ''}</span>? This process will remove the data permanently from your R2 storage.
              </>
            )}
          </p>

          <div className="flex w-full gap-3">
            <button
              disabled={isLoading}
              onClick={onClose}
              className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={isLoading}
              onClick={onConfirm}
              className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete Now</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
