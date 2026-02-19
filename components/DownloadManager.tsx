
import React, { useState, useMemo } from 'react';
import { DownloadTask } from '../types';
import { IconFile, IconRefresh, IconClose, IconChevronRight, IconDownload } from './Icons';

interface DownloadManagerProps {
    tasks: DownloadTask[];
    onRemove: (id: string) => void;
    onClearCompleted: () => void;
    onClearAll: () => void;
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
};

const ProgressCircle = ({ progress, status }: { progress: number; status: string }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-12 h-12">
            <svg className="w-full h-full -rotate-90">
                <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    className="stroke-slate-800 fill-none"
                    strokeWidth="3"
                />
                <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
                    className={`fill-none transition-all duration-300 ease-out ${status === 'failed' ? 'stroke-red-500' :
                        status === 'completed' ? 'stroke-green-500' : 'stroke-indigo-500'
                        }`}
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            </svg>
            <span className="absolute text-[9px] font-bold text-slate-300">
                {status === 'failed' ? '!' : `${Math.round(progress)}%`}
            </span>
        </div>
    );
};

export const DownloadManager: React.FC<DownloadManagerProps> = ({
    tasks,
    onRemove,
    onClearCompleted,
    onClearAll
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const activeTasks = tasks.filter(t => t.status === 'downloading' || t.status === 'pending');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    const aggregateStats = useMemo(() => {
        const totalBytes = tasks.reduce((sum, t) => sum + t.total, 0);
        const loadedBytes = tasks.reduce((sum, t) => sum + t.loaded, 0);
        const progress = totalBytes > 0 ? (loadedBytes / totalBytes) * 100 : 0;
        return { totalBytes, loadedBytes, progress };
    }, [tasks]);

    if (tasks.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[200] w-80 md:w-96 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all">
                {/* Header Summary */}
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-5 bg-gradient-to-br from-indigo-950/20 to-slate-900/80 border-b border-slate-700/50 flex flex-col gap-3 cursor-pointer hover:from-indigo-900/30 transition-all relative"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${activeTasks.length > 0 ? 'bg-indigo-500 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}></div>
                            <span className="text-xs font-black text-white uppercase tracking-[0.15em]">
                                {activeTasks.length > 0 ? `Downloading ${activeTasks.length} Files` : 'Downloads Complete'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <IconChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-500 ${isExpanded ? 'rotate-90' : ''}`} />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClearAll();
                                }}
                                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all active:scale-90"
                                title="Dismiss All"
                            >
                                <IconClose className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-end justify-between px-1">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Progress</span>
                            <span className="text-2xl font-black text-indigo-400 leading-none">
                                {Math.round(aggregateStats.progress)}%
                            </span>
                        </div>
                        <div className="text-right flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Total Data</span>
                            <span className="text-xs font-bold text-slate-300">
                                {formatSize(aggregateStats.loadedBytes)} / {formatSize(aggregateStats.totalBytes)}
                            </span>
                        </div>
                    </div>

                    <div className="h-1.5 w-full bg-slate-950/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] transition-all duration-500 ease-out"
                            style={{ width: `${aggregateStats.progress}%` }}
                        />
                    </div>
                </div>

                {/* Task List */}
                {isExpanded && (
                    <div className="max-h-96 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className="bg-slate-950/40 border border-slate-800/50 rounded-2xl p-3 flex items-center gap-3 group hover:border-indigo-500/30 transition-all"
                            >
                                <div className="w-10 h-10 flex items-center justify-center bg-slate-800/50 rounded-xl shrink-0">
                                    <IconDownload className="w-5 h-5 text-indigo-400" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-xs font-bold text-slate-200 truncate pr-2">{task.name}</p>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRemove(task.id); }}
                                                className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors"
                                            >
                                                <IconClose className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                                        <span>{formatSize(task.loaded)} / {formatSize(task.total)}</span>
                                        {task.status === 'downloading' && task.estimatedTimeRemaining !== undefined && (
                                            <span className="text-indigo-400 font-bold">{formatTime(task.estimatedTimeRemaining)} left</span>
                                        )}
                                        {task.status === 'completed' && <span className="text-green-500 font-bold">Success</span>}
                                        {task.status === 'failed' && <span className="text-red-500 font-bold">Error</span>}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {completedTasks.length > 0 && activeTasks.length === 0 && (
                            <button
                                onClick={onClearCompleted}
                                className="w-full py-2.5 mt-2 bg-slate-800/50 hover:bg-slate-800 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-700/30"
                            >
                                Clear Finished Downloads
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
