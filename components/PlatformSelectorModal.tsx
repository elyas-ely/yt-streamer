import React from 'react';
import { StreamingPlatform } from '../types';
import { IconClose, IconVideo, IconYoutube, IconTwitch, IconRumble } from './Icons';

interface PlatformSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (platform: StreamingPlatform) => void;
    platforms: StreamingPlatform[];
    fileName: string;
}

const getPlatformIcon = (id: string) => {
    switch (id.toLowerCase()) {
        case 'youtube': return <IconYoutube className="w-6 h-6 text-red-500 group-hover:text-white transition-colors" />;
        case 'twitch': return <IconTwitch className="w-6 h-6 text-purple-500 group-hover:text-white transition-colors" />;
        case 'rumble': return <IconRumble className="w-6 h-6 text-green-500 group-hover:text-white transition-colors" />;
        default: return <IconVideo className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors" />;
    }
};

export const PlatformSelectorModal: React.FC<PlatformSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    platforms,
    fileName
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800/50">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Select Platform</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            Go Live with: <span className="text-indigo-400">{fileName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                    >
                        <IconClose className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-3">
                    {platforms.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No platforms configured</p>
                        </div>
                    ) : (
                        platforms.map((platform) => (
                            <button
                                key={platform.id}
                                onClick={() => onSelect(platform)}
                                className="group flex items-center gap-4 p-4 rounded-2xl transition-all text-left border bg-slate-800/30 border-slate-800 hover:border-indigo-500/30 hover:bg-indigo-500/5"
                            >
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-slate-900 border-white/5 group-hover:bg-indigo-600 group-hover:border-white/10 transition-all">
                                    {getPlatformIcon(platform.id)}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black uppercase tracking-wider text-white group-hover:text-indigo-300 transition-colors">
                                        {platform.name}
                                    </h4>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                        {platform.channels.length} {platform.channels.length === 1 ? 'Channel' : 'Channels'} available
                                    </p>
                                </div>
                                <div className="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center group-hover:border-indigo-500 transition-all">
                                    <div className="w-2 h-2 bg-transparent group-hover:bg-indigo-500 rounded-full transition-all"></div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="px-8 py-6 bg-slate-950/50 border-t border-slate-800/50 flex flex-col gap-4">
                    <button
                        onClick={onClose}
                        className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.2em] transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
