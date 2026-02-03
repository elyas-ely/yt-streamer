
export interface LocalVideo {
    name: string;
    size: number;
    lastModified: string;
    path: string;
}

export const getLocalVideos = async (): Promise<LocalVideo[]> => {
    const response = await fetch('/api/local/videos');
    if (!response.ok) {
        throw new Error('Failed to fetch local videos');
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
        const error = await response.json();
        throw new Error(error.error || 'Failed to save to local');
    }

    return response.json();
};

export const startStream = async (fileName: string, loop: boolean = false): Promise<{ message: string; fileName: string }> => {
    const response = await fetch('/api/local/stream/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName, loop }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start stream');
    }

    return response.json();
};

export const stopStream = async (): Promise<{ message: string }> => {
    const response = await fetch('/api/local/stream/stop', {
        method: 'POST',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop stream');
    }

    return response.json();
};

export const getStreamStatus = async (): Promise<{ isStreaming: boolean; fileName: string | null }> => {
    const response = await fetch('/api/local/stream/status');
    if (!response.ok) {
        throw new Error('Failed to fetch stream status');
    }
    return response.json();
};

export const getStreamLogs = async (): Promise<{ logs: string[] }> => {
    const response = await fetch('/api/local/stream/logs');
    if (!response.ok) {
        throw new Error('Failed to fetch stream logs');
    }
    return response.json();
};
