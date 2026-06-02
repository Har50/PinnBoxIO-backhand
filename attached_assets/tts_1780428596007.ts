import { Platform, Alert } from "react-native";

let speechSynth: SpeechSynthesis | null = null;
if (Platform.OS === "web" && typeof window !== "undefined" && window.speechSynthesis) {
  speechSynth = window.speechSynthesis;
}

export function isTtsSupported(): boolean {
  return !!speechSynth;
}

export function speakText(text: string, onDone?: () => void): void {
  if (!speechSynth) {
    Alert.alert("TTS Unavailable", "Text-to-speech is only available on web browsers.");
    return;
  }
  speechSynth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  if (onDone) {
    utterance.onend = onDone;
  }
  speechSynth.speak(utterance);
}

export function stopSpeaking(): void {
  if (speechSynth) {
    speechSynth.cancel();
  }
}

export function isSpeaking(): boolean {
  if (!speechSynth) return false;
  return speechSynth.speaking;
}
