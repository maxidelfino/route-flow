/**
 * Formatting Utilities
 * Reusable formatting functions for distance, duration, etc.
 */

/**
 * Format distance in kilometers
 * @param km - Distance in kilometers
 * @returns Formatted string (e.g., "12.5 km")
 */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) {
    return '--';
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Format distance for display in banners (compact)
 * @param km - Distance in kilometers
 * @returns Formatted string (e.g., "12.5km" or "500m")
 */
export function formatDistanceCompact(km: number): string {
  if (!Number.isFinite(km)) {
    return '';
  }
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Format duration in minutes
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "45 min" or "1h 30min")
 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes)) {
    return '--';
  }

  const rounded = Math.round(minutes);

  if (rounded < 60) {
    return `${rounded} min`;
  }

  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}min`;
}

/**
 * Format duration remaining (compact for banners)
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "~45 min")
 */
export function formatDurationRemaining(minutes: number): string {
  if (!Number.isFinite(minutes)) {
    return '--';
  }
  return `~${formatDuration(minutes)}`;
}
