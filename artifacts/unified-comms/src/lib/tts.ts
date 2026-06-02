let currentUtterance: SpeechSynthesisUtterance | null = null;
let onEndCallback: (() => void) | null = null;

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isSpeaking(): boolean {
  return typeof window !== "undefined" && window.speechSynthesis.speaking;
}

export function speak(text: string, onEnd?: () => void): void {
  if (!isTTSSupported()) return;
  stop();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("samantha") ||
        v.name.toLowerCase().includes("zira") ||
        v.name.toLowerCase().includes("aria"))
  );
  if (preferred) utterance.voice = preferred;

  onEndCallback = onEnd ?? null;
  utterance.onend = () => {
    currentUtterance = null;
    onEndCallback?.();
    onEndCallback = null;
  };
  utterance.onerror = () => {
    currentUtterance = null;
    onEndCallback = null;
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stop(): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
  onEndCallback = null;
}

export function toggle(text: string, onEnd?: () => void): boolean {
  if (isSpeaking()) {
    stop();
    return false;
  }
  speak(text, onEnd);
  return true;
}
