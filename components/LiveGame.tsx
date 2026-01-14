import React, { useEffect, useRef, useState } from 'react';
import { GameState, Personality } from '../types';
import { ai, MODELS } from '../services/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../services/audioUtils';
import AudioVisualizer from './AudioVisualizer';
import { FunctionDeclaration, Type, Modality, LiveServerMessage } from '@google/genai';

interface LiveGameProps {
  gameState: GameState;
  onScoreUpdate: (newScore: number) => void;
  onEndGame: () => void;
}

// Custom Hook for Session Management
function useLiveSession(
    gameState: GameState, 
    onScoreUpdate: (pts: number) => void,
    onTimerStart: (duration: number) => void,
    onTimerStop: () => void
) {
    const [isConnected, setIsConnected] = useState(false);
    const [transcript, setTranscript] = useState<{role: string, text: string}[]>([]);
    
    // Audio Context Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    const { selectedPersonality: personality, topic, difficulty, topicFacts } = gameState;

    useEffect(() => {
        let cleanupFn = () => {};

        const initSession = async () => {
            try {
                // Initialize Audio Contexts
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
                audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
                
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
                analyserRef.current.connect(audioContextRef.current.destination);

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;

                // Tool Definitions
                const tools = [{
                    functionDeclarations: [
                    {
                        name: 'updateScore',
                        description: 'Update the user score.',
                        parameters: {
                        type: Type.OBJECT,
                        properties: {
                            pointsToAdd: { type: Type.NUMBER },
                            reason: { type: Type.STRING }
                        },
                        required: ['pointsToAdd'],
                        },
                    },
                    {
                        name: 'startTimer',
                        description: 'Start the countdown timer.',
                        parameters: {
                        type: Type.OBJECT,
                        properties: { duration: { type: Type.NUMBER } },
                        required: ['duration'],
                        },
                    }
                    ]
                }];

                const config = {
                    model: MODELS.LIVE,
                    systemInstruction: `
                        You are ${personality?.name}, a ${personality?.description} trivia host.
                        Topic: "${topic}" (${difficulty} difficulty).
                        Reference Facts: ${topicFacts}
                        
                        GAMEPLAY LOOP:
                        1. Brief Intro.
                        2. Ask ONE question.
                        3. Call \`startTimer(15)\`.
                        4. Listen for answer.
                        5. If correct: compliment, \`updateScore(10)\`.
                        6. If wrong/timeout: roast, give answer, \`updateScore(-5)\`.
                        7. Next question.
                    `,
                    tools: tools,
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: personality?.voiceName || 'Puck' } },
                    },
                };

                const sessionPromise = ai.live.connect({
                    model: config.model,
                    config: config as any,
                    callbacks: {
                        onopen: () => {
                            setIsConnected(true);
                            // Start Input Stream
                            if (inputContextRef.current && streamRef.current) {
                                const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
                                const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
                                processor.onaudioprocess = (e) => {
                                    const blob = createPcmBlob(e.inputBuffer.getChannelData(0));
                                    sessionPromise.then(s => s.sendRealtimeInput({ media: blob }));
                                };
                                source.connect(processor);
                                processor.connect(inputContextRef.current.destination);
                            }
                        },
                        onmessage: async (msg: LiveServerMessage) => {
                            // Tools
                            if (msg.toolCall) {
                                for (const fc of msg.toolCall.functionCalls) {
                                    if (fc.name === 'updateScore') {
                                        onTimerStop();
                                        onScoreUpdate((fc.args as any).pointsToAdd);
                                        sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "OK" } } }));
                                    } else if (fc.name === 'startTimer') {
                                        onTimerStart((fc.args as any).duration || 15);
                                        sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "OK" } } }));
                                    }
                                }
                            }
                            
                            // Audio Out
                            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                            if (audioData && audioContextRef.current) {
                                const ctx = audioContextRef.current;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                                const buffer = await decodeAudioData(base64ToUint8Array(audioData), ctx, 24000, 1);
                                const source = ctx.createBufferSource();
                                source.buffer = buffer;
                                if (analyserRef.current) source.connect(analyserRef.current);
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += buffer.duration;
                                sourcesRef.current.add(source);
                                source.onended = () => sourcesRef.current.delete(source);
                            }

                            if (msg.serverContent?.interrupted) {
                                sourcesRef.current.forEach(s => s.stop());
                                sourcesRef.current.clear();
                                nextStartTimeRef.current = 0;
                            }

                            // Transcript
                            if ((msg.serverContent as any)?.outputTranscription?.text) {
                                setTranscript(p => [...p, { role: 'model', text: (msg.serverContent as any).outputTranscription.text }]);
                            }
                            if (msg.serverContent?.turnComplete && (msg.serverContent as any)?.inputTranscription?.text) {
                                setTranscript(p => [...p, { role: 'user', text: (msg.serverContent as any).inputTranscription.text }]);
                            }
                        },
                        onclose: () => setIsConnected(false),
                    }
                });

                cleanupFn = () => {
                   sessionPromise.then(s => s.close()); // Close session
                   stream.getTracks().forEach(t => t.stop());
                   inputContextRef.current?.close();
                   audioContextRef.current?.close();
                };

            } catch (err) {
                console.error("Session Init Failed", err);
            }
        };

        initSession();
        return cleanupFn;
    }, []); // Run once on mount

    return { isConnected, transcript, analyser: analyserRef.current, stream: streamRef.current };
}

const CountdownRing: React.FC<{ timeLeft: number; totalTime: number }> = ({ timeLeft, totalTime }) => {
  const radius = 120; 
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (timeLeft / totalTime) * circumference;
  const progress = timeLeft / totalTime;
  
  let color = 'text-green-500';
  if (progress < 0.3) color = 'text-red-500';
  else if (progress < 0.6) color = 'text-yellow-500';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
       <svg height={radius * 2} width={radius * 2} className="transform -rotate-90 transition-all duration-100 linear">
          <circle className="text-slate-800" strokeWidth={stroke} stroke="currentColor" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
          <circle className={`${color} transition-colors duration-300`} strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }} strokeLinecap="round" stroke="currentColor" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        </svg>
        <div className={`absolute bottom-[-30px] font-mono font-bold ${color}`}>
            {timeLeft.toFixed(1)}s
        </div>
    </div>
  );
};

const LiveGame: React.FC<LiveGameProps> = ({ gameState, onScoreUpdate, onEndGame }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [micActive, setMicActive] = useState(true);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const { isConnected, transcript, analyser, stream } = useLiveSession(
      gameState,
      onScoreUpdate,
      (duration) => {
          setTotalTime(duration);
          setTimeLeft(duration);
          setIsTimerRunning(true);
      },
      () => {
          setIsTimerRunning(false);
          setTimeLeft(0);
      }
  );

  // Timer Logic
  useEffect(() => {
      if (isTimerRunning && timeLeft > 0) {
          timerRef.current = setTimeout(() => setTimeLeft(t => t - 0.1), 100);
      } else if (isTimerRunning && timeLeft <= 0) {
          setIsTimerRunning(false);
          // System could send timeout event here if passed back to hook, 
          // but for simplicity we assume the model notices silence or we let the conversation flow naturally.
      }
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isTimerRunning, timeLeft]);

  // Auto scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const toggleMic = () => {
      if (stream) {
          stream.getAudioTracks().forEach(t => t.enabled = !micActive);
          setMicActive(!micActive);
      }
  };

  const p = gameState.selectedPersonality!;

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-white relative font-sans">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-20 pointer-events-none">
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full border border-slate-800 pointer-events-auto">
           <span className="text-2xl">{p.icon}</span>
           <div className="hidden md:block">
             <div className="font-bold text-sm leading-none">{p.name}</div>
             <div className="text-[10px] text-slate-400 uppercase tracking-wider">{gameState.difficulty} Mode</div>
           </div>
        </div>
        <div className="flex flex-col items-end">
            <div className={`text-6xl font-mono font-bold tracking-tighter text-${p.color.split('-')[0]}-400 drop-shadow-lg`}>
                {gameState.score}
            </div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mr-1">Current Score</div>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Ambient Background */}
          <div className={`absolute inset-0 bg-gradient-to-b from-${p.color.split('-')[0]}-900/20 to-transparent opacity-50 pointer-events-none`} />
          
          <div className="relative z-10 mb-12">
             {isTimerRunning && <CountdownRing timeLeft={timeLeft} totalTime={totalTime} />}

             <div className={`w-48 h-48 md:w-64 md:h-64 rounded-full bg-slate-900 border-4 border-slate-800 shadow-2xl flex items-center justify-center relative transition-all duration-500 ${isConnected ? 'scale-100 opacity-100' : 'scale-95 opacity-50 grayscale'}`}>
                {/* Visualizer Inside Avatar */}
                <div className="absolute inset-0 rounded-full overflow-hidden opacity-60">
                    <AudioVisualizer 
                        analyser={analyser} 
                        isActive={isConnected} 
                        color={p.color.includes('red') ? '#ef4444' : p.color.includes('green') ? '#22c55e' : p.color.includes('blue') ? '#3b82f6' : '#a855f7'}
                    />
                </div>
                
                {/* Avatar Icon */}
                <div className="text-8xl md:text-9xl relative z-10 drop-shadow-2xl">
                    {p.icon}
                </div>

                {/* Connection Status Indicator */}
                <div className={`absolute bottom-4 right-4 w-4 h-4 rounded-full border-2 border-slate-900 z-20 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
             </div>
          </div>
          
          {/* Status Text */}
          <div className="h-8 text-center z-10">
              {!isConnected && <span className="inline-flex items-center gap-2 text-cyan-400 font-mono text-sm"><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Connecting to Neural Net...</span>}
              {isConnected && isTimerRunning && <span className="text-yellow-400 font-bold tracking-widest animate-pulse">LISTENING FOR ANSWER</span>}
              {isConnected && !isTimerRunning && <span className="text-slate-500 text-sm">AI is thinking...</span>}
          </div>
      </div>

      {/* Transcript Log (Chat Bubble Style) */}
      <div className="h-1/3 max-h-[300px] bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 flex flex-col relative z-20">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {transcript.length === 0 && (
                 <div className="h-full flex items-center justify-center text-slate-700 italic text-sm">
                     Conversation will appear here...
                 </div>
             )}
             {transcript.map((t, i) => (
                 <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                         t.role === 'user' 
                         ? 'bg-slate-800 text-slate-100 rounded-tr-none' 
                         : `bg-${p.color.split('-')[0]}-900/30 text-${p.color.split('-')[0]}-100 border border-${p.color.split('-')[0]}-800/50 rounded-tl-none`
                     }`}>
                         {t.text}
                     </div>
                 </div>
             ))}
             <div ref={transcriptRef} />
          </div>

          {/* Controls Bar */}
          <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex justify-center items-center gap-6">
            <button 
                onClick={toggleMic}
                className={`p-4 rounded-full transition-all duration-300 ${
                    micActive 
                    ? 'bg-slate-800 text-white hover:bg-slate-700 hover:scale-105 border border-slate-700' 
                    : 'bg-red-500 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                }`}
            >
                {micActive ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>
                )}
            </button>
            
            <button 
                onClick={onEndGame}
                className="px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/50 rounded-full font-bold text-sm uppercase tracking-wider transition-all"
            >
                End Session
            </button>
          </div>
      </div>
    </div>
  );
};

export default LiveGame;