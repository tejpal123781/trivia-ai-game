import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const MODELS = {
  LIVE: 'gemini-2.5-flash-native-audio-preview-12-2025',
  SEARCH_GROUNDING: 'gemini-3-flash-preview',
  TTS: 'gemini-2.5-flash-preview-tts',
  TRANSCRIPTION: 'gemini-3-flash-preview',
  COMPLEX_TASK: 'gemini-3-pro-preview'
};