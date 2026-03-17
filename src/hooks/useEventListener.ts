import { useEffect, useCallback, useRef } from 'react';

type EventCallback<T extends Event = Event> = (event: T) => void;

/**
 * Options for useEventListener hook
 */
export interface UseEventListenerOptions {
  /** Whether the event listener is active */
  enabled?: boolean;
  /** Whether to listen during capture phase */
  capture?: boolean;
  /** Optional: custom event target (defaults to window) */
  target?: EventTarget;
}

/**
 * Hook for subscribing to DOM events with automatic cleanup
 * @param eventName - Name of the event to listen for
 * @param callback - Function to call when event fires
 * @param options - Configuration options
 */
export function useEventListener<T extends Event = Event>(
  eventName: string,
  callback: EventCallback<T>,
  options: UseEventListenerOptions = {}
) {
  const {
    enabled = true,
    capture = false,
    target = typeof window !== 'undefined' ? window : undefined,
  } = options;

  const callbackRef = useRef(callback);

  // Keep callback ref updated to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const handleEvent = useCallback((event: Event) => {
    callbackRef.current(event as T);
  }, []);

  useEffect(() => {
    if (!enabled || !target) return;

    target.addEventListener(eventName, handleEvent, capture);

    return () => {
      target.removeEventListener(eventName, handleEvent, capture);
    };
  }, [eventName, enabled, capture, target, handleEvent]);
}

/**
 * Hook for subscribing to window events
 * @param eventName - Name of the window event
 * @param callback - Function to call when event fires
 * @param enabled - Whether the listener is active
 */
export function useWindowEvent<T extends Event = Event>(
  eventName: string,
  callback: EventCallback<T>,
  enabled = true
) {
  return useEventListener<T>(eventName, callback, { enabled });
}

/**
 * Hook for subscribing to online/offline events
 * Useful for detecting network connectivity changes
 */
export function useOnlineStatus() {
  const getOnlineStatus = useCallback(() => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  }, []);

  return getOnlineStatus;
}
