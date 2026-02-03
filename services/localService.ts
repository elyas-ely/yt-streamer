
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
