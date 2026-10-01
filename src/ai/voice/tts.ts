import { VoiceNotEnabledError } from "@/ai/voice/stt";

/**
 * Text-to-speech, planned for the voice phase (e.g. Azure Speech). Visemes
 * drive a browser-side avatar's lip sync, so avatar cost does not grow with
 * the number of users. Interface only in this phase.
 */

export interface TtsRequest {
  text: string;
  language: "az" | "tr" | "en";
  voice?: string;
}

export interface Viseme {
  /** Offset from the start of the audio, in milliseconds. */
  offsetMs: number;
  id: number;
}

export interface TtsResult {
  audio: Uint8Array;
  mimeType: "audio/mpeg" | "audio/ogg";
  visemes: Viseme[];
}

export interface TtsProvider {
  readonly name: string;
  synthesize(request: TtsRequest): Promise<TtsResult>;
}

export const disabledTts: TtsProvider = {
  name: "disabled",
  async synthesize() {
    throw new VoiceNotEnabledError();
  },
};
