/**
 * Speech-to-text, planned for the voice phase: microphone audio becomes text,
 * then goes through the same topic check and limits as typed messages.
 * Recordings are never stored: the provider converts, the buffer is dropped.
 *
 * Interface only in this phase; no provider is wired up.
 */

export interface SttRequest {
  audio: Uint8Array;
  mimeType: "audio/webm" | "audio/ogg" | "audio/wav";
  language: "az" | "tr" | "en";
}

export interface SttResult {
  text: string;
  /** Audio length, counted against a separate daily voice-minutes limit. */
  durationSeconds: number;
}

export interface SttProvider {
  readonly name: string;
  transcribe(request: SttRequest): Promise<SttResult>;
}

export class VoiceNotEnabledError extends Error {
  constructor() {
    super("Voice is not enabled in this phase");
  }
}

export const disabledStt: SttProvider = {
  name: "disabled",
  async transcribe() {
    throw new VoiceNotEnabledError();
  },
};
