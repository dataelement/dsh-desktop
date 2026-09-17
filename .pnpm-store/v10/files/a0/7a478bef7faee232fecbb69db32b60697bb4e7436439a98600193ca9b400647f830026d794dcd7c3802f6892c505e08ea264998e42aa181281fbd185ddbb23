var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
// NEVER convert to top-level imports - breaks browser/Vite builds
let _existsSync = null;
let _homedir = null;
let _join = null;
const dynamicImport = (specifier) => import(__rewriteRelativeImportExtension(specifier));
const NODE_FS_SPECIFIER = "node:" + "fs";
const NODE_OS_SPECIFIER = "node:" + "os";
const NODE_PATH_SPECIFIER = "node:" + "path";
// Eagerly load in Node.js/Bun environment only
if (typeof process !== "undefined" && (process.versions?.node || process.versions?.bun)) {
    dynamicImport(NODE_FS_SPECIFIER).then((m) => {
        _existsSync = m.existsSync;
    });
    dynamicImport(NODE_OS_SPECIFIER).then((m) => {
        _homedir = m.homedir;
    });
    dynamicImport(NODE_PATH_SPECIFIER).then((m) => {
        _join = m.join;
    });
}
import { getProviderEnvValue } from "./utils/provider-env.js";
export const ANTHROPIC_AUTH_TOKEN_ENV = "ANTHROPIC_AUTH_TOKEN";
export const ANTHROPIC_OAUTH_TOKEN_ENV = "ANTHROPIC_OAUTH_TOKEN";
export const ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY";
let cachedVertexAdcCredentialsExists = null;
function hasVertexAdcCredentials(env) {
    const explicitCredentialsPath = env?.GOOGLE_APPLICATION_CREDENTIALS;
    if (explicitCredentialsPath) {
        return _existsSync ? _existsSync(explicitCredentialsPath) : false;
    }
    if (cachedVertexAdcCredentialsExists === null) {
        // If node modules haven't loaded yet (async import race at startup),
        // return false WITHOUT caching so the next call retries once they're ready.
        // Only cache false permanently in a browser environment where fs is never available.
        if (!_existsSync || !_homedir || !_join) {
            const isNode = typeof process !== "undefined" && (process.versions?.node || process.versions?.bun);
            if (!isNode) {
                // Definitively in a browser — safe to cache false permanently
                cachedVertexAdcCredentialsExists = false;
            }
            return false;
        }
        // Check GOOGLE_APPLICATION_CREDENTIALS env var first (standard way)
        const gacPath = getProviderEnvValue("GOOGLE_APPLICATION_CREDENTIALS", env);
        if (gacPath) {
            cachedVertexAdcCredentialsExists = _existsSync(gacPath);
        }
        else {
            // Fall back to default ADC path (lazy evaluation)
            cachedVertexAdcCredentialsExists = _existsSync(_join(_homedir(), ".config", "gcloud", "application_default_credentials.json"));
        }
    }
    return cachedVertexAdcCredentialsExists;
}
function getApiKeyEnvVars(provider) {
    if (provider === "github-copilot") {
        return ["COPILOT_GITHUB_TOKEN"];
    }
    // ANTHROPIC_AUTH_TOKEN participates in env discovery/status, but
    // getEnvApiKey() skips it because requests must pass it as Authorization: Bearer.
    if (provider === "anthropic") {
        return [ANTHROPIC_AUTH_TOKEN_ENV, ANTHROPIC_OAUTH_TOKEN_ENV, ANTHROPIC_API_KEY_ENV];
    }
    const envMap = {
        "ant-ling": "ANT_LING_API_KEY",
        "qwen-token-plan": "QWEN_TOKEN_PLAN_API_KEY",
        "qwen-token-plan-cn": "QWEN_TOKEN_PLAN_CN_API_KEY",
        "qwen-token-plan-individual": "QWEN_TOKEN_PLAN_API_KEY",
        openai: "OPENAI_API_KEY",
        "azure-openai-responses": "AZURE_OPENAI_API_KEY",
        nvidia: "NVIDIA_API_KEY",
        deepseek: "DEEPSEEK_API_KEY",
        google: "GEMINI_API_KEY",
        "google-vertex": "GOOGLE_CLOUD_API_KEY",
        groq: "GROQ_API_KEY",
        cerebras: "CEREBRAS_API_KEY",
        xai: "XAI_API_KEY",
        radius: "RADIUS_API_KEY",
        openrouter: "OPENROUTER_API_KEY",
        "vercel-ai-gateway": "AI_GATEWAY_API_KEY",
        zai: "ZAI_API_KEY",
        "zai-coding-cn": "ZAI_CODING_CN_API_KEY",
        mistral: "MISTRAL_API_KEY",
        minimax: "MINIMAX_API_KEY",
        "minimax-cn": "MINIMAX_CN_API_KEY",
        moonshotai: "MOONSHOT_API_KEY",
        "moonshotai-cn": "MOONSHOT_API_KEY",
        huggingface: "HF_TOKEN",
        fireworks: "FIREWORKS_API_KEY",
        together: "TOGETHER_API_KEY",
        baseten: "BASETEN_API_KEY",
        opencode: "OPENCODE_API_KEY",
        "opencode-go": "OPENCODE_API_KEY",
        "kimi-coding": "KIMI_API_KEY",
        "cloudflare-workers-ai": "CLOUDFLARE_API_KEY",
        "cloudflare-ai-gateway": "CLOUDFLARE_API_KEY",
        xiaomi: "XIAOMI_API_KEY",
        "xiaomi-token-plan-cn": "XIAOMI_TOKEN_PLAN_CN_API_KEY",
        "xiaomi-token-plan-ams": "XIAOMI_TOKEN_PLAN_AMS_API_KEY",
        "xiaomi-token-plan-sgp": "XIAOMI_TOKEN_PLAN_SGP_API_KEY",
    };
    const envVar = envMap[provider];
    return envVar ? [envVar] : undefined;
}
export function findEnvKeys(provider, env) {
    const envVars = getApiKeyEnvVars(provider);
    if (!envVars)
        return undefined;
    const found = envVars.filter((envVar) => !!getProviderEnvValue(envVar, env));
    return found.length > 0 ? found : undefined;
}
export function getEnvApiKey(provider, env) {
    const envKeys = findEnvKeys(provider, env);
    if (envKeys?.[0]) {
        const apiKeyEnv = provider === "anthropic" ? envKeys.find((key) => key !== ANTHROPIC_AUTH_TOKEN_ENV) : envKeys[0];
        if (apiKeyEnv)
            return getProviderEnvValue(apiKeyEnv, env);
    }
    // Vertex AI supports either an explicit API key or Application Default Credentials.
    // Auth is configured via `gcloud auth application-default login`.
    if (provider === "google-vertex") {
        const hasCredentials = hasVertexAdcCredentials(env);
        const hasProject = !!(getProviderEnvValue("GOOGLE_CLOUD_PROJECT", env) || getProviderEnvValue("GCLOUD_PROJECT", env));
        const hasLocation = !!getProviderEnvValue("GOOGLE_CLOUD_LOCATION", env);
        if (hasCredentials && hasProject && hasLocation) {
            return "<authenticated>";
        }
    }
    if (provider === "amazon-bedrock") {
        // Amazon Bedrock supports multiple credential sources:
        // 1. AWS_PROFILE - named profile from ~/.aws/credentials
        // 2. AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY - standard IAM keys
        // 3. AWS_BEARER_TOKEN_BEDROCK - Bedrock bearer token
        // 4. AWS_CONTAINER_CREDENTIALS_RELATIVE_URI - ECS task roles
        // 5. AWS_CONTAINER_CREDENTIALS_FULL_URI - ECS task roles (full URI)
        // 6. AWS_WEB_IDENTITY_TOKEN_FILE - IRSA (IAM Roles for Service Accounts)
        if (getProviderEnvValue("AWS_PROFILE", env) ||
            (getProviderEnvValue("AWS_ACCESS_KEY_ID", env) && getProviderEnvValue("AWS_SECRET_ACCESS_KEY", env)) ||
            getProviderEnvValue("AWS_BEARER_TOKEN_BEDROCK", env) ||
            getProviderEnvValue("AWS_CONTAINER_CREDENTIALS_RELATIVE_URI", env) ||
            getProviderEnvValue("AWS_CONTAINER_CREDENTIALS_FULL_URI", env) ||
            getProviderEnvValue("AWS_WEB_IDENTITY_TOKEN_FILE", env)) {
            return "<authenticated>";
        }
    }
    return undefined;
}
//# sourceMappingURL=env-api-keys.js.map