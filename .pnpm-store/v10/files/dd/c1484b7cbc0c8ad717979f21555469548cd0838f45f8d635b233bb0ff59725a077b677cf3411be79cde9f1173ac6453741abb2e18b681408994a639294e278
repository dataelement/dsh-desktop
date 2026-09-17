/** Persistent PTY session with bounded output, readiness, and terminal-protocol replies. */
import type { SubprocessTerminalHandle } from '@deepseek-ai/dsh-subprocess';
import type { TerminalBackendSession, TerminalReadRequest, TerminalReadResult, TerminalSendOperation, TerminalSendRequest, TerminalSessionStatus, TerminalSignal, TerminalSignalResult } from '@deepseek-ai/dsh-terminal';
import type { ResolvedConfig } from './config.ts';
/** Backend session wrapping one provider-owned terminal process. */
export declare class LocalPtySession implements TerminalBackendSession {
    private readonly terminal;
    private readonly config;
    motd: string;
    readonly pid: number;
    private readonly decoder;
    /** Protocol state only; the sanitizer and bounded buffers own returned text. */
    private readonly emulator;
    private readonly emulatorData;
    private readonly sanitizer;
    private readonly scrollback;
    private readonly outputEnded;
    private readonly completion;
    private statusValue;
    private active;
    private activeTimer;
    private activeDeadlineTimer;
    private activeAbort;
    private interrupting;
    private activeWrite;
    private pollingReady;
    private polling;
    private promptSeen;
    private promptTextSeen;
    private promptTail;
    private shellPgid;
    private initializing;
    private lastOutputAt;
    private closing;
    private closePromise;
    private transportFailure;
    private emulatorWrites;
    private emulatorWriteDone;
    private emulatorBuffer;
    private emulatorWriting;
    private responseWrites;
    private pendingResponseWrites;
    private emulatorClosed;
    constructor(terminal: SubprocessTerminalHandle, config: ResolvedConfig);
    /**
     * Capture startup output through the same readiness contract as later sends.
     * @param signal - optional cancellation while the shell reaches its first prompt.
     * @returns Resolves after startup readiness; rejects on exit or readiness timeout.
     */
    initialize(signal?: AbortSignal): Promise<void>;
    startSend(request: TerminalSendRequest): TerminalSendOperation;
    private beginSend;
    private resetReadinessEvidence;
    read(request: TerminalReadRequest): TerminalReadResult;
    signal(signal: TerminalSignal): Promise<TerminalSignalResult>;
    status(): TerminalSessionStatus;
    close(reason: string): Promise<void>;
    private readonly onTerminalData;
    private readonly onTerminalEnd;
    private readonly onTerminalError;
    private onData;
    private onExit;
    private onTransportFailure;
    private appendOutput;
    private schedulePoll;
    private pollReadiness;
    /** Wait until generated replies reach the provider before another send can publish. */
    private drainTerminalProtocol;
    /** Sample foreground state only after protocol replies are quiet for the entire inspection. */
    private inspectForegroundAfterProtocol;
    private protocolStateChanged;
    private protocolWorkPending;
    private queueEmulatorData;
    private pumpEmulator;
    private finishResponseWrite;
    private releaseSettledActive;
    private closeEmulator;
    private settleActive;
    private stopPolling;
    private stopReadinessPolling;
    private clearActive;
    private failActive;
    private interrupt;
    private interruptOnce;
    private closeOnce;
}
//# sourceMappingURL=session.d.ts.map