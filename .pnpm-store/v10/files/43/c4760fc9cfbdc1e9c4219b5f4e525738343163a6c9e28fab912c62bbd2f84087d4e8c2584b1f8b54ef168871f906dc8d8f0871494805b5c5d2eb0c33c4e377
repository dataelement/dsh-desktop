#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Writable, Readable } from "node:stream";
import readline from "node:readline/promises";
import * as acp from "../acp.js";
class ExampleClient {
    async requestPermission(params) {
        console.log(`\n🔐 Permission requested: ${params.toolCall.title}`);
        console.log(`\nOptions:`);
        params.options.forEach((option, index) => {
            console.log(`   ${index + 1}. ${option.name} (${option.kind})`);
        });
        while (true) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            const answer = await rl.question("\nChoose an option: ");
            const trimmedAnswer = answer.trim();
            const optionIndex = parseInt(trimmedAnswer) - 1;
            if (optionIndex >= 0 && optionIndex < params.options.length) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: params.options[optionIndex].optionId,
                    },
                };
            }
            else {
                console.log("Invalid option. Please try again.");
            }
        }
    }
    async sessionUpdate(params) {
        const update = params.update;
        switch (update.sessionUpdate) {
            case "agent_message_chunk":
                if (update.content.type === "text") {
                    console.log(update.content.text);
                }
                else {
                    console.log(`[${update.content.type}]`);
                }
                break;
            case "tool_call":
                console.log(`\n🔧 ${update.title} (${update.status})`);
                break;
            case "tool_call_update":
                console.log(`\n🔧 Tool call \`${update.toolCallId}\` updated: ${update.status}\n`);
                break;
            case "plan":
            case "agent_thought_chunk":
            case "user_message_chunk":
                console.log(`[${update.sessionUpdate}]`);
                break;
            default:
                break;
        }
    }
    async writeTextFile(params) {
        console.error("[Client] Write text file called with:", JSON.stringify(params, null, 2));
        return {};
    }
    async readTextFile(params) {
        console.error("[Client] Read text file called with:", JSON.stringify(params, null, 2));
        return {
            content: "Mock file content",
        };
    }
}
async function main() {
    // Get the current file's directory to find agent.ts
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const agentPath = join(__dirname, "agent.ts");
    // Spawn the agent as a subprocess via npx (npx.cmd on Windows) using tsx
    const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const agentProcess = spawn(npxCmd, ["tsx", agentPath], {
        stdio: ["pipe", "pipe", "inherit"],
    });
    // Create streams to communicate with the agent
    const input = Writable.toWeb(agentProcess.stdin);
    const output = Readable.toWeb(agentProcess.stdout);
    // Create the client handlers and connect to the agent
    const client = new ExampleClient();
    const stream = acp.ndJsonStream(input, output);
    try {
        const promptResult = await acp
            .client({ name: "example-client" })
            .onRequest(acp.methods.client.session.requestPermission, (ctx) => client.requestPermission(ctx.params))
            .onRequest(acp.methods.client.fs.writeTextFile, (ctx) => client.writeTextFile(ctx.params))
            .onRequest(acp.methods.client.fs.readTextFile, (ctx) => client.readTextFile(ctx.params))
            .connectWith(stream, async (ctx) => {
            // Initialize the connection
            const initResult = await ctx.request(acp.methods.agent.initialize, {
                protocolVersion: acp.PROTOCOL_VERSION,
                clientCapabilities: {
                    fs: {
                        readTextFile: true,
                        writeTextFile: true,
                    },
                },
            });
            console.log(`✅ Connected to agent (protocol v${initResult.protocolVersion})`);
            return ctx.buildSession(process.cwd()).withSession(async (session) => {
                console.log(`📝 Created session: ${session.sessionId}`);
                console.log(`💬 User: Hello, agent!\n`);
                process.stdout.write(" ");
                session.prompt("Hello, agent!");
                for (;;) {
                    const message = await session.nextUpdate();
                    if (message.kind === "stop") {
                        return message.response;
                    }
                    await client.sessionUpdate(message.notification);
                }
            });
        });
        console.log(`\n\n✅ Agent completed with: ${promptResult.stopReason}`);
    }
    catch (error) {
        console.error("[Client] Error:", error);
    }
    finally {
        agentProcess.kill();
        process.exit(0);
    }
}
main().catch(console.error);
//# sourceMappingURL=client.js.map