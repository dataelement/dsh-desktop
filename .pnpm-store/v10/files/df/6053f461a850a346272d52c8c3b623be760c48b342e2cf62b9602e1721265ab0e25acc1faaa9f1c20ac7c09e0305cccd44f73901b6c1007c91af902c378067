/**
 * Agent-preset management controller: the roster as a list, a copy dialog as
 * the only way a preset is created, and a read-only viewer over the shipped
 * compositions.
 *
 * The browser edits no composition text. A new preset is a host-side copy of
 * an existing one (`{ from, id, name? }` is all that crosses the wire), and
 * everything after creation happens in the preset's own files — which is why
 * the page's other job is getting the user TO those files: open the directory
 * where the host has a desktop, show its path where it does not.
 *
 * The host stays the single fact source. Every mutation writes through the
 * wire and the page re-reads the roster afterwards, because a copy changes
 * more than the row it targeted.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
/** One preset row the page renders. */
export interface PresetRow {
    /** Preset id and directory name; the display name falls back to it. */
    id: string;
    /** Display name the preset published, absent when it published none. */
    name?: string;
    /** One sentence on what the preset is for. */
    description?: string;
    /** Whether the preset ships with the deployment or was authored locally. */
    trust: 'system' | 'user';
    /** Whether a session that names no preset gets this one. */
    isDefault: boolean;
    /**
     * Why the preset cannot compose a session, absent when it can. A broken
     * row renders marked and unselectable — its directory still occupies the
     * id, so deleting it (or fixing the files) is the way out, and this page
     * is where both of those live.
     */
    broken?: string;
}
/** The copy dialog: a new id and optional display name over a fixed source. */
export interface CopyDraft {
    /** The preset being copied. */
    from: string;
    /** Display name of the source, for the dialog title. */
    fromTitle: string;
    /** New preset id being typed; the directory name, so it is required. */
    id: string;
    /** Display name being typed; empty falls back to the id. */
    name: string;
    /** Whether the copy is in flight. */
    saving: boolean;
    /** The last copy failure, cleared by the next edit. */
    error: string | null;
}
/** The read-only composition viewer over one shipped preset. */
export interface PresetView {
    /** The preset whose composition is shown. */
    id: string;
    /** Display name, for the dialog title. */
    title: string;
    /** Composition text exactly as stored. */
    content: string;
}
/** Page snapshot. */
export interface AgentPresetSectionState {
    status: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';
    /** Whole-load failure text; a copy failure stays on the dialog. */
    error: string | null;
    /** Whether the deployment configures a root new presets can be written to. */
    authorable: boolean;
    /** Whether the host can open a preset directory on a native desktop. */
    hasDocument: boolean;
    /** Every preset the deployment currently supplies. */
    rows: readonly PresetRow[];
    /** The open copy dialog, or null. */
    copy: CopyDraft | null;
    /** The open read-only viewer, or null. */
    view: PresetView | null;
    /** The preset awaiting delete confirmation. */
    pendingDelete: string | null;
    /** Whether a delete is in flight. */
    deleting: boolean;
    /**
     * Preset directories shown as text because the host has no desktop opener
     * — the answer `openDocument` gives instead of opening.
     */
    revealedPaths: Readonly<Record<string, string>>;
}
/**
 * Why this copy cannot be submitted yet, as a locale key, or undefined when
 * it can. Client-side only: the host re-checks the id and its answer is what
 * the dialog reports on failure.
 * @param draft - the open copy dialog.
 * @param rows - the roster, for the collision check.
 * @returns the blocking reason's locale key, or undefined when submittable.
 */
export declare function draftBlocker(draft: CopyDraft, rows: readonly PresetRow[]): 'idRequired' | 'idInvalid' | 'idTaken' | undefined;
/** Reads the roster and drives the copy dialog, viewer, and location reveals. */
export declare class AgentPresetSectionController {
    private readonly ctx;
    /**
     * Called after this page changes the roster DIRECTORY, so the other
     * surfaces reading the same roster re-read it. A settings field moving is
     * already announced by the host through the forwarded
     * `settings/document-updated`; a directory copied or deleted here is not,
     * and the new-session chip has no other way to learn a preset it should
     * offer now exists.
     */
    private readonly rosterChanged;
    /** Page snapshot the renderer subscribes to. */
    readonly store: SnapshotStore<AgentPresetSectionState>;
    constructor(ctx: ClientContext, 
    /**
     * Called after this page changes the roster DIRECTORY, so the other
     * surfaces reading the same roster re-read it. A settings field moving is
     * already announced by the host through the forwarded
     * `settings/document-updated`; a directory copied or deleted here is not,
     * and the new-session chip has no other way to learn a preset it should
     * offer now exists.
     */
    rosterChanged?: () => void);
    private set;
    private patchCopy;
    /**
     * Load the roster. An empty roster means the deployment composes no
     * presets, which is a valid deployment rather than a failure — the section
     * reports `unavailable` and renders nothing.
     * @returns once the snapshot reflects the host.
     */
    load(): Promise<void>;
    /**
     * Open one shipped preset's composition in the read-only viewer.
     * @param id - the preset to view.
     * @returns once the composition loaded or the failure is on the page.
     */
    view(id: string): Promise<void>;
    /** Close the read-only viewer. */
    closeView(): void;
    /**
     * Open the copy dialog over one preset.
     * @param from - the preset the copy will start from.
     */
    beginCopy(from: string): void;
    /** Close the copy dialog, discarding whatever was typed. */
    cancelCopy(): void;
    /**
     * Name the preset the copy creates.
     * @param id - the id typed into the dialog.
     */
    setCopyId(id: string): void;
    /**
     * Name the copy's display name.
     * @param name - the display name typed into the dialog.
     */
    setCopyName(name: string): void;
    /**
     * Submit the copy, re-read the roster, then take the user to the new
     * preset's files — the directory opens where the host has a desktop, and
     * its path appears on the new row where it does not.
     * @returns once the copy settled and the page reflects it.
     */
    confirmCopy(): Promise<void>;
    /**
     * Open one preset's directory on the host desktop, or reveal its path on
     * the row where the deployment has no opener to hand it to.
     * @param id - the preset whose files the user wants.
     * @returns once the host answered and the page reflects it.
     */
    openLocation(id: string): Promise<void>;
    /**
     * Ask for confirmation before deleting one preset.
     * @param id - the preset to delete, or null to dismiss the confirmation.
     */
    confirmDelete(id: string | null): void;
    /**
     * Delete the preset awaiting confirmation, then re-read the roster.
     *
     * A session already composed from it keeps running: its composition was
     * mounted at creation and nothing re-reads the file.
     * @returns once the delete settled and the page reflects it.
     */
    remove(): Promise<void>;
    /**
     * Make one preset the default for sessions created later. Running sessions
     * keep the composition they began with, so this never disturbs work.
     * @param id - the preset to make default.
     * @returns once the write settled and the roster was re-read.
     */
    makeDefault(id: string): Promise<void>;
}
//# sourceMappingURL=section-store.d.ts.map