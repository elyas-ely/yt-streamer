
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getLocalVideos, LocalVideo, getStreamStatus, startStream, stopStream, getStreamLogs, deleteLocalVideo } from '../services/localService';
import { IconGrid, IconSearch, IconStorage, IconRefresh, IconClose, IconVideo } from './Icons';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface LocalFilesProps {
    searchQuery: string;
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const LocalFiles: React.FC<LocalFilesProps> = ({ searchQuery }) => {
    const [videos, setVideos] = useState<LocalVideo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [streamStatus, setStreamStatus] = useState<{ isStreaming: boolean; fileName: string | null }>({ isStreaming: false, fileName: null });
    const [isLooping, setIsLooping] = useState(true);
    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

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
            setStreamStatus(status);
        } catch (err) {
            console.error("Failed to fetch stream status", err);
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            const data = await getStreamLogs();
            setLogs(data.logs);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        }
    }, []);

    useEffect(() => {
        fetchVideos();
        fetchStreamStatus();

        const statusInterval = setInterval(() => {
            fetchStreamStatus();
        }, 5000);

        return () => clearInterval(statusInterval);
    }, [fetchVideos, fetchStreamStatus]);

    useEffect(() => {
        let logsInterval: any = null;
        if (showLogs) {
            fetchLogs();
            logsInterval = setInterval(fetchLogs, 2000);
        }
        return () => {
            if (logsInterval) clearInterval(logsInterval);
        };
    }, [showLogs, fetchLogs]);

    useEffect(() => {
        if (showLogs && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, showLogs]);

    const handleToggleStream = async (fileName: string) => {
        try {
            if (streamStatus.isStreaming && streamStatus.fileName === fileName) {
                await stopStream();
            } else if (!streamStatus.isStreaming) {
                await startStream(fileName, isLooping);
            } else {
                alert("A stream is already running. Please stop it before starting a new one.");
                return;
            }
            fetchStreamStatus();
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

    if (isLoading) {
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

    if (filteredVideos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-800/60 rounded-[3rem] bg-slate-900/40">
                <div className="w-20 h-20 bg-slate-800/10 rounded-full flex items-center justify-center mb-6 border border-slate-800/40 opacity-40">
                    <IconSearch className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">No Local Videos Found</h3>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest text-center max-w-xs">
                    {searchQuery ? `No videos matching "${searchQuery}" found in your local /public folder.` : "Download videos from R2 to see them here."}
                </p>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredVideos.map((video) => {
                    const isCurrentlyStreaming = streamStatus.isStreaming && streamStatus.fileName === video.name;
                    const extension = video.name.split('.').pop()?.toUpperCase();
                    const formattedDate = new Date(video.lastModified).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });

                    return (
                        <div
                            key={video.name}
                            className={`group relative bg-slate-900/40 border rounded-[2.5rem] p-5 transition-colors duration-300 ${isCurrentlyStreaming
                                ? 'border-red-500/40 bg-red-500/[0.03] shadow-[0_20px_50px_rgba(239,68,68,0.15)]'
                                : 'border-slate-800/60 hover:bg-slate-800/60 hover:border-indigo-500/40 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)]'
                                }`}
                        >
                            <div className="aspect-video relative rounded-3xl overflow-hidden bg-slate-950 mb-5 border border-white/5 group-hover:border-indigo-500/30 transition-colors duration-300 shadow-inner">
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
                                    <div className="absolute top-4 left-4 bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full flex items-center gap-2 shadow-[0_8px_20px_rgba(220,38,38,0.4)] backdrop-blur-md z-10">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]"></div>
                                        BROADCASTING
                                    </div>
                                )}

                                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-black text-white/80 uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {extension}
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex justify-between items-end backdrop-blur-[1px]">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-indigo-400/90 uppercase tracking-[0.1em]">{formatSize(video.size)}</span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{formattedDate}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {isCurrentlyStreaming && (
                                            <button
                                                onClick={() => setShowLogs(true)}
                                                className="w-9 h-9 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center text-white transition-colors duration-300 border border-white/10 shadow-lg"
                                                title="View Logs"
                                            >
                                                <IconSearch className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsLooping(!isLooping)}
                                            disabled={streamStatus.isStreaming}
                                            title={isLooping ? "Looping Enabled" : "Looping Disabled"}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 border ${isLooping
                                                ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-400'
                                                : 'border-white/5 bg-white/5 text-slate-500 opacity-60'
                                                } ${streamStatus.isStreaming ? 'cursor-not-allowed' : ''}`}
                                        >
                                            <IconRefresh className={`w-4 h-4 ${isLooping ? 'animate-spin-slow' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => handleToggleStream(video.name)}
                                            title={isCurrentlyStreaming ? "Stop Stream" : "Start YouTube Stream"}
                                            className={`h-9 px-4 rounded-xl flex items-center gap-2 text-white shadow-xl transition-all active:scale-95 border border-white/10 ${isCurrentlyStreaming
                                                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                                                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                                                }`}
                                        >
                                            {isCurrentlyStreaming ? (
                                                <>
                                                    <div className="w-2.5 h-2.5 bg-white rounded-[2px] shadow-sm"></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">STOP</span>
                                                </>
                                            ) : (
                                                <>
                                                    <IconVideo className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">LIVE</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="px-1 flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-[13px] font-black uppercase tracking-wider truncate mb-2 transition-colors duration-300 ${isCurrentlyStreaming ? 'text-red-400' : 'text-white group-hover:text-indigo-300'}`}>
                                        {video.name.split('.')[0]}
                                    </h4>
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isCurrentlyStreaming ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-slate-700'}`}></div>
                                        <span className="text-[9px] font-bold uppercase tracking-widest">{isCurrentlyStreaming ? 'Live Streaming' : 'Ready to Stream'}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setVideoToDelete(video.name)}
                                    disabled={isCurrentlyStreaming}
                                    title="Delete Local Video"
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300 ${isCurrentlyStreaming
                                        ? 'opacity-0 pointer-events-none'
                                        : 'bg-red-500/10 text-red-500/60 hover:bg-red-500 hover:text-white border border-red-500/20'
                                        }`}
                                >
                                    <IconClose className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showLogs && (
                <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none p-6">
                    <div className="w-full max-w-4xl bg-slate-900/95 border border-slate-700 rounded-3xl shadow-2xl backdrop-blur-xl pointer-events-auto overflow-hidden animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">Stream Logs: {streamStatus.fileName}</h3>
                            </div>
                            <button
                                onClick={() => setShowLogs(false)}
                                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                            >
                                <IconClose className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="h-64 overflow-y-auto p-4 font-mono text-[10px] text-slate-300 custom-scrollbar bg-black/50">
                            {logs.length > 0 ? (
                                logs.map((log, i) => (
                                    <div key={i} className="mb-1 opacity-80 border-l border-indigo-500/30 pl-3 py-0.5 hover:bg-white/5 transition-colors">
                                        {log}
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500 uppercase tracking-widest font-bold">
                                    Initializing logs...
                                </div>
                            )}
                            <div ref={logEndRef} />
                        </div>
                        <div className="px-6 py-2 bg-slate-800/30 flex justify-between items-center">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Circular Buffer: {logs.length} / 1000 lines</span>
                            <button
                                onClick={() => setLogs([])}
                                className="text-[8px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                            >
                                Clear View
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
