import { Download, Play } from 'lucide-react';
import type { GeneratedHologram } from '../types/hologram';

interface RenderHistoryProps {
  renders: GeneratedHologram[];
  activeRenderId: string | null;
  onSelectRender: (render: GeneratedHologram) => void;
}

export function RenderHistory({
  renders,
  activeRenderId,
  onSelectRender,
}: RenderHistoryProps) {
  return (
    <section
      id="renders"
      className="border-t border-[#1E1E24] py-12"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-[#F4F4F6]">
            Session Renders
          </h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Select any rendered clip to inspect in Standard, 4-Face Pyramid, or Fan Aperture preview.
          </p>
        </div>
        <span className="text-xs font-mono text-[#71717A] tabular-nums">
          {renders.length} {renders.length === 1 ? 'clip' : 'clips'}
        </span>
      </div>

      {renders.length === 0 ? (
        <div className="rounded-xl border border-[#1E1E24] bg-[#0B0B0E] px-6 py-10 text-center">
          <p className="text-sm font-medium text-[#F4F4F6]">
            No 360° hologram videos rendered yet
          </p>
          <p className="mt-1.5 text-xs text-[#A1A1AA]">
            Configure your aspect ratio and rotation settings above, then select Generate 360° Hologram.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {renders.map((item) => {
            const isActive = item.id === activeRenderId;
            return (
              <div
                key={item.id}
                className={`group flex flex-col overflow-hidden rounded-xl border transition-colors duration-150 ${
                  isActive
                    ? 'border-[#F2B705]/70 bg-[#121216]'
                    : 'border-[#232329] bg-[#0B0B0E] hover:border-[#34343D]'
                }`}
              >
                <div className="relative aspect-video bg-[#000000] overflow-hidden">
                  <video
                    src={item.videoUrl}
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => void e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="flex flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F4F4F6] truncate">
                      {item.sourceName}
                    </p>
                    <p className="mt-1 text-xs text-[#A1A1AA] tabular-nums">
                      {item.aspectRatio} · {item.duration} · {item.resolution} ·{' '}
                      {item.direction === 'clockwise' ? 'Clockwise' : 'Counter-Clockwise'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1A1A20]">
                    <button
                      type="button"
                      onClick={() => onSelectRender(item)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#F4F4F6] hover:text-[#F2B705] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{isActive ? 'Active in Viewport' : 'Load in Viewport'}</span>
                    </button>

                    <a
                      href={item.videoUrl}
                      download={`hologram-360-${item.aspectRatio.replace(':', 'x')}-${item.id.slice(0, 8)}.mp4`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#2B2B33] bg-[#141418] px-3 py-1.5 text-xs font-medium text-[#F4F4F6] hover:border-[#3F3F4A] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>MP4</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
