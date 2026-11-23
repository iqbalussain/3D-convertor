import { useState, type DragEvent } from 'react';
import { ImagePlus, RotateCcw, ImageOff } from 'lucide-react';
import type { SourceImageState } from '../types/hologram';

interface SubjectUploaderProps {
  sourceImage: SourceImageState;
  onSelectFile: (file: File) => void;
  onTriggerUpload: () => void;
  onResetSample: () => void;
  disabled?: boolean;
}

export function SubjectUploader({
  sourceImage,
  onSelectFile,
  onTriggerUpload,
  onResetSample,
  disabled = false,
}: SubjectUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImgLoadFailed(false);
      onSelectFile(file);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium tracking-wide text-[#A1A1AA]">
          Source Photograph
        </span>
        <div className="flex items-center gap-3 text-xs text-[#71717A] tabular-nums">
          <span className="truncate max-w-[170px]">{sourceImage.fileName}</span>
          {sourceImage.width > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">
                {sourceImage.width} × {sourceImage.height}
              </span>
            </>
          )}
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative overflow-hidden rounded-xl border transition-colors duration-150 ${
          isDragging
            ? 'border-[#F2B705] bg-[#141418]'
            : 'border-[#232329] bg-[#000000] hover:border-[#34343D]'
        }`}
      >
        <div className="flex items-center gap-4 p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#232329] bg-[#000000]">
            {!imgLoadFailed ? (
              <img
                src={sourceImage.previewUrl}
                alt={sourceImage.fileName}
                referrerPolicy="no-referrer"
                onError={() => setImgLoadFailed(true)}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-[#0E0E11] text-[#71717A]">
                <ImageOff className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-[#F4F4F6] truncate">
              {sourceImage.useSampleAsset
                ? 'Stainless Steel Straws & Brush Jar'
                : sourceImage.fileName}
            </p>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Drop a PNG, JPG, or WEBP product shot here, or replace with your own photo.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setImgLoadFailed(false);
                  onTriggerUpload();
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2B2B33] bg-[#121216] px-3 py-1.5 text-xs font-medium text-[#F4F4F6] hover:border-[#3F3F4A] hover:bg-[#19191F] disabled:opacity-50 transition-colors duration-150 whitespace-nowrap shrink-0"
              >
                <ImagePlus className="h-3.5 w-3.5 text-[#F2B705]" aria-hidden="true" />
                <span>Replace Photo</span>
              </button>

              {!sourceImage.useSampleAsset && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setImgLoadFailed(false);
                    onResetSample();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F6] disabled:opacity-50 transition-colors duration-150 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset Sample</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
