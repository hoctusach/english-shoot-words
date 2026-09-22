import { getVoiceName } from '@/data/settingsStore';

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  return s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
}

export function onVoicesReady(callback: () => void): () => void {
  const s = synth();
  if (!s) return () => {};
  s.addEventListener('voiceschanged', callback);
  return () => s.removeEventListener('voiceschanged', callback);
}

export function speak(word: string, voiceName = getVoiceName()): void {
  const s = synth();
  if (!s) return;
  s.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  const voice = voiceName ? s.getVoices().find((v) => v.name === voiceName) : undefined;
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  s.speak(utterance);
}
