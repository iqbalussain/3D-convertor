import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Film, RotateCw, RotateCcw } from 'lucide-react';
import { Header } from './components/Header';
import { SubjectUploader } from './components/SubjectUploader';
import { HologramViewport } from './components/HologramViewport';
import { RenderHistory } from './components/RenderHistory';
import { HardwareGuide } from './components/HardwareGuide';
import type {
  ApiErrorState,
  AspectRatio,
  ElevationAngle,
  GeneratedHologram,
  HologramDisplayMode,
  RotationDirection,
  SourceImageState,
  VideoResolution,
} from './types/hologram';

const SAMPLE_IMAGE_URL =
  '/assets/aistudio/Gemini_Generated_Image_6spgoz6spgoz6spg__1__44725f7e.jpg';

const INITIAL_SAMPLE_IMAGE: SourceImageState = {
  previewUrl: SAMPLE_IMAGE_URL,
  fileName: 'stainless_straws_jar.jpg',
  mimeType: 'image/jpeg',
  base64Data: null,
  useSampleAsset: true,
  width: 0,
  height: 0,
};

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [sourceImage, setSourceImage] = useState<SourceImageState>(INITIAL_SAMPLE_IMAGE);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [direction, setDirection] = useState<RotationDirection>('clockwise');
  const [displayMode, setDisplayMode] = useState<HologramDisplayMode>('fan');
  const [elevationAngle, setElevationAngle] = useState<ElevationAngle>('eye-level');
  const [duration, setDuration] = useState<string>('10s');
  const [resolution, setResolution] = useState<VideoResolution>('720p');
  const [customNotes, setCustomNotes] = useState<string>(
    'Preserve crisp brushed-steel highlights and clear glass jar refractions on pure #000000 black.'
  );

  const [renders, setRenders] = useState<GeneratedHologram[]>([]);
  const [activeRender, setActiveRender] = useState<GeneratedHologram | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<ApiErrorState | null>(null);

  // Measure natural dimensions of the active source image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setSourceImage((prev) =>
        prev.previewUrl === img.src || prev.useSampleAsset
          ? { ...prev, width: img.naturalWidth, height: img.naturalHeight }
          : prev
      );
    };
    img.src = sourceImage.previewUrl;
  }, [sourceImage.previewUrl]);

  // Live elapsed timer during Omni Flash generation/refinement
  useEffect(() => {
    if (!isGenerating && !isRefining) {
      setElapsedSeconds(0);
      return;
    }
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isGenerating, isRefining]);

  const triggerUploadDialog = () => {
    fileInputRef.current?.click();
  };

  const handleSelectFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      const base64 = result.split(',')[1] || '';
      setSourceImage({
        previewUrl: result,
        fileName: file.name,
        mimeType: file.type || 'image/png',
        base64Data: base64,
        useSampleAsset: false,
        width: 0,
        height: 0,
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectFile(file);
    }
    e.target.value = '';
  };

  const handleResetSample = () => {
    setSourceImage(INITIAL_SAMPLE_IMAGE);
    setError(null);
  };

  const handleGenerate = async () => {
    if (isGenerating || isRefining) return;
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-hologram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: sourceImage.useSampleAsset ? undefined : sourceImage.base64Data,
          mimeType: sourceImage.mimeType,
          useSampleAsset: sourceImage.useSampleAsset,
          aspectRatio,
          duration,
          resolution,
          direction,
          displayMode,
          elevationAngle,
          customNotes,
        }),
      });

      const payload = (await response.json()) as {
        id?: string;
        interactionId?: string | null;
        videoUrl?: string;
        mimeType?: string;
        aspectRatio?: AspectRatio;
        duration?: string;
        resolution?: VideoResolution;
        direction?: RotationDirection;
        displayMode?: HologramDisplayMode;
        elevationAngle?: ElevationAngle;
        error?: string;
        code?: string;
        hint?: string;
      };

      if (!response.ok || !payload.videoUrl || !payload.id) {
        setError({
          message: payload.error || 'Video generation failed.',
          code: payload.code,
          hint: payload.hint,
        });
        return;
      }

      const created: GeneratedHologram = {
        id: payload.id,
        interactionId: payload.interactionId ?? null,
        videoUrl: payload.videoUrl,
        mimeType: payload.mimeType || 'video/mp4',
        aspectRatio: payload.aspectRatio || aspectRatio,
        duration: payload.duration || duration,
        resolution: payload.resolution || resolution,
        direction: payload.direction || direction,
        displayMode: payload.displayMode || displayMode,
        elevationAngle: payload.elevationAngle || elevationAngle,
        sourcePreviewUrl: sourceImage.previewUrl,
        sourceName: sourceImage.useSampleAsset
          ? 'Stainless Steel Straws & Brush Jar'
          : sourceImage.fileName,
        createdAt: new Date().toISOString(),
      };

      setRenders((prev) => [created, ...prev]);
      setActiveRender(created);
    } catch (err) {
      setError({
        message:
          err instanceof Error
            ? err.message
            : 'Network error while communicating with the video rendering service.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!activeRender?.interactionId || isGenerating || isRefining) return;
    setIsRefining(true);
    setError(null);

    try {
      const response = await fetch('/api/refine-hologram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previousInteractionId: activeRender.interactionId,
          instruction,
          aspectRatio: activeRender.aspectRatio,
          duration: activeRender.duration,
          resolution: activeRender.resolution,
        }),
      });

      const payload = (await response.json()) as {
        id?: string;
        interactionId?: string | null;
        videoUrl?: string;
        mimeType?: string;
        aspectRatio?: AspectRatio;
        duration?: string;
        resolution?: VideoResolution;
        error?: string;
        code?: string;
        hint?: string;
      };

      if (!response.ok || !payload.videoUrl || !payload.id) {
        setError({
          message: payload.error || 'Refinement failed.',
          code: payload.code,
          hint: payload.hint,
        });
        return;
      }

      const refined: GeneratedHologram = {
        ...activeRender,
        id: payload.id,
        interactionId: payload.interactionId ?? activeRender.interactionId,
        videoUrl: payload.videoUrl,
        mimeType: payload.mimeType || 'video/mp4',
        aspectRatio: payload.aspectRatio || activeRender.aspectRatio,
        duration: payload.duration || activeRender.duration,
        resolution: payload.resolution || activeRender.resolution,
        createdAt: new Date().toISOString(),
      };

      setRenders((prev) => [refined, ...prev]);
      setActiveRender(refined);
    } catch (err) {
      setError({
        message:
          err instanceof Error
            ? err.message
            : 'Network error while refining the hologram video.',
      });
    } finally {
      setIsRefining(false);
    }
  };

  const busy = isGenerating || isRefining;

  return (
    <div className="min-h-screen bg-[#050505] text-[#F4F4F6]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileInputChange}
        className="sr-only"
        aria-label="Upload subject photograph"
      />

      <Header onTriggerUpload={triggerUploadDialog} />

      <main className="mx-auto max-w-[1360px] px-6">
        {/* Studio Split */}
        <section id="studio" className="py-8 lg:py-10">
          <div className="mb-8 max-w-2xl">
            <h1
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F4F6]"
              style={{ textWrap: 'balance' }}
            >
              360° Hologram Rotation Studio
            </h1>
            <p className="mt-2.5 text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
              Upload a product photo and render a seamless 360-degree orbital video on pure black for LED hologram fans and Pepper&apos;s Ghost pyramids.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Motion & Framing Controls */}
            <div className="lg:col-span-5 rounded-2xl border border-[#232329] bg-[#0B0B0E] p-6 space-y-6">
              <SubjectUploader
                sourceImage={sourceImage}
                onSelectFile={handleSelectFile}
                onTriggerUpload={triggerUploadDialog}
                onResetSample={handleResetSample}
                disabled={busy}
              />

              {/* Aspect Ratio (Mandatory 16:9 or 9:16) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tracking-wide text-[#A1A1AA]">
                    Output Aspect Ratio
                  </span>
                  <span className="text-xs font-mono text-[#71717A] tabular-nums">
                    {aspectRatio === '16:9' ? 'Landscape 16:9' : 'Portrait 9:16'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#232329] bg-[#121216] p-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAspectRatio('16:9')}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                      aspectRatio === '16:9'
                        ? 'bg-[#23232B] text-[#F4F4F6]'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F6]'
                    }`}
                  >
                    16:9 Landscape
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAspectRatio('9:16')}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                      aspectRatio === '9:16'
                        ? 'bg-[#23232B] text-[#F4F4F6]'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F6]'
                    }`}
                  >
                    9:16 Portrait
                  </button>
                </div>
              </div>

              {/* Rotation Direction */}
              <div className="space-y-2.5">
                <span className="block text-xs font-medium tracking-wide text-[#A1A1AA]">
                  360° Orbit Direction
                </span>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#232329] bg-[#121216] p-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDirection('clockwise')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                      direction === 'clockwise'
                        ? 'bg-[#23232B] text-[#F4F4F6]'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F6]'
                    }`}
                  >
                    <RotateCw className="h-3.5 w-3.5 text-[#F2B705]" aria-hidden="true" />
                    <span>Clockwise</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDirection('counterclockwise')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                      direction === 'counterclockwise'
                        ? 'bg-[#23232B] text-[#F4F4F6]'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F6]'
                    }`}
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-[#F2B705]" aria-hidden="true" />
                    <span>Counter-Clockwise</span>
                  </button>
                </div>
              </div>

              {/* Hologram Hardware Target & Camera Angle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="display-mode-select"
                    className="block text-xs font-medium tracking-wide text-[#A1A1AA]"
                  >
                    Hologram Stage
                  </label>
                  <select
                    id="display-mode-select"
                    disabled={busy}
                    value={displayMode}
                    onChange={(e) => setDisplayMode(e.target.value as HologramDisplayMode)}
                    className="w-full rounded-lg border border-[#232329] bg-[#121216] px-3 py-2 text-xs font-medium text-[#F4F4F6] focus:border-[#F2B705] focus:outline-none"
                  >
                    <option value="fan">LED Hologram Fan</option>
                    <option value="pyramid">Pepper&apos;s Ghost Floating</option>
                    <option value="turntable">Glossy Black Turntable</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="elevation-select"
                    className="block text-xs font-medium tracking-wide text-[#A1A1AA]"
                  >
                    Camera Elevation
                  </label>
                  <select
                    id="elevation-select"
                    disabled={busy}
                    value={elevationAngle}
                    onChange={(e) => setElevationAngle(e.target.value as ElevationAngle)}
                    className="w-full rounded-lg border border-[#232329] bg-[#121216] px-3 py-2 text-xs font-medium text-[#F4F4F6] focus:border-[#F2B705] focus:outline-none"
                  >
                    <option value="eye-level">Eye-Level (0°)</option>
                    <option value="slightly-elevated">Elevated (15°)</option>
                    <option value="isometric">Isometric (30°)</option>
                  </select>
                </div>
              </div>

              {/* Duration & Resolution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="block text-xs font-medium tracking-wide text-[#A1A1AA]">
                    Loop Duration
                  </span>
                  <div className="grid grid-cols-4 gap-1 rounded-lg border border-[#232329] bg-[#121216] p-1">
                    {['5s', '8s', '10s', '15s'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        disabled={busy}
                        onClick={() => setDuration(d)}
                        className={`rounded-md py-1.5 text-xs font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                          duration === d
                            ? 'bg-[#23232B] text-[#F4F4F6]'
                            : 'text-[#A1A1AA] hover:text-[#F4F4F6]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-medium tracking-wide text-[#A1A1AA]">
                    Resolution
                  </span>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border border-[#232329] bg-[#121216] p-1">
                    {(['360p', '720p', '1080p'] as VideoResolution[]).map((res) => (
                      <button
                        key={res}
                        type="button"
                        disabled={busy}
                        onClick={() => setResolution(res)}
                        className={`rounded-md py-1.5 text-xs font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                          resolution === res
                            ? 'bg-[#23232B] text-[#F4F4F6]'
                            : 'text-[#A1A1AA] hover:text-[#F4F4F6]'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Direction Notes */}
              <div className="space-y-2">
                <label
                  htmlFor="director-notes"
                  className="block text-xs font-medium tracking-wide text-[#A1A1AA]"
                >
                  Lighting & Material Notes
                </label>
                <textarea
                  id="director-notes"
                  rows={2}
                  disabled={busy}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Describe surface highlights, rotation smoothness, or background rules..."
                  className="w-full resize-none rounded-lg border border-[#232329] bg-[#121216] px-3.5 py-2.5 text-xs text-[#F4F4F6] placeholder-[#71717A] leading-relaxed focus:border-[#F2B705] focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* Primary Generate Action */}
              <button
                type="button"
                disabled={busy}
                onClick={handleGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F2B705] px-5 py-3 text-sm font-semibold text-[#050505] hover:bg-[#F5C531] active:scale-[0.99] disabled:opacity-60 transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B705]"
              >
                <Film className="h-4 w-4" aria-hidden="true" />
                <span>
                  {isGenerating
                    ? 'Rendering 360° Hologram...'
                    : 'Generate 360° Hologram'}
                </span>
              </button>
            </div>

            {/* Right Column: Dominant Optical Viewport */}
            <div className="lg:col-span-7">
              <HologramViewport
                sourceImage={sourceImage}
                aspectRatio={aspectRatio}
                direction={direction}
                activeRender={activeRender}
                isGenerating={isGenerating}
                isRefining={isRefining}
                elapsedSeconds={elapsedSeconds}
                error={error}
                onRetry={handleGenerate}
                onRefine={handleRefine}
              />
            </div>
          </div>
        </section>

        <RenderHistory
          renders={renders}
          activeRenderId={activeRender?.id ?? null}
          onSelectRender={(render) => {
            setActiveRender(render);
            setError(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        <HardwareGuide />
      </main>

      <footer className="border-t border-[#1E1E24] py-8">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-6 text-xs text-[#71717A]">
          <span>HoloSpin Studio</span>
          <span>Pure Black #000000 Hologram Output · 16:9 &amp; 9:16 MP4</span>
        </div>
      </footer>
    </div>
  );
}
