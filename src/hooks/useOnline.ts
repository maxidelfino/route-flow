'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

function getOnlineStatus() {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getOnlineStatus, () => true);
}
