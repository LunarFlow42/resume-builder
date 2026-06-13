import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnalyzedJob } from '../../skillforge/types';
import { loadAISettings, loadAISettingsStore, saveAISettingsStore, fetchModelList } from '../../services/gemini';

const getScannerTheme = (dark: boolean) => ({
  // Ambient effects
  ambientA: dark ? 'bg-violet-600/20' : 'bg-violet-300/15',
  ambientB: dark ? 'bg-emerald-600/10' : 'bg-emerald-300/10',
  // Header
  backBtn: dark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800',
  subtitle: dark ? 'text-slate-400' : 'text-gray-500',
  // Main card
  cardOuter: dark ? 'bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 shadow-2xl' : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-xl',
  cardInner: dark ? 'bg-[#0b1221]' : 'bg-gray-50',
  label: dark ? 'text-slate-300' : 'text-gray-600',
  dots: dark ? '' : 'opacity-40',
  // Attachment
  attachBg: dark ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-emerald-50 border-emerald-200',
  attachIcon: dark ? 'bg-emerald-800/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
  attachTitle: dark ? 'text-emerald-300' : 'text-emerald-700',
  attachDesc: dark ? 'text-slate-500' : 'text-gray-400',
  attachRemove: dark ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-500 hover:bg-red-50',
  // Textarea
  textarea: dark ? 'bg-slate-900/50 text-slate-300 border-slate-800 focus:border-emerald-500/50 focus:ring-emerald-500/50 placeholder:text-slate-700' : 'bg-white text-gray-800 border-gray-300 focus:border-emerald-400 focus:ring-emerald-400 placeholder:text-gray-400',
  // Upload button
  uploadBtn: dark ? 'text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200 bg-slate-900/30' : 'text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700 bg-white',
  uploadHint: dark ? 'text-slate-600' : 'text-gray-400',
  // Model selector
  modelLabel: dark ? 'text-slate-500' : 'text-gray-500',
  modelBtn: dark ? 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-slate-500' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400',
  modelDrop: dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-xl',
  modelDropBorder: dark ? 'border-slate-700' : 'border-gray-200',
  modelInput: dark ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-emerald-500 placeholder:text-slate-600' : 'bg-gray-50 border-gray-300 text-gray-800 focus:border-emerald-500 placeholder:text-gray-400',
  modelItem: dark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-50 text-gray-700',
  modelItemActive: dark ? 'text-emerald-400 bg-slate-700/50' : 'text-emerald-600 bg-emerald-50',
  modelHint: dark ? 'text-slate-500' : 'text-gray-400',
  modelLoading: dark ? 'text-slate-500' : 'text-gray-400',
  // Error
  errorBg: dark ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-600',
  // Analyze button
  analyzeBtn: dark ? 'bg-emerald-600 text-white hover:scale-[1.01] hover:bg-emerald-500' : 'bg-emerald-600 text-white hover:scale-[1.01] hover:bg-emerald-500',
  analyzeShimmer: dark ? 'from-transparent via-emerald-400/20 to-transparent' : 'from-transparent via-white/30 to-transparent',
  analyzeSpinner: dark ? 'text-white' : 'text-white',
  // Footer
  footer: dark ? 'text-slate-600' : 'text-gray-400',
});

interface ScannerViewProps {
  jdText: string;
  setJdText: (text: string) => void;
  imageBase64: string | null;
  setImageBase64: (img: string | null) => void;
  isAnalyzing: boolean;
  error: string | null;
  history: AnalyzedJob[];
  onAnalyze: () => void;
  onSwitchToDashboard: () => void;
  darkMode: boolean;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  jdText,
  setJdText,
  imageBase64,
  setImageBase64,
  isAnalyzing,
  error,
  history,
  onAnalyze,
  onSwitchToDashboard,
  darkMode
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Model selector state
  const [aiSettings, setAiSettings] = useState(loadAISettings);
  const [modelList, setModelList] = useState<string[]>(() => {
    const store = loadAISettingsStore();
    const active = store.profiles.find(p => p.id === store.activeProfileId) || store.profiles[0];
    return active?.cachedModels || [];
  });
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelFilter, setModelFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = getScannerTheme(darkMode);

  // Load model list on mount if no cache and settings exist
  useEffect(() => {
    if (modelList.length === 0 && aiSettings.baseUrl && aiSettings.apiKey) {
      handleFetchModels();
    }
  }, []);

  // Sync when AI settings change in App.tsx (e.g. model list fetched, profile switched)
  useEffect(() => {
    const handler = () => {
      const settings = loadAISettings();
      setAiSettings(settings);
      const store = loadAISettingsStore();
      const active = store.profiles.find(p => p.id === store.activeProfileId) || store.profiles[0];
      setModelList(active?.cachedModels || []);
    };
    window.addEventListener('ai-settings-changed', handler);
    return () => window.removeEventListener('ai-settings-changed', handler);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFetchModels = async () => {
    const settings = loadAISettings();
    if (!settings.baseUrl || !settings.apiKey) return;
    setIsLoadingModels(true);
    try {
      const models = await fetchModelList(settings.baseUrl, settings.apiKey);
      setModelList(models);
      // Cache into profile
      const store = loadAISettingsStore();
      const idx = store.profiles.findIndex(p => p.id === store.activeProfileId);
      if (idx >= 0) {
        store.profiles[idx] = { ...store.profiles[idx], cachedModels: models };
        saveAISettingsStore(store);
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSelectModel = (model: string) => {
    const updated = { ...aiSettings, model };
    setAiSettings(updated);
    // Update active profile via store API
    const store = loadAISettingsStore();
    const idx = store.profiles.findIndex(p => p.id === store.activeProfileId);
    if (idx >= 0) {
      store.profiles[idx] = { ...store.profiles[idx], model };
      saveAISettingsStore(store);
    }
    setShowModelDropdown(false);
    setModelFilter('');
  };

  const filteredModels = modelList.filter(m =>
    m.toLowerCase().includes(modelFilter.toLowerCase())
  );

  // --- Image handling ---

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const base64 = await readFileAsBase64(file);
    setImageBase64(base64);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items) as DataTransferItem[]) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const base64 = await readFileAsBase64(file);
          setImageBase64(base64);
        }
        return;
      }
    }
  }, [setImageBase64]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const base64 = await readFileAsBase64(file);
      setImageBase64(base64);
    }
  }, [setImageBase64]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const canAnalyze = !isAnalyzing && (jdText.trim() || imageBase64);

  return (
    <div className="h-full overflow-y-auto auto-scrollbar relative">
        {/* Background Ambient Effects */}
        <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] ${t.ambientA} rounded-full blur-[120px] pointer-events-none`} />
        <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] ${t.ambientB} rounded-full blur-[120px] pointer-events-none`} />

      <div className="min-h-full flex items-center justify-center p-4">
      <div className="max-w-3xl w-full z-10 space-y-8 sf-animate-fade-in-up">

        {/* Header with Back Button if history exists */}
        <div className="text-center space-y-2 relative">
          {history.length > 0 && (
            <button
              onClick={onSwitchToDashboard}
              className={`absolute left-0 top-2 z-10 ${t.backBtn} flex items-center gap-1 text-sm transition-colors`}
            >
              ← 返回仪表盘
            </button>
          )}
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-indigo-400 drop-shadow-lg leading-tight">
            职场技能锻造所
          </h1>
          <p className={`${t.subtitle} text-lg`}>
            {history.length > 0
              ? "解析新 JD 并将其融合到您的技能库中"
              : "一键解析 JD，点亮你的专属技能树"}
          </p>
        </div>

        <div className={`${t.cardOuter} p-1 rounded-2xl`}>
          <div
            className={`${t.cardInner} rounded-xl p-6 md:p-8 space-y-6`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="flex justify-between items-center">
              <label className={`text-sm font-bold ${t.label} uppercase tracking-wider`}>
                粘贴职位描述 (JD)
              </label>
              <div className={`flex gap-2 ${t.dots}`}>
                <span className="w-3 h-3 rounded-full bg-red-500/50"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/50"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/50"></span>
              </div>
            </div>

            {/* Image attachment indicator */}
            {imageBase64 && (
              <div className={`flex items-center gap-3 px-3 py-2.5 ${t.attachBg} border rounded-lg`}>
                <div className={`w-8 h-8 rounded ${t.attachIcon} flex items-center justify-center shrink-0`}>
                  <i className="fas fa-image"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.attachTitle} font-medium`}>已添加 JD 截图</div>
                  <div className={`text-xs ${t.attachDesc}`}>将通过视觉模型识别图片内容</div>
                </div>
                <button
                  onClick={() => setImageBase64(null)}
                  className={`w-6 h-6 rounded-full ${t.attachRemove} flex items-center justify-center transition-colors shrink-0`}
                  title="移除图片"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              onPaste={handlePaste}
              className={`w-full h-52 ${t.textarea} p-4 rounded-lg font-mono text-sm border focus:ring-1 outline-none resize-none transition-all`}
              placeholder={imageBase64 ? "（可选）补充文字说明..." : "在此粘贴完整的职位描述，或粘贴/拖入 JD 截图..."}
            />

            {/* Image upload button */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${t.uploadBtn}`}
              >
                <i className="fas fa-image"></i>
                {imageBase64 ? '更换图片' : '上传 JD 截图'}
              </button>
              <span className={`text-xs ${t.uploadHint}`}>
                支持粘贴截图 / 拖拽图片 / 点击上传
              </span>
            </div>

            {/* Model selector */}
            <div className="flex items-center gap-3" ref={dropdownRef}>
              <span className={`text-xs ${t.modelLabel} shrink-0`}>模型：</span>
              <div className="relative flex-1">
                <button
                  onClick={() => {
                    setShowModelDropdown(!showModelDropdown);
                    if (!showModelDropdown && modelList.length === 0) {
                      handleFetchModels();
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all ${t.modelBtn}`}
                >
                  <span className="truncate">{(!aiSettings.baseUrl || !aiSettings.apiKey) ? '请先配置 AI 设置' : (aiSettings.model || '选择模型')}</span>
                  <i className={`fas fa-chevron-down text-xs ml-2 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`}></i>
                </button>

                {showModelDropdown && (
                  <div className={`absolute bottom-full mb-1 left-0 right-0 ${t.modelDrop} border rounded-lg z-50 overflow-hidden max-h-64 flex flex-col`}>
                    <div className={`p-2 border-b ${t.modelDropBorder}`}>
                      <input
                        type="text"
                        value={modelFilter}
                        onChange={e => setModelFilter(e.target.value)}
                        placeholder="搜索或输入模型名称..."
                        className={`w-full px-2 py-1.5 text-sm ${t.modelInput} border rounded outline-none`}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter' && modelFilter.trim()) {
                            handleSelectModel(modelFilter.trim());
                          }
                        }}
                      />
                    </div>
                    <div className="overflow-y-auto auto-scrollbar flex-1">
                      {isLoadingModels ? (
                        <div className={`p-3 text-xs ${t.modelLoading} text-center`}>
                          <i className="fas fa-spinner animate-spin mr-1"></i> 加载中...
                        </div>
                      ) : filteredModels.length > 0 ? (
                        filteredModels.map(m => (
                          <button
                            key={m}
                            onClick={() => handleSelectModel(m)}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors truncate ${
                              m === aiSettings.model ? t.modelItemActive : t.modelItem
                            }`}
                          >
                            {m}
                          </button>
                        ))
                      ) : (
                        <div className={`p-3 text-xs ${t.modelHint} text-center`}>
                          {modelFilter ? '回车确认使用自定义模型名' : '暂无模型列表，可直接输入模型名称'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className={`p-3 ${t.errorBg} border rounded text-sm flex items-center gap-2`}>
                 <span>⚠️</span> {error}
              </div>
            )}

            <button
              onClick={onAnalyze}
              disabled={!canAnalyze}
              className={`w-full group relative py-4 ${t.analyzeBtn} font-bold rounded-lg overflow-hidden transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            >
              <div className={`absolute inset-0 w-full h-full bg-gradient-to-r ${t.analyzeShimmer} translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out`}></div>
              <span className="relative flex items-center justify-center gap-2">
                {isAnalyzing ? (
                  <>
                    <svg className={`animate-spin h-5 w-5 ${t.analyzeSpinner}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    正在融合技能...
                  </>
                ) : (
                  <>
                    {history.length > 0 ? "融合到技能库" : "启动解析"} <span className="text-xl">🚀</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        <div className={`text-center text-xs ${t.footer} font-mono`}>
          Powered by AI · 本地数据自动保存
        </div>
      </div>
      </div>
    </div>
  );
};
