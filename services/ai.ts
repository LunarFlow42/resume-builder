const AI_SETTINGS_KEY = 'resume-builder-ai-settings';

export type APIProtocol = 'openai' | 'claude' | 'gemini' | 'ollama' | 'azure';

export interface AISettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  apiProtocol?: APIProtocol;
}

export interface AIProfile {
  id: string;
  name: string;
  apiProtocol?: APIProtocol;
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
  model: '',
  apiProtocol: 'openai',
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
      if (parsed.profiles && Array.isArray(parsed.profiles)) {
        return parsed as AISettingsStore;
      }
    }
  } catch (e) {
    console.error('Failed to load AI settings store:', e);
  }
  // Empty store with one blank profile
  const blank: AIProfile = { id: generateProfileId(), name: '默认', baseUrl: '', apiKey: '', model: '', apiProtocol: 'openai' };
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
  return {
    baseUrl: active.baseUrl,
    apiKey: active.apiKey,
    model,
    apiProtocol: active.apiProtocol || 'openai'
  };
}

/**
 * 根据协议推导完整 API 请求 Endpoint
 */
export function getEndpoint(baseUrl: string, protocol: APIProtocol = 'openai', model = ''): string {
  let u = baseUrl.trim().replace(/\/+$/, '');
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) {
    u = (protocol === 'ollama' ? 'http://' : 'https://') + u;
  }

  if (protocol === 'claude') {
    if (u.endsWith('/v1/messages') || u.endsWith('/messages')) return u;
    if (/\/v\d+$/.test(u)) return u + '/messages';
    return u + '/v1/messages';
  }

  if (protocol === 'gemini') {
    if (u.includes(':generateContent')) return u;
    const m = model ? model.trim() : '{model}';
    if (/\/models\//.test(u)) return u + ':generateContent';
    if (/\/v\d+[a-z]*$/.test(u)) return u + `/models/${m}:generateContent`;
    return u + `/v1beta/models/${m}:generateContent`;
  }

  if (protocol === 'ollama') {
    if (u.endsWith('/api/chat') || u.endsWith('/chat')) return u;
    return u + '/api/chat';
  }

  if (protocol === 'azure') {
    return u; // Azure endpoint contains full path
  }

  // Default 'openai'
  if (u.endsWith('/chat/completions')) return u;
  if (/\/v\d+$/.test(u)) return u + '/chat/completions';
  return u + '/v1/chat/completions';
}


/**
 * 从 base URL 推导出模型列表端点
 */
function getModelsEndpoint(url: string, protocol: APIProtocol = 'openai'): string {
  let u = url.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) {
    u = (protocol === 'ollama' ? 'http://' : 'https://') + u;
  }
  if (protocol === 'ollama') {
    return u.replace(/\/api\/chat$/, '') + '/api/tags';
  }
  u = u.replace(/\/chat\/completions$/, '').replace(/\/messages$/, '');
  if (/\/v\d+$/.test(u)) return u + '/models';
  return u + '/v1/models';
}

/**
 * 获取可用模型列表
 */
export async function fetchModelList(baseUrl: string, apiKey: string, protocol: APIProtocol = 'openai'): Promise<string[]> {
  if (protocol === 'ollama') {
    const endpoint = getModelsEndpoint(baseUrl, 'ollama');
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`获取 Ollama 模型失败 (${response.status})`);
    const data = await response.json();
    return (data.models || []).map((m: any) => m.name).sort();
  }

  if (protocol === 'gemini') {
    let u = baseUrl.trim().replace(/\/+$/, '');
    if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
    const endpoint = `${u}/v1beta/models?key=${apiKey}`;
    const response = await fetch(endpoint, {
      headers: { 'x-goog-api-key': apiKey }
    });
    if (!response.ok) throw new Error(`获取 Gemini 模型失败 (${response.status})`);
    const data = await response.json();
    return (data.models || [])
      .map((m: any) => m.name ? m.name.replace(/^models\//, '') : '')
      .filter(Boolean)
      .sort();
  }

  const endpoint = getModelsEndpoint(baseUrl, protocol);
  const headers: Record<string, string> = {};
  if (protocol === 'azure') {
    headers['api-key'] = apiKey;
  } else if (protocol === 'claude') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, { headers });
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

interface RequestPayload {
  url: string;
  headers: Record<string, string>;
  body: any;
}

function buildPayload(
  settings: AISettings,
  messages: ChatMessage[],
  isJson = false
): RequestPayload {
  const protocol = settings.apiProtocol || 'openai';
  const model = settings.model ? settings.model.trim() : '';

  if (protocol === 'claude') {
    const systemMsg = messages.find(m => m.role === 'system');
    const userMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

    let systemText = typeof systemMsg?.content === 'string' ? systemMsg.content : undefined;
    if (isJson && systemText) {
      systemText += '\nRespond STRICTLY with valid JSON object format.';
    }

    return {
      url: getEndpoint(settings.baseUrl, 'claude'),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model,
        ...(systemText ? { system: systemText } : {}),
        messages: userMsgs,
        max_tokens: 4096,
        temperature: 0.7,
      }
    };
  }

  if (protocol === 'gemini') {
    const systemMsg = messages.find(m => m.role === 'system');
    const userMsgs = messages.filter(m => m.role !== 'system');
    const contents = userMsgs.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
    }));

    let endpoint = getEndpoint(settings.baseUrl, 'gemini', model);
    if (settings.apiKey) {
      endpoint += `${endpoint.includes('?') ? '&' : '?'}key=${encodeURIComponent(settings.apiKey)}`;
    }

    return {
      url: endpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(settings.apiKey ? { 'x-goog-api-key': settings.apiKey } : {})
      },
      body: {
        contents,
        ...(systemMsg ? {
          systemInstruction: { parts: [{ text: typeof systemMsg.content === 'string' ? systemMsg.content : '' }] }
        } : {}),
        generationConfig: {
          temperature: 0.7,
          ...(isJson ? { responseMimeType: 'application/json' } : {})
        }
      }
    };
  }

  if (protocol === 'ollama') {
    return {
      url: getEndpoint(settings.baseUrl, 'ollama'),
      headers: {
        'Content-Type': 'application/json',
        ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {})
      },
      body: {
        model,
        messages: messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })),
        stream: false,
        ...(isJson ? { format: 'json' } : {})
      }
    };
  }

  // OpenAI & Azure
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (protocol === 'azure') {
    headers['api-key'] = settings.apiKey;
  } else {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  const body: any = {
    model,
    messages,
    temperature: 0.7,
  };
  if (isJson) {
    body.response_format = { type: 'json_object' };
  }

  return {
    url: getEndpoint(settings.baseUrl, protocol),
    headers,
    body,
  };
}

function parseResponse(data: any, protocol: APIProtocol = 'openai'): string {
  if (protocol === 'claude') {
    const textPart = data.content?.find((c: any) => c.type === 'text') || data.content?.[0];
    return textPart?.text?.trim() || '';
  }
  if (protocol === 'gemini') {
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || '';
  }
  if (protocol === 'ollama') {
    return data.message?.content?.trim() || '';
  }
  // OpenAI & Azure
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * 带历史消息的对话式调用
 */
export async function chatWithAI(messages: ChatMessage[], moduleKey?: AIModuleKey): Promise<string> {
  const settings = loadAISettings(moduleKey);

  if (!settings.baseUrl && settings.apiProtocol !== 'ollama') {
    throw new Error('请先配置 AI 设置（Base URL 和 API Key）');
  }
  if (!settings.model) {
    throw new Error('请先在 AI 设置中填写或选择模型名称');
  }

  const payload = buildPayload(settings, messages, false);

  const response = await fetchWithRetry(payload.url, {
    method: 'POST',
    headers: payload.headers,
    body: JSON.stringify(payload.body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const result = parseResponse(data, settings.apiProtocol);
  if (!result) {
    throw new Error('API 返回内容为空');
  }
  return result;
}

/**
 * 请求 AI 返回 JSON 格式响应并解析为指定类型
 */
export async function chatWithAIJson<T>(messages: ChatMessage[], moduleKey?: AIModuleKey): Promise<T> {
  const settings = loadAISettings(moduleKey);

  if (!settings.baseUrl && settings.apiProtocol !== 'ollama') {
    throw new Error('请先配置 AI 设置（Base URL 和 API Key）');
  }
  if (!settings.model) {
    throw new Error('请先在 AI 设置中填写或选择模型名称');
  }

  let payload = buildPayload(settings, messages, true);
  let response: Response;

  try {
    response = await fetchWithRetry(payload.url, {
      method: 'POST',
      headers: payload.headers,
      body: JSON.stringify(payload.body),
    });
  } catch (err) {
    // 自动降级：去掉 response_format 重试
    if (settings.apiProtocol === 'openai' || !settings.apiProtocol) {
      payload = buildPayload(settings, messages, false);
      response = await fetchWithRetry(payload.url, {
        method: 'POST',
        headers: payload.headers,
        body: JSON.stringify(payload.body),
      });
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    // 自动降级：某些第三方代理接口不支持 response_format，遭遇 400/422 时去掉重试
    if ((response.status === 400 || response.status === 422) && (settings.apiProtocol === 'openai' || !settings.apiProtocol)) {
      payload = buildPayload(settings, messages, false);
      const fallbackResp = await fetchWithRetry(payload.url, {
        method: 'POST',
        headers: payload.headers,
        body: JSON.stringify(payload.body),
      });
      if (fallbackResp.ok) {
        response = fallbackResp;
      } else {
        const errBody = await response.text();
        throw new Error(`API 请求失败 (${response.status}): ${errBody.slice(0, 300)}`);
      }
    } else {
      const errBody = await response.text();
      throw new Error(`API 请求失败 (${response.status}): ${errBody.slice(0, 300)}`);
    }
  }

  const data = await response.json();
  const content = parseResponse(data, settings.apiProtocol);
  if (!content) {
    throw new Error('API 返回内容为空');
  }

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
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一名顶级科技企业资深技术面试官。请基于 Google XYZ 法则（通过采用技术方案Z解决痛点X达成成果Y）优化简历内容。要求：1. 以硬核动作动词开头，输出精炼的「•」要点；2. 突出技术深度与工程量化成效，严禁无中生有凭空捏造虚假业务数据；3. 语言精炼专业，只输出优化后的纯文本，不要带有 Markdown 标签或任何多余解释。'
    },
    {
      role: 'user',
      content: `简历板块：${context}\n原始内容：${text}`
    }
  ];
  return chatWithAI(messages, 'resume');
}
