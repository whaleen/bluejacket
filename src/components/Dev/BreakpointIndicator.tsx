import { useEffect, useState } from 'react';

export function BreakpointIndicator() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tailwind breakpoints
  const getBreakpoint = () => {
    if (width < 640) return 'xs';
    if (width < 768) return 'sm';
    if (width < 1024) return 'md';
    if (width < 1280) return 'lg';
    if (width < 1536) return 'xl';
    return '2xl';
  };

  const breakpoint = getBreakpoint();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      <div className="bg-black/90 text-white px-3 py-1.5 rounded-full text-xs font-mono shadow-lg border border-white/20">
        <span className="font-bold">{breakpoint}</span>
        <span className="text-white/60 ml-2">{width}px</span>
      </div>
    </div>
  );
}
