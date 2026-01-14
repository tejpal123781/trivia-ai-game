import { LeaderboardEntry } from '../types';

const STORAGE_KEY = 'trivia_ai_leaderboard';

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse leaderboard", e);
    return [];
  }
};

export const saveScore = (entry: Omit<LeaderboardEntry, 'id' | 'date'>): LeaderboardEntry[] => {
  const current = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: Date.now().toString(),
    date: new Date().toISOString()
  };
  
  // Add new score, sort descending, and keep top 20
  const updated = [...current, newEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
    
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};