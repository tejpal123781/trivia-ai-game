export enum AppScreen {
  LOBBY = 'LOBBY',
  TOPIC_SELECT = 'TOPIC_SELECT',
  GAME_ROOM = 'GAME_ROOM',
  AD_BREAK = 'AD_BREAK',
  GAME_OVER = 'GAME_OVER',
  LEADERBOARD = 'LEADERBOARD',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD'
}

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
  EXTREME = 'Extreme'
}

export interface Personality {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  color: string; // Tailwind color class snippet, e.g., "red-500"
  icon: string;
  voiceName: string; // For TTS preview and Live API config
}

export interface GameState {
  score: number;
  topic: string;
  difficulty: Difficulty;
  topicFacts: string; // Grounded facts from Search
  selectedPersonality: Personality | null;
  history: { role: 'user' | 'model'; text: string }[];
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  topic: string;
  difficulty: string;
  personalityName: string;
  date: string;
}

// Search Grounding chunk structure based on API response
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}