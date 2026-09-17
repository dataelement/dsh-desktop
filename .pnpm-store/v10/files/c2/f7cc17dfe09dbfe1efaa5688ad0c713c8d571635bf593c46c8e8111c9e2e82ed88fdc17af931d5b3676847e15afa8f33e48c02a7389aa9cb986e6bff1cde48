/**
 * Anthropic OAuth flow (Claude Pro/Max)
 *
 * NOTE: This module uses Node.js http.createServer for the OAuth callback server.
 * It is only intended for CLI use, not browser environments.
 */
import { getProviderEnvValue } from "../../utils/provider-env.js";
import { oauthErrorHtml, oauthSuccessHtml } from "./oauth-page.js";
import { generatePKCE } from "./pkce.js";
let nodeApis = null;
let nodeApisPromise = null;
const decode = (s) => atob(s);
const CLIENT_ID = decode("OWQxYzI1MGEtZTYxYi00NGQ5LTg4ZWQtNTk0NGQxOTYyZjVl");
const AUTHORIZE_URL = "https://claude.ai/oauth/authorize";
const TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
const CALLBACK_HOST = getProviderEnvValue("PI_OAUTH_CALLBACK_HOST") || "127.0.0.1";
const CALLBACK_PORT = 53692;
const CALLBACK_PATH = "/callback";
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;
const SCOPES = "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";
async function getNodeApis() {
    if (nodeApis)
        return nodeApis;
    if (!nodeApisPromise) {
        if (typeof process === "undefined" || (!process.versions?.node && !process.versions?.bun)) {
            throw new Error("Anthropic OAuth is only available in Node.js environments");
        }
        nodeApisPromise = import("node:http").then((httpModule) => ({
            createServer: httpModule.createServer,
        }));
    }
    nodeApis = await nodeApisPromise;
    return nodeApis;
}
function parseAuthorizationInput(input) {
    const value = input.trim();
    if (!value)
        return {};
    try {
        const url = new URL(value);
        return {
            code: url.searchParams.get("code") ?? undefined,
            state: url.searchParams.get("state") ?? undefined,
        };
    }
    catch {
        // not a URL
    }
    if (value.includes("#")) {
        const [code, state] = value.split("#", 2);
        return { code, state };
    }
    if (value.includes("code=")) {
        const params = new URLSearchParams(value);
        return {
            code: params.get("code") ?? undefined,
            state: params.get("state") ?? undefined,
        };
    }
    return { code: value };
}
function formatErrorDetails(error) {
    if (error instanceof Error) {
        const details = [`${error.name}: ${error.message}`];
        const errorWithCode = error;
        if (errorWithCode.code)
            details.push(`code=${errorWithCode.code}`);
        if (typeof errorWithCode.errno !== "undefined")
            details.push(`errno=${String(errorWithCode.errno)}`);
        if (typeof error.cause !== "undefined") {
            details.push(`cause=${formatErrorDetails(error.cause)}`);
        }
        if (error.stack) {
            details.push(`stack=${error.stack}`);
        }
        return details.join("; ");
    }
    return String(error);
}
async function startCallbackServer(expectedState) {
    const { createServer } = await getNodeApis();
    return new Promise((resolve, reject) => {
        let settleWait;
        const waitForCodePromise = new Promise((resolveWait) => {
            let settled = false;
            settleWait = (value) => {
                if (settled)
                    return;
                settled = true;
                resolveWait(value);
            };
        });
        const server = createServer((req, res) => {
            try {
                const url = new URL(req.url || "", "http://localhost");
                if (url.pathname !== CALLBACK_PATH) {
                    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
                    res.end(oauthErrorHtml("Callback route not found."));
                    return;
                }
                const code = url.searchParams.get("code");
                const state = url.searchParams.get("state");
                const error = url.searchParams.get("error");
                if (error) {
                    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
                    res.end(oauthErrorHtml("Anthropic authentication did not complete.", `Error: ${error}`));
                    return;
                }
                if (!code || !state) {
                    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
                    res.end(oauthErrorHtml("Missing code or state parameter."));
                    return;
                }
                if (state !== expectedState) {
                    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
                    res.end(oauthErrorHtml("State mismatch."));
                    return;
                }
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(oauthSuccessHtml("Anthropic authentication completed. You can close this window."));
                settleWait?.({ code, state });
            }
            catch {
                res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
                res.end("Internal error");
            }
        });
        server.on("error", (err) => {
            reject(err);
        });
        server.listen(CALLBACK_PORT, CALLBACK_HOST, () => {
            resolve({
                server,
                redirectUri: REDIRECT_URI,
                cancelWait: () => {
                    settleWait?.(null);
                },
                waitForCode: () => waitForCodePromise,
            });
        });
    });
}
async function postJson(url, body, signal) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
    });
    const responseBody = await response.text();
    if (!response.ok) {
        throw new Error(`HTTP request failed. status=${response.status}; url=${url}; body=${responseBody}`);
    }
    return responseBody;
}
async function exchangeAuthorizationCode(code, state, verifier, redirectUri, signal) {
    let responseBody;
    try {
        responseBody = await postJson(TOKEN_URL, {
            grant_type: "authorization_code",
            client_id: CLIENT_ID,
            code,
            state,
            redirect_uri: redirectUri,
            code_verifier: verifier,
        }, signal);
    }
    catch (error) {
        throw new Error(`Token exchange request failed. url=${TOKEN_URL}; redirect_uri=${redirectUri}; response_type=authorization_code; details=${formatErrorDetails(error)}`);
    }
    let tokenData;
    try {
        tokenData = JSON.parse(responseBody);
    }
    catch (error) {
        throw new Error(`Token exchange returned invalid JSON. url=${TOKEN_URL}; body=${responseBody}; details=${formatErrorDetails(error)}`);
    }
    return {
        type: "oauth",
        refresh: tokenData.refresh_token,
        access: tokenData.access_token,
        expires: Date.now() + tokenData.expires_in * 1000 - 5 * 60 * 1000,
    };
}
async function loginAnthropic(interaction) {
    const { verifier, challenge } = await generatePKCE();
    const server = await startCallbackServer(verifier);
    const manualAbort = new AbortController();
    const onAbort = () => server.cancelWait();
    interaction.signal.addEventListener("abort", onAbort, { once: true });
    if (interaction.signal.aborted)
        onAbort();
    let code;
    let state;
    let manualInput;
    let manualError;
    try {
        const authParams = new URLSearchParams({
            code: "true",
            client_id: CLIENT_ID,
            response_type: "code",
            redirect_uri: REDIRECT_URI,
            scope: SCOPES,
            code_challenge: challenge,
            code_challenge_method: "S256",
            state: verifier,
        });
        interaction.notify({
            type: "auth_url",
            url: `${AUTHORIZE_URL}?${authParams.toString()}`,
            instructions: "Complete login in your browser. If the browser is on another machine, paste the final redirect URL here.",
        });
        const manualPromise = interaction
            .prompt({
            type: "manual_code",
            message: "Complete login in your browser, or paste the authorization code / redirect URL here:",
            placeholder: REDIRECT_URI,
            signal: manualAbort.signal,
        })
            .then((input) => {
            manualInput = input;
            server.cancelWait();
        })
            .catch((error) => {
            manualError = error instanceof Error ? error : new Error(String(error));
            server.cancelWait();
        });
        const result = await server.waitForCode();
        if (manualError)
            throw manualError;
        if (result?.code) {
            code = result.code;
            state = result.state;
        }
        else if (manualInput) {
            const parsed = parseAuthorizationInput(manualInput);
            if (parsed.state && parsed.state !== verifier)
                throw new Error("OAuth state mismatch");
            code = parsed.code;
            state = parsed.state ?? verifier;
        }
        if (!code) {
            await manualPromise;
            if (manualError)
                throw manualError;
            if (manualInput) {
                const parsed = parseAuthorizationInput(manualInput);
                if (parsed.state && parsed.state !== verifier)
                    throw new Error("OAuth state mismatch");
                code = parsed.code;
                state = parsed.state ?? verifier;
            }
        }
        if (!code)
            throw new Error("Missing authorization code");
        if (!state)
            throw new Error("Missing OAuth state");
        interaction.notify({ type: "progress", message: "Exchanging authorization code for tokens..." });
        return exchangeAuthorizationCode(code, state, verifier, REDIRECT_URI, interaction.signal);
    }
    finally {
        interaction.signal.removeEventListener("abort", onAbort);
        manualAbort.abort();
        server.server.close();
    }
}
/**
 * Refresh Anthropic OAuth token
 */
async function refreshAnthropicToken(refreshToken, signal) {
    let responseBody;
    try {
        responseBody = await postJson(TOKEN_URL, {
            grant_type: "refresh_token",
            client_id: CLIENT_ID,
            refresh_token: refreshToken,
        }, signal);
    }
    catch (error) {
        throw new Error(`Anthropic token refresh request failed. url=${TOKEN_URL}; details=${formatErrorDetails(error)}`);
    }
    let data;
    try {
        data = JSON.parse(responseBody);
    }
    catch (error) {
        throw new Error(`Anthropic token refresh returned invalid JSON. url=${TOKEN_URL}; body=${responseBody}; details=${formatErrorDetails(error)}`);
    }
    return {
        type: "oauth",
        refresh: data.refresh_token,
        access: data.access_token,
        expires: Date.now() + data.expires_in * 1000 - 5 * 60 * 1000,
    };
}
export const anthropicOAuth = {
    name: "Anthropic (Claude Pro/Max)",
    isSubscription: true,
    login: loginAnthropic,
    refresh: (credential, signal) => refreshAnthropicToken(credential.refresh, signal),
    async toAuth(credential) {
        return { apiKey: credential.access };
    },
};
//# sourceMappingURL=anthropic.js.map