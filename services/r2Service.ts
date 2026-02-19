
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CopyObjectCommand
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { XhrHttpHandler } from "@aws-sdk/xhr-http-handler";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { R2Object, Bucket } from '../types';

/**
 * R2 Configuration
 */
const R2_CONFIG = {
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  useFipsEndpoint: false,
  useDualstackEndpoint: false,
};

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const s3Client = new S3Client({
  ...R2_CONFIG,
  requestHandler: new XhrHttpHandler({}),
});

export const getBucketStats = async (bucketName: string): Promise<{ storageUsed: number; objectCount: number }> => {
  let storageUsed = 0;
  let objectCount = 0;
  let continuationToken: string | undefined = undefined;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      });
      const response = await s3Client.send(command);

      if (response.Contents) {
        response.Contents.forEach(item => {
          storageUsed += item.Size || 0;
          objectCount++;
        });
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  } catch (error) {
    console.error("Error calculating bucket stats:", error);
    return { storageUsed: 0, objectCount: 0 };
  }

  return { storageUsed, objectCount };
};

export const getBuckets = async (): Promise<Bucket[]> => {
  const stats = await getBucketStats(BUCKET_NAME);
  return [{
    name: BUCKET_NAME,
    region: 'auto',
    created: new Date(),
    storageUsed: stats.storageUsed,
    objectCount: stats.objectCount
  }];
};

export const listAllRecursive = async (prefix: string): Promise<R2Object[]> => {
  let allObjects: R2Object[] = [];
  let continuationToken: string | undefined = undefined;
  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });
      const response = await s3Client.send(command);
      if (response.Contents) {
        response.Contents.forEach(item => {
          if (item.Key) {
            allObjects.push({
              key: item.Key,
              size: item.Size || 0,
              lastModified: item.LastModified || new Date(),
              etag: item.ETag || '',
              type: item.Key.endsWith('/') ? 'folder' : 'file',
              mimeType: item.Key.split('.').pop()
            });
          }
        });
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  } catch (error) {
    console.error("Error in listAllRecursive:", error);
    throw error;
  }
  return allObjects;
};

export const listObjects = async (prefix: string = ''): Promise<R2Object[]> => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: '/',
    });
    const response = await s3Client.send(command);

    const result: R2Object[] = [];

    if (response.CommonPrefixes) {
      response.CommonPrefixes.forEach(cp => {
        if (cp.Prefix) {
          result.push({
            key: cp.Prefix,
            size: 0,
            lastModified: new Date(),
            etag: '',
            type: 'folder'
          });
        }
      });
    }

    if (response.Contents) {
      response.Contents.forEach(item => {
        if (item.Key === prefix) return;
        if (item.Key?.endsWith('/')) return;
        result.push({
          key: item.Key || '',
          size: item.Size || 0,
          lastModified: item.LastModified || new Date(),
          etag: item.ETag || '',
          type: 'file',
          mimeType: item.Key?.split('.').pop()
        });
      });
    }
    return result;
  } catch (error) {
    console.error("R2 listObjects failure:", error);
    throw error;
  }
};

export const createFolder = async (path: string): Promise<void> => {
  const key = path.endsWith('/') ? path : `${path}/`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: "",
    ContentType: 'application/x-directory',
  });
  await s3Client.send(command);
};

export const uploadFileWithProgress = async (
  file: File,
  path: string,
  onProgress: (loaded: number) => void
): Promise<void> => {
  const key = `${path}${file.name}`;

  try {
    console.log(`[R2 Upload] Starting upload for ${file.name} to ${key}`);
    const parallelUploads3 = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: file.type || 'application/octet-stream',
      },
      // Cloudflare R2 supports single PUT up to 5GB. 
      // Using 100MB part size to ensure smaller videos are single-part
      // and larger ones have manageable parts.
      partSize: 1024 * 1024 * 100,
      queueSize: 4,
      leavePartsOnError: false,
    });

    parallelUploads3.on("httpUploadProgress", (progress) => {
      if (progress.loaded !== undefined) {
        onProgress(progress.loaded);
      }
    });

    const result = await parallelUploads3.done();
    console.log(`[R2 Upload] Finished upload for ${file.name}:`, result);
  } catch (error: any) {
    console.error(`Upload error for ${file.name}:`, error);
    throw error;
  }
};

export const renameObject = async (oldKey: string, newKey: string): Promise<void> => {
  if (oldKey === newKey) return;

  if (oldKey.endsWith('/')) {
    const allItems = await listAllRecursive(oldKey);
    for (const item of allItems) {
      const itemKey = item.key;
      const relativePath = itemKey.substring(oldKey.length);
      const targetKey = `${newKey}${relativePath}`;

      const copyCommand = new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${encodeURIComponent(itemKey)}`,
        Key: targetKey
      });
      await s3Client.send(copyCommand);

      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: itemKey
      });
      await s3Client.send(deleteCommand);
    }
  } else {
    const copyCommand = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${encodeURIComponent(oldKey)}`,
      Key: newKey
    });
    await s3Client.send(copyCommand);

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: oldKey
    });
    await s3Client.send(deleteCommand);
  }
};

export const deleteObjects = async (keys: string[]): Promise<void> => {
  const keysToDelete = new Set<string>();
  for (const key of keys) {
    if (key.endsWith('/')) {
      const nestedItems = await listAllRecursive(key);
      nestedItems.forEach(item => keysToDelete.add(item.key));
      keysToDelete.add(key);
    } else {
      keysToDelete.add(key);
    }
  }

  const keysArray = Array.from(keysToDelete);
  const batchSize = 10;
  for (let i = 0; i < keysArray.length; i += batchSize) {
    const batch = keysArray.slice(i, i + batchSize);
    await Promise.all(batch.map(async (key) => {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });
      await s3Client.send(command);
    }));
  }
};

/**
 * Fetches raw bytes for an object and tracks download progress
 */
const getObjectBytes = async (
  key: string,
  onProgress?: (loaded: number) => void
): Promise<Uint8Array> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  // Generate a signed URL so we can use native XMLHttpRequest for granular progress
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Uint8Array(xhr.response));
      } else {
        reject(new Error(`Download failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      console.error(`XHR Network Error for key: ${key}`, xhr);
      reject(new Error('Network error during download'));
    };

    xhr.send();
  });
};

export const downloadObject = async (
  key: string,
  onProgress?: (loaded: number) => void
): Promise<void> => {
  try {
    const body = await getObjectBytes(key, onProgress);
    const blob = new Blob([body as unknown as BlobPart]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = key.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();

    // Delay revocation to ensure browser has time to start the download
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      if (a.parentNode) document.body.removeChild(a);
    }, 10000);
  } catch (error) {
    console.error(`Error in downloadObject for ${key}:`, error);
    throw error;
  }
};

export const downloadFolder = async (prefix: string, onProgress?: (current: number, total: number) => void): Promise<void> => {
  const allObjects = await listAllRecursive(prefix);
  // We only care about files
  const files = allObjects.filter(obj => obj.type === 'file');
  const total = files.length;

  if (total === 0) {
    throw new Error("Folder is empty");
  }

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) onProgress(i + 1, total);

    try {
      // Trigger individual download for each file
      await downloadObject(file.key);

      // Small delay to prevent browser from getting overwhelmed or blocking popups
      if (i < total - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error(`Failed to download ${key}:`, err);
    }
  }
};
