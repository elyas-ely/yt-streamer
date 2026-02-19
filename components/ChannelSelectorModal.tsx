import React, { useState, useEffect } from 'react';
import { StreamChannel, StreamStatus } from '../types';
import { IconClose, IconVideo, IconYoutube, IconTwitch, IconRumble, IconArrowLeft } from './Icons';

interface ChannelSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBack: () => void;
    onSelect: (channels: StreamChannel[]) => void;
    channels: StreamChannel[];
    activeStreams: StreamStatus[];
    fileName: string;
    platformName: string;
    platformId: string;
}

const getPlatformIcon = (id: string, isSelected: boolean) => {
    const className = `w-6 h-6 ${isSelected ? 'text-white' : 'text-indigo-400'}`;
    switch (id.toLowerCase()) {
        case 'youtube': return <IconYoutube className={className} />;
        case 'twitch': return <IconTwitch className={className} />;
        case 'rumble': return <IconRumble className={className} />;
        default: return <IconVideo className={className} />;
    }
};

export const ChannelSelectorModal: React.FC<ChannelSelectorModalProps> = ({
    isOpen,
    onClose,
    onBack,
    onSelect,
    channels,
    activeStreams,
    fileName,
    platformName,
    platformId
}) => {
    const [selectedChannelIds, setSelectedChannelIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setSelectedChannelIds(new Set());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleChannel = (id: number) => {
        const newSelected = new Set(selectedChannelIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedChannelIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedChannelIds.size === channels.length) {
            setSelectedChannelIds(new Set());
        } else {
            setSelectedChannelIds(new Set(channels.map(c => c.id)));
        }
    };

    const handleGoLive = () => {
        const selectedChannels = channels.filter(c => selectedChannelIds.has(c.id));
        if (selectedChannels.length > 0) {
            onSelect(selectedChannels);
        }
    };

    const isAllSelected = channels.length > 0 && selectedChannelIds.size === channels.length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-6 px-8 py-6 border-b border-slate-800/50">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white group"
                        title="Go Back"
                    >
                        <IconArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Select {platformName} Channels</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            Streaming: <span className="text-indigo-400">{fileName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                    >
                        <IconClose className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                    {channels.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No channels configured in youtube.json</p>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={toggleAll}
                                className="flex items-center gap-4 p-4 mb-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl transition-all text-left group"
                            >
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isAllSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-700'}`}>
                                    {isAllSelected && <div className="w-2 h-2 bg-white rounded-sm"></div>}
                                </div>
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Select All Channels</span>
                            </button>

                            {channels.map((channel) => {
                                const isSelected = selectedChannelIds.has(channel.id);
                                const isAlreadyRunning = activeStreams.some(s => s.streamKey === channel.streamKey);

                                return (
                                    <button
                                        key={channel.id}
                                        onClick={() => !isAlreadyRunning && toggleChannel(channel.id)}
                                        disabled={isAlreadyRunning}
                                        className={`group flex items-center gap-4 p-4 rounded-2xl transition-all text-left border ${isSelected
                                            ? 'bg-indigo-600/20 border-indigo-500/50'
                                            : isAlreadyRunning
                                                ? 'bg-red-500/5 border-red-500/20 opacity-80 cursor-not-allowed'
                                                : 'bg-slate-800/30 border-slate-800 hover:border-indigo-500/30'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-400' :
                                            isAlreadyRunning ? 'bg-red-950/40 border-red-500/20' :
                                                'bg-slate-900 border-white/5'
                                            }`}>
                                            {channel.emoji ? (
                                                <span className={`text-2xl ${isAlreadyRunning ? 'opacity-40 grayscale-[0.5]' : ''}`}>{channel.emoji}</span>
                                            ) : (
                                                getPlatformIcon(platformId, isSelected)
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-sm font-black uppercase tracking-wider transition-colors ${isSelected ? 'text-indigo-300' : isAlreadyRunning ? 'text-red-400/60' : 'text-white'}`}>
                                                    {channel.title}
                                                </h4>
                                                {isAlreadyRunning && (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 rounded-full">
                                                        <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                                        <span className="text-[7px] font-black text-white uppercase tracking-widest">RUNNING</span>
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isAlreadyRunning ? 'text-red-900/40' : 'text-slate-500'}`}>
                                                {channel.channel}
                                            </p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' :
                                            isAlreadyRunning ? 'bg-red-500/20 border-red-500/30' :
                                                'border-slate-700'
                                            }`}>
                                            {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                            {isAlreadyRunning && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                                        </div>
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>

                <div className="px-8 py-6 bg-slate-950/50 border-t border-slate-800/50 flex flex-col gap-4">
                    <button
                        onClick={handleGoLive}
                        disabled={selectedChannelIds.size === 0}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl ${selectedChannelIds.size > 0
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20 active:scale-95'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        Go Live {selectedChannelIds.size > 0 && `on ${selectedChannelIds.size} ${selectedChannelIds.size === 1 ? 'Channel' : 'Channels'}`}
                    </button>
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
