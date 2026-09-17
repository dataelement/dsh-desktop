/**
 * Local-filesystem implementation of `ctx.fileReferences`.
 *
 * @module @deepseek-ai/dsh-file-reference-local
 */
import z from '@deepseek-ai/schemastery';
import FileReferenceService, { FILE_REFERENCE_PROMPT, } from '@deepseek-ai/dsh-file-reference';
import { DEFAULT_FILE_SEARCH_EXCLUDED_DIRECTORIES, DEFAULT_FILE_SEARCH_MAX_ENTRIES, DEFAULT_FILE_SEARCH_MAX_RESULTS, WorkspaceFileSearch, } from "./search.js";
export { DEFAULT_FILE_SEARCH_EXCLUDED_DIRECTORIES, DEFAULT_FILE_SEARCH_MAX_ENTRIES, DEFAULT_FILE_SEARCH_MAX_RESULTS, WorkspaceFileSearch, } from "./search.js";
export { FILE_REFERENCE_PROMPT } from '@deepseek-ai/dsh-file-reference';
export { activeAtToken, formatFileMention } from '@deepseek-ai/dsh-file-reference/grammar';
/** Local-filesystem owner of the file-reference discovery service. */
export class LocalFileReferenceService extends FileReferenceService {
    static inject = ['agents'];
    static Config = z.object({
        maxResults: z.number().step(1).min(1).default(DEFAULT_FILE_SEARCH_MAX_RESULTS),
        maxEntries: z.number().step(1).min(1).default(DEFAULT_FILE_SEARCH_MAX_ENTRIES),
        excludedDirectories: z.array(z.string()).default([...DEFAULT_FILE_SEARCH_EXCLUDED_DIRECTORIES]),
    });
    config;
    searches = new Map();
    promptFibers = new Map();
    promptDisposals = new Set();
    constructor(ctx, config = {}) {
        super(ctx);
        this.config = {
            maxResults: config.maxResults ?? DEFAULT_FILE_SEARCH_MAX_RESULTS,
            maxEntries: config.maxEntries ?? DEFAULT_FILE_SEARCH_MAX_ENTRIES,
            excludedDirectories: config.excludedDirectories ?? DEFAULT_FILE_SEARCH_EXCLUDED_DIRECTORIES,
        };
        validateConfig(this.config);
        const installPrompt = (agent) => {
            if (this.promptFibers.has(agent))
                return;
            const fiber = agent.ctx.inject(['systemPrompt', 'tools'], (scope) => {
                scope.systemPrompt.section({
                    name: 'context:file-reference',
                    order: scope.systemPrompt.getSectionOrder('FILE_REFERENCE'),
                    text: () => agent.ctx.tools.get('read', agent) === undefined ? '' : FILE_REFERENCE_PROMPT,
                });
            });
            this.promptFibers.set(agent, fiber);
        };
        const disposePrompt = (agent) => {
            const fiber = this.promptFibers.get(agent);
            if (fiber === undefined)
                return;
            this.promptFibers.delete(agent);
            const task = fiber.dispose().catch((error) => {
                ctx.logger.warn(`file-reference-local: prompt cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
            });
            this.promptDisposals.add(task);
            void task.finally(() => {
                this.promptDisposals.delete(task);
            });
        };
        for (const agent of ctx.agents.list())
            installPrompt(agent);
        ctx.on('agent/created', ({ agent }) => { installPrompt(agent); });
        ctx.on('agent/disposed', ({ agent }) => {
            this.searches.get(agent)?.dispose();
            this.searches.delete(agent);
            disposePrompt(agent);
        });
        ctx.on('session/event', (session, event) => {
            if (event.type !== 'tool/result')
                return;
            const agent = ctx.agents.get(session.id);
            if (agent !== undefined)
                this.searches.get(agent)?.invalidate();
        });
        ctx.effect(() => async () => {
            for (const search of this.searches.values())
                search.dispose();
            this.searches.clear();
            const promptFibers = [...this.promptFibers.values()];
            this.promptFibers.clear();
            await Promise.all([
                ...promptFibers.map(fiber => fiber.dispose()),
                ...this.promptDisposals,
            ]);
        }, 'file-reference-local: search cache');
    }
    list(agent, query, signal) {
        let search = this.searches.get(agent);
        if (search === undefined) {
            search = new WorkspaceFileSearch(agent.session.header.cwd ?? process.cwd(), this.config);
            this.searches.set(agent, search);
        }
        return search.list(query, signal);
    }
}
function validateConfig(config) {
    if (!Number.isSafeInteger(config.maxResults) || config.maxResults <= 0) {
        throw new Error('file-reference-local: maxResults must be a positive safe integer');
    }
    if (!Number.isSafeInteger(config.maxEntries) || config.maxEntries <= 0) {
        throw new Error('file-reference-local: maxEntries must be a positive safe integer');
    }
    if (config.excludedDirectories.some(name => name.length === 0 || name.includes('/') || name.includes('\\'))) {
        throw new Error('file-reference-local: excludedDirectories entries must be non-empty directory basenames');
    }
}
export default LocalFileReferenceService;
//# sourceMappingURL=index.js.map