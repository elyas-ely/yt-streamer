
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getLocalVideos, LocalVideo, getStreamStatus, startStream, stopStream, getStreamLogs } from '../services/localService';
import { IconGrid, IconSearch, IconStorage, IconRefresh, IconClose } from './Icons';

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-700">
                {filteredVideos.map((video) => {
                    const isCurrentlyStreaming = streamStatus.isStreaming && streamStatus.fileName === video.name;

                    return (
                        <div
                            key={video.name}
                            className={`group bg-slate-900/40 border rounded-[2.5rem] p-5 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] ${isCurrentlyStreaming ? 'border-red-500/50 bg-red-500/5' : 'border-slate-800/60 hover:bg-slate-800/40 hover:border-indigo-500/30'
                                }`}
                        >
                            <div className="aspect-video relative rounded-3xl overflow-hidden bg-slate-950 mb-5 border border-slate-800/40 group-hover:border-indigo-500/30 transition-colors">
                                <video
                                    src={video.path}
                                    className={`w-full h-full object-cover transition-opacity ${isCurrentlyStreaming ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}
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
                                    <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-2 shadow-[0_4px_12px_rgba(220,38,38,0.5)] animate-pulse">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                        LIVE ON YOUTUBE
                                    </div>
                                )}

                                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950/90 to-transparent flex justify-between items-end backdrop-blur-[2px]">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{formatSize(video.size)}</span>
                                    <div className="flex gap-2">
                                        {isCurrentlyStreaming && (
                                            <button
                                                onClick={() => setShowLogs(true)}
                                                className="w-10 h-10 bg-slate-800/80 rounded-2xl flex items-center justify-center text-indigo-400 hover:bg-slate-700 transition-all hover:scale-110 shadow-lg"
                                                title="View Logs"
                                            >
                                                <IconSearch className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsLooping(!isLooping)}
                                            disabled={streamStatus.isStreaming}
                                            title={isLooping ? "Looping Enabled" : "Looping Disabled"}
                                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 ${isLooping
                                                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400'
                                                    : 'border-slate-700 bg-slate-800 text-slate-500 opacity-50'
                                                } ${streamStatus.isStreaming ? 'cursor-not-allowed' : ''}`}
                                        >
                                            <IconRefresh className={`w-5 h-5 ${isLooping ? 'animate-spin-slow' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => handleToggleStream(video.name)}
                                            title={isCurrentlyStreaming ? "Stop Stream" : "Start YouTube Stream"}
                                            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 active:scale-95 ${isCurrentlyStreaming ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800 hover:bg-slate-700'
                                                }`}
                                        >
                                            {isCurrentlyStreaming ? (
                                                <div className="w-3 h-3 bg-white rounded-sm"></div>
                                            ) : (
                                                <IconRefresh className="w-5 h-5" />
                                            )}
                                        </button>
                                        <a
                                            href={video.path}
                                            download={video.name}
                                            title="Download to Device"
                                            className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-transform"
                                        >
                                            <IconGrid className="w-5 h-5 -rotate-90" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div className="px-1">
                                <h4 className={`text-sm font-black uppercase tracking-widest truncate mb-2 ${isCurrentlyStreaming ? 'text-red-400' : 'text-white'}`}>{video.name}</h4>
                                <div className="flex items-center gap-2">
                                    <IconStorage className="w-3 h-3 text-slate-600" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Local Drive</span>
                                </div>
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
        </div>
    );
};
