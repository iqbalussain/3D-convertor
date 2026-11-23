export function HardwareGuide() {
  const specs = [
    {
      index: '01',
      title: 'LED Hologram Fans',
      meta: '16:9 Landscape · Pure #000000 Void',
      description:
        'Spinning LED blades render black pixels as transparent air. Center your subject with clean dark margins and test with the Fan Mask preview before exporting.',
    },
    {
      index: '02',
      title: "Pepper's Ghost Pyramids",
      meta: '4-Face Mirrored · 45° Acrylic Prism',
      description:
        'Switch the viewport to 4-Face Pyramid mode after rendering to project four synchronized orthogonal views around a central apex for tabletop acrylic prisms.',
    },
    {
      index: '03',
      title: 'Vertical Hologram Totems',
      meta: '9:16 Portrait · Eye-Level Orbit',
      description:
        'Use 9:16 portrait framing for tall glassware, bottles, and vertical retail kiosks so the full silhouette fills the display height without horizontal cropping.',
    },
  ];

  return (
    <section
      id="hardware-guide"
      className="border-t border-[#1E1E24] py-12"
    >
      <div className="mb-8 max-w-2xl">
        <h2 className="font-display text-xl font-semibold tracking-tight text-[#F4F4F6]">
          Hologram Display Calibration
        </h2>
        <p className="mt-1.5 text-sm text-[#A1A1AA] leading-relaxed">
          Match aspect ratio and background contrast to your physical projection hardware.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {specs.map((spec) => (
          <div
            key={spec.index}
            className="rounded-xl border border-[#1E1E24] bg-[#0B0B0E] p-6 space-y-2.5"
          >
            <div className="flex items-center gap-2 text-xs text-[#A1A1AA] tabular-nums">
              <span className="font-mono text-[#F2B705]">{spec.index}</span>
              <span aria-hidden="true">·</span>
              <span>{spec.meta}</span>
            </div>
            <h3 className="font-display text-base font-semibold text-[#F4F4F6]">
              {spec.title}
            </h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              {spec.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
