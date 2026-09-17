/**
 * GitHub Copilot OAuth flow
 */
import { GITHUB_COPILOT_MODELS } from "../../providers/github-copilot.models.js";
import { sleep } from "../../utils/sleep.js";
import { pollOAuthDeviceCodeFlow } from "./device-code.js";
const decode = (s) => atob(s);
const CLIENT_ID = decode("SXYxLmI1MDdhMDhjODdlY2ZlOTg=");
const COPILOT_HEADERS = {
    "User-Agent": "GitHubCopilotChat/0.35.0",
    "Editor-Version": "vscode/1.107.0",
    "Editor-Plugin-Version": "copilot-chat/0.35.0",
    "Copilot-Integration-Id": "vscode-chat",
};
const COPILOT_API_VERSION = "2026-06-01";
function normalizeDomain(input) {
    const trimmed = input.trim();
    if (!trimmed)
        return null;
    try {
        const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
        return url.hostname;
    }
    catch {
        return null;
    }
}
function getUrls(domain) {
    return {
        deviceCodeUrl: `https://${domain}/login/device/code`,
        accessTokenUrl: `https://${domain}/login/oauth/access_token`,
        copilotTokenUrl: `https://api.${domain}/copilot_internal/v2/token`,
    };
}
/**
 * Parse the proxy-ep from a Copilot token and convert to API base URL.
 * Token format: tid=...;exp=...;proxy-ep=proxy.individual.githubcopilot.com;...
 * Returns API URL like https://api.individual.githubcopilot.com
 */
function getBaseUrlFromToken(token) {
    const match = token.match(/proxy-ep=([^;]+)/);
    if (!match)
        return null;
    const proxyHost = match[1];
    // Convert proxy.xxx to api.xxx
    const apiHost = proxyHost.replace(/^proxy\./, "api.");
    return `https://${apiHost}`;
}
function getGitHubCopilotBaseUrl(token, enterpriseDomain) {
    // If we have a token, extract the base URL from proxy-ep
    if (token) {
        const urlFromToken = getBaseUrlFromToken(token);
        if (urlFromToken)
            return urlFromToken;
    }
    // Fallback for enterprise or if token parsing fails
    if (enterpriseDomain)
        return `https://copilot-api.${enterpriseDomain}`;
    return "https://api.individual.githubcopilot.com";
}
function asRecord(value) {
    return value && typeof value === "object" ? value : undefined;
}
function parseGitHubCopilotModelCatalog(raw, allowPolicyFallback) {
    const data = asRecord(raw)?.data;
    if (!Array.isArray(data)) {
        throw new Error("Invalid Copilot models response");
    }
    const accountModels = data.flatMap((rawItem) => {
        const item = asRecord(rawItem);
        const id = item?.id;
        if (!item || typeof id !== "string")
            return [];
        const capabilities = asRecord(item.capabilities);
        const supports = asRecord(capabilities?.supports);
        if (supports?.tool_calls === false)
            return [];
        return [
            {
                id,
                pickerEnabled: item.model_picker_enabled === true,
                policyState: asRecord(item.policy)?.state,
            },
        ];
    });
    const pickerModelIds = accountModels
        .filter((model) => model.pickerEnabled && model.policyState !== "disabled")
        .map((model) => model.id);
    const usePolicyFallback = allowPolicyFallback && pickerModelIds.length === 0;
    const availableModelIds = pickerModelIds.length > 0 || !allowPolicyFallback
        ? pickerModelIds
        : accountModels.filter((model) => model.policyState === "enabled").map((model) => model.id);
    const policyModelIds = accountModels
        .filter((model) => model.policyState === "unconfigured" &&
        Object.hasOwn(GITHUB_COPILOT_MODELS, model.id) &&
        (model.pickerEnabled || usePolicyFallback))
        .map((model) => model.id);
    return { availableModelIds, policyModelIds };
}
async function fetchWithRateLimitRetry(url, init, signal, retryPolicy) {
    const retryBudgetSignal = retryPolicy.maxRetries > 0 && retryPolicy.maxElapsedMs > 0
        ? AbortSignal.timeout(retryPolicy.maxElapsedMs)
        : undefined;
    const requestSignal = retryBudgetSignal ? AbortSignal.any([signal, retryBudgetSignal]) : signal;
    const retryDeadline = retryBudgetSignal ? Date.now() + retryPolicy.maxElapsedMs : undefined;
    for (let retry = 0;; retry++) {
        const response = await fetch(url, {
            ...init,
            signal: AbortSignal.any([requestSignal, AbortSignal.timeout(5000)]),
        });
        if (response.status !== 429 || retry === retryPolicy.maxRetries)
            return response;
        const retryAfter = response.headers.get("retry-after");
        let delayMs = 500 * 2 ** retry;
        if (retryAfter) {
            const seconds = Number.parseFloat(retryAfter);
            delayMs = Number.isNaN(seconds) ? Date.parse(retryAfter) - Date.now() : seconds * 1000;
            if (!Number.isFinite(delayMs))
                return response;
        }
        delayMs = Math.max(0, delayMs);
        if (retryDeadline !== undefined && delayMs >= retryDeadline - Date.now())
            return response;
        await response.body?.cancel();
        await sleep(delayMs, requestSignal);
    }
}
async function fetchGitHubCopilotModels(copilotToken, enterpriseDomain, signal, retryPolicy) {
    const baseUrl = getGitHubCopilotBaseUrl(copilotToken, enterpriseDomain);
    // Some Individual accounts return false for every picker flag despite explicit enabled policies.
    // Limit the fallback to that endpoint so other account types keep strict picker semantics.
    const allowPolicyFallback = baseUrl === "https://api.individual.githubcopilot.com";
    const response = await fetchWithRateLimitRetry(`${baseUrl}/models`, {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${copilotToken}`,
            ...COPILOT_HEADERS,
            "X-GitHub-Api-Version": COPILOT_API_VERSION,
        },
    }, signal, retryPolicy);
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
    }
    return parseGitHubCopilotModelCatalog(await response.json(), allowPolicyFallback);
}
async function fetchJson(url, init) {
    const response = await fetch(url, init);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }
    return response.json();
}
async function startDeviceFlow(domain, signal) {
    const urls = getUrls(domain);
    const data = await fetchJson(urls.deviceCodeUrl, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "GitHubCopilotChat/0.35.0",
        },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            scope: "read:user",
        }),
        signal,
    });
    if (!data || typeof data !== "object") {
        throw new Error("Invalid device code response");
    }
    const deviceCode = data.device_code;
    const userCode = data.user_code;
    const verificationUri = data.verification_uri;
    const interval = data.interval;
    const expiresIn = data.expires_in;
    if (typeof deviceCode !== "string" ||
        typeof userCode !== "string" ||
        typeof verificationUri !== "string" ||
        (interval !== undefined && typeof interval !== "number") ||
        typeof expiresIn !== "number") {
        throw new Error("Invalid device code response fields");
    }
    // The verification URI is opened in the user's browser and to prevent `open` from
    // opening an executable or similar, we force it to be a URL.
    let parsedUri;
    try {
        parsedUri = new URL(verificationUri);
    }
    catch {
        throw new Error("Untrusted verification_uri in device code response");
    }
    if (parsedUri.protocol !== "https:" && parsedUri.protocol !== "http:") {
        throw new Error("Untrusted verification_uri in device code response");
    }
    return {
        device_code: deviceCode,
        user_code: userCode,
        verification_uri: parsedUri.href,
        interval,
        expires_in: expiresIn,
    };
}
async function pollForGitHubAccessToken(domain, device, signal) {
    const urls = getUrls(domain);
    return pollOAuthDeviceCodeFlow({
        intervalSeconds: device.interval,
        expiresInSeconds: device.expires_in,
        waitBeforeFirstPoll: true,
        signal,
        poll: async () => {
            const raw = await fetchJson(urls.accessTokenUrl, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "GitHubCopilotChat/0.35.0",
                },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    device_code: device.device_code,
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                }),
                signal,
            });
            if (raw && typeof raw === "object" && typeof raw.access_token === "string") {
                return { status: "complete", value: raw.access_token };
            }
            if (raw && typeof raw === "object" && typeof raw.error === "string") {
                const { error, error_description: description, interval } = raw;
                if (error === "authorization_pending") {
                    return { status: "pending" };
                }
                if (error === "slow_down") {
                    return { status: "slow_down", intervalSeconds: typeof interval === "number" ? interval : undefined };
                }
                const descriptionSuffix = description ? `: ${description}` : "";
                return { status: "failed", message: `Device flow failed: ${error}${descriptionSuffix}` };
            }
            return { status: "failed", message: "Invalid device token response" };
        },
    });
}
async function refreshGitHubCopilotAccessToken(refreshToken, enterpriseDomain, signal) {
    const domain = enterpriseDomain || "github.com";
    const urls = getUrls(domain);
    const raw = await fetchJson(urls.copilotTokenUrl, {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${refreshToken}`,
            ...COPILOT_HEADERS,
        },
        signal,
    });
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid Copilot token response");
    }
    const token = raw.token;
    const expiresAt = raw.expires_at;
    if (typeof token !== "string" || typeof expiresAt !== "number") {
        throw new Error("Invalid Copilot token response fields");
    }
    return {
        type: "oauth",
        refresh: refreshToken,
        access: token,
        expires: expiresAt * 1000 - 5 * 60 * 1000,
        enterpriseUrl: enterpriseDomain,
    };
}
/**
 * Refresh GitHub Copilot token
 */
async function refreshGitHubCopilotToken(refreshToken, enterpriseDomain, signal) {
    const credentials = await refreshGitHubCopilotAccessToken(refreshToken, enterpriseDomain, signal);
    const { availableModelIds } = await fetchGitHubCopilotModels(credentials.access, enterpriseDomain, signal, {
        maxRetries: 0,
        maxElapsedMs: 0,
    });
    return {
        ...credentials,
        availableModelIds,
    };
}
/**
 * Enable a model for the user's GitHub Copilot account.
 * This is required for some models (like Claude, Grok) before they can be used.
 */
async function enableGitHubCopilotModel(token, modelId, enterpriseDomain, signal) {
    const baseUrl = getGitHubCopilotBaseUrl(token, enterpriseDomain);
    const url = `${baseUrl}/models/${modelId}/policy`;
    let response;
    try {
        response = await fetchWithRateLimitRetry(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...COPILOT_HEADERS,
                "openai-intent": "chat-policy",
                "x-interaction-type": "chat-policy",
            },
            body: JSON.stringify({ state: "enabled" }),
        }, signal, { maxRetries: 2, maxElapsedMs: 5000 });
    }
    catch (error) {
        if (signal.aborted)
            throw error;
        return false;
    }
    if (response.status === 429) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
    }
    return response.ok;
}
/**
 * Enable the requested GitHub Copilot models and return the successful IDs.
 * Policy updates are best effort; exhausted rate limiting stops the batch.
 */
async function enableGitHubCopilotModels(token, modelIds, enterpriseDomain, signal) {
    const enabledModelIds = [];
    for (const modelId of modelIds) {
        try {
            if (await enableGitHubCopilotModel(token, modelId, enterpriseDomain, signal)) {
                enabledModelIds.push(modelId);
            }
        }
        catch (error) {
            if (signal.aborted)
                throw error;
            break;
        }
    }
    return enabledModelIds;
}
async function loginGitHubCopilot(interaction) {
    const input = await interaction.prompt({
        type: "text",
        message: "GitHub Enterprise URL/domain (blank for github.com)",
        placeholder: "company.ghe.com",
    });
    if (interaction.signal.aborted)
        throw new Error("Login cancelled");
    const trimmed = input.trim();
    const enterpriseDomain = normalizeDomain(input);
    if (trimmed && !enterpriseDomain)
        throw new Error("Invalid GitHub Enterprise URL/domain");
    const domain = enterpriseDomain || "github.com";
    const device = await startDeviceFlow(domain, interaction.signal);
    interaction.notify({
        type: "device_code",
        userCode: device.user_code,
        verificationUri: device.verification_uri,
        intervalSeconds: device.interval,
        expiresInSeconds: device.expires_in,
    });
    const githubAccessToken = await pollForGitHubAccessToken(domain, device, interaction.signal);
    const credentials = await refreshGitHubCopilotAccessToken(githubAccessToken, enterpriseDomain ?? undefined, interaction.signal);
    const models = await fetchGitHubCopilotModels(credentials.access, enterpriseDomain ?? undefined, interaction.signal, {
        maxRetries: 2,
        maxElapsedMs: 5000,
    });
    let enabledModelIds = [];
    if (models.policyModelIds.length > 0) {
        interaction.notify({ type: "progress", message: "Enabling models..." });
        enabledModelIds = await enableGitHubCopilotModels(credentials.access, models.policyModelIds, enterpriseDomain ?? undefined, interaction.signal);
    }
    return {
        ...credentials,
        availableModelIds: [...new Set([...models.availableModelIds, ...enabledModelIds])],
    };
}
function copilotEnterpriseDomain(credential) {
    const enterpriseUrl = credential.enterpriseUrl;
    if (typeof enterpriseUrl !== "string" || !enterpriseUrl)
        return undefined;
    return normalizeDomain(enterpriseUrl) ?? undefined;
}
export const githubCopilotOAuth = {
    name: "GitHub Copilot",
    isSubscription: true,
    login: loginGitHubCopilot,
    refresh: (credential, signal) => refreshGitHubCopilotToken(credential.refresh, copilotEnterpriseDomain(credential), signal),
    /** Derive the credential-specific proxy endpoint for each request. */
    async toAuth(credential) {
        return {
            apiKey: credential.access,
            baseUrl: getGitHubCopilotBaseUrl(credential.access, copilotEnterpriseDomain(credential)),
        };
    },
};
//# sourceMappingURL=github-copilot.js.map