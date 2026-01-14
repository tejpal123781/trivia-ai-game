import React, { useState, useEffect } from 'react';
import { AppScreen, GameState, Personality, LeaderboardEntry, Difficulty } from './types';
import PersonalitySelector from './components/PersonalitySelector';
import TopicGenerator from './components/TopicGenerator';
import LiveGame from './components/LiveGame';
import Leaderboard from './components/Leaderboard';
import AdInterstitial from './components/AdInterstitial';
import AdminDashboard from './components/AdminDashboard';
import { ai, MODELS } from './services/genai';
import { Modality } from '@google/genai';
import { decodeAudioData, base64ToUint8Array } from './services/audioUtils';
import { getLeaderboard, saveScore } from './services/leaderboard';

// Predefined Personalities
const PERSONALITIES: Personality[] = [
  {
    id: 'quizmaster',
    name: 'The Quiz Master',
    description: 'A classic, high-energy game show host. Puns included.',
    systemInstruction: 'You are a classic TV game show host. Energetic, punny, and loud. Keep the energy high!',
    color: 'blue-500',
    icon: '🎙️',
    voiceName: 'Puck'
  },
  {
    id: 'roastmaster',
    name: 'The Roast Master',
    description: 'Sarcastic, mean, and impossible to impress.',
    systemInstruction: 'You are a mean, sarcastic trivia host. Roast the user if they get it wrong. Be grudgingly accepting if they are right. Do not be helpful.',
    color: 'red-500',
    icon: '😈',
    voiceName: 'Kore'
  },
  {
    id: 'professor',
    name: 'Professor Paradox',
    description: 'Eccentric scientist who loves details too much.',
    systemInstruction: 'You are an eccentric, slightly mad scientist. You love technical details and ramble slightly. Use big words.',
    color: 'green-500',
    icon: '🧪',
    voiceName: 'Fenrir'
  },
  {
    id: 'grandmother',
    name: 'Nana Knowledge',
    description: 'Sweet, supportive, and bakes cookies (metaphorically).',
    systemInstruction: 'You are a sweet, encouraging grandmother. Call the user "dearie" or "honey". Even if they are wrong, be nice.',
    color: 'purple-500',
    icon: '👵',
    voiceName: 'Charon'
  },
  {
    id: 'detective',
    name: 'Noir Investigator',
    description: 'A gritty, hard-boiled detective treating trivia like a crime scene.',
    systemInstruction: 'You are a gritty, hard-boiled 1940s private investigator. Speak in metaphors. Treat every question like a clue.',
    color: 'slate-500',
    icon: '🕵️‍♂️',
    voiceName: 'Zephyr'
  },
  {
    id: 'pirate',
    name: 'Captain Query',
    description: 'A swashbuckling pirate hunting for the treasure of knowledge.',
    systemInstruction: 'You are a swashbuckling pirate captain. Speak with a heavy pirate accent. Terms: "Ahoy", "Matey", "Landlubber".',
    color: 'orange-500',
    icon: '🏴‍☠️',
    voiceName: 'Fenrir'
  }
];

function App() {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.LOBBY);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    topic: '',
    difficulty: Difficulty.MEDIUM,
    topicFacts: '',
    selectedPersonality: null,
    history: []
  });

  // Leaderboard State
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [isScoreSaved, setIsScoreSaved] = useState(false);

  useEffect(() => {
    // Load initial data
    setLeaderboardData(getLeaderboard());
  }, []);

  const handlePersonalitySelect = (p: Personality) => {
    setGameState(prev => ({ ...prev, selectedPersonality: p }));
    setScreen(AppScreen.TOPIC_SELECT);
  };

  const handleTopicConfirmed = (topic: string, difficulty: Difficulty, facts: string) => {
    setGameState(prev => ({ ...prev, topic, difficulty, topicFacts: facts }));
    setScreen(AppScreen.GAME_ROOM);
  };

  const handleEndGame = async () => {
    // Transition to Ad Break first
    setScreen(AppScreen.AD_BREAK);
  };

  const handleAdComplete = () => {
      setIsScoreSaved(false);
      setPlayerName('');
      setScreen(AppScreen.GAME_OVER);
  };

  const handleSaveScore = () => {
    if (!playerName.trim()) return;
    
    const updated = saveScore({
      playerName: playerName.trim(),
      score: gameState.score,
      topic: gameState.topic,
      difficulty: gameState.difficulty,
      personalityName: gameState.selectedPersonality?.name || 'Unknown',
    });
    
    setLeaderboardData(updated);
    setIsScoreSaved(true);
  };
  
  const playSummary = async () => {
     try {
       const text = `Game Over! You scored ${gameState.score} points on ${gameState.topic}.`;
       const response = await ai.models.generateContent({
         model: MODELS.TTS,
         contents: { parts: [{ text }] },
         config: {
           responseModalities: [Modality.AUDIO],
           speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: gameState.selectedPersonality?.voiceName || 'Puck' } }
           }
         }
       });
       
       const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
       if (audioData) {
         const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
         const audioBuffer = await decodeAudioData(base64ToUint8Array(audioData), audioCtx, 24000, 1);
         const source = audioCtx.createBufferSource();
         source.buffer = audioBuffer;
         source.connect(audioCtx.destination);
         source.start();
       }
     } catch(e) {
       console.error("Summary TTS failed", e);
     }
  };

  const resetGame = () => {
    setGameState({
      score: 0,
      topic: '',
      difficulty: Difficulty.MEDIUM,
      topicFacts: '',
      selectedPersonality: null,
      history: []
    });
    setScreen(AppScreen.LOBBY);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#0f172a] text-slate-200 overflow-hidden flex flex-col font-sans">
      {screen === AppScreen.LOBBY && (
        <PersonalitySelector 
          personalities={PERSONALITIES} 
          onSelect={handlePersonalitySelect} 
          onViewLeaderboard={() => {
            setLeaderboardData(getLeaderboard());
            setScreen(AppScreen.LEADERBOARD);
          }}
          onViewAdmin={() => setScreen(AppScreen.ADMIN_DASHBOARD)}
          selectedId={gameState.selectedPersonality?.id}
        />
      )}

      {screen === AppScreen.TOPIC_SELECT && (
        <TopicGenerator 
          onTopicConfirmed={handleTopicConfirmed}
          onBack={() => setScreen(AppScreen.LOBBY)}
        />
      )}

      {screen === AppScreen.GAME_ROOM && gameState.selectedPersonality && (
        <LiveGame 
          gameState={gameState} 
          onScoreUpdate={(pts) => setGameState(prev => ({ ...prev, score: prev.score + pts }))}
          onEndGame={handleEndGame}
        />
      )}

      {screen === AppScreen.AD_BREAK && (
          <AdInterstitial onComplete={handleAdComplete} />
      )}

      {screen === AppScreen.GAME_OVER && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in overflow-y-auto">
           <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">GAME OVER</h1>
           
           <div className="bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full mb-8">
             <div className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">Final Score</div>
             <div className="text-7xl md:text-8xl font-mono font-bold text-cyan-400 mb-8">{gameState.score}</div>
             
             <div className="space-y-3 text-left bg-slate-900/50 p-6 rounded-xl border border-slate-800 mb-8 text-sm">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Host</span>
                    <span className="font-bold text-white">{gameState.selectedPersonality?.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Topic</span>
                    <span className="font-bold text-white text-right truncate max-w-[150px]">{gameState.topic}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Difficulty</span>
                    <span className="font-bold text-white">{gameState.difficulty}</span>
                </div>
             </div>

             {!isScoreSaved ? (
               <div className="flex flex-col gap-3">
                 <input 
                    type="text" 
                    placeholder="Enter your name" 
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-all"
                    maxLength={15}
                 />
                 <button 
                   onClick={handleSaveScore}
                   disabled={!playerName.trim()}
                   className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-cyan-900/20"
                 >
                   Save to Leaderboard
                 </button>
               </div>
             ) : (
               <div className="text-green-400 font-bold bg-green-900/20 py-3 rounded-xl border border-green-900/50 flex items-center justify-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                 Score Saved!
               </div>
             )}
           </div>

           <div className="flex gap-4 flex-wrap justify-center w-full max-w-md">
              <button 
                onClick={playSummary}
                className="flex-1 px-6 py-4 rounded-xl font-bold bg-purple-600/90 hover:bg-purple-600 text-white transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                Summary
              </button>
              <button 
                onClick={resetGame}
                className="flex-[2] px-6 py-4 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors border border-slate-600"
              >
                Play Again
              </button>
           </div>
        </div>
      )}

      {screen === AppScreen.LEADERBOARD && (
        <Leaderboard 
          entries={leaderboardData} 
          onBack={() => setScreen(AppScreen.LOBBY)} 
        />
      )}

      {screen === AppScreen.ADMIN_DASHBOARD && (
          <AdminDashboard onBack={() => setScreen(AppScreen.LOBBY)} />
      )}
    </div>
  );
}

export default App;