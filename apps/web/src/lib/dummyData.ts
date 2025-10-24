// Dummy data for Conference Room UI testing
import { Participant, Subtitle } from '../types/conference';

export const DUMMY_PARTICIPANTS: Participant[] = [
  { id: 'p1', name: 'Alice', isSpeaking: false, isSelf: true, isMuted: false },
  { id: 'p2', name: 'Bob', isSpeaking: true, isSelf: false, isMuted: false },
  { id: 'p3', name: 'Charlie', isSpeaking: false, isSelf: false, isMuted: true },
  { id: 'p4', name: 'Diana', isSpeaking: false, isSelf: false, isMuted: false },
  { id: 'p5', name: 'Eve', isSpeaking: false, isSelf: false, isMuted: false },
];

let subtitleIdCounter = 0;

export const generateDummySubtitle = (
  speaker: Participant,
  original: string,
  translated: string,
  isProcessing: boolean = false
): Subtitle => {
  subtitleIdCounter++;
  return {
    id: `sub-${subtitleIdCounter}`,
    speakerName: speaker.name,
    originalText: original,
    translatedText: translated,
    timestamp: Date.now(),
    isProcessing,
  };
};

export const getInitialDummySubtitles = (): Subtitle[] => [
  generateDummySubtitle(
    DUMMY_PARTICIPANTS[1],
    "Hello everyone, good morning!",
    "¡Hola a todos, buenos días!"
  ),
  generateDummySubtitle(
    DUMMY_PARTICIPANTS[0],
    "Good morning, Bob!",
    "¡Buenos días, Bob!"
  ),
  generateDummySubtitle(
    DUMMY_PARTICIPANTS[1],
    "I'm excited to discuss this project.",
    "Estoy emocionado de discutir este proyecto."
  ),
  generateDummySubtitle(
    DUMMY_PARTICIPANTS[3],
    "Let's start with the architecture overview.",
    "Comencemos con la descripción general de la arquitectura."
  ),
];

// Simulated speech samples for different participants
const SPEECH_SAMPLES = [
  { original: "This is looking great!", translated: "¡Esto se ve genial!" },
  { original: "I have a question about the timeline.", translated: "Tengo una pregunta sobre el cronograma." },
  { original: "Can you hear me clearly?", translated: "¿Puedes oírme claramente?" },
  { original: "Let me share my screen.", translated: "Déjame compartir mi pantalla." },
  { original: "That makes sense to me.", translated: "Eso tiene sentido para mí." },
  { original: "What do you think about this approach?", translated: "¿Qué piensas de este enfoque?" },
  { original: "I agree with that solution.", translated: "Estoy de acuerdo con esa solución." },
  { original: "Could you repeat that please?", translated: "¿Podrías repetir eso por favor?" },
];

// Helper functions to simulate real-time updates
export const simulateParticipantSpeaking = (
  currentParticipants: Participant[],
  speakerId: string
): Participant[] => {
  return currentParticipants.map((p) => ({
    ...p,
    isSpeaking: p.id === speakerId,
  }));
};

export const simulateNewSubtitle = (
  currentSubtitles: Subtitle[],
  newSubtitle: Subtitle,
  maxCount: number = 5
): Subtitle[] => {
  const updated = [...currentSubtitles, newSubtitle];
  return updated.slice(Math.max(updated.length - maxCount, 0)); // Keep only the last N subtitles
};

export const getRandomSpeechSample = () => {
  return SPEECH_SAMPLES[Math.floor(Math.random() * SPEECH_SAMPLES.length)];
};

export const getRandomParticipant = (participants: Participant[]) => {
  return participants[Math.floor(Math.random() * participants.length)];
};
