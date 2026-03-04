'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RouteExperienceProps {
  children: React.ReactNode;
}

function isInternalNavigationAnchor(event: MouseEvent) {
  if (event.defaultPrevented) return null;
  if (event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;

  const target = event.target as HTMLElement | null;
  const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!anchor) return null;

  if (anchor.target && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;
  if (anchor.getAttribute('rel')?.includes('external')) return null;
  if (anchor.dataset.noTransition === 'true') return null;

  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return url;
  } catch {
    return null;
  }
}

export default function RouteExperience({ children }: RouteExperienceProps) {
  const pathname = usePathname();
  const currentPath = pathname || '';

  const [progress, setProgress] = useState(0);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [transitionTick, setTransitionTick] = useState(0);

  const firstRenderRef = useRef(true);
  const pendingNavigationRef = useRef(false);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    progressTimerRef.current = null;
    hideTimerRef.current = null;
  }, []);

  const startLoader = useCallback(() => {
    pendingNavigationRef.current = true;
    setLoaderVisible(true);
    setProgress(current => (current > 10 ? current : 12));

    if (!progressTimerRef.current) {
      progressTimerRef.current = setInterval(() => {
        setProgress(current => Math.min(current + Math.random() * 14 + 4, 88));
      }, 140);
    }
  }, []);

  const finishLoader = useCallback(() => {
    clearTimers();
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setLoaderVisible(false);
      setProgress(0);
      pendingNavigationRef.current = false;
    }, 240);
  }, [clearTimers]);

  const triggerPathChangeEffects = useCallback(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });

    setTransitionTick(tick => tick + 1);

    if (!pendingNavigationRef.current) {
      setLoaderVisible(true);
      setProgress(36);
    }

    finishLoader();
  }, [finishLoader]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const url = isInternalNavigationAnchor(event);
      if (!url) return;

      const nextPath = url.pathname;
      if (nextPath === currentPath) return;

      startLoader();
    };

    document.addEventListener('click', onDocumentClick, true);
    return () => {
      document.removeEventListener('click', onDocumentClick, true);
      clearTimers();
    };
  }, [clearTimers, currentPath, startLoader]);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      triggerPathChangeEffects();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [currentPath, triggerPathChangeEffects]);

  return (
    <>
      <div className={`route-top-loader ${loaderVisible ? 'is-visible' : ''}`} style={{ transform: `scaleX(${progress / 100})` }} />
      <div key={transitionTick} className="route-content-enter">
        {children}
      </div>
    </>
  );
}
