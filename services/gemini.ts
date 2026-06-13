
const AI_SETTINGS_KEY = 'resume-builder-ai-settings';

export interface AISettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AIProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  modelOverrides?: Record<string, string>; // moduleKey → model name
  cachedModels?: string[]; // fetched model list cache
}

export const AI_MODULES = {
  'resume': '简历优化',
  'jd-parse': '职位解析',
  'skill-advice': '学习建议',
  'skill-roadmap': '技能路线图',
} as const;

export type AIModuleKey = keyof typeof AI_MODULES;

export interface AISettingsStore {
  activeProfileId: string;
  profiles: AIProfile[];
}

const DEFAULT_SETTINGS: AISettings = {
  baseUrl: '',
  apiKey: '',
  model: 'gemini-3-pro-preview-bs',
};

const generateProfileId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

/**
 * Load the full multi-profile store from localStorage.
 * Migrates old single-settings format automatically.
 */
export function loadAISettingsStore(): AISettingsStore {
  try {
    const saved = localStorage.getItem(AI_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // New multi-profile format
      if (parsed.profiles && Array.isArray(parsed.profiles)) {
        return parsed as AISettingsStore;
      }
      // Old single-settings format → migrate
      if (parsed.baseUrl !== undefined) {
        const migrated: AIProfile = {
          id: generateProfileId(),
          name: parsed.baseUrl ? new URL(parsed.baseUrl.startsWith('http') ? parsed.baseUrl : `https://${parsed.baseUrl}`).host || '默认' : '默认',
          baseUrl: parsed.baseUrl || '',
          apiKey: parsed.apiKey || '',
          model: parsed.model || 'gemini-3-pro-preview-bs',
        };
        const store: AISettingsStore = { activeProfileId: migrated.id, profiles: [migrated] };
        localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(store));
        return store;
      }
    }
  } catch (e) {
    console.error('Failed to load AI settings store:', e);
  }
  // Empty store with one blank profile
  const blank: AIProfile = { id: generateProfileId(), name: '默认', baseUrl: '', apiKey: '', model: 'gemini-3-pro-preview-bs' };
  return { activeProfileId: blank.id, profiles: [blank] };
}

export function saveAISettingsStore(store: AISettingsStore): void {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent('ai-settings-changed'));
}

/**
 * Returns the active profile's settings as a flat AISettings object.
 * If moduleKey is provided, uses the module-specific model override if set.
 */
export function loadAISettings(moduleKey?: AIModuleKey): AISettings {
  const store = loadAISettingsStore();
  const active = store.profiles.find(p => p.id === store.activeProfileId) || store.profiles[0];
  if (!active) return DEFAULT_SETTINGS;
  let model = active.model;
  if (moduleKey && active.modelOverrides?.[moduleKey]) {
    model = active.modelOverrides[moduleKey]!;
  }
  return { baseUrl: active.baseUrl, apiKey: active.apiKey, model };
}

/**
 * @deprecated Use saveAISettingsStore() for multi-profile support.
 * Kept for backward compat — updates the active profile in-place.
 */
export function saveAISettings(settings: AISettings): void {
  const store = loadAISettingsStore();
  const idx = store.profiles.findIndex(p => p.id === store.activeProfileId);
  if (idx >= 0) {
    store.profiles[idx] = { ...store.profiles[idx], ...settings };
  }
  saveAISettingsStore(store);
}

/**
 * 自动补全修正 base URL 路径
 */
export function normalizeBaseUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '');

  if (u && !/^https?:\/\//i.test(u)) {
    u = 'https://' + u;
  }

  if (u.endsWith('/chat/completions')) {
    return u;
  }
  if (/\/v\d+$/.test(u)) {
    return u + '/chat/completions';
  }
  return u + '/v1/chat/completions';
}

/**
 * 从 base URL 推导出模型列表端点
 */
function getModelsEndpoint(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) {
    u = 'https://' + u;
  }
  u = u.replace(/\/chat\/completions$/, '');
  if (/\/v\d+$/.test(u)) return u + '/models';
  return u + '/v1/models';
}

/**
 * 获取可用模型列表
 */
export async function fetchModelList(baseUrl: string, apiKey: string): Promise<string[]> {
  const endpoint = getModelsEndpoint(baseUrl);
  const response = await fetch(endpoint, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('此 API 不支持获取模型列表，请手动输入模型名称');
    }
    const errBody = await response.text();
    throw new Error(`获取模型列表失败 (${response.status}): ${errBody.slice(0, 200)}`);
  }
  const data = await response.json();
  const models: string[] = (data.data || []).map((m: any) => m.id).sort();
  return models;
}

export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContentPart[];
}

/**
 * 自动重试：网络错误或 5xx/429 状态码时重试，最多 maxRetries 次
 */
async function fetchWithRetry(
  input: RequestInfo,
  init: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      // 5xx 或 429 可重试
      if (response.status >= 500 || response.status === 429) {
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error('请求失败');
}

/**
 * 带历史消息的对话式调用
 */
export async function chatWithAI(messages: ChatMessage[], moduleKey?: AIModuleKey): Promise<string> {
  const settings = loadAISettings(moduleKey);

  if (!settings.baseUrl || !settings.apiKey) {
    throw new Error('请先配置 AI 设置（Base URL 和 API Key）');
  }

  const endpoint = normalizeBaseUrl(settings.baseUrl);

  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gemini-3-pro-preview-bs',
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content?.trim();
  if (!result) {
    throw new Error('API 返回内容为空');
  }
  return result;
}

/**
 * 请求 AI 返回 JSON 格式响应并解析为指定类型
 * 兼容所有 OpenAI 兼容 API，通过 system prompt 描述 JSON schema
 */
export async function chatWithAIJson<T>(messages: ChatMessage[], moduleKey?: AIModuleKey): Promise<T> {
  const settings = loadAISettings(moduleKey);

  if (!settings.baseUrl || !settings.apiKey) {
    throw new Error('请先配置 AI 设置（Base URL 和 API Key）');
  }

  const endpoint = normalizeBaseUrl(settings.baseUrl);

  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gemini-3-pro-preview-bs',
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('API 返回内容为空');
  }

  // 容错处理：去掉 markdown 代码块包裹
  let jsonStr = content;
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    throw new Error(`JSON 解析失败: ${(e as Error).message}\n原始内容: ${jsonStr.slice(0, 200)}`);
  }
}

export async function optimizeResumeText(text: string, context: string): Promise<string> {
  const settings = loadAISettings('resume');

  if (!settings.baseUrl || !settings.apiKey) {
    throw new Error('请先配置 AI 设置（Base URL 和 API Key）');
  }

  const endpoint = normalizeBaseUrl(settings.baseUrl);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || 'gemini-3-pro-preview-bs',
        messages: [
          {
            role: 'system',
            content: '你是一名专业的简历顾问。请优化用户提供的简历内容。要求：1. 语言更专业、精炼。2. 突出成就和可量化的结果。3. 保持真实的背景信息。4. 返回优化后的纯文本，不要带有Markdown标签或多余解释。'
          },
          {
            role: 'user',
            content: `简历板块：${context}\n原始内容：${text}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`API 请求失败 (${response.status}): ${errBody.slice(0, 300)}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();
    if (!result) {
      throw new Error('API 返回内容为空');
    }
    return result;
  } catch (error) {
    console.error('AI optimization failed:', error);
    throw error;
  }
}
