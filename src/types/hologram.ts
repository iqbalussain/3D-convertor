export type AspectRatio = '16:9' | '9:16';
export type RotationDirection = 'clockwise' | 'counterclockwise';
export type HologramDisplayMode = 'fan' | 'pyramid' | 'turntable';
export type ElevationAngle = 'eye-level' | 'slightly-elevated' | 'isometric';
export type VideoResolution = '360p' | '720p' | '1080p';
export type ViewportProjectionMode = 'standard' | 'pyramid' | 'fan-mask';

export interface SourceImageState {
  previewUrl: string;
  fileName: string;
  mimeType: string;
  base64Data: string | null;
  useSampleAsset: boolean;
  width: number;
  height: number;
}

export interface GeneratedHologram {
  id: string;
  interactionId: string | null;
  videoUrl: string;
  mimeType: string;
  aspectRatio: AspectRatio;
  duration: string;
  resolution: VideoResolution;
  direction: RotationDirection;
  displayMode: HologramDisplayMode;
  elevationAngle: ElevationAngle;
  sourcePreviewUrl: string;
  sourceName: string;
  createdAt: string;
}

export interface ApiErrorState {
  message: string;
  code?: string;
  hint?: string;
}
