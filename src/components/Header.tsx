import { Upload } from 'lucide-react';

interface HeaderProps {
  onTriggerUpload: () => void;
}

export function Header({ onTriggerUpload }: HeaderProps) {
  return (
    <header className="border-b border-[#1E1E24] bg-[#050505]">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-4">
        <a
          href="#studio"
          className="font-display text-lg font-semibold tracking-tight text-[#F4F4F6] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F2B705]"
        >
          HoloSpin
        </a>

        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A1A1AA]"
        >
          <a
            href="#studio"
            className="hover:text-[#F4F4F6] transition-colors duration-150 whitespace-nowrap shrink-0 hover:underline underline-offset-4"
          >
            Studio
          </a>
          <a
            href="#renders"
            className="hover:text-[#F4F4F6] transition-colors duration-150 whitespace-nowrap shrink-0 hover:underline underline-offset-4"
          >
            Session Renders
          </a>
          <a
            href="#hardware-guide"
            className="hover:text-[#F4F4F6] transition-colors duration-150 whitespace-nowrap shrink-0 hover:underline underline-offset-4"
          >
            Display Guide
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onTriggerUpload}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F2B705] px-4 py-2 text-xs font-semibold text-[#050505] hover:bg-[#F5C531] active:scale-[0.99] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B705]"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Upload Photo</span>
          </button>
        </div>
      </div>
    </header>
  );
}
