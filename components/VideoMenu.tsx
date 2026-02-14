
import React, { useState, useRef, useEffect } from 'react';
import { IconMore, IconVideo, IconTrash } from './Icons';

interface VideoMenuProps {
    onStartStream: () => void;
    onDelete: () => void;
    isStreaming?: boolean;
}

export const VideoMenu: React.FC<VideoMenuProps> = ({ onStartStream, onDelete, isStreaming }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all duration-300 ${isOpen
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-white border border-slate-700/50'
                    }`}
            >
                <IconMore className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {isOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="p-1.5 flex flex-col gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onStartStream();
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/10 transition-colors group"
                        >
                            <IconVideo className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span>Go Live</span>
                        </button>

                        <div className="h-px bg-slate-800/50 mx-2" />

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isStreaming) {
                                    onDelete();
                                }
                                setIsOpen(false);
                            }}
                            disabled={isStreaming}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors group ${isStreaming
                                    ? 'text-slate-600 cursor-not-allowed'
                                    : 'text-red-400 hover:bg-red-500/10'
                                }`}
                        >
                            <IconTrash className={`w-4 h-4 ${!isStreaming && 'group-hover:scale-110 transition-transform'}`} />
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
