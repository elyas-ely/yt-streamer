
import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function localServerPlugin(): Plugin {
    return {
        name: 'local-server-plugin',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (!req.url) return next();

                // API to list videos in /public
                if (req.url === '/api/local/videos' && req.method === 'GET') {
                    try {
                        const publicDir = path.resolve(__dirname, 'public');
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
                            const fileName = key.split('/').pop() || 'downloaded_video.mp4';
                            const publicDir = path.resolve(__dirname, 'public');

                            if (!fs.existsSync(publicDir)) {
                                fs.mkdirSync(publicDir, { recursive: true });
                            }

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

                next();
            });
        },
    };
}
