
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

export interface StreamChannel {
  id: number;
  title: string;
  channel: string;
  streamKey: string;
  emoji: string;
}

export interface StreamingPlatform {
  id: string;
  name: string;
  icon: string;
  rtmpUrl: string;
  channels: StreamChannel[];
}

export interface StreamStatus {
  streamKey: string;
  fileName: string;
  title: string;
  channel: string;
  emoji: string;
  startTime: number;
  loop: boolean;
  isStreaming: boolean;
}
