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
                    const filePath = path.join(publicDir, fileName);
                    const writeStream = fs.createWriteStream(filePath);

                    if (response.Body) {
                        // @ts-ignore
                        response.Body.pipe(writeStream);

                        writeStream.on('finish', () => {
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ message: 'Download complete', fileName }));
                        });

                        writeStream.on('error', (err) => {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err.message }));
                        });
                    } else {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: 'No response body' }));
                    }

                } catch (error: any) {
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

                    // Improved FFmpeg command: transcode to H.264/AAC for YouTube compatibility
                    // Using fastpreset for low latency and consistent results
                    const ffmpegArgs = [];
                    if (loop) {
                        ffmpegArgs.push('-stream_loop', '-1');
                    }
                    ffmpegArgs.push(
                        '-re',
                        '-i', videoPath,
                        '-vcodec', 'libx264',
                        '-preset', 'veryfast',
                        '-maxrate', '3000k',
                        '-bufsize', '6000k',
                        '-pix_fmt', 'yuv420p',
                        '-g', '60', // Keyframe interval (2 seconds at 30fps)
                        '-acodec', 'aac',
                        '-ar', '44100',
                        '-b:a', '128k',
                        '-f', 'flv',
                        rtmpUrl
                    );

                    currentStreamProcess = spawn('ffmpeg', ffmpegArgs);

                    streamLogs = []; // Clear logs for new stream
                    appendLog(`Starting stream for ${fileName} with loop=${loop}`);

                    currentStreamingVideo = fileName;

                    currentStreamProcess.on('exit', (code) => {
                        console.log(`FFmpeg exited with code ${code}`);
                        appendLog(`FFmpeg exited with code ${code}`);
                        currentStreamProcess = null;
                        currentStreamingVideo = null;
                    });

                    currentStreamProcess.stderr?.on('data', (data) => {
                        const log = data.toString();
                        console.error(`FFmpeg stderr: ${log}`);
                        appendLog(log);
                    });

                    currentStreamProcess.stdout?.on('data', (data) => {
                        const log = data.toString();
                        console.log(`FFmpeg stdout: ${log}`);
                        appendLog(log);
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
