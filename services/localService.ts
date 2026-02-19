
export interface LocalVideo {
    name: string;
    size: number;
    lastModified: string;
    path: string;
}

export interface YouTubeChannel {
    id: number;
    title: string;
    channel: string;
    streamKey: string;
    emoji?: string;
}

export interface ActiveStream {
    streamKey: string;
    fileName: string;
    title: string;
    channel: string;
    emoji?: string;
    startTime: number;
    loop: boolean;
    isStreaming: boolean;
}

export const getLocalVideos = async (): Promise<LocalVideo[]> => {
    const response = await fetch('/api/local/videos');
    if (!response.ok) {
        throw new Error('Failed to fetch local videos');
    }
    return response.json();
};

export const getYouTubeChannels = async (): Promise<YouTubeChannel[]> => {
    const response = await fetch('/api/local/youtube-channels');
    if (!response.ok) {
        throw new Error('Failed to fetch YouTube channels');
    }
    return response.json();
};

export const saveToLocal = async (key: string): Promise<{ message: string; fileName: string }> => {
    const response = await fetch('/api/local/download', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
    });

    if (!response.ok) {
        let errorMsg = 'Failed to save to local';
        try {
            const error = await response.json();
            errorMsg = error.error || errorMsg;
        } catch (e) {
            errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
    }

    return response.json();
};

export const startStream = async (params: {
    fileName: string;
    streamKey: string;
    title: string;
    channel: string;
    emoji?: string;
    loop: boolean
}): Promise<{ message: string; fileName: string }> => {
    const response = await fetch('/api/local/stream/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start stream');
    }

    return response.json();
};

export const stopStream = async (streamKey: string): Promise<{ message: string }> => {
    const response = await fetch('/api/local/stream/stop', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ streamKey }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop stream');
    }

    return response.json();
};

export const getStreamStatus = async (): Promise<{ streams: ActiveStream[] }> => {
    const response = await fetch('/api/local/stream/status');
    if (!response.ok) {
        throw new Error('Failed to fetch stream status');
    }
    return response.json();
};

export const getStreamLogs = async (streamKey: string): Promise<{ logs: string[] }> => {
    const response = await fetch(`/api/local/stream/logs?streamKey=${encodeURIComponent(streamKey)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch stream logs');
    }
    return response.json();
};

export const deleteLocalVideo = async (fileName: string): Promise<{ message: string; fileName: string }> => {
    const response = await fetch('/api/local/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName }),
    });

    return response.json();
};

export const stopAllStreams = async (): Promise<{ message: string }> => {
    const response = await fetch('/api/local/stream/stop-all', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop all streams');
    }

    return response.json();
};
export const getDownloadProgress = async (key: string): Promise<{ loaded: number; total: number }> => {
    const response = await fetch(`/api/local/download/status?key=${encodeURIComponent(key)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch download progress');
    }
    return response.json();
};
