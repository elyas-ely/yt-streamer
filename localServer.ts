import { Plugin, loadEnv } from 'vite';
import fs from 'fs';
import path from 'path';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let currentStreamProcess: ChildProcess | null = null;
let currentStreamingVideo: string | null = null;
const MAX_LOG_LINES = 1000;
let streamLogs: string[] = [];

const appendLog = (data: string) => {
    const lines = data.split('\n');
    streamLogs.push(...lines.filter(l => l.trim()));
    if (streamLogs.length > MAX_LOG_LINES) {
        streamLogs = streamLogs.slice(streamLogs.length - MAX_LOG_LINES);
    }
};

export function localServerPlugin(): Plugin {
    const handleRequest = (server: any, req: any, res: any, next: any, isPreview = false) => {
        const publicDir = path.resolve(__dirname, isPreview ? 'dist' : 'public');
        const env = loadEnv(server.config.mode, '.', '');
        const ytKey = env['YT_KEY'];

        if (!req.url) return next();

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

                    const s3Client = new S3Client({
                        region: "auto",
                        endpoint: server.config.define?.['process.env.R2_ENDPOINT']?.replace(/\"/g, '') || process.env.R2_ENDPOINT,
                        credentials: {
                            accessKeyId: server.config.define?.['process.env.R2_ACCESS_KEY_ID']?.replace(/\"/g, '') || process.env.R2_ACCESS_KEY_ID!,
                            secretAccessKey: server.config.define?.['process.env.R2_SECRET_ACCESS_KEY']?.replace(/\"/g, '') || process.env.R2_SECRET_ACCESS_KEY!,
                        },
                        forcePathStyle: true,
                    });

                    const bucketName = server.config.define?.['process.env.R2_BUCKET_NAME']?.replace(/\"/g, '') || process.env.R2_BUCKET_NAME;

                    const command = new GetObjectCommand({
                        Bucket: bucketName,
                        Key: key,
                    });

                    const response = await s3Client.send(command);
                    if (!fs.existsSync(publicDir)) {
                        fs.mkdirSync(publicDir, { recursive: true });
                    }

                    const fileName = path.basename(key);
                    const tempFilePath = path.join(publicDir, `temp_${Date.now()}_${fileName}`);
                    const finalFilePath = path.join(publicDir, fileName);
                    const writeStream = fs.createWriteStream(tempFilePath);

                    if (response.Body) {
                        // console.log(`Starting download of ${key} to ${tempFilePath}`);
                        // @ts-ignore
                        response.Body.pipe(writeStream);

                        writeStream.on('finish', async () => {
                            writeStream.close();
                            // console.log(`Download finished for ${fileName}. Optimizing video...`);

                            // Optimization: Move moov atom to the front for better web playback (faststart)
                            // This is crucial for 1GB+ videos to play without downloading the whole file first
                            const ffmpegArgs = ['-y', '-i', tempFilePath, '-c', 'copy', '-map_metadata', '0', '-movflags', '+faststart', finalFilePath];
                            const optimizeProcess = spawn('ffmpeg', ffmpegArgs);

                            let optimizeError = '';
                            optimizeProcess.stderr?.on('data', (data) => {
                                optimizeError += data.toString();
                            });

                            optimizeProcess.on('exit', (code) => {
                                // Clean up temp file
                                try { fs.unlinkSync(tempFilePath); } catch (e) { }

                                if (code === 0) {
                                    // console.log(`Optimization complete for ${fileName}`);
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ message: 'Download and optimization complete', fileName }));
                                } else {
                                    console.error(`Optimization failed for ${fileName} with code ${code}: ${optimizeError}`);
                                    // If optimization fails, just move the original file to final location
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
                    const { fileName, loop } = JSON.parse(body);
                    if (!fileName) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'fileName is required' }));
                        return;
                    }

                    if (currentStreamProcess) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'A stream is already running' }));
                        return;
                    }

                    if (!ytKey) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: 'YouTube Stream Key (YT_KEY) not found in .env.local' }));
                        return;
                    }

                    const videoPath = path.resolve(publicDir, fileName);
                    if (!fs.existsSync(videoPath)) {
                        res.statusCode = 404;
                        res.end(JSON.stringify({ error: 'Video file not found' }));
                        return;
                    }

                    const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${ytKey}`;

                    // ffmpeg [-stream_loop -1] -re -i video.mp4 -c copy -f flv rtmp://...
                    const ffmpegArgs = [];
                    if (loop) {
                        ffmpegArgs.push('-stream_loop', '-1');
                    }
                    ffmpegArgs.push('-re', '-i', videoPath, '-c', 'copy', '-f', 'flv', rtmpUrl);

                    currentStreamProcess = spawn('ffmpeg', ffmpegArgs);

                    streamLogs = []; // Clear logs for new stream
                    appendLog(`Starting stream for ${fileName} with loop=${loop}`);

                    currentStreamingVideo = fileName;

                    currentStreamProcess.on('exit', (code) => {
                        const msg = `FFmpeg exited with code ${code}`;
                        // console.log(msg);
                        appendLog(`--- STREAM TERMINATED ---`);
                        appendLog(msg);
                        if (code === 183) {
                            appendLog("Note: Error 183 often means the file is corrupt, incomplete, or the codec is incompatible with RTMP.");
                        }
                        currentStreamProcess = null;
                        currentStreamingVideo = null;
                    });

                    currentStreamProcess.stderr?.on('data', (data) => {
                        appendLog(data.toString());
                    });

                    currentStreamProcess.stdout?.on('data', (data) => {
                        appendLog(data.toString());
                    });

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ message: 'Stream started', fileName }));

                } catch (error: any) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }

        // API to stop streaming
        if (req.url === '/api/local/stream/stop' && req.method === 'POST') {
            if (currentStreamProcess) {
                currentStreamProcess.kill();
                currentStreamProcess = null;
                currentStreamingVideo = null;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'Stream stopped' }));
            } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'No stream is currently running' }));
            }
            return;
        }

        // API to get stream status
        if (req.url === '/api/local/stream/status' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                isStreaming: !!currentStreamProcess,
                fileName: currentStreamingVideo
            }));
            return;
        }

        // API to get stream logs
        if (req.url === '/api/local/stream/logs' && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                logs: streamLogs
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

                    // Check if the video is currently streaming
                    if (currentStreamingVideo === fileName) {
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
