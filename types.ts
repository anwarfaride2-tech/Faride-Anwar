
export type AspectRatio = '16:9' | '9:16';
export type Resolution = '720p' | '1080p';
export type AudioType = 'city' | 'nature' | 'quiet' | 'default';

export interface GenerationState {
  status: 'idle' | 'uploading' | 'generating' | 'polling' | 'fetching' | 'completed' | 'error';
  progressMessage?: string;
  error?: string;
}

export interface VideoResult {
  url: string;
  aspectRatio: AspectRatio;
}
