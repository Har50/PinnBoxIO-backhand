import { Platform } from "react-native";

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string): void {
  if (Platform.OS !== "web") return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onend = () => { currentUtterance = null; };
  utterance.onerror = () => { currentUtterance = null; };
  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (Platform.OS !== "web") return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  if (Platform.OS !== "web") return false;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return window.speechSynthesis.speaking;
}

export function isTTSSupported(): boolean {
  if (Platform.OS !== "web") return false;
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
