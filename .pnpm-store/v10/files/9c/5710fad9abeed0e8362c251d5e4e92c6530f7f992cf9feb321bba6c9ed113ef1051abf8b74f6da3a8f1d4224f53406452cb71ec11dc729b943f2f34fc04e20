/**
 * xAI OAuth device-code flow.
 */
import { pollOAuthDeviceCodeFlow } from "./device-code.js";
const XAI_CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828";
const XAI_SCOPE = "openid profile email offline_access grok-cli:access api:access";
const XAI_DEVICE_CODE_URL = "https://auth.x.ai/oauth2/device/code";
const XAI_TOKEN_URL = "https://auth.x.ai/oauth2/token";
// Refresh slightly before the reported expiry to avoid using a token that dies mid-request.
const REFRESH_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;
function requiredString(body, field) {
    const value = body[field];
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`Invalid xAI OAuth response field: ${field}`);
    }
    return value;
}
function positiveNumber(body, field) {
    const value = body[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid xAI OAuth response field: ${field}`);
    }
    return value;
}
// The verification URI is opened in the user's browser; force it to be an https URL
// so a malicious response cannot make `open` launch something else.
function validateVerificationUri(raw) {
    let url;
    try {
        url = new URL(raw);
    }
    catch {
        throw new Error("Untrusted verification URI in xAI OAuth response");
    }
    if (url.protocol !== "https:") {
        throw new Error("Untrusted verification URI in xAI OAuth response");
    }
    return url.href;
}
async function postForm(url, fields, signal) {
    let response;
    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(fields),
            signal,
        });
    }
    catch (error) {
        if (signal.aborted) {
            throw new Error("Login cancelled");
        }
        throw error;
    }
    let body;
    try {
        const parsed = (await response.json());
        body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    }
    catch {
        if (signal.aborted) {
            throw new Error("Login cancelled");
        }
        throw new Error(`xAI OAuth returned invalid JSON (HTTP ${response.status})`);
    }
    return {
        ok: response.ok,
        status: response.status,
        body,
    };
}
function requestFailure(action, response) {
    const error = typeof response.body.error === "string" ? response.body.error : undefined;
    const description = typeof response.body.error_description === "string" ? response.body.error_description : undefined;
    const detail = [error, description].filter(Boolean).join(": ");
    return new Error(`xAI OAuth ${action} failed (HTTP ${response.status})${detail ? `: ${detail}` : ""}`);
}
function parseDeviceCode(body) {
    // RFC 8628 allows interval 0 (no minimum wait); fall back to the poller's
    // default instead of failing on non-positive or malformed values.
    const interval = body.interval;
    const intervalSeconds = typeof interval === "number" && Number.isFinite(interval) && interval > 0 ? interval : undefined;
    const verificationUriComplete = typeof body.verification_uri_complete === "string" && body.verification_uri_complete.length > 0
        ? validateVerificationUri(body.verification_uri_complete)
        : undefined;
    return {
        deviceCode: requiredString(body, "device_code"),
        userCode: requiredString(body, "user_code"),
        verificationUri: validateVerificationUri(requiredString(body, "verification_uri")),
        verificationUriComplete,
        intervalSeconds,
        expiresInSeconds: positiveNumber(body, "expires_in"),
    };
}
function credentialsFromTokenResponse(body, previousRefreshToken) {
    const access = requiredString(body, "access_token");
    // xAI may omit refresh_token on refresh when the token is not rotated.
    const refresh = body.refresh_token === undefined && previousRefreshToken
        ? previousRefreshToken
        : requiredString(body, "refresh_token");
    const expiresInSeconds = body.expires_in === undefined ? DEFAULT_TOKEN_LIFETIME_SECONDS : positiveNumber(body, "expires_in");
    return {
        type: "oauth",
        access,
        refresh,
        expires: Date.now() + expiresInSeconds * 1000 - REFRESH_SKEW_MS,
    };
}
async function requestDeviceCode(signal) {
    const response = await postForm(XAI_DEVICE_CODE_URL, {
        client_id: XAI_CLIENT_ID,
        scope: XAI_SCOPE,
        referrer: "pi",
    }, signal);
    if (!response.ok) {
        throw requestFailure("device authorization", response);
    }
    return parseDeviceCode(response.body);
}
async function pollForTokens(device, signal) {
    return pollOAuthDeviceCodeFlow({
        intervalSeconds: device.intervalSeconds,
        expiresInSeconds: device.expiresInSeconds,
        waitBeforeFirstPoll: true,
        signal,
        poll: async () => {
            const response = await postForm(XAI_TOKEN_URL, {
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                client_id: XAI_CLIENT_ID,
                device_code: device.deviceCode,
            }, signal);
            if (response.ok) {
                return { status: "complete", value: credentialsFromTokenResponse(response.body) };
            }
            const error = response.body.error;
            if (error === "authorization_pending") {
                return { status: "pending" };
            }
            if (error === "slow_down") {
                const interval = response.body.interval;
                return { status: "slow_down", intervalSeconds: typeof interval === "number" ? interval : undefined };
            }
            if (error === "access_denied" || error === "authorization_denied") {
                return { status: "failed", message: "xAI device authorization was denied" };
            }
            if (error === "expired_token") {
                return { status: "failed", message: "xAI device code expired" };
            }
            return { status: "failed", message: requestFailure("device token polling", response).message };
        },
    });
}
async function loginXai(interaction) {
    const device = await requestDeviceCode(interaction.signal);
    interaction.notify({
        type: "device_code",
        userCode: device.userCode,
        verificationUri: device.verificationUriComplete ?? device.verificationUri,
        intervalSeconds: device.intervalSeconds,
        expiresInSeconds: device.expiresInSeconds,
    });
    return pollForTokens(device, interaction.signal);
}
async function refreshXaiToken(refreshToken, signal) {
    const response = await postForm(XAI_TOKEN_URL, {
        grant_type: "refresh_token",
        client_id: XAI_CLIENT_ID,
        refresh_token: refreshToken,
    }, signal);
    if (!response.ok) {
        throw requestFailure("token refresh", response);
    }
    return credentialsFromTokenResponse(response.body, refreshToken);
}
export const xaiOAuth = {
    name: "xAI (Grok/X subscription)",
    isSubscription: true,
    loginLabel: "Sign in with SuperGrok or X Premium",
    login: loginXai,
    refresh: (credential, signal) => refreshXaiToken(credential.refresh, signal),
    async toAuth(credential) {
        return { apiKey: credential.access };
    },
};
//# sourceMappingURL=xai.js.map