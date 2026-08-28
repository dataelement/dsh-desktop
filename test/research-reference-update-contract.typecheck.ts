import type { ReferenceInsert } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {
  ComposerKeyboard,
  InputEvent
} from '../node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/input/contract'
import type { SessionInputShell } from '../node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/input/facade'

declare const reference: ReferenceInsert
declare const keyboard: ComposerKeyboard
declare const shell: SessionInputShell

const updateResearchReferenceEvent: InputEvent = {
  type: 'update-research-ref',
  fileId: 'research-node-id',
  reference
}
const keyboardChanged: boolean = keyboard.updateResearchReferenceOccurrences(
  'research-node-id',
  reference
)
const shellChanged: boolean = shell.updateResearchReferenceOccurrences(
  'research-node-id',
  reference
)

void updateResearchReferenceEvent
void keyboardChanged
void shellChanged
