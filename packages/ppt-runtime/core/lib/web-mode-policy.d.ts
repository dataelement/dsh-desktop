import type { Context } from '@deepseek-ai/cordis'

export interface PresentationModeState {
  presentationMode?: string
}

export function installWebModePolicy(
  ctx: Context,
  modes: { state(id: string): Promise<PresentationModeState> }
): () => void
