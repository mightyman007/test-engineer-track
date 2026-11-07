export interface TtsProvider {
  readonly id: string;
  isReady(): Promise<boolean>;
  speak(text: string, opts?: { rate?: number }): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
}
