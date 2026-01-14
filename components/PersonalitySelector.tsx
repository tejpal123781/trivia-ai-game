import React, { useState } from 'react';
import { Personality } from '../types';
import { ai, MODELS } from '../services/genai';
import { Modality } from '@google/genai';
import { decodeAudioData, base64ToUint8Array } from '../services/audioUtils';

interface PersonalitySelectorProps {
  personalities: Personality[];
  onSelect: (p: Personality) => void;
  onViewLeaderboard: () => void;
  onViewAdmin?: () => void;
  selectedId?: string;
}

const PersonalitySelector: React.FC<PersonalitySelectorProps> = ({ personalities, onSelect, onViewLeaderboard, onViewAdmin, selectedId }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const playPreview = async (e: React.MouseEvent, p: Personality) => {
    e.stopPropagation(); // Prevent selection
    if (playingId) return;

    setPlayingId(p.id);

    try {
      const response = await ai.models.generateContent({
        model: MODELS.TTS,
        contents: {
          parts: [{ text: `Hello! I am ${p.name}. ${p.description}` }]
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: p.voiceName }
            }
          }
        }
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await decodeAudioData(
          base64ToUint8Array(audioData),
          audioCtx,
          24000,
          1
        );
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
        source.onended = () => setPlayingId(null);
      } else {
        setPlayingId(null);
      }
    } catch (err) {
      console.error("TTS Preview failed", err);
      setPlayingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 relative">
      <div className="absolute top-6 right-6 z-20 flex gap-3">
        {onViewAdmin && (
            <button 
            onClick={onViewAdmin}
            className="flex items-center justify-center w-10 h-10 bg-slate-800/50 hover:bg-slate-700 text-slate-500 hover:text-white rounded-lg transition-colors border border-slate-700"
            title="Admin Dashboard"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            </button>
        )}
        <button 
          onClick={onViewLeaderboard}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg font-bold text-sm transition-colors border border-slate-700 hover:shadow-lg hover:shadow-cyan-900/20 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          Leaderboard
        </button>
      </div>

      <h2 className="text-4xl font-bold text-white mb-2 text-center mt-8 md:mt-0">Select Your Host</h2>
      <p className="text-slate-400 text-center mb-8">Choose the AI personality that will quiz you.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto w-full pb-8">
        {personalities.map((p) => {
          const isSelected = selectedId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p)}
              className={`group relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden 
                ${isSelected 
                  ? 'bg-slate-800 -translate-y-2 shadow-xl' 
                  : 'bg-slate-800/50 hover:-translate-y-2 hover:shadow-xl'
                }
                ${isSelected ? 'border-' + p.color : 'border-slate-700 hover:border-' + p.color}
                ${isSelected ? 'shadow-' + p.color + '/20' : 'hover:shadow-' + p.color + '/10'}
              `}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-${p.color} transition-opacity duration-500`} />
              
              {isSelected && (
                <div className={`absolute top-4 right-4 text-${p.color} animate-fade-in`}>
                  <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}
              
              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <div className={`text-6xl transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${isSelected ? 'scale-110' : ''}`}>
                  {p.icon}
                </div>
                <h3 className={`text-2xl font-bold transition-colors ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                  {p.name}
                </h3>
                <p className="text-sm text-slate-400 h-10 line-clamp-2">{p.description}</p>
                
                <button
                  onClick={(e) => playPreview(e, p)}
                  disabled={!!playingId}
                  className={`mt-4 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all transform active:scale-95 ${
                      playingId === p.id ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {playingId === p.id ? (
                    <>
                      <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                      Speaking...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                      </svg>
                      Hear Voice
                    </>
                  )}
                </button>
              </div>
              
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-${p.color} transform transition-transform duration-300 ${isSelected ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonalitySelector;