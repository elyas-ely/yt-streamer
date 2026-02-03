
import React, { useEffect, useState } from 'react';
import { getLocalVideos, LocalVideo } from '../services/localService';
import { IconGrid, IconSearch, IconStorage } from './Icons';

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

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                setIsLoading(true);
                const data = await getLocalVideos();
                setVideos(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVideos();
    }, []);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-700">
            {filteredVideos.map((video) => (
                <div
                    key={video.name}
                    className="group bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-5 hover:bg-slate-800/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                >
                    <div className="aspect-video relative rounded-3xl overflow-hidden bg-slate-950 mb-5 border border-slate-800/40 group-hover:border-indigo-500/30 transition-colors">
                        <video
                            src={video.path}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            controls={false}
                            muted
                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                            onMouseLeave={(e) => {
                                const v = e.target as HTMLVideoElement;
                                v.pause();
                                v.currentTime = 0;
                            }}
                        />
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950/90 to-transparent flex justify-between items-end backdrop-blur-[2px]">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{formatSize(video.size)}</span>
                            <a
                                href={video.path}
                                download={video.name}
                                className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-transform"
                            >
                                <IconGrid className="w-5 h-5 -rotate-90" />
                            </a>
                        </div>
                    </div>
                    <div className="px-1">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest truncate mb-2">{video.name}</h4>
                        <div className="flex items-center gap-2">
                            <IconStorage className="w-3 h-3 text-slate-600" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Local Drive</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
