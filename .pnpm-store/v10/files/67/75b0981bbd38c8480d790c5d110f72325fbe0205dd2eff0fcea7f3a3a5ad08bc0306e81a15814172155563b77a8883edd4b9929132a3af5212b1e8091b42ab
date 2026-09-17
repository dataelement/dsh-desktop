#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { builtinProviders } from "./providers/all.js";
const AUTH_FILE = "auth.json";
const PROVIDERS = builtinProviders().filter((provider) => provider.auth.oauth !== undefined);
function prompt(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve));
}
function loadAuth() {
    if (!existsSync(AUTH_FILE))
        return {};
    try {
        return JSON.parse(readFileSync(AUTH_FILE, "utf-8"));
    }
    catch {
        return {};
    }
}
function saveAuth(auth) {
    writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2), "utf-8");
}
async function answerPrompt(rl, authPrompt) {
    if (authPrompt.type === "select") {
        console.log(`\n${authPrompt.message}`);
        for (let index = 0; index < authPrompt.options.length; index++) {
            console.log(`  ${index + 1}. ${authPrompt.options[index].label}`);
        }
        const choice = Number.parseInt(await prompt(rl, `Enter number (1-${authPrompt.options.length}): `), 10) - 1;
        const selected = authPrompt.options[choice];
        if (!selected)
            throw new Error("Invalid selection");
        return selected.id;
    }
    return prompt(rl, `${authPrompt.message}${authPrompt.placeholder ? ` (${authPrompt.placeholder})` : ""}: `);
}
async function login(providerId) {
    const provider = PROVIDERS.find((entry) => entry.id === providerId);
    if (!provider)
        throw new Error(`Unknown provider: ${providerId}`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
        const credential = await provider.auth.oauth.login({
            signal: new AbortController().signal,
            prompt: (authPrompt) => answerPrompt(rl, authPrompt),
            notify: (event) => {
                switch (event.type) {
                    case "auth_url":
                        console.log(`\nOpen this URL in your browser:\n${event.url}`);
                        if (event.instructions)
                            console.log(event.instructions);
                        break;
                    case "device_code":
                        console.log(`\nOpen this URL in your browser:\n${event.verificationUri}`);
                        console.log(`Enter code: ${event.userCode}`);
                        break;
                    case "info":
                    case "progress":
                        console.log(event.message);
                        break;
                }
            },
        });
        const auth = loadAuth();
        auth[providerId] = credential;
        saveAuth(auth);
        console.log(`\nCredentials saved to ${AUTH_FILE}`);
    }
    finally {
        rl.close();
    }
}
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    if (!command || command === "help" || command === "--help" || command === "-h") {
        const providerList = PROVIDERS.map((provider) => `  ${provider.id.padEnd(20)} ${provider.name}`).join("\n");
        console.log(`Usage: npx @earendil-works/pi-ai <command> [provider]\n\nCommands:\n  login [provider]  Login to an OAuth provider\n  list              List available providers\n\nProviders:\n${providerList}`);
        return;
    }
    if (command === "list") {
        for (const provider of PROVIDERS)
            console.log(`${provider.id.padEnd(20)} ${provider.name}`);
        return;
    }
    if (command === "login") {
        let providerId = args[1];
        if (!providerId) {
            const rl = createInterface({ input: process.stdin, output: process.stdout });
            try {
                for (let index = 0; index < PROVIDERS.length; index++) {
                    console.log(`  ${index + 1}. ${PROVIDERS[index].name}`);
                }
                const index = Number.parseInt(await prompt(rl, `Enter number (1-${PROVIDERS.length}): `), 10) - 1;
                providerId = PROVIDERS[index]?.id;
            }
            finally {
                rl.close();
            }
        }
        if (!providerId || !PROVIDERS.some((provider) => provider.id === providerId)) {
            throw new Error(`Unknown provider: ${providerId ?? ""}`);
        }
        await login(providerId);
        return;
    }
    throw new Error(`Unknown command: ${command}`);
}
main().catch((error) => {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
});
//# sourceMappingURL=cli.js.map