
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    getLocalVideos,
    LocalVideo,
    getStreamStatus,
    startStream,
    getYouTubeChannels,
    YouTubeChannel,
    ActiveStream,
    deleteLocalVideo
} from '../services/localService';
import { IconGrid, IconSearch, IconStorage, IconRefresh, IconClose, IconVideo, IconTrash } from './Icons';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ChannelSelectorModal } from './ChannelSelectorModal';
import { StreamingManager } from './StreamingManager';
import { VideoMenu } from './VideoMenu';

import { ViewMode } from '../types';

interface LocalFilesProps {
    searchQuery: string;
    viewMode: ViewMode;
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

type ActiveTab = 'files' | 'streaming';

export const LocalFiles: React.FC<LocalFilesProps> = ({ searchQuery, viewMode }) => {
    const [videos, setVideos] = useState<LocalVideo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStreams, setActiveStreams] = useState<ActiveStream[]>([]);
    const [channels, setChannels] = useState<YouTubeChannel[]>([]);
    const [isLooping, setIsLooping] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('files');

    // Channel selection state
    const [showChannelSelector, setShowChannelSelector] = useState(false);
    const [videoToStream, setVideoToStream] = useState<string | null>(null);

    const [isDeleting, setIsDeleting] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

    const fetchVideos = useCallback(async () => {
        try {
            const data = await getLocalVideos();
            setVideos(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchStreamStatus = useCallback(async () => {
        try {
            const status = await getStreamStatus();
            setActiveStreams(status.streams);
        } catch (err) {
            console.error("Failed to fetch stream status", err);
        }
    }, []);

    const fetchChannels = useCallback(async () => {
        try {
            const data = await getYouTubeChannels();
            setChannels(data);
        } catch (err) {
            console.error("Failed to fetch channels", err);
        }
    }, []);

    useEffect(() => {
        fetchVideos();
        fetchStreamStatus();
        fetchChannels();

        const statusInterval = setInterval(() => {
            fetchStreamStatus();
        }, 5000);

        return () => clearInterval(statusInterval);
    }, [fetchVideos, fetchStreamStatus, fetchChannels]);

    const handleStartStreamClick = (fileName: string) => {
        setVideoToStream(fileName);
        setShowChannelSelector(true);
    };

    const handleChannelSelect = async (selectedChannels: YouTubeChannel[]) => {
        if (!videoToStream) return;

        try {
            const promises = selectedChannels.map(channel =>
                startStream({
                    fileName: videoToStream,
                    streamKey: channel.streamKey,
                    title: channel.title,
                    channel: channel.channel,
                    emoji: channel.emoji || '🔴',
                    loop: isLooping
                })
            );

            await Promise.all(promises);

            setShowChannelSelector(false);
            setVideoToStream(null);
            fetchStreamStatus();
            setActiveTab('streaming');
        } catch (err: any) {
            alert(`Streaming Error: ${err.message}`);
        }
    };

    const handleDelete = async () => {
        if (!videoToDelete) return;

        setIsDeleting(true);
        try {
            await deleteLocalVideo(videoToDelete);
            await fetchVideos(); // Refresh list
            setVideoToDelete(null);
        } catch (err: any) {
            alert(`Delete Error: ${err.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredVideos = videos.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (isLoading && activeTab === 'files') {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading local videos...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
                <p className="text-red-400 font-bold uppercase tracking-widest text-xs">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 bg-slate-900/60 p-1.5 rounded-3xl border border-slate-800/40 w-fit">
                <button
                    onClick={() => setActiveTab('files')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'files'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <IconStorage className="w-4 h-4" />
                    Local Files
                </button>
                <button
                    onClick={() => setActiveTab('streaming')}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'streaming'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <IconVideo className="w-4 h-4" />
                    Streaming
                    {activeStreams.length > 0 && (
                        <span className="flex h-2 w-2 rounded-full bg-white absolute top-2 right-2 animate-pulse"></span>
                    )}
                </button>
            </div>

            {activeTab === 'streaming' ? (
                <StreamingManager />
            ) : filteredVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-800/60 rounded-[3rem] bg-slate-900/40">
                    <div className="w-20 h-20 bg-slate-800/10 rounded-full flex items-center justify-center mb-6 border border-slate-800/40 opacity-40">
                        <IconSearch className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">No Local Videos Found</h3>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest text-center max-w-xs">
                        {searchQuery ? `No videos matching "${searchQuery}" found in your local /public folder.` : "Download videos from R2 to see them here."}
                    </p>
                </div>
            ) : viewMode === 'list' ? (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center px-4 py-2 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-800/40 mb-2">
                        <div className="flex-1">Video Details</div>
                        <div className="hidden sm:block sm:w-32 text-center">Size</div>
                        <div className="hidden md:block md:w-40 text-right">Modified</div>
                        <div className="w-24 shrink-0 text-right">Actions</div>
                    </div>
                    {filteredVideos.map((video) => {
                        const streamingInfo = activeStreams.filter(s => s.fileName === video.name);
                        const isCurrentlyStreaming = streamingInfo.length > 0;
                        const formattedDate = new Date(video.lastModified).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });

                        return (
                            <div
                                key={video.name}
                                className={`group flex items-center bg-slate-900/40 border rounded-2xl p-3 transition-all duration-300 ${isCurrentlyStreaming
                                    ? 'border-red-500/40 bg-red-500/[0.03] shadow-[0_10px_30px_rgba(239,68,68,0.1)]'
                                    : 'border-slate-800/60 hover:bg-slate-800/60 hover:border-indigo-500/40'
                                    }`}
                            >
                                <div className="flex-1 flex items-center gap-4 min-w-0">
                                    <div className="w-16 aspect-video bg-slate-950 rounded-lg overflow-hidden border border-white/5 relative shrink-0">
                                        <video src={video.path} className="w-full h-full object-cover opacity-60" muted />
                                        {isCurrentlyStreaming && (
                                            <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <h4 className={`text-sm font-black uppercase tracking-wider truncate transition-colors ${isCurrentlyStreaming ? 'text-red-400' : 'text-white'}`}>
                                            {video.name.replace(/\.[^/.]+$/, "")}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                <div className={`w-1 h-1 rounded-full ${isCurrentlyStreaming ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-slate-700'}`}></div>
                                                {isCurrentlyStreaming ? 'Live' : 'Ready'}
                                            </span>
                                            {isCurrentlyStreaming && streamingInfo.map(s => (
                                                <span key={s.streamKey} className="text-[8px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-red-500/20 flex items-center gap-1">
                                                    {s.emoji && <span>{s.emoji}</span>}
                                                    {s.channel}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden sm:block sm:w-32 text-center text-[10px] font-black uppercase tracking-widest text-indigo-400/80">
                                    {formatSize(video.size)}
                                </div>

                                <div className="hidden md:block md:w-40 text-right text-[10px] font-bold text-slate-600 uppercase">
                                    {formattedDate}
                                </div>

                                <div className="w-24 shrink-0 flex justify-end gap-2 pr-1">
                                    <VideoMenu
                                        onStartStream={() => handleStartStreamClick(video.name)}
                                        onDelete={() => setVideoToDelete(video.name)}
                                        isStreaming={isCurrentlyStreaming}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className={viewMode === 'grid-small'
                    ? "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-2 md:gap-3"
                    : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-6"
                }>
                    {filteredVideos.map((video) => {
                        const streamingInfo = activeStreams.filter(s => s.fileName === video.name);
                        const isCurrentlyStreaming = streamingInfo.length > 0;
                        const extension = video.name.split('.').pop()?.toUpperCase();
                        const formattedDate = new Date(video.lastModified).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });

                        return (
                            <div
                                key={video.name}
                                className={`group relative bg-slate-900/40 border rounded-xl md:rounded-[2.5rem] p-2 md:p-5 transition-colors duration-300 ${isCurrentlyStreaming
                                    ? 'border-red-500/40 bg-red-500/[0.03] shadow-[0_20px_50px_rgba(239,68,68,0.15)]'
                                    : 'border-slate-800/60 hover:bg-slate-800/60 hover:border-indigo-500/40 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)]'
                                    }`}
                            >
                                <div className="aspect-video relative rounded-lg md:rounded-3xl overflow-hidden bg-slate-950 mb-1.5 md:mb-5 border border-white/5 group-hover:border-indigo-500/30 transition-colors duration-300 shadow-inner">
                                    <video
                                        src={video.path}
                                        className={`w-full h-full object-cover ${isCurrentlyStreaming ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                                        controls={false}
                                        muted
                                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                        onMouseLeave={(e) => {
                                            const v = e.target as HTMLVideoElement;
                                            v.pause();
                                            v.currentTime = 0;
                                        }}
                                    />

                                    {isCurrentlyStreaming && (
                                        <div className="absolute top-1 left-1 md:top-4 md:left-4 bg-red-600 text-white text-[6px] md:text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 md:px-4 md:py-2 rounded-full flex items-center gap-1 md:gap-2 shadow-[0_8px_20px_rgba(220,38,38,0.4)] backdrop-blur-md z-10">
                                            <div className="w-0.5 md:w-1.5 h-0.5 md:h-1.5 bg-white rounded-full shadow-[0_0_8px_white]"></div>
                                            <span className="hidden xs:inline">BROADCASTING</span>
                                            <span className="xs:hidden">LIVE</span>
                                        </div>
                                    )}

                                    <div className="absolute top-1 right-1 md:top-4 md:right-4 bg-black/40 backdrop-blur-md border border-white/10 text-[6px] md:text-[9px] font-black text-white/80 uppercase tracking-widest px-1 py-0.5 md:px-3 md:py-1.5 rounded-md md:rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        {extension}
                                    </div>

                                    <div className="absolute inset-x-0 bottom-0 p-1.5 md:p-5 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex justify-between items-end backdrop-blur-[1px]">
                                        <div className="flex flex-col gap-0 md:gap-1">
                                            <span className="text-[7px] md:text-[10px] font-black text-indigo-400/90 uppercase tracking-[0.1em]">{formatSize(video.size)}</span>
                                            <span className="text-[5px] md:text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{formattedDate}</span>
                                        </div>
                                        <div className="flex gap-1 md:gap-2">
                                            <VideoMenu
                                                onStartStream={() => handleStartStreamClick(video.name)}
                                                onDelete={() => setVideoToDelete(video.name)}
                                                isStreaming={isCurrentlyStreaming}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="px-0.5 md:px-1 flex justify-between items-start gap-1 md:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-px md:text-[13px] font-black uppercase tracking-wider truncate mb-0 md:mb-2 transition-colors duration-300 ${isCurrentlyStreaming ? 'text-red-400' : 'text-white group-hover:text-indigo-300'}`}>
                                            {video.name.replace(/\.[^/.]+$/, "")}
                                        </h4>
                                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                            <div className="flex items-center gap-1 md:gap-2 text-slate-500">
                                                <div className={`w-0.5 md:w-1.5 h-0.5 md:h-1.5 rounded-full ${isCurrentlyStreaming ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-slate-700'}`}></div>
                                                <span className="text-[5px] md:text-[9px] font-bold uppercase tracking-widest">
                                                    {isCurrentlyStreaming ? 'Live' : 'Ready'}
                                                </span>
                                            </div>
                                            {isCurrentlyStreaming && streamingInfo.map(s => (
                                                <span key={s.streamKey} className="text-[6px] md:text-[8px] bg-red-600/20 text-red-400 px-1.5 md:px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-red-500/20 flex items-center gap-1">
                                                    {s.emoji && <span>{s.emoji}</span>}
                                                    {s.channel}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ChannelSelectorModal
                isOpen={showChannelSelector}
                onClose={() => {
                    setShowChannelSelector(false);
                    setVideoToStream(null);
                }}
                onSelect={handleChannelSelect}
                channels={channels}
                activeStreams={activeStreams}
                fileName={videoToStream || ''}
            />

            <DeleteConfirmModal
                isOpen={!!videoToDelete}
                onClose={() => setVideoToDelete(null)}
                onConfirm={handleDelete}
                itemsCount={1}
                isFolder={false}
                isLoading={isDeleting}
            />
        </div>
    );
};
