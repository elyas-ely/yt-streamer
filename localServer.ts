import { Plugin, loadEnv } from 'vite';
import fs from 'fs';
import path from 'path';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StreamState {
    process: ChildProcess;
    fileName: string;
    title: string;
    channel: string;
    emoji: string;
    logs: string[];
    startTime: number;
    loop: boolean;
}

const activeStreams = new Map<string, StreamState>();
const activeDownloads = new Map<string, { loaded: number, total: number }>();
const MAX_LOG_LINES = 10;

const appendLog = (streamKey: string, data: string) => {
    const state = activeStreams.get(streamKey);
    if (!state) return;

    const lines = data.split('\n');
    state.logs.push(...lines.filter(l => l.trim()));
    if (state.logs.length > MAX_LOG_LINES) {
        state.logs = state.logs.slice(state.logs.length - MAX_LOG_LINES);
    }
};

export function localServerPlugin(): Plugin {
    let s3Client: S3Client | null = null;
    let bucketName: string | null = null;

    const handleRequest = (server: any, req: any, res: any, next: any, isPreview = false) => {
        const publicDir = path.resolve(__dirname, isPreview ? 'dist' : 'public');
        const env = loadEnv(server.config.mode, '.', '');
        const ytKey = env['YT_KEY'];

        if (!s3Client) {
            const endpoint = env['R2_ENDPOINT'];
            const accessKeyId = env['R2_ACCESS_KEY_ID'];
            const secretAccessKey = env['R2_SECRET_ACCESS_KEY'];
            bucketName = env['R2_BUCKET_NAME'];

            if (endpoint && accessKeyId && secretAccessKey) {
                console.log(`[LocalServer] Initializing S3 Client for R2 (Bucket: ${bucketName})`);
                s3Client = new S3Client({
                    region: "auto",
                    endpoint,
                    credentials: {
                        accessKeyId,
                        secretAccessKey,
                    },
                    forcePathStyle: true,
                    maxAttempts: 10,
                });
            } else {
                console.warn('[LocalServer] R2 configuration missing in environment variables');
            }
        }

        if (!req.url) return next();

        // API to list streaming platforms and channels from platforms.json
        if (req.url === '/api/local/platforms' && req.method === 'GET') {
            try {
                const configPath = path.resolve(__dirname, 'platforms.json');
                if (fs.existsSync(configPath)) {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(config.platforms || []));
                } else {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify([]));
                }
            } catch (error: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: error.message }));
            }
            return;
        }

        // API to list videos in /public
        if (req.url === '/api/local/videos' && req.method === 'GET') {
            try {
                if (!fs.existsSync(publicDir)) {
                    fs.mkdirSync(publicDir, { recursive: true });
                }

                const files = fs.readdirSync(publicDir);
                const videos = files.filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.mp4', '.webm', '.ogg', '.mov', '.avi'].includes(ext);
                }).map(file => {
                    const stat = fs.statSync(path.join(publicDir, file));
                    return {
                        name: file,
                        size: stat.size,
                        lastModified: stat.mtime,
                        path: `/${file}` // Relative to public
                    };
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(videos));
            } catch (error: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: error.message }));
            }
            return;
        }

        // API to download from R2 to /public
        if (req.url === '/api/local/download' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const { key } = JSON.parse(body);
                    if (!key) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'Key is required' }));
                        return;
                    }

                    if (!s3Client || !bucketName) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: 'S3 Client not initialized. Check R2 credentials.' }));
                        return;
                    }

                    const command = new GetObjectCommand({
                        Bucket: bucketName,
                        Key: key,
                    });

                    const response = await s3Client.send(command);
                    if (!fs.existsSync(publicDir)) {
                        fs.mkdirSync(publicDir, { recursive: true });
                    }

                    const fileName = path.basename(key);
                    console.log(`[LocalServer] Saving video: ${fileName} (Key: ${key})`);
                    const tempFilePath = path.join(publicDir, `temp_${Date.now()}_${fileName}`);
                    const finalFilePath = path.join(publicDir, fileName);
                    const writeStream = fs.createWriteStream(tempFilePath);

                    if (response.Body) {
                        const total = parseInt(response.ContentLength?.toString() || '0');
                        activeDownloads.set(key, { loaded: 0, total });

                        // @ts-ignore
                        const body = response.Body as any;
                        let loaded = 0;

                        body.on('data', (chunk: any) => {
                            loaded += chunk.length;
                            activeDownloads.set(key, { loaded, total });
                        });

                        // @ts-ignore
                        body.pipe(writeStream);

                        writeStream.on('finish', async () => {
                            writeStream.close();
                            activeDownloads.delete(key);
                            const ffmpegArgs = ['-y', '-i', tempFilePath, '-c', 'copy', '-map_metadata', '0', '-movflags', '+faststart', finalFilePath];
                            const optimizeProcess = spawn('ffmpeg', ffmpegArgs);

                            let optimizeError = '';
                            optimizeProcess.stderr?.on('data', (data) => {
                                optimizeError += data.toString();
                            });

                            optimizeProcess.on('exit', (code) => {
                                try { fs.unlinkSync(tempFilePath); } catch (e) { }

                                if (code === 0) {
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ message: 'Download and optimization complete', fileName }));
                                } else {
                                    console.error(`Optimization failed for ${fileName} with code ${code}: ${optimizeError}`);
                                    fs.renameSync(tempFilePath, finalFilePath);
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ message: 'Download complete (optimization failed, but file is saved)', fileName }));
                                }
                            });
                        });

                        writeStream.on('error', (err) => {
                            console.error(`Write stream error for ${fileName}:`, err);
                            try { fs.unlinkSync(tempFilePath); } catch (e) { }
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: `File write error: ${err.message}` }));
                        });
                    } else {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: 'No response body' }));
                    }

                } catch (error: any) {
                    console.error(`S3 download error:`, error);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }

        // API to start streaming
        if (req.url === '/api/local/stream/start' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const { fileName, streamKey, title, channel, emoji, loop, rtmpUrl: platformRtmpUrl } = JSON.parse(body);
                    if (!fileName || !streamKey || !platformRtmpUrl) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'fileName, streamKey, and rtmpUrl are required' }));
                        return;
                    }

                    if (activeStreams.has(streamKey)) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'This channel is already streaming' }));
                        return;
                    }

                    const videoPath = path.resolve(publicDir, fileName);
                    if (!fs.existsSync(videoPath)) {
                        res.statusCode = 404;
                        res.end(JSON.stringify({ error: 'Video file not found' }));
                        return;
                    }

                    const rtmpUrl = `${platformRtmpUrl}${streamKey}`;

                    const ffmpegArgs = [];
                    if (loop) {
                        ffmpegArgs.push('-stream_loop', '-1');
                    }
                    // -re (read input at native frame rate), -i (input), -c copy (no re-encoding), -f flv (output format)
                    ffmpegArgs.push('-re', '-i', videoPath, '-c', 'copy', '-f', 'flv', rtmpUrl);

                    const process = spawn('ffmpeg', ffmpegArgs);

                    const streamState: StreamState = {
                        process,
                        fileName,
                        title: title || 'Live Stream',
                        channel: channel || 'Unknown Channel',
                        emoji: emoji || '🔴',
                        logs: [`Starting stream for ${fileName} on ${channel}`],
                        startTime: Date.now(),
                        loop: !!loop
                    };

                    activeStreams.set(streamKey, streamState);

                    process.on('exit', (code) => {
                        const msg = `FFmpeg exited with code ${code}`;
                        appendLog(streamKey, `--- STREAM TERMINATED ---`);
                        appendLog(streamKey, msg);
                        activeStreams.delete(streamKey);
                    });

                    process.stderr?.on('data', (data) => {
                        appendLog(streamKey, data.toString());
                    });

                    process.stdout?.on('data', (data) => {
                        appendLog(streamKey, data.toString());
                    });

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ message: 'Stream started', fileName, channel }));

                } catch (error: any) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }

        // API to stop all streaming
        if (req.url === '/api/local/stream/stop-all' && req.method === 'POST') {
            try {
                for (const [key, state] of activeStreams.entries()) {
                    state.process.kill();
                }
                activeStreams.clear();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'All streams stopped' }));
            } catch (error: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: error.message }));
            }
            return;
        }

        // API to stop streaming
        if (req.url === '/api/local/stream/stop' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const { streamKey } = JSON.parse(body);
                    if (!streamKey) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'streamKey is required' }));
                        return;
                    }

                    const state = activeStreams.get(streamKey);
                    if (state) {
                        state.process.kill();
                        activeStreams.delete(streamKey);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ message: 'Stream stopped' }));
                    } else {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'No stream found for this key' }));
                    }
                } catch (error: any) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }

        // API to get stream status
        if (req.url === '/api/local/stream/status' && req.method === 'GET') {
            const streams = Array.from(activeStreams.entries()).map(([key, state]) => ({
                streamKey: key,
                fileName: state.fileName,
                title: state.title,
                channel: state.channel,
                emoji: state.emoji,
                startTime: state.startTime,
                loop: state.loop,
                isStreaming: true
            }));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ streams }));
            return;
        }

        // API to get download progress
        if (req.url.startsWith('/api/local/download/status') && req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const key = url.searchParams.get('key');

            if (!key) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'key is required' }));
                return;
            }

            const progress = activeDownloads.get(key) || { loaded: 0, total: 0 };
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(progress));
            return;
        }

        // API to get stream logs
        if (req.url.startsWith('/api/local/stream/logs') && req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const streamKey = url.searchParams.get('streamKey');

            if (!streamKey) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'streamKey is required' }));
                return;
            }

            const state = activeStreams.get(streamKey);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                logs: state ? state.logs : []
            }));
            return;
        }

        // API to delete a local video
        if (req.url === '/api/local/delete' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const { fileName } = JSON.parse(body);
                    if (!fileName) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'fileName is required' }));
                        return;
                    }

                    const videoPath = path.resolve(publicDir, fileName);
                    if (!fs.existsSync(videoPath)) {
                        res.statusCode = 404;
                        res.end(JSON.stringify({ error: 'Video file not found' }));
                        return;
                    }

                    // Check if the video is currently used in any stream
                    const isStreaming = Array.from(activeStreams.values()).some(s => s.fileName === fileName);
                    if (isStreaming) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'Cannot delete a video that is currently streaming' }));
                        return;
                    }

                    fs.unlinkSync(videoPath);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ message: 'Video deleted successfully', fileName }));

                } catch (error: any) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }

        next();
    };

    return {
        name: 'local-server-plugin',
        configureServer(server) {
            server.middlewares.use((req, res, next) => handleRequest(server, req, res, next, false));
        },
        configurePreviewServer(server) {
            server.middlewares.use((req, res, next) => handleRequest(server, req, res, next, true));
        }
    };
}
