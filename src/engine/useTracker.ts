import { useEffect, useState, useSyncExternalStore } from 'react';
import { tracker, type TrackerState } from './tracker.ts';

export function useTracker(): TrackerState {
  return useSyncExternalStore(tracker.subscribe, tracker.getState, tracker.getState);
}

/** Current time in unix seconds, ticking once a second so holding times and countdowns stay live. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
