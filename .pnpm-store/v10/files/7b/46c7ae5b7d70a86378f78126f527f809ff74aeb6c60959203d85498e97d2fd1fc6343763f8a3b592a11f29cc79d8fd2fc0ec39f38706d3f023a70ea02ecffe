import { createHash } from "node:crypto";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import "@deepseek-ai/cordis";
import { escapeText, isModelInvocable, isSkillName, isUserInvocable, renderSkillContent } from "@deepseek-ai/dsh-skill";
//#region ../../util/brand/src/index.ts
/**
* Apply a compile-time number brand without changing the value.
* @param value - number admitted by the domain that owns the target brand.
* @returns the same number with the requested compile-time brand.
*/
function brandNumber(value) {
	return value;
}
//#endregion
//#region ../../core/session/src/types.ts
/**
* Admit a numeric value as an existing Session event position.
* @param value - non-negative safe integer admitted by the owning log operation.
* @returns the same number with the Session-sequence brand.
*/
function SessionSeq(value) {
	if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) throw new TypeError(`SessionSeq must be a non-negative safe integer, got ${String(value)}`);
	return brandNumber(value);
}
//#endregion
//#region lib/types/index.js
/**
* Durable session skill catalog and model-facing `skill` loader tool.
*
* @module @deepseek-ai/dsh-tool-skill
*/
const name = "tool-skill";
const inject = [
	"agents",
	"tools",
	"skills"
];
const DEFAULT_CATALOG_DESCRIPTION_MAX_LENGTH = 500;
/** Durable entry list mirroring the rendered catalog lines, for non-model consumers. */
function catalogSourceEntries(skills, descriptionMaxLength) {
	return skills.map((skill) => ({
		name: skill.name,
		description: catalogDescription(skill.description, descriptionMaxLength)
	}));
}
/** Validate and default the model-facing skill catalog configuration. */
const Config = z.object({ catalogDescriptionMaxLength: z.number().default(DEFAULT_CATALOG_DESCRIPTION_MAX_LENGTH) });
/**
* Register the model-facing skill loader and its visibility-matched
* durable session catalog. The catalog is emitted only when the calling agent
* resolves this plugin's exact tool registration; a restriction or scoped
* same-name shadow therefore removes both the schema and its call guidance.
*/
function apply(ctx, config = {}) {
	const catalogDescriptionMaxLength = config.catalogDescriptionMaxLength ?? DEFAULT_CATALOG_DESCRIPTION_MAX_LENGTH;
	assertPositiveInteger("catalogDescriptionMaxLength", catalogDescriptionMaxLength, 3);
	const skillTool = defineTool({
		name: "skill",
		description: "Load the full instructions for an available skill. Call this with the exact skill name from the session skill catalog before acting on a task that names or clearly matches that skill.",
		parameters: { name: {
			type: "string",
			required: true,
			description: "The exact skill name from the available skills list."
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					name: {
						type: "string",
						required: true
					},
					provider: {
						type: "string",
						required: true
					},
					resourceBase: { oneOf: [
						{
							type: "object",
							additionalProperties: false,
							properties: {
								kind: {
									type: "string",
									required: true,
									const: "directory"
								},
								path: {
									type: "string",
									required: true
								}
							}
						},
						{
							type: "object",
							additionalProperties: false,
							properties: {
								kind: {
									type: "string",
									required: true,
									const: "url"
								},
								url: {
									type: "string",
									required: true
								}
							}
						},
						{
							type: "object",
							additionalProperties: false,
							properties: {
								kind: {
									type: "string",
									required: true,
									const: "opaque"
								},
								description: {
									type: "string",
									required: true
								}
							}
						}
					] },
					content: {
						type: "string",
						required: true
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: renderSkillContent(value)
			}]
		},
		async execute(args, exec) {
			if (!isSkillName(args.name)) throw new Error(`invalid skill name "${args.name}"`);
			const lookup = {
				cwd: exec.agent?.session.header.cwd,
				signal: exec.signal,
				scope: exec.agent
			};
			const summary = (await ctx.skills.list(lookup)).find((skill) => skill.name === args.name);
			if (!summary) throw new Error(`skill "${args.name}" is unknown or no longer available`);
			if (!isModelInvocable(summary)) throw new Error(`skill "${args.name}" is not available for model invocation`);
			const skill = await ctx.skills.get(args.name, lookup);
			if (!skill) throw new Error(`skill "${args.name}" is unknown or no longer available`);
			if (!isModelInvocable(skill)) throw new Error(`skill "${args.name}" is not available for model invocation`);
			return {
				name: skill.name,
				provider: skill.provider,
				...skill.resourceBase !== void 0 ? { resourceBase: { ...skill.resourceBase } } : {},
				content: skill.content
			};
		},
		presentCall(args) {
			return {
				card: "generic",
				title: `Load skill ${args.name}`,
				kind: "read",
				rawInput: args.name
			};
		}
	});
	ctx.tools.register(skillTool);
	ctx.on("agent/pre-step", async ({ agent, messages, signal }, next) => {
		const decision = await next();
		if (decision.kind === "reject") return decision;
		const names = invokedSkillNames(messages);
		if (names.length === 0) return decision;
		signal.throwIfAborted();
		const lookup = {
			cwd: agent.session.header.cwd,
			signal,
			scope: agent
		};
		const injections = [];
		for (const name of names) {
			const skill = await ctx.skills.get(name, lookup);
			signal.throwIfAborted();
			if (skill === void 0 || !isUserInvocable(skill)) continue;
			const source = {
				kind: "skill-invocation",
				name,
				form: "instructions"
			};
			injections.push(createUserMessage({
				content: [{
					type: "text",
					text: renderSkillContent(skill)
				}],
				source
			}));
		}
		if (injections.length === 0) return decision;
		return {
			...decision,
			messages: [...decision.messages, ...injections]
		};
	});
	ctx.on("agent/pre-step", async ({ agent, signal }, next) => {
		const decision = await next();
		if (decision.kind === "reject") return decision;
		signal.throwIfAborted();
		const snapshot = ctx.tools.get(skillTool.name, agent) === skillTool ? await ctx.skills.snapshot({
			cwd: agent.session.header.cwd,
			signal,
			scope: agent
		}) : {
			skills: [],
			complete: true
		};
		signal.throwIfAborted();
		if (!snapshot.complete) return decision;
		const skills = snapshot.skills.filter(isModelInvocable);
		const entries = catalogSourceEntries(skills, catalogDescriptionMaxLength);
		const digest = digestCatalogEntries(entries);
		const history = catalogHistory(agent);
		const existing = catalogMessage(decision.messages);
		if (history.visibleDigest === digest) return existing === void 0 ? decision : {
			...decision,
			messages: decision.messages.filter((message) => message.id !== existing.message.id)
		};
		if (existing !== void 0 && digestCatalogEntries(existing.entries) === digest) return decision;
		if (!history.published && skills.length === 0) return existing === void 0 ? decision : {
			...decision,
			messages: decision.messages.filter((message) => message.id !== existing.message.id)
		};
		const catalog = history.published ? renderCatalogUpdate(entries) : renderCatalogMessage(entries);
		return {
			...decision,
			messages: existing === void 0 ? [...decision.messages, catalog] : decision.messages.map((message) => message.id === existing.message.id ? catalog : message)
		};
	});
}
function renderCatalogMessage(entries) {
	return createUserMessage({
		content: [{
			type: "text",
			text: [
				"<system-reminder>",
				"A skill is a reusable set of task-specific instructions. The following skills are available in this session:",
				"",
				"<available_skills>",
				...renderCatalogEntries(entries),
				"</available_skills>",
				"",
				"If the user names a skill, or the task clearly matches a skill's description, call the `skill` tool with the exact skill name before taking task actions. Load all applicable skills, then follow their full instructions. This catalog contains summaries only; do not infer or follow a skill's instructions until it has been loaded.",
				"A user may also invoke a skill directly; its <skill_content> block then appears in this conversation. Follow it, and do not call the `skill` tool again for that skill.",
				"</system-reminder>"
			].join("\n")
		}],
		source: {
			kind: "skill-catalog",
			form: "catalog",
			entries
		}
	});
}
function renderCatalogUpdate(entries) {
	const availability = entries.length === 0 ? ["No skills are currently available through the `skill` tool. Do not use names from earlier skill catalogs.", "A user may still invoke a skill directly; its <skill_content> block then appears in this conversation. Follow it, and do not call the `skill` tool for it."] : ["Use only names in this replacement catalog. If the user names a listed skill, or the task clearly matches its description, call the `skill` tool with the exact name before acting.", "A user may also invoke a skill directly; its <skill_content> block then appears in this conversation. Follow it, and do not call the `skill` tool again for that skill."];
	return createUserMessage({
		content: [{
			type: "text",
			text: [
				"<system-reminder>",
				"The available skill catalog changed. This complete catalog replaces every earlier available-skills list in this session:",
				"",
				"<available_skills>",
				...renderCatalogEntries(entries),
				"</available_skills>",
				"",
				...availability,
				"</system-reminder>"
			].join("\n")
		}],
		source: {
			kind: "skill-catalog",
			form: "catalog",
			update: true,
			entries
		}
	});
}
/**
* Model-facing catalog lines, projected from the same entries the source records.
* The pseudo-XML escaping belongs to this frame, not to the published fact, so it
* is applied here and never stored. Names are `isSkillName`-validated and carry
* no escapable character.
*/
function renderCatalogEntries(entries) {
	return entries.map((entry) => `- \`${entry.name}\`: ${escapeText(entry.description)}`);
}
/**
* Catalog identity over the durable entry list rather than the rendered prose.
* The entries are what changes; the surrounding `<system-reminder>` framing is
* written for the model and must not decide whether a republish is needed.
*/
function digestCatalogEntries(entries) {
	const canonical = entries.map((entry) => JSON.stringify([entry.name, entry.description])).join("\n");
	return createHash("sha256").update(canonical).digest("hex");
}
/**
* Entries of one durable catalog message, or undefined when the record is not a
* usable catalog.
*
* `agent.session.snapshotEvents()` may contain a resumed, forked, or externally written seed,
* and seed validation only guarantees a source object with a non-empty `kind`;
* no per-kind field is checked there. An unreadable record is therefore treated
* as "not this plugin's catalog" — the posture the replaced content digest had —
* rather than throwing inside the step listener, which would fail every
* subsequent turn of that session.
*/
function readCatalogEntries(source) {
	const entries = source.entries;
	if (!Array.isArray(entries)) return void 0;
	const readable = [];
	for (const entry of entries) {
		if (typeof entry !== "object" || entry === null) return void 0;
		const { name, description } = entry;
		if (typeof name !== "string" || name === "" || typeof description !== "string") return void 0;
		readable.push({
			name,
			description
		});
	}
	return readable;
}
function catalogHistory(agent) {
	const visible = new Set(agent.session.surface.nodes);
	let published = false;
	for (let index = agent.session.seq - 1; index >= 0; index -= 1) {
		const event = agent.session.eventAt(SessionSeq(index));
		if (event === void 0) throw new Error(`skill catalog cannot read seq ${String(index)} below the current Session length`);
		if (event.type !== "user/message" || event.data.source.kind !== "skill-catalog") continue;
		const entries = readCatalogEntries(event.data.source);
		if (entries === void 0) continue;
		const digest = digestCatalogEntries(entries);
		published = true;
		if (visible.has(event.seq)) return {
			visibleDigest: digest,
			published
		};
	}
	return { published };
}
function catalogMessage(messages) {
	for (const message of messages) {
		if (message.source.kind !== "skill-catalog") continue;
		const entries = readCatalogEntries(message.source);
		if (entries !== void 0) return {
			message,
			entries
		};
	}
}
function catalogDescription(value, maxLength) {
	const normalized = value.replaceAll(/\s+/g, " ").trim();
	return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 3)}...`;
}
function assertPositiveInteger(name, value, minimum = 1) {
	if (!Number.isInteger(value) || value < minimum) throw new Error(`tool-skill: ${name} must be an integer greater than or equal to ${minimum}`);
}
/**
* A whitespace-bounded `/name` token (the public skill-name grammar) anywhere
* in the text — the same word-boundary shape the transcript chip decoration
* uses, so a gesture reads as one wherever it sits in the sentence. A second
* `/` or any non-boundary character breaks the match, which keeps file paths
* (`/usr/bin`) and fractions (`5/8`) out.
*/
const SKILL_GESTURE = /(^|\s)\/([a-z0-9]+(?:-[a-z0-9]+)*)(?=\s|$)/g;
/**
* `/name` gesture tokens from the claimed user messages, deduplicated in
* first-seen order. Every text block of direct user input is scanned; no
* other source can forge a gesture.
* @param messages - the step's claimed batch.
* @returns candidate skill names, unvalidated against the registry.
*/
function invokedSkillNames(messages) {
	const names = [];
	for (const message of messages) {
		if (message.source.kind !== "user") continue;
		for (const block of message.content) {
			if (block.type !== "text") continue;
			for (const match of block.text.matchAll(SKILL_GESTURE)) {
				const name = match[2];
				if (name !== void 0 && !names.includes(name)) names.push(name);
			}
		}
	}
	return names;
}
//#endregion
export { Config, apply, inject, name };
