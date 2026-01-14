import React, { useState, useRef } from 'react';
import { ai, MODELS } from '../services/genai';
import { GroundingChunk, Difficulty } from '../types';

interface TopicGeneratorProps {
  onTopicConfirmed: (topic: string, difficulty: Difficulty, facts: string) => void;
  onBack: () => void;
}

const TopicGenerator: React.FC<TopicGeneratorProps> = ({ onTopicConfirmed, onBack }) => {
  const [topicInput, setTopicInput] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          await transcribeAudio(base64data, mimeType);
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError("Microphone access denied. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const transcribeAudio = async (base64: string, mimeType: string) => {
    setIsLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: MODELS.TRANSCRIPTION,
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: "Transcribe this audio exactly as spoken. Return only the transcription." }
          ]
        }
      });
      
      const text = response.text;
      if (text) {
        setTopicInput((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${text.trim()}` : text.trim();
        });
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setError("Failed to transcribe audio. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!topicInput.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      // Using gemini-3-pro-preview with Thinking Mode for deep research
      const response = await ai.models.generateContent({
        model: MODELS.COMPLEX_TASK,
        contents: `Generate a brief cheat sheet of 5 interesting, verified facts about "${topicInput}" that can be used for a trivia game. Focus on numbers, dates, and specific names suitable for a ${difficulty} level quiz.`,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
          tools: [{ googleSearch: {} }],
        },
      });

      const facts = response.text || '';
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      
      let finalFacts = facts;
      if (groundingChunks && groundingChunks.length > 0) {
        finalFacts += "\n\nSources:\n" + groundingChunks
          .map(c => c.web ? `- ${c.web.title}: ${c.web.uri}` : '')
          .filter(Boolean)
          .join('\n');
      }

      onTopicConfirmed(topicInput, difficulty, finalFacts);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate topic data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full max-w-2xl mx-auto p-6 space-y-8 animate-fade-in w-full">
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Setup Game</h2>
        <p className="text-slate-400">
          Customize your trivia session.
        </p>
      </div>

      <div className="w-full space-y-6 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
        
        {/* Topic Input */}
        <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Topic</label>
            <div className="relative">
                <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g., The Roman Empire, 90s Hip Hop..."
                className="w-full pl-4 pr-14 py-4 bg-slate-900 border border-slate-700 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-slate-600"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button
                    onClick={toggleRecording}
                    disabled={isLoading && !isRecording}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                        isRecording 
                        ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Use Microphone"
                >
                    {isRecording ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    )}
                </button>
            </div>
        </div>

        {/* Difficulty Selection */}
        <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Difficulty</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.values(Difficulty).map((d) => (
                    <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                            difficulty === d
                            ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        }`}
                    >
                        {d}
                    </button>
                ))}
            </div>
        </div>
        
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-4 w-full">
          <button
            onClick={onBack}
            className="px-6 py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading || !topicInput.trim()}
            className={`flex-1 px-6 py-4 rounded-xl font-bold text-white transition-all transform active:scale-95 ${
              isLoading
                ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/20 border border-cyan-500/30'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </span>
            ) : (
              "Start Game"
            )}
          </button>
        </div>
      
      <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
        Powered by Gemini 3 Pro
      </div>
    </div>
  );
};

export default TopicGenerator;