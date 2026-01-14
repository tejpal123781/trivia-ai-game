const ADMIN_KEY = 'trivia_ai_admin_stats';

export interface AdminStats {
  totalRevenue: number; // Deprecated, kept for type compatibility
  adImpressions: number;
  adClicks: number; // Deprecated, kept for type compatibility
}

export const getAdminStats = (): AdminStats => {
  try {
    const data = localStorage.getItem(ADMIN_KEY);
    return data ? JSON.parse(data) : { totalRevenue: 0, adImpressions: 0, adClicks: 0 };
  } catch (e) {
    return { totalRevenue: 0, adImpressions: 0, adClicks: 0 };
  }
};

export const recordAdImpression = () => {
  const stats = getAdminStats();
  stats.adImpressions += 1;
  // Note: Revenue is now tracked in Google AdSense, not locally.
  localStorage.setItem(ADMIN_KEY, JSON.stringify(stats));
  return stats;
};

// Deprecated: Ad clicks are handled inside the iframe by Google and cannot be tracked via JS events reliably
export const recordAdClick = () => {
  const stats = getAdminStats();
  stats.adClicks += 1;
  localStorage.setItem(ADMIN_KEY, JSON.stringify(stats));
  return stats;
};

export const resetAdminStats = () => {
    const defaultStats = { totalRevenue: 0, adImpressions: 0, adClicks: 0 };
    localStorage.setItem(ADMIN_KEY, JSON.stringify(defaultStats));
    return defaultStats;
};