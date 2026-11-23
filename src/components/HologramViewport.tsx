import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Play,
  Pause,
  Download,
  Repeat,
  AlertTriangle,
  RefreshCw,
  Grid2x2,
  CircleDot,
  Maximize2,
  Send,
  Crosshair,
} from 'lucide-react';
import type {
  ApiErrorState,
  AspectRatio,
  GeneratedHologram,
  RotationDirection,
  SourceImageState,
  ViewportProjectionMode,
} from '../types/hologram';

interface HologramViewportProps {
  sourceImage: SourceImageState;
  aspectRatio: AspectRatio;
  direction: RotationDirection;
  activeRender: GeneratedHologram | null;
  isGenerating: boolean;
  isRefining: boolean;
  elapsedSeconds: number;
  error: ApiErrorState | null;
  onRetry: () => void;
  onRefine: (instruction: string) => void;
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function HologramViewport({
  sourceImage,
  aspectRatio,
  direction,
  activeRender,
  isGenerating,
  isRefining,
  elapsedSeconds,
  error,
  onRetry,
  onRefine,
}: HologramViewportProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pyramidCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [projectionMode, setProjectionMode] = useState<ViewportProjectionMode>('standard');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showGuides, setShowGuides] = useState(true);
  const [refineText, setRefineText] = useState('');

  const busy = isGenerating || isRefining;
  const activeAspect: AspectRatio = activeRender ? activeRender.aspectRatio : aspectRatio;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate, activeRender]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = isLooping;
  }, [isLooping, activeRender]);

  useEffect(() => {
    if (!activeRender) return;
    setIsPlaying(true);
  }, [activeRender?.id]);

  // Synchronized 4-Face Pepper's Ghost Pyramid Canvas Renderer
  useEffect(() => {
    if (projectionMode !== 'pyramid' || !activeRender) return;
    const video = videoRef.current;
    const canvas = pyramidCanvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const renderFrame = () => {
      const size = canvas.width;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const quadSize = size * 0.34;
        const scale = Math.min(quadSize / vw, quadSize / vh);
        const drawW = vw * scale;
        const drawH = vh * scale;
        const centerOffset = size * 0.27;

        const quadrants: Array<{ angle: number }> = [
          { angle: 0 },
          { angle: Math.PI / 2 },
          { angle: Math.PI },
          { angle: (3 * Math.PI) / 2 },
        ];

        for (const q of quadrants) {
          ctx.save();
          ctx.translate(size / 2, size / 2);
          ctx.rotate(q.angle);
          ctx.translate(0, -centerOffset);
          ctx.drawImage(video, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        }
      }

      // Subtle central pyramid apex guide
      ctx.strokeStyle = 'rgba(242, 183, 5, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size / 2 - 14, size / 2 - 14);
      ctx.lineTo(size / 2 + 14, size / 2 + 14);
      ctx.moveTo(size / 2 + 14, size / 2 - 14);
      ctx.lineTo(size / 2 - 14, size / 2 + 14);
      ctx.stroke();

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [projectionMode, activeRender]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleRefineSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!refineText.trim() || busy || !activeRender?.interactionId) return;
    onRefine(refineText.trim());
    setRefineText('');
  };

  const quickRefinements = [
    'Slow rotation speed by 30%',
    'Boost specular steel rim lighting',
    'Deepen pure black contrast',
  ];

  return (
    <section
      aria-label="Hologram Optical Viewport"
      className="flex flex-col rounded-2xl border border-[#232329] bg-[#0B0B0E] overflow-hidden"
    >
      {/* Top Viewport Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E1E24] px-5 py-3.5">
        <div className="flex items-center gap-2.5 text-xs text-[#A1A1AA] tabular-nums">
          <span className="font-medium text-[#F4F4F6]">
            {activeRender ? 'Generated Hologram' : 'Optical Stage Preview'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{activeAspect}</span>
          {activeRender ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{activeRender.duration}</span>
              <span aria-hidden="true">·</span>
              <span>{activeRender.resolution}</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">·</span>
              <span>{direction === 'clockwise' ? 'Clockwise 360°' : 'Counter-Clockwise 360°'}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeRender && (
            <div className="flex items-center gap-1 rounded-lg bg-[#141418] p-1 border border-[#232329]">
              <button
                type="button"
                onClick={() => setProjectionMode('standard')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  projectionMode === 'standard'
                    ? 'bg-[#23232B] text-[#F4F4F6]'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F6]'
                }`}
              >
                <Maximize2 className="h-3 w-3" aria-hidden="true" />
                <span>Standard</span>
              </button>
              <button
                type="button"
                onClick={() => setProjectionMode('pyramid')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  projectionMode === 'pyramid'
                    ? 'bg-[#23232B] text-[#F4F4F6]'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F6]'
                }`}
              >
                <Grid2x2 className="h-3 w-3" aria-hidden="true" />
                <span>4-Face Pyramid</span>
              </button>
              <button
                type="button"
                onClick={() => setProjectionMode('fan-mask')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  projectionMode === 'fan-mask'
                    ? 'bg-[#23232B] text-[#F4F4F6]'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F6]'
                }`}
              >
                <CircleDot className="h-3 w-3" aria-hidden="true" />
                <span>Fan Mask</span>
              </button>
            </div>
          )}

          {!activeRender && (
            <button
              type="button"
              onClick={() => setShowGuides((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                showGuides
                  ? 'border-[#34343D] bg-[#16161B] text-[#F4F4F6]'
                  : 'border-[#232329] bg-transparent text-[#A1A1AA] hover:text-[#F4F4F6]'
              }`}
            >
              <Crosshair className="h-3 w-3" aria-hidden="true" />
              <span>Calibration Guides</span>
            </button>
          )}
        </div>
      </div>

      {/* Central Pure Black Optical Stage */}
      <div className="relative flex min-h-[420px] lg:min-h-[500px] items-center justify-center bg-[#000000] p-6">
        {/* Aspect-Matched Stage Frame */}
        <div
          className={`relative flex items-center justify-center overflow-hidden bg-[#000000] transition-all duration-200 ${
            projectionMode === 'pyramid' && activeRender
              ? 'w-full max-w-[480px] aspect-square border border-[#1E1E24] rounded-xl'
              : activeAspect === '16:9'
                ? 'w-full max-w-[720px] aspect-video border border-[#1E1E24] rounded-xl'
                : 'h-[440px] aspect-[9/16] border border-[#1E1E24] rounded-xl'
          }`}
        >
          {/* Active Video Element (kept mounted for Pyramid canvas sync) */}
          {activeRender && (
            <video
              ref={videoRef}
              key={activeRender.id}
              src={activeRender.videoUrl}
              autoPlay
              loop={isLooping}
              playsInline
              muted
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className={`h-full w-full object-contain transition-opacity duration-200 ${
                projectionMode === 'pyramid'
                  ? 'pointer-events-none absolute opacity-0 h-1 w-1'
                  : 'opacity-100'
              } ${
                projectionMode === 'fan-mask' ? 'rounded-full scale-[0.94]' : ''
              }`}
            />
          )}

          {/* 4-Face Pepper's Ghost Canvas */}
          {activeRender && projectionMode === 'pyramid' && (
            <canvas
              ref={pyramidCanvasRef}
              width={720}
              height={720}
              className="h-full w-full object-contain"
            />
          )}

          {/* Circular LED Fan Aperture Overlay */}
          {activeRender && projectionMode === 'fan-mask' && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-4 rounded-full border border-[#F2B705]/35"
            />
          )}

          {/* Staging Preview (before first generation) */}
          {!activeRender && !busy && (
            <>
              <img
                src={sourceImage.previewUrl}
                alt={sourceImage.fileName}
                referrerPolicy="no-referrer"
                className="max-h-[82%] max-w-[82%] object-contain select-none"
              />
              {showGuides && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-[#F2B705]/20" />
                  <div className="absolute top-1/2 left-4 right-4 h-px -translate-y-1/2 bg-[#F2B705]/20" />
                  <div className="absolute left-1/2 top-1/2 h-[78%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#F2B705]/25" />
                </div>
              )}
            </>
          )}

          {/* Rendering Progress Overlay */}
          {busy && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#000000]/88 backdrop-blur-sm px-6 text-center">
              <div className="mb-4 h-12 w-12 rounded-full border-2 border-[#232329] border-t-[#F2B705] animate-spin" />
              <p className="font-display text-base font-semibold text-[#F4F4F6]">
                {isRefining
                  ? 'Refining 360° Hologram Sequence'
                  : 'Rendering 360° Hologram Rotation'}
              </p>
              <p className="mt-1.5 max-w-sm text-xs text-[#A1A1AA] leading-relaxed">
                Synthesizing continuous orbital frames on pure black via Gemini Omni Flash.
              </p>
              <p className="mt-4 font-mono text-sm text-[#F2B705] tabular-nums">
                {formatTimer(elapsedSeconds)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error State Banner */}
      {error && !busy && (
        <div
          role="alert"
          className="border-t border-[#7F1D1D]/60 bg-[#1C0B0D] px-5 py-4 text-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-[#F87171]"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="font-medium text-[#FCA5A5]">{error.message}</p>
                {error.hint && (
                  <p className="text-xs text-[#FECACA]/80 leading-relaxed">{error.hint}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 self-start rounded-md border border-[#F87171]/40 bg-[#2A1014] px-3 py-1.5 text-xs font-medium text-[#FECACA] hover:bg-[#3A161B] transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Playback & Refinement Bar (only when a video is active) */}
      {activeRender && (
        <div className="border-t border-[#1E1E24] bg-[#0B0B0E] px-5 py-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayPause}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2B2B33] bg-[#141418] px-3 py-1.5 text-xs font-medium text-[#F4F4F6] hover:border-[#3F3F4A] transition-colors whitespace-nowrap shrink-0"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5 text-[#F2B705]" aria-hidden="true" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 text-[#F2B705]" aria-hidden="true" />
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsLooping((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isLooping
                    ? 'border-[#F2B705]/50 bg-[#F2B705]/10 text-[#F2B705]'
                    : 'border-[#2B2B33] bg-[#141418] text-[#A1A1AA] hover:text-[#F4F4F6]'
                }`}
              >
                <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Loop</span>
              </button>

              <div className="flex items-center gap-1 rounded-lg border border-[#232329] bg-[#141418] p-1">
                {[0.5, 1, 1.5].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={`rounded-md px-2 py-1 text-xs font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                      playbackRate === rate
                        ? 'bg-[#23232B] text-[#F4F4F6]'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F6]'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <a
              href={activeRender.videoUrl}
              download={`hologram-360-${activeRender.aspectRatio.replace(':', 'x')}-${activeRender.id.slice(0, 8)}.mp4`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F2B705] px-4 py-2 text-xs font-semibold text-[#050505] hover:bg-[#F5C531] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download MP4</span>
            </a>
          </div>

          {/* Multi-turn Video Refinement Bar */}
          {activeRender.interactionId && (
            <form onSubmit={handleRefineSubmit} className="space-y-2.5 pt-2 border-t border-[#1A1A20]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="refine-input"
                  className="text-xs font-medium text-[#A1A1AA]"
                >
                  Refine this render
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {quickRefinements.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={busy}
                      onClick={() => onRefine(preset)}
                      className="text-xs text-[#A1A1AA] hover:text-[#F2B705] underline decoration-[#2B2B33] underline-offset-4 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="refine-input"
                  type="text"
                  value={refineText}
                  onChange={(e) => setRefineText(e.target.value)}
                  placeholder="Describe an adjustment (e.g., slower turn, sharper glass reflections)..."
                  disabled={busy}
                  className="min-w-0 flex-1 rounded-lg border border-[#232329] bg-[#141418] px-3.5 py-2 text-sm text-[#F4F4F6] placeholder-[#71717A] focus:border-[#F2B705] focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={busy || !refineText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#2B2B33] bg-[#18181D] px-4 py-2 text-xs font-semibold text-[#F4F4F6] hover:border-[#F2B705]/60 hover:text-[#F2B705] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Apply Edit</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
