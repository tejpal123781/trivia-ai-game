import React from 'react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onBack: () => void;
  highlightId?: string; // To highlight the newly added score
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries, onBack, highlightId }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto p-6 animate-fade-in w-full">
      <h2 className="text-4xl font-bold text-white mb-8">Hall of Fame</h2>
      
      <div className="w-full bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden backdrop-blur-sm mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800 text-slate-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4 text-right">Score</th>
                <th className="px-6 py-4">Topic</th>
                <th className="px-6 py-4">Host</th>
                <th className="px-6 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                    No scores yet. Be the first to play!
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr 
                    key={entry.id} 
                    className={`transition-colors ${entry.id === highlightId ? 'bg-cyan-900/30' : 'hover:bg-slate-700/30'}`}
                  >
                    <td className="px-6 py-4 font-mono text-slate-500">#{index + 1}</td>
                    <td className="px-6 py-4 font-bold text-white">{entry.playerName}</td>
                    <td className="px-6 py-4 text-right font-mono text-cyan-400 font-bold">{entry.score}</td>
                    <td className="px-6 py-4 text-slate-300 max-w-[200px] truncate" title={entry.topic}>{entry.topic}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{entry.personalityName}</td>
                    <td className="px-6 py-4 text-right text-slate-500 text-sm">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={onBack}
        className="px-8 py-3 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors"
      >
        Back to Menu
      </button>
    </div>
  );
};

export default Leaderboard;