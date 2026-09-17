import { Service } from "@deepseek-ai/cordis";
import { HarnessError } from "@deepseek-ai/dsh-llm";
//#region lib/types/index.js
/**
* Service Definition for the authorization capability seam (`ctx.authorization`):
* obtaining a credential nobody can supply from configuration alone, because
* getting it requires a conversation with the human — open this page, paste
* that code, pick an account.
*
* The seam owns the conversation and the lifecycle; it never owns the protocol.
* A plugin that knows how to obtain its own credential registers a flow keyed
* by the `CredentialKey` that flow writes, and the flow talks to whatever
* surface started it through one neutral vocabulary of notices and prompts. So
* a second authorization protocol arrives as another flow rather than as
* another seam, and a surface that renders one flow renders all of them.
*
* ```ts
* const dispose = ctx.authorization.registerFlow({
*   key: credentialKey('llm-pi-ai', 'openai-codex'),
*   label: 'ChatGPT (Codex)',
*   methods: [{ id: 'oauth', label: 'Sign in with ChatGPT' }],
*   async run(session) {
*     session.notify({ message: 'Continue in your browser', url })
*     await commitThroughCredentials(await exchange(session.signal))
*   },
* })
* ```
*
* @module @deepseek-ai/dsh-authorization
*/
/** Stable error taxonomy for authorization failures. */
var AuthorizationError = class extends HarnessError {
	constructor(message, code, options) {
		super(message, code, options);
		this.name = "AuthorizationError";
	}
};
/**
* The rejection an {@link AuthorizationInteraction.prompt} uses to say the
* human declined — dismissed the question, chose not to answer — rather than
* that the surface broke. An attempt whose flow fails after a prompt was
* declined settles as `cancelled`, the same outcome as a withdrawn signal,
* because the human saying no is a refusal, not a breakage. Only a human's
* "no" may reject with this class: a prompt withdrawn by its own `signal` (a
* flow retiring the losing question of a race) must reject with something
* else, or a later genuine failure would be misread as a decline.
*/
var AuthorizationDeclinedError = class extends AuthorizationError {
	constructor(message = "the authorization prompt was declined") {
		super(message, "DECLINED");
		this.name = "AuthorizationDeclinedError";
	}
};
/**
* `ctx.authorization`: a registry of credential-obtaining flows, one attempt at
* a time per key.
*/
var AuthorizationService = class extends Service {
	/** The commit this seam confirms is a credential-record write, so the store is required, not optional. */
	static inject = ["credentials"];
	flows = /* @__PURE__ */ new Map();
	running = /* @__PURE__ */ new Map();
	constructor(ctx) {
		super(ctx, "authorization");
	}
	/**
	* Offer a way to obtain one credential. One flow per key: two plugins
	* claiming the same key would each write a record in their own format, and
	* whichever ran last would leave the other reading a payload it cannot parse.
	*
	* @param flow - the key it writes, its label, its methods, and its runner.
	* @returns Disposer that withdraws this flow.
	* @throws {AuthorizationError} code `DUPLICATE_FLOW` when the key is already claimed.
	*/
	registerFlow(flow) {
		const dispose = this.ctx.effect(function* () {
			if (this.flows.has(flow.key)) throw new AuthorizationError(`an authorization flow for "${flow.key}" is already registered`, "DUPLICATE_FLOW");
			this.flows.set(flow.key, flow);
			yield () => {
				this.flows.delete(flow.key);
				this.running.get(flow.key)?.controller.abort();
			};
		}.bind(this), "authorization.registerFlow()");
		return () => void dispose();
	}
	/**
	* Every registered flow, for a surface listing what can be authorized.
	* @returns one entry per flow, in registration order.
	*/
	list() {
		return [...this.flows.values()].map((flow) => this.entry(flow));
	}
	/**
	* One registered flow.
	* @param key - the credential record to ask about.
	* @returns the entry, or undefined when no flow claims that key.
	*/
	describe(key) {
		const flow = this.flows.get(key);
		return flow === void 0 ? void 0 : this.entry(flow);
	}
	/** The public view of one registered flow. */
	entry(flow) {
		return {
			key: flow.key,
			label: flow.label,
			methods: flow.methods,
			inFlight: this.running.has(flow.key)
		};
	}
	/**
	* Withdraw the attempt running for a key, if any. Separate from the
	* request's own signal because a request/response transport answers a Cancel
	* button on a second call, with no handle on the first one's signal.
	* @param key - the credential record whose attempt should stop.
	*/
	cancel(key) {
		this.running.get(key)?.controller.abort();
	}
	/**
	* Run one attempt to authorize a key, and report how it ended.
	*
	* One attempt per key at a time. A second caller is refused rather than
	* joined: the two would be prompting different humans through the same flow,
	* and the second would answer questions the first was asked.
	*
	* @param request - the key, the method, the surface, and the cancel signal.
	* @returns `authorized` once the flow's record is committed during this
	*   attempt and observed, or `cancelled` when the human declined or the
	*   caller withdrew.
	* @throws {AuthorizationError} code `NO_FLOW` when nothing claims the key,
	*   `UNKNOWN_METHOD` when the named method is not one the flow offers,
	*   `ALREADY_IN_FLIGHT` when an attempt is already running for the key, or
	*   `NOT_COMMITTED` when the flow resolved without committing a record
	*   during the attempt.
	*/
	async begin(request) {
		const { key } = request;
		const flow = this.flows.get(key);
		if (flow === void 0) throw new AuthorizationError(`no authorization flow is registered for "${key}"`, "NO_FLOW");
		const method = request.method ?? flow.methods[0].id;
		if (!flow.methods.some((candidate) => candidate.id === method)) throw new AuthorizationError(`authorization flow for "${key}" offers no method "${method}"`, "UNKNOWN_METHOD");
		if (this.running.has(key)) throw new AuthorizationError(`an authorization attempt for "${key}" is already running`, "ALREADY_IN_FLIGHT");
		if (request.signal?.aborted === true) return { status: "cancelled" };
		const controller = new AbortController();
		const withdraw = () => {
			controller.abort(request.signal?.reason);
		};
		request.signal?.addEventListener("abort", withdraw, { once: true });
		this.running.set(key, { controller });
		let settlement = "failed";
		try {
			const outcome = await this.attempt(flow, method, controller.signal, request.interaction);
			settlement = outcome.status;
			return outcome;
		} finally {
			request.signal?.removeEventListener("abort", withdraw);
			this.running.delete(key);
			this.settle(key, settlement);
		}
	}
	/**
	* Fan `authorization/settled` out with contained listener failures: every
	* listener runs, and a sync throw or async rejection is logged without
	* changing the finished attempt's own outcome — except `INVARIANT`-coded
	* failures, which rethrow after every listener ran. The attempt is already
	* over and its key released when this fires, so a broken watcher (that
	* second browser tab) can never turn the caller's settled result into a
	* failure of its own.
	*/
	settle(key, settlement) {
		let invariantFailure;
		const args = [
			"authorization/settled",
			key,
			settlement
		];
		for (const listener of this.ctx.events.dispatch("emit", args)) try {
			const returned = listener(key, settlement);
			if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
				this.warnSettledListenerFailure(key, error);
			});
		} catch (error) {
			if (error?.code === "INVARIANT") {
				invariantFailure ??= error;
				continue;
			}
			this.warnSettledListenerFailure(key, error);
		}
		if (invariantFailure !== void 0) throw invariantFailure;
	}
	/** Contained-listener diagnostic shared by the sync and async failure paths. */
	warnSettledListenerFailure(key, error) {
		this.ctx.logger.warn("authorization: an authorization/settled listener for \"%s\" failed", key);
		this.ctx.logger.warn(error);
	}
	/** Run the flow, then hold it to its half of the commit contract. */
	async attempt(flow, method, signal, interaction) {
		const withdrawn = new Promise((resolve) => {
			signal.addEventListener("abort", () => {
				resolve("withdrawn");
			}, { once: true });
		});
		const observed = {
			declined: false,
			committed: false
		};
		const unwatch = this.ctx.on("credentials/record-updated", (key) => {
			if (key === flow.key) observed.committed = true;
		});
		try {
			const running = flow.run({
				method,
				signal,
				notify: (notice) => {
					try {
						interaction.notify(notice);
					} catch (error) {
						this.ctx.logger.warn("authorization: the interaction surface failed to render a notice");
						this.ctx.logger.warn(error);
					}
				},
				prompt: (prompt) => interaction.prompt(prompt).catch((error) => {
					if (error instanceof AuthorizationDeclinedError) observed.declined = true;
					throw error;
				})
			});
			try {
				if (await Promise.race([running.then(() => "ran"), withdrawn]) === "withdrawn") {
					running.catch(() => {
						this.ctx.logger.debug("authorization: withdrawn flow failed after the fact");
					});
					return { status: "cancelled" };
				}
			} catch (error) {
				if (signal.aborted || observed.declined) return { status: "cancelled" };
				throw error;
			}
		} finally {
			unwatch();
		}
		if (!observed.committed) throw new AuthorizationError(`authorization flow for "${flow.key}" resolved without committing a credential record in this attempt`, "NOT_COMMITTED");
		if (!(await this.ctx.credentials.describeRecord(flow.key)).configured) throw new AuthorizationError(`authorization flow for "${flow.key}" deleted its credential record instead of committing one`, "NOT_COMMITTED");
		return { status: "authorized" };
	}
};
//#endregion
export { AuthorizationDeclinedError, AuthorizationError, AuthorizationService, AuthorizationService as default };
