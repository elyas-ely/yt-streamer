
export interface R2Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  type: 'file' | 'folder';
  mimeType?: string;
}

export interface Bucket {
  name: string;
  region: string;
  created: Date;
  storageUsed: number;
  objectCount: number;
}

export type ViewMode = 'grid' | 'grid-small' | 'list';

export interface FileExplorerState {
  currentPath: string;
  selectedKeys: string[];
  viewMode: ViewMode;
  searchQuery: string;
}

export interface UploadTask {
  id: string;
  file: File;
  path: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  startTime?: number;
  estimatedTimeRemaining?: number;
  loaded: number;
  total: number;
  webkitRelativePath?: string;
}
export interface DownloadTask {
  id: string;
  name: string;
  key: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
  startTime?: number;
  estimatedTimeRemaining?: number;
  loaded: number;
  total: number;
}
