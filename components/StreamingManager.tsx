
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StreamStatus, getStreamStatus, stopStream, getStreamLogs, stopAllStreams } from '../services/localService';
import { IconClose, IconVideo, IconRefresh, IconSearch } from './Icons';

export const StreamingManager: React.FC = () => {
    const [activeStreams, setActiveStreams] = useState<StreamStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStreamKey, setSelectedStreamKey] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [showLogs, setShowLogs] = useState(false);
    const logEndRef = useRef<HTMLDivElement>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const data = await getStreamStatus();
            setActiveStreams(data.streams);
        } catch (err) {
            console.error("Failed to fetch stream status", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchLogs = useCallback(async (key: string) => {
        try {
            const data = await getStreamLogs(key);
            setLogs(data.logs);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    useEffect(() => {
        let logsInterval: any = null;
        if (showLogs && selectedStreamKey) {
            fetchLogs(selectedStreamKey);
            logsInterval = setInterval(() => fetchLogs(selectedStreamKey), 2000);
        }
        return () => {
            if (logsInterval) clearInterval(logsInterval);
        };
    }, [showLogs, selectedStreamKey, fetchLogs]);

    useEffect(() => {
        if (showLogs && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, showLogs]);

    const handleStop = async (key: string) => {
        if (!confirm("Are you sure you want to stop this stream?")) return;
        try {
            await stopStream(key);
            fetchStatus();
        } catch (err: any) {
            alert(`Error stopping stream: ${err.message}`);
        }
    };

    const handleStopAll = async () => {
        if (!confirm("Are you sure you want to stop ALL active streams?")) return;
        try {
            await stopAllStreams();
            fetchStatus();
        } catch (err: any) {
            alert(`Error stopping all streams: ${err.message}`);
        }
    };

    const handleViewLogs = (key: string) => {
        setSelectedStreamKey(key);
        setShowLogs(true);
    };

    if (isLoading && activeStreams.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching active streams...</p>
            </div>
        );
    }

    if (activeStreams.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-800/60 rounded-[3rem] bg-slate-900/40">
                <div className="w-20 h-20 bg-slate-800/10 rounded-full flex items-center justify-center mb-6 border border-slate-800/40 opacity-40">
                    <IconVideo className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">No Active Streams</h3>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest text-center max-w-xs">
                    Start a stream from the Files tab to see it here.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800/60 p-6 rounded-[2rem] backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                        <IconVideo className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Active Streams</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            Current Instances: <span className="text-indigo-400">{activeStreams.length}</span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleStopAll}
                    className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-600/20 border border-white/10 active:scale-95 flex items-center gap-2"
                >
                    <IconClose className="w-4 h-4" />
                    Stop All Streams
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeStreams.map((stream) => (
                    <div
                        key={stream.streamKey}
                        className="bg-slate-900/40 border border-red-500/30 rounded-[2.5rem] p-6 shadow-[0_20px_50px_rgba(239,68,68,0.1)] relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full shadow-lg shadow-red-600/20">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                <span className="text-[8px] font-black text-white uppercase tracking-widest">LIVE</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-1 truncate pr-16">
                                {stream.channel}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="text-indigo-400">{stream.fileName}</span>
                                {stream.loop && (
                                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">
                                        <IconRefresh className="w-2.5 h-2.5 animate-spin-slow" />
                                        LOOPING
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleViewLogs(stream.streamKey)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
                            >
                                <IconSearch className="w-3.5 h-3.5" />
                                View Logs
                            </button>
                            <button
                                onClick={() => handleStop(stream.streamKey)}
                                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                            >
                                <IconClose className="w-3.5 h-3.5" />
                                Stop
                            </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800/50">
                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                                Started: {new Date(stream.startTime).toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {showLogs && selectedStreamKey && (
                <div className="fixed inset-0 z-[110] flex items-end justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowLogs(false)} />
                    <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                                <div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest">
                                        Logs: {activeStreams.find(s => s.streamKey === selectedStreamKey)?.channel || 'Stream'}
                                    </h3>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Real-time FFmpeg Output</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLogs(false)}
                                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white border border-white/5"
                            >
                                <IconClose className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="h-80 overflow-y-auto p-6 font-mono text-[10px] text-slate-300 custom-scrollbar bg-black/40">
                            {logs.length > 0 ? (
                                logs.map((log, i) => (
                                    <div key={i} className="mb-1.5 opacity-80 border-l-2 border-indigo-500/30 pl-4 py-1 hover:bg-white/5 transition-colors rounded-sm">
                                        <span className="text-slate-600 mr-2">[{i + 1}]</span> {log}
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-600 uppercase tracking-widest font-black opacity-30">
                                    <IconRefresh className="w-8 h-8 animate-spin-slow" />
                                    Initializing stream logs...
                                </div>
                            )}
                            <div ref={logEndRef} />
                        </div>
                        <div className="px-8 py-3 bg-slate-950/50 flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Active Stream Instance Logs</span>
                            <button
                                onClick={() => setLogs([])}
                                className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-full transition-all"
                            >
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                Flush View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
