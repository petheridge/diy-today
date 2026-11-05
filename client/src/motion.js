import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

// Shared timing — keep in sync with the --dur-* tokens in index.css.
export const DUR = { fast: 150, base: 200, slow: 250 };
// Exits run ~20% shorter than their entrance.
export const exitMs = (enterMs) => Math.round(enterMs * 0.8);

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const supportsViewTransitions = () =>
  typeof document !== 'undefined' && typeof document.startViewTransition === 'function';

if (supportsViewTransitions()) document.documentElement.classList.add('has-vt');

/**
 * Run a state update inside a View Transition so elements sharing a
 * `view-transition-name` morph between their old and new positions
 * (the CSS equivalent of reusing a Framer Motion layoutId).
 * `kind` sets a data attribute on <html> so CSS can tune each transition
 * (e.g. shorter durations when closing).
 */
export function withViewTransition(update, kind = 'default') {
  if (!supportsViewTransitions() || prefersReducedMotion()) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.vt = kind;
  const vt = document.startViewTransition(() => flushSync(update));
  vt.finished.finally(() => {
    if (root.dataset.vt === kind) delete root.dataset.vt;
  });
}

/**
 * Keeps an element mounted for `ms` after `open` goes false so it can play
 * an exit animation. Returns [mounted, exiting].
 */
export function usePresence(open, ms) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    if (!mounted) return;
    const t = setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : ms);
    return () => clearTimeout(t);
  }, [open, ms, mounted]);
  return [mounted || open, mounted && !open];
}

/** Remembers the last non-null value so content can render while it animates out. */
export function useLatest(value) {
  const ref = useRef(value);
  if (value != null) ref.current = value;
  return ref.current;
}

/** True only on renders where `value` has just changed from false to true. */
export function useBecameTrue(value) {
  const prev = useRef(value);
  const [flag, setFlag] = useState(0);
  useEffect(() => {
    if (value && !prev.current) setFlag(f => f + 1);
    prev.current = value;
  }, [value]);
  return flag; // increments on each false→true transition; use as a React key
}
