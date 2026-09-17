import { defineTool } from "@deepseek-ai/dsh-tools";
import "@deepseek-ai/dsh-user-questions";
//#region lib/types/index.js
/**
* Model-facing Consumer of the `ctx.userQuestions` capability seam.
* The tool pauses until a UI provider returns a human answer, then feeds that
* answer back into the agent loop as an ordinary tool result.
*
* @module @deepseek-ai/dsh-tool-ask-user
*/
const name = "tool-ask-user";
const inject = ["tools", "userQuestions"];
const description = "Ask the user a concise question when you need confirmation, a choice, or missing information before proceeding. Send one or more questions, each with a stable id that will be echoed in the answer.";
function apply(ctx) {
	ctx.tools.register(defineTool({
		name: "ask_user_question",
		description,
		parameters: { questions: {
			type: "array",
			required: true,
			description: "Questions to ask the user before continuing.",
			items: {
				type: "object",
				additionalProperties: true,
				properties: {
					id: {
						type: "string",
						required: true,
						description: "Stable id for this question; echoed in the answer."
					},
					question: {
						type: "string",
						required: true,
						description: "The specific question to ask the user."
					},
					header: {
						type: "string",
						description: "Optional short heading for the question, such as \"Confirm\" or \"Choose Mode\"."
					},
					options: {
						type: "array",
						description: "Optional choices to show the user. If you recommend one, put it first and append \"(Recommended)\" to that label.",
						items: {
							type: "object",
							additionalProperties: true,
							properties: {
								label: {
									type: "string",
									required: true,
									description: "Short user-facing option label."
								},
								description: {
									type: "string",
									description: "One sentence explaining the tradeoff or impact."
								}
							}
						}
					},
					multi_select: {
						type: "boolean",
						description: "Whether the user may select more than one option. Defaults to false."
					}
				}
			}
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: { answers: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							id: {
								type: "string",
								required: true
							},
							selected: {
								type: "array",
								required: true,
								items: { type: "string" }
							},
							custom: { type: "string" }
						}
					}
				} }
			},
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value)
			}]
		},
		async execute(args, exec) {
			return { answers: (await ctx.userQuestions.ask({
				questions: args.questions.map((question) => ({
					id: question.id,
					question: question.question,
					...question.header !== void 0 ? { header: question.header } : {},
					...question.options !== void 0 ? { options: question.options } : {},
					...question.multi_select !== void 0 ? { multiSelect: question.multi_select } : {}
				})),
				...exec.agent !== void 0 ? { agent: exec.agent } : {},
				signal: exec.signal
			})).answers.map((answer) => ({
				id: answer.id,
				selected: [...answer.selected],
				...answer.custom !== void 0 ? { custom: answer.custom } : {}
			})) };
		}
	}));
}
//#endregion
export { apply, inject, name };
