import { useEffect, useState, type ReactNode, useRef } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition - Smooth fade transition between views
 * 
 * Provides a lightweight page transition effect without external dependencies.
 * Uses CSS transitions for smooth animations. Respects prefers-reduced-motion.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const prevChildrenRef = useRef(children);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Only animate if children actually changed
    if (prevChildrenRef.current === children) {
      return;
    }

    prevChildrenRef.current = children;

    if (prefersReducedMotion) {
      // Skip animation, just swap content
      setDisplayChildren(children);
      return;
    }

    // Start transition out
    setIsVisible(false);
    
    // After fade out, swap content
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      // Start transition in
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }, 150); // Half of transition duration (300ms total)

    return () => clearTimeout(timer);
  }, [children, prefersReducedMotion]);

  return (
    <div
      className={cn(
        prefersReducedMotion ? '' : 'transition-opacity duration-300 ease-in-out',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {displayChildren}
    </div>
  );
}
