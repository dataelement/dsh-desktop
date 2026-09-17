import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { ZAI_CODING_CN_MODELS } from "./zai-coding-cn.models.js";
export function zaiCodingCnProvider() {
    return createProvider({
        id: "zai-coding-cn",
        name: "Z.AI Coding CN",
        baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
        auth: { apiKey: envApiKeyAuth("Z.AI Coding CN API key", ["ZAI_CODING_CN_API_KEY"]) },
        models: Object.values(ZAI_CODING_CN_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=zai-coding-cn.js.map