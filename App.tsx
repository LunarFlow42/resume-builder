
import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas-pro';
import ResumeEditor from './components/ResumeEditor';
import ResumePreview from './components/ResumePreview';
import SkillForgeApp from './components/skillforge/SkillForgeApp';
import { paginateResume } from './services/pagination';
import { INITIAL_DATA } from './constants';
import { ResumeData, ResumeVersion, StorageData } from './types';
import { loadAISettings, loadAISettingsStore, saveAISettingsStore, getEndpoint, fetchModelList, chatWithAI, AI_MODULES, type AISettings, type AIProfile, type AISettingsStore, type AIModuleKey, type APIProtocol } from './services/ai';
import { loadState, saveState } from './services/skillForgeStorage';

type ActiveTab = 'resume' | 'skillforge';

const STORAGE_KEY = 'resume-builder-data-v2';
const DEFAULT_TEMPLATE_KEY = 'resume-builder-default-template';
const BACKUP_REMINDED_KEY = 'resume-builder-backup-reminded'; // 是否已提醒过备份
const DARK_MODE_KEY = 'resume-builder-dark-mode';

// 生成唯一ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 创建新版本
const createVersion = (name: string, data: ResumeData): ResumeVersion => ({
  id: generateId(),
  name,
  data: JSON.parse(JSON.stringify(data)), // 深拷贝
  createdAt: Date.now(),
  updatedAt: Date.now()
});

// 初始化存储数据
const initStorageData = (): StorageData => {
  const firstVersion = createVersion('我的简历', INITIAL_DATA);
  return {
    currentVersionId: firstVersion.id,
    versions: [firstVersion]
  };
};

// 迁移旧版 ResumeData，补全新增字段
const migrateResumeData = (d: any): ResumeData => {
  // 补全缺失的数组/字符串字段
  if (!d.work) d.work = [];
  if (!d.internship) d.internship = [];
  if (!d.awards) d.awards = [];
  if (!d.certificates) d.certificates = [];
  if (d.evaluation === undefined) d.evaluation = '';
  if (d.personalInfo && d.personalInfo.gender === undefined) d.personalInfo.gender = '男';

  // 为缺少 id 的 SkillEntry 补上 id
  if (d.skills) {
    for (let i = 0; i < d.skills.length; i++) {
      if (!d.skills[i].id) {
        d.skills[i].id = `skill-${Date.now()}-${i}`;
      }
    }
  }

  // 补全 layout.sectionTitles 缺失的 key
  if (d.layout?.sectionTitles) {
    const defaults: Record<string, string> = {
      work: '工作经历',
      internship: '实习经历',
      awards: '荣誉奖项',
      certificates: '证书资质',
      evaluation: '自我评价',
    };
    for (const [k, v] of Object.entries(defaults)) {
      if (!d.layout.sectionTitles[k]) {
        d.layout.sectionTitles[k] = v;
      }
    }
  }

  return d as ResumeData;
};

// 对 StorageData 中每个版本执行迁移
const migrateStorageData = (sd: StorageData): StorageData => {
  for (const ver of sd.versions) {
    ver.data = migrateResumeData(ver.data);
  }
  return sd;
};

// 从 localStorage 加载数据
const loadStorageData = (): StorageData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 验证数据结构
      if (parsed.versions && parsed.versions.length > 0 && parsed.currentVersionId) {
        return migrateStorageData(parsed);
      }
    }
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
  }
  return initStorageData();
};

export interface FullBackupPackage {
  storageData: StorageData;
  aiSettings?: AISettingsStore;
  skillForge?: any;
  defaultTemplate?: any;
}

// 导出全量数据到 JSON 文件（包含简历数据、AI配置、技能锻造JD分析记录等）
const exportDataToFile = (data: StorageData, filename?: string) => {
  let defaultTemplate = null;
  try {
    const rawTemplate = localStorage.getItem(DEFAULT_TEMPLATE_KEY);
    if (rawTemplate) defaultTemplate = JSON.parse(rawTemplate);
  } catch (e) {
    console.error('Failed to parse default template for export:', e);
  }

  const exportData = {
    ...data,
    aiSettings: loadAISettingsStore(),
    skillForge: loadState(),
    defaultTemplate,
    exportedAt: Date.now(),
    version: '2.0'
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `简历全量备份_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // 标记已备份，不再提醒
  localStorage.setItem(BACKUP_REMINDED_KEY, 'true');
};

// 从文件导入数据
const importDataFromFile = (file: File): Promise<FullBackupPackage | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // 验证数据结构
        if (parsed.versions && parsed.versions.length > 0 && parsed.currentVersionId) {
          resolve({
            storageData: migrateStorageData(parsed as StorageData),
            aiSettings: parsed.aiSettings,
            skillForge: parsed.skillForge,
            defaultTemplate: parsed.defaultTemplate
          });
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Failed to parse import file:', error);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
};

// 检查简历是否填入了用户自定义的大部分信息（排除默认模版占位符）
const hasSubstantialData = (data: ResumeData): boolean => {
  const { personalInfo, education, projects, skills } = data;

  // 如果姓名依然是默认值或为空，直接判定为未开始填写
  if (!personalInfo.name || personalInfo.name.trim() === '姓名') {
    return false;
  }

  // 检查关键个人信息是否已修改且非空（姓名已修改，电话和邮箱至少再填一个非默认的）
  const isPhoneChanged = personalInfo.phone && personalInfo.phone.trim() !== '138-0000-0000' && personalInfo.phone.trim().length > 0;
  const isEmailChanged = personalInfo.email && personalInfo.email.trim() !== 'your.email@example.com' && personalInfo.email.trim().length > 0;
  
  if (!isPhoneChanged && !isEmailChanged) {
    return false;
  }

  // 检查是否有用户自定义的教育、项目或技能经历
  const hasUserEducation = education.length > 0 && education.some(e => e.school && e.school.trim() !== '某某大学' && e.school.trim().length > 0);
  const hasUserProjects = projects.length > 0 && projects.some(p => p.title && p.title.trim() !== '某某响应式 Web 后台管理系统' && p.title.trim().length > 0);
  const hasUserSkills = skills.length > 0 && skills.some(s => s.content && !s.content.includes('熟练掌握 React / Vue') && !s.content.includes('熟练使用 Git') && s.content.trim().length > 0);

  return !!(hasUserEducation || hasUserProjects || hasUserSkills);
};

// App 主题
const getAppTheme = (dark: boolean) => ({
  root: dark ? 'bg-[#0f172a]' : 'bg-gray-50',
  header: dark ? 'bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50' : 'bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm',
  logo: dark ? 'text-slate-100' : 'text-gray-900',
  logoSub: dark ? 'text-slate-500' : 'text-gray-400',
  tabs: dark ? 'bg-slate-800 border-slate-700/50' : 'bg-gray-100 border-gray-200',
  tabActive: dark ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'bg-white text-emerald-600 shadow-sm',
  tabInactive: dark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700',
  verBtn: dark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
  verDrop: dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-lg',
  verBorder: dark ? 'border-slate-700' : 'border-gray-200',
  verNew: dark ? 'text-emerald-400 hover:bg-emerald-900/30' : 'text-emerald-600 hover:bg-emerald-50',
  verItem: dark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50',
  verItemActive: dark ? 'bg-slate-700/30' : 'bg-emerald-50',
  verInput: dark ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-300 text-gray-800',
  verCurrent: dark ? 'font-bold text-emerald-400' : 'font-bold text-emerald-600',
  verNormal: dark ? 'text-slate-300' : 'text-gray-700',
  verDate: dark ? 'text-slate-500' : 'text-gray-400',
  verAction: dark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600',
  verDelete: dark ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500',
  verExport: dark ? 'text-emerald-400 hover:bg-emerald-900/20' : 'text-emerald-600 hover:bg-emerald-50',
  verImport: dark ? 'text-cyan-400 hover:bg-cyan-900/20' : 'text-cyan-600 hover:bg-cyan-50',
  saveBtn: dark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
  mobileBtn: dark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-gray-700 border-gray-300',
  editorBg: dark ? 'bg-[#0f172a] border-r border-slate-700/50' : 'bg-gray-50 border-r border-gray-200',
  previewBg: dark ? 'bg-slate-800/50' : 'bg-gray-100',
  backup: dark ? 'bg-amber-900/30 border-b border-amber-700/50' : 'bg-amber-50 border-b border-amber-200',
  backupText: dark ? 'text-amber-300' : 'text-amber-700',
  backupClose: dark ? 'text-amber-500 hover:text-amber-300' : 'text-amber-400 hover:text-amber-600',
  toggle: dark ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-gray-100',
  toggleAI: dark ? 'text-slate-400 hover:bg-slate-800 hover:text-violet-400' : 'text-slate-500 hover:bg-gray-100 hover:text-violet-500',
});

const App: React.FC = () => {
  // Tab 切换状态
  const [activeTab, setActiveTab] = useState<ActiveTab>('resume');

  // 日夜模式
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(DARK_MODE_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch { return true; }
  });

  // 版本管理状态
  const [storageData, setStorageData] = useState<StorageData>(loadStorageData);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const versionMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  // AI 设置弹窗状态
  const [showAISettings, setShowAISettings] = useState(false);
  const [aiStore, setAiStore] = useState<AISettingsStore>(loadAISettingsStore);
  const [urlPreview, setUrlPreview] = useState(() => {
    const store = loadAISettingsStore();
    const active = store.profiles.find(p => p.id === store.activeProfileId) || store.profiles[0];
    return active?.baseUrl ? getEndpoint(active.baseUrl, active.apiProtocol || 'openai', active.model) : '';
  });
  const [modelList, setModelList] = useState<string[]>(() => {
    const store = loadAISettingsStore();
    const active = store.profiles.find(p => p.id === store.activeProfileId) || store.profiles[0];
    return active?.cachedModels || [];
  });
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState('');
  const aiSettingsRef = useRef<HTMLDivElement>(null);

  const activeProfile = aiStore.profiles.find(p => p.id === aiStore.activeProfileId) || aiStore.profiles[0];

  const updateActiveProfile = (patch: Partial<AIProfile>) => {
    setAiStore(prev => {
      const newProfiles = prev.profiles.map(p =>
        p.id === prev.activeProfileId ? { ...p, ...patch } : p
      );
      const newStore = { ...prev, profiles: newProfiles };
      saveAISettingsStore(newStore);
      return newStore;
    });
  };

  const switchProfile = (id: string) => {
    setAiStore(prev => {
      const newStore = { ...prev, activeProfileId: id };
      saveAISettingsStore(newStore);
      return newStore;
    });
    const profile = aiStore.profiles.find(p => p.id === id);
    setModelList(profile?.cachedModels || []);
    setModelError('');
    setUrlPreview(profile?.baseUrl ? getEndpoint(profile.baseUrl, profile.apiProtocol || 'openai', profile.model) : '');
  };

  const addProfile = () => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newProfile: AIProfile = { id, name: `配置 ${aiStore.profiles.length + 1}`, baseUrl: '', apiKey: '', model: 'gemini-3-pro-preview-bs', apiProtocol: 'openai' };
    setAiStore(prev => {
      const newStore = { activeProfileId: id, profiles: [...prev.profiles, newProfile] };
      saveAISettingsStore(newStore);
      return newStore;
    });
    setModelList([]);
    setModelError('');
    setUrlPreview('');
  };

  const removeProfile = (id: string) => {
    if (aiStore.profiles.length <= 1) return;
    setAiStore(prev => {
      const remaining = prev.profiles.filter(p => p.id !== id);
      const newActiveId = prev.activeProfileId === id ? remaining[0].id : prev.activeProfileId;
      const newStore = { activeProfileId: newActiveId, profiles: remaining };
      saveAISettingsStore(newStore);
      const active = remaining.find(p => p.id === newActiveId);
      setUrlPreview(active?.baseUrl ? getEndpoint(active.baseUrl, active.apiProtocol || 'openai', active.model) : '');
      return newStore;
    });
    setModelList([]);
    setModelError('');
  };

  const t = getAppTheme(darkMode);

  // 获取当前版本
  const currentVersion = storageData.versions.find(v => v.id === storageData.currentVersionId)
    || storageData.versions[0];
  const data = currentVersion?.data || INITIAL_DATA;

  // 保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
    }
  }, [storageData]);

  // 持久化 darkMode
  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, String(darkMode));
  }, [darkMode]);

  // 点击外部关闭版本菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (versionMenuRef.current && !versionMenuRef.current.contains(event.target as Node)) {
        setIsVersionMenuOpen(false);
        setEditingVersionId(null);
      }
      if (aiSettingsRef.current && !aiSettingsRef.current.contains(event.target as Node)) {
        setShowAISettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 检查是否需要提示备份（只在填入大部分信息后提醒一次）
  useEffect(() => {
    const hasReminded = localStorage.getItem(BACKUP_REMINDED_KEY) === 'true';

    // 如果已经提醒过，不再提醒
    if (hasReminded) {
      setShowBackupReminder(false);
      return;
    }

    // 检查当前数据是否填入了大部分信息
    if (hasSubstantialData(data)) {
      setShowBackupReminder(true);
    }
  }, [data]);

  // 导出数据
  const handleExportData = useCallback(() => {
    exportDataToFile(storageData);
    setShowBackupReminder(false);
    setIsVersionMenuOpen(false);
  }, [storageData]);

  // 导入数据
  const handleImportData = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imported = await importDataFromFile(file);
    if (imported) {
      const { storageData: importedStorageData, aiSettings: importedAiSettings, skillForge: importedSkillForge, defaultTemplate: importedDefaultTemplate } = imported;

      const hasAi = !!(importedAiSettings && Array.isArray(importedAiSettings.profiles) && importedAiSettings.profiles.length > 0);
      const sfJobsCount = importedSkillForge?.history?.length || 0;

      let confirmMsg = `成功解析备份文件！包含以下模块：\n\n`;
      confirmMsg += `• 简历版本：${importedStorageData.versions.length} 个\n`;
      confirmMsg += `• AI 接口配置：${hasAi ? `已包含 (${importedAiSettings.profiles.length} 个 Api Profile)` : '未包含'}\n`;
      confirmMsg += `• 技能锻造/JD分析历史：${sfJobsCount > 0 ? `已包含 (${sfJobsCount} 个岗位记录)` : '未包含'}\n`;
      confirmMsg += `\n是否覆盖当前浏览器数据并导入？`;

      if (confirm(confirmMsg)) {
        setStorageData(importedStorageData);
        if (hasAi) {
          saveAISettingsStore(importedAiSettings);
        }
        if (importedSkillForge) {
          saveState(importedSkillForge);
        }
        if (importedDefaultTemplate) {
          localStorage.setItem(DEFAULT_TEMPLATE_KEY, JSON.stringify(importedDefaultTemplate));
        }
        alert('数据导入成功！页面即将自动刷新以加载完整配置。');
        window.location.reload();
      }
    } else {
      alert('导入失败：文件格式不正确或损坏');
    }

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsVersionMenuOpen(false);
  }, []);

  // 更新当前版本的数据
  const setData = (newData: ResumeData) => {
    setStorageData(prev => ({
      ...prev,
      versions: prev.versions.map(v =>
        v.id === prev.currentVersionId
          ? { ...v, data: newData, updatedAt: Date.now() }
          : v
      )
    }));
  };

  // 切换版本
  const switchVersion = (versionId: string) => {
    setStorageData(prev => ({ ...prev, currentVersionId: versionId }));
    setIsVersionMenuOpen(false);
  };

  // 新建版本（基于当前数据）
  const createNewVersion = () => {
    const name = `简历 ${storageData.versions.length + 1}`;
    const newVersion = createVersion(name, data); // 使用当前数据作为模板
    setStorageData(prev => ({
      currentVersionId: newVersion.id,
      versions: [...prev.versions, newVersion]
    }));
    setIsVersionMenuOpen(false);
  };

  // 复制当前版本
  const duplicateVersion = (versionId: string) => {
    const source = storageData.versions.find(v => v.id === versionId);
    if (!source) return;
    const newVersion = createVersion(`${source.name} (副本)`, source.data);
    setStorageData(prev => ({
      currentVersionId: newVersion.id,
      versions: [...prev.versions, newVersion]
    }));
    setIsVersionMenuOpen(false);
  };

  // 重命名版本
  const startRenaming = (version: ResumeVersion) => {
    setEditingVersionId(version.id);
    setEditingName(version.name);
  };

  const saveRename = () => {
    if (!editingVersionId || !editingName.trim()) return;
    setStorageData(prev => ({
      ...prev,
      versions: prev.versions.map(v =>
        v.id === editingVersionId ? { ...v, name: editingName.trim() } : v
      )
    }));
    setEditingVersionId(null);
    setEditingName('');
  };

  // 删除版本
  const deleteVersion = (versionId: string) => {
    if (storageData.versions.length <= 1) {
      alert('至少需要保留一个简历版本！');
      return;
    }
    if (!confirm('确定要删除这个简历版本吗？')) return;

    setStorageData(prev => {
      const newVersions = prev.versions.filter(v => v.id !== versionId);
      const newCurrentId = prev.currentVersionId === versionId
        ? newVersions[0].id
        : prev.currentVersionId;
      return { currentVersionId: newCurrentId, versions: newVersions };
    });
  };

  // 保存当前数据为默认模板
  const handleSaveAsDefault = () => {
    try {
      localStorage.setItem(DEFAULT_TEMPLATE_KEY, JSON.stringify(data));
      alert('已保存当前数据为默认模板！新建简历时将使用此模板。');
    } catch (error) {
      console.error('Failed to save default template:', error);
      alert('保存失败，请重试。');
    }
  };

/**
 * 提取当前页面所有生效的样式规则并合并为字符串。
 * 生产构建（如 Vercel）中，Tailwind CSS 会被打包为外部独立文件 <link rel="stylesheet" href="/assets/index-xxx.css">。
 * html2canvas 渲染时会在隐藏的 about:blank 沙箱 iframe 中克隆 DOM。
 * 由于沙箱环境对外部异步样式表可能未完成加载即开始绘制，导致出现 Tailwind 布局样式完全丢失（flex/grid/absolute 失效、纵向坍塌）。
 * 通过预先同步提取全量 CSS 规则并内嵌注入到克隆沙箱中，彻底消除异步加载时序与沙箱限制问题。
 */
const collectAllDocumentStyles = async (): Promise<string> => {
  let allCss = '';

  const extractRules = (sheet: CSSStyleSheet): string => {
    let css = '';
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (rules && rules.length > 0) {
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i];
          if ('styleSheet' in rule && (rule as any).styleSheet) {
            css += extractRules((rule as any).styleSheet);
          } else if (rule.cssText) {
            css += rule.cssText + '\n';
          }
        }
      }
    } catch {
      // 跨域或同源限制时捕获，留给下方的 fetch 兜底
    }
    return css;
  };

  const processedHrefs = new Set<string>();

  // 1. 从 document.styleSheets 中提取已解析的 CSSOM 规则
  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.href) processedHrefs.add(sheet.href);
    const css = extractRules(sheet);
    if (css) {
      allCss += css + '\n';
    } else if (sheet.href) {
      // 降级兜底：如果 cssRules 因跨域不可读，直接 fetch 样式文本
      try {
        const resp = await fetch(sheet.href);
        if (resp.ok) {
          allCss += (await resp.text()) + '\n';
        }
      } catch (err) {
        console.warn('Failed to fetch stylesheet fallback:', sheet.href, err);
      }
    }
  }

  // 2. 补漏：检查是否有 DOM 中存在但 styleSheets 集合未完全覆盖的 link 标签
  const linkEls = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  for (const link of linkEls) {
    if (link.href && !processedHrefs.has(link.href)) {
      processedHrefs.add(link.href);
      try {
        const resp = await fetch(link.href);
        if (resp.ok) {
          allCss += (await resp.text()) + '\n';
        }
      } catch (err) {
        console.warn('Failed to fetch link stylesheet fallback:', link.href, err);
      }
    }
  }

  // 3. 补漏：收集页面内现有的 <style> 标签
  const styleEls = Array.from(document.querySelectorAll<HTMLStyleElement>('style'));
  for (const s of styleEls) {
    if (s.id !== 'pdf-inlined-styles' && s.textContent) {
      if (!allCss.includes(s.textContent.slice(0, 50))) {
        allCss += s.textContent + '\n';
      }
    }
  }

  return allCss;
};

  const handleExportPDF = async () => {
    const sourceElement = document.getElementById('resume-content');
    if (!sourceElement) return;

    setIsExporting(true);

    // 确保 FontAwesome 字体完全加载
    try {
      // @ts-ignore
      await document.fonts.ready;
      await document.fonts.load('900 12px "Font Awesome 6 Free"');
      await document.fonts.load('400 12px "Font Awesome 6 Free"');
    } catch (e) {
      console.warn('Font loading check failed:', e);
    }

    // 提取全局全量样式表，确保在沙箱 iframe 中 100% 具备所有 Tailwind 类名与样式
    const allCss = await collectAllDocumentStyles();

    // 创建一个全屏白色遮罩层，将克隆元素放在可见位置
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: white;
      z-index: 99999;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 0;
      overflow: auto;
    `;
    document.body.appendChild(overlay);

    const clone = sourceElement.cloneNode(true) as HTMLElement;
    clone.id = 'resume-content-clone';
    clone.style.cssText += `
      ; transform: none !important;
      margin: 0 !important;
      box-shadow: none !important;
      position: relative !important;
      width: 210mm !important;
      min-height: 297mm !important;
      overflow: visible !important;
      flex-shrink: 0 !important;
      padding: 20px 28px !important;
      box-sizing: border-box !important;
      background-image: none !important;
    `;

    // 将提取的样式表同步植入克隆体顶部
    if (allCss) {
      const styleEl = document.createElement('style');
      styleEl.id = 'pdf-inlined-styles';
      styleEl.textContent = allCss;
      clone.insertBefore(styleEl, clone.firstChild);
    }

    overlay.appendChild(clone);

    // 移除分页参考线（不导出到 PDF）
    clone.querySelectorAll('[data-page-break]').forEach(el => el.remove());

    // 在 1:1 克隆体上执行精确智能分页排版，避免跨页切割
    const { totalPages } = paginateResume(clone);
    clone.style.minHeight = `${totalPages * 297}mm`;
    clone.style.height = `${totalPages * 297}mm`;

    // 等待渲染，让字体有时间加载和排版回流
    await new Promise(resolve => setTimeout(resolve, 400));

    try {
      // @ts-ignore
      const jsPDF = window.jspdf?.jsPDF || window.jsPDF;

      if (!html2canvas || !jsPDF) {
        throw new Error('库加载失败');
      }

      // 使用 html2canvas 渲染
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
        ignoreElements: (el) => {
          // 忽略外部 link stylesheet，防止沙箱在 about:blank 发起可能失败或慢速的异步请求
          if (el.tagName === 'LINK' && el.getAttribute('rel') === 'stylesheet') {
            return true;
          }
          return false;
        },
        onclone: async (clonedDoc) => {
          // 1. 同步将全量提取的样式注入克隆沙箱 iframe 的 head
          if (allCss) {
            const headStyle = clonedDoc.createElement('style');
            headStyle.id = 'pdf-inlined-styles-head';
            headStyle.textContent = allCss;
            clonedDoc.head.appendChild(headStyle);
          }

          // 2. 双重保险：移除 iframe 中的外部样式表 link
          clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(l => l.remove());

          // 3. 等待沙箱字体完全就绪
          if (clonedDoc.fonts && clonedDoc.fonts.ready) {
            await clonedDoc.fonts.ready;
          }
        }
      });

      // A4 尺寸 (mm)
      const A4_WIDTH = 210;
      const A4_HEIGHT = 297;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const pageHeightInCanvas = canvasWidth * (A4_HEIGHT / A4_WIDTH);

      // 创建 PDF
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      });

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        // 裁剪当前页对应的 canvas 区域（保持标准 A4 比例画布）
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        pageCanvas.height = pageHeightInCanvas;
        const ctx = pageCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        const sourceY = page * pageHeightInCanvas;
        const sliceHeight = Math.min(pageHeightInCanvas, Math.max(0, canvasHeight - sourceY));

        if (sliceHeight > 0) {
          ctx.drawImage(
            canvas,
            0, sourceY,
            canvasWidth, sliceHeight,
            0, 0,
            canvasWidth, sliceHeight
          );
        }

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH, A4_HEIGHT, undefined, 'FAST');
      }

      pdf.save(`${currentVersion.name}_${data.personalInfo.name}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert(`导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      document.body.removeChild(overlay);
      setIsExporting(false);
    }
  };

  return (
    <div className={`h-screen flex flex-col ${t.root} overflow-hidden`}>
      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportData}
        accept=".json"
        className="hidden"
      />

      {/* 备份提醒横幅 */}
      {showBackupReminder && (
        <div className={`no-print ${t.backup} px-3 sm:px-6 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2`}>
          <div className={`flex items-center gap-2 ${t.backupText} text-sm`}>
            <i className="fas fa-exclamation-triangle"></i>
            <span>建议备份数据到本地文件，防止浏览器缓存清理或端口变更导致数据丢失</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportData}
              className="px-3 py-1 bg-amber-500 text-white rounded text-sm font-bold hover:bg-amber-600 transition-all"
            >
              <i className="fas fa-download mr-1"></i> 立即备份
            </button>
            <button
              onClick={() => {
                setShowBackupReminder(false);
                localStorage.setItem(BACKUP_REMINDED_KEY, 'true');
              }}
              className={`p-1 ${t.backupClose}`}
              title="不再提醒"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* 顶部简易导航 */}
      <header className={`no-print ${t.header} px-3 sm:px-6 py-2 sm:py-4 flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-2 shrink-0 z-50`}>
        {/* Logo + Title */}
        <a
          href="https://github.com/LunarFlow42/resume-builder"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 sm:gap-4 group"
        >
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-lg shadow-emerald-900/30 group-hover:scale-105 transition-transform duration-200 shrink-0"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="header-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill="url(#header-logo-bg)" />
            <path d="M18 13 h20 l10 10 v26 a3 3 0 0 1 -3 3 H18 a3 3 0 0 1 -3 -3 V16 a3 3 0 0 1 3 -3 z" fill="#ffffff" />
            <path d="M38 13 v8 a2 2 0 0 0 2 2 h8 z" fill="#94a3b8" />
            <circle cx="24" cy="23" r="3.5" fill="#059669" />
            <rect x="30" y="21" width="12" height="4" rx="2" fill="#0f172a" />
            <rect x="20" y="31" width="24" height="3" rx="1.5" fill="#059669" fillOpacity="0.85" />
            <rect x="20" y="37" width="18" height="2.5" rx="1.2" fill="#64748b" />
            <rect x="20" y="42" width="22" height="2.5" rx="1.2" fill="#94a3b8" />
            <rect x="20" y="47" width="14" height="2.5" rx="1.2" fill="#cbd5e1" />
          </svg>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <h1 className={`text-lg font-bold ${t.logo} leading-none`}>简历专家</h1>
              <i className={`fab fa-github ${darkMode ? 'text-slate-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'} text-base transition-colors duration-200`}></i>
            </div>
            <p className={`text-[10px] ${t.logoSub} font-bold uppercase tracking-wider hidden sm:block`}>Modular Resume Builder</p>
          </div>
        </a>

        {/* 日夜模式 + AI 设置 (row 1 right side on mobile) */}
        <div className="flex items-center gap-1 sm:gap-0 ml-auto sm:ml-0 order-2 sm:order-none">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 sm:p-2.5 rounded-lg transition-all ${t.toggle}`}
            title={darkMode ? '切换到日间模式' : '切换到夜间模式'}
          >
            <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'} text-base`}></i>
          </button>

          {/* AI 设置按钮 */}
          <div className="relative" ref={aiSettingsRef}>
            <button
              onClick={() => setShowAISettings(!showAISettings)}
              className={`p-2 sm:p-2.5 rounded-lg transition-all relative ${t.toggleAI}`}
              title="AI 设置"
            >
              <i className="fas fa-robot text-base"></i>
              {activeProfile?.baseUrl && activeProfile?.apiKey ? (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
              ) : (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              )}
            </button>

            {/* AI 设置弹窗 */}
            {showAISettings && (
              <>
              {/* Mobile backdrop */}
              <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setShowAISettings(false)}></div>
              <div className={`fixed left-3 right-3 top-14 max-h-[calc(100vh-4.5rem)] overflow-y-auto auto-scrollbar sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-96 sm:max-h-[80vh] rounded-xl z-50 shadow-2xl border ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              }`}>
                {/* 弹窗标题 */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                  darkMode ? 'border-slate-700' : 'border-gray-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <i className={`fas fa-robot ${darkMode ? 'text-violet-400' : 'text-violet-500'}`}></i>
                    <span className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>AI 设置</span>
                  </div>
                  <button
                    onClick={() => setShowAISettings(false)}
                    className={`p-1 rounded transition-colors ${
                      darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </div>

                {/* Profile 选项卡 */}
                <div className={`px-4 pt-3 flex items-center gap-1 overflow-x-auto hide-scrollbar ${
                  darkMode ? 'border-slate-700' : 'border-gray-100'
                }`}>
                  {aiStore.profiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => switchProfile(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold whitespace-nowrap transition-colors border border-b-0 ${
                        p.id === aiStore.activeProfileId
                          ? darkMode
                            ? 'bg-slate-900 text-violet-400 border-slate-600'
                            : 'bg-white text-violet-600 border-gray-300'
                          : darkMode
                            ? 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'
                            : 'bg-transparent text-gray-400 border-transparent hover:text-gray-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        p.baseUrl && p.apiKey ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}></span>
                      {p.name}
                      {aiStore.profiles.length > 1 && p.id === aiStore.activeProfileId && (
                        <span
                          onClick={(e) => { e.stopPropagation(); removeProfile(p.id); }}
                          className={`ml-1 hover:text-red-400 transition-colors`}
                        >
                          <i className="fas fa-times text-[8px]"></i>
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    onClick={addProfile}
                    className={`px-2 py-1.5 text-xs transition-colors ${
                      darkMode ? 'text-slate-500 hover:text-violet-400' : 'text-gray-400 hover:text-violet-500'
                    }`}
                    title="添加配置"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>

                {/* 当前 Profile 编辑区域 */}
                {activeProfile && (
                  <div className={`p-4 space-y-3 border-t ${
                    darkMode ? 'border-slate-700' : 'border-gray-200'
                  }`}>
                    {/* Profile Name */}
                    <div>
                      <label className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-1 block`}>配置名称</label>
                      <input
                        type="text"
                        value={activeProfile.name}
                        className={`w-full border p-2 rounded text-sm focus:border-violet-400 outline-none ${
                          darkMode ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-600' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                        }`}
                        onChange={e => updateActiveProfile({ name: e.target.value })}
                      />
                    </div>

                    {/* API 协议类型 */}
                    <div>
                      <label className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-1 block`}>API 协议格式</label>
                      <select
                        value={activeProfile.apiProtocol || 'openai'}
                        className={`w-full border p-2 rounded text-sm focus:border-violet-400 outline-none ${
                          darkMode ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        onChange={e => {
                          const proto = e.target.value as APIProtocol;
                          const updates: Partial<AIProfile> = { apiProtocol: proto };
                          if (proto === 'claude' && (!activeProfile.baseUrl || activeProfile.baseUrl.includes('openai'))) {
                            updates.baseUrl = 'https://api.anthropic.com';
                            updates.model = 'claude-3-5-sonnet-20241022';
                          } else if (proto === 'gemini' && (!activeProfile.baseUrl || activeProfile.baseUrl.includes('openai'))) {
                            updates.baseUrl = 'https://generativelanguage.googleapis.com';
                            updates.model = 'gemini-1.5-pro';
                          } else if (proto === 'ollama' && (!activeProfile.baseUrl || activeProfile.baseUrl.includes('openai'))) {
                            updates.baseUrl = 'http://localhost:11434';
                            updates.model = 'llama3.2';
                          }
                          updateActiveProfile(updates);
                          const nextUrl = updates.baseUrl !== undefined ? updates.baseUrl : activeProfile.baseUrl;
                          const nextModel = updates.model !== undefined ? updates.model : activeProfile.model;
                          setUrlPreview(nextUrl.trim() ? getEndpoint(nextUrl, proto, nextModel) : '');
                        }}
                      >
                        <option value="openai">OpenAI 兼容 (DeepSeek/Qwen/Moonshot/OneAPI/Groq等)</option>
                        <option value="claude">Anthropic Claude 原生格式 (/v1/messages)</option>
                        <option value="gemini">Google Gemini 原生格式 (generateContent)</option>
                        <option value="ollama">Ollama 本地原生格式 (/api/chat)</option>
                        <option value="azure">Azure OpenAI (api-key Header)</option>
                      </select>
                    </div>

                    {/* Base URL */}
                    <div>
                      <label className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-1 block`}>Base URL</label>
                      <input
                        type="text"
                        value={activeProfile.baseUrl}
                        placeholder={
                          activeProfile.apiProtocol === 'claude' ? 'https://api.anthropic.com' :
                          activeProfile.apiProtocol === 'gemini' ? 'https://generativelanguage.googleapis.com' :
                          activeProfile.apiProtocol === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com'
                        }
                        className={`w-full border p-2 rounded text-sm focus:border-violet-400 outline-none ${
                          darkMode ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-600' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                        }`}
                        onChange={e => {
                          updateActiveProfile({ baseUrl: e.target.value });
                          setUrlPreview(e.target.value.trim() ? getEndpoint(e.target.value, activeProfile.apiProtocol || 'openai', activeProfile.model) : '');
                        }}
                      />
                      {urlPreview && (
                        <p className={`text-[10px] mt-1 ${darkMode ? 'text-violet-400' : 'text-violet-500'}`}>
                          <i className="fas fa-link mr-1"></i>{urlPreview}
                        </p>
                      )}
                    </div>

                    {/* API Key */}
                    <div>
                      <label className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-1 block`}>
                        API Key {activeProfile.apiProtocol === 'ollama' && <span className="opacity-60">(本地免填)</span>}
                      </label>
                      <input
                        type="password"
                        value={activeProfile.apiKey}
                        placeholder={activeProfile.apiProtocol === 'ollama' ? '可选' : 'sk-...'}
                        className={`w-full border p-2 rounded text-sm focus:border-violet-400 outline-none ${
                          darkMode ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-600' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                        }`}
                        onChange={e => updateActiveProfile({ apiKey: e.target.value })}
                      />
                    </div>

                    {/* Model */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>模型名称</label>
                        <button
                          onClick={async () => {
                            if (!activeProfile.baseUrl && activeProfile.apiProtocol !== 'ollama') {
                              setModelError('请先填写 Base URL');
                              return;
                            }
                            setModelLoading(true);
                            setModelError('');
                            try {
                              const models = await fetchModelList(activeProfile.baseUrl, activeProfile.apiKey, activeProfile.apiProtocol || 'openai');
                              setModelList(models);
                              updateActiveProfile({ cachedModels: models });
                              if (models.length === 0) setModelError('API 返回的模型列表为空');
                            } catch (e) {
                              setModelError(e instanceof Error ? e.message : '获取失败');
                              setModelList([]);
                            } finally {
                              setModelLoading(false);
                            }
                          }}
                          disabled={modelLoading}
                          className={`text-[10px] font-bold ${darkMode ? 'text-violet-400 hover:text-violet-300' : 'text-violet-500 hover:text-violet-600'}`}
                        >
                          {modelLoading ? (
                            <><i className="fas fa-spinner animate-spin mr-1"></i>获取中...</>
                          ) : (
                            <><i className="fas fa-sync-alt mr-1"></i>获取模型列表</>
                          )}
                        </button>
                      </div>
                      {modelList.length > 0 ? (
                        <select
                          value={activeProfile.model}
                          className={`w-full border p-2 rounded text-sm focus:border-violet-400 outline-none ${
                            darkMode ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                          onChange={e => updateActiveProfile({ model: e.target.value })}
                        >
                          {!modelList.includes(activeProfile.model) && activeProfile.model && (
                            <option value={activeProfile.model}>{activeProfile.model} (当前)</option>
                          )}
                          {modelList.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={activeProfile.model}
                          placeholder=""
                          className={`w-full border p-2 rounded text-sm focus:border-violet-400 outline-none ${
                            darkMode ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-600' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                          }`}
                          onChange={e => {
                            updateActiveProfile({ model: e.target.value });
                            setUrlPreview(activeProfile.baseUrl.trim() ? getEndpoint(activeProfile.baseUrl, activeProfile.apiProtocol || 'openai', e.target.value) : '');
                          }}
                        />
                      )}
                      {modelError && (
                        <p className="text-[10px] text-red-500 mt-1">
                          <i className="fas fa-exclamation-circle mr-1"></i>{modelError}
                        </p>
                      )}
                    </div>

                    {/* 模块模型配置 */}
                    <div>
                      <div className={`flex items-center justify-between mb-2 pt-2 border-t ${
                        darkMode ? 'border-slate-700' : 'border-gray-100'
                      }`}>
                        <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>模块独立模型</label>
                        <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>留空则用默认模型</span>
                      </div>
                      <div className="space-y-2">
                        {(Object.entries(AI_MODULES) as [AIModuleKey, string][]).map(([key, label]) => {
                          const overrideVal = activeProfile?.modelOverrides?.[key] || '';
                          const selectCls = `flex-1 border px-2 py-1 rounded text-xs focus:border-violet-400 outline-none ${
                            darkMode ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-600' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                          }`;
                          const handleChange = (val: string) => {
                            const overrides = { ...(activeProfile?.modelOverrides || {}) };
                            if (val.trim()) {
                              overrides[key] = val;
                            } else {
                              delete overrides[key];
                            }
                            updateActiveProfile({ modelOverrides: overrides });
                          };
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <span className={`text-[11px] w-16 flex-shrink-0 ${
                                darkMode ? 'text-slate-400' : 'text-gray-500'
                              }`}>{label}</span>
                              {modelList.length > 0 ? (
                                <select
                                  value={overrideVal}
                                  className={selectCls}
                                  onChange={e => handleChange(e.target.value)}
                                >
                                  <option value="">默认 ({activeProfile?.model || '-'})</option>
                                  {modelList.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                  {overrideVal && !modelList.includes(overrideVal) && (
                                    <option value={overrideVal}>{overrideVal} (自定义)</option>
                                  )}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={overrideVal}
                                  placeholder=""
                                  className={selectCls}
                                  onChange={e => handleChange(e.target.value)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 底部操作栏 */}
                    <div className={`flex items-center justify-between pt-2 border-t ${
                      darkMode ? 'border-slate-700' : 'border-gray-100'
                    }`}>
                      <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>自动保存到浏览器本地</p>
                      <button
                        onClick={async () => {
                          if (!activeProfile.baseUrl && activeProfile.apiProtocol !== 'ollama') {
                            alert('请先填写 Base URL');
                            return;
                          }
                          if (!activeProfile.model) {
                            alert('请先填写或选择模型名称');
                            return;
                          }
                          try {
                            await chatWithAI([{ role: 'user', content: '你好，请回复"连接成功"' }]);
                            alert('连接测试成功！');
                          } catch (e) {
                            alert(`连接失败：${e instanceof Error ? e.message : '网络错误'}`);
                          }
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                          darkMode ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-violet-500 text-white hover:bg-violet-600'
                        }`}
                      >
                        <i className="fas fa-plug mr-1"></i>测试连接
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        </div>

        {/* Tab 切换按钮 (own row on mobile) */}
        <div className={`order-3 sm:order-none w-full sm:w-auto flex justify-center sm:justify-start sm:ml-0`}>
          <div className={`flex rounded-lg p-1 border ${t.tabs}`}>
            <button
              onClick={() => setActiveTab('resume')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                activeTab === 'resume' ? t.tabActive : t.tabInactive
              }`}
            >
              <i className="fas fa-file-alt mr-1.5"></i>简历编辑
            </button>
            <button
              onClick={() => setActiveTab('skillforge')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                activeTab === 'skillforge' ? t.tabActive : t.tabInactive
              }`}
            >
              <i className="fas fa-chart-radar mr-1.5"></i>技能分析
            </button>
          </div>
        </div>

        {/* 简历相关控件仅在 resume tab 显示 */}
        {activeTab === 'resume' && (
        <div className="flex items-center gap-2 sm:gap-3 order-4 sm:order-none w-full sm:w-auto sm:ml-auto">
          {/* 版本选择器 */}
          <div className="relative" ref={versionMenuRef}>
            <button
              onClick={() => setIsVersionMenuOpen(!isVersionMenuOpen)}
              className={`px-2.5 sm:px-4 py-2 rounded-lg text-sm font-bold border transition-all flex items-center gap-2 ${t.verBtn}`}
            >
              <i className="fas fa-file-alt"></i>
              <span className="max-w-[120px] truncate">{currentVersion?.name || '选择版本'}</span>
              <i className={`fas fa-chevron-down text-xs transition-transform ${isVersionMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {/* 版本下拉菜单 */}
            {isVersionMenuOpen && (
              <div className={`absolute top-full left-0 mt-2 w-72 rounded-lg z-50 overflow-hidden ${t.verDrop}`}>
                <div className={`p-2 border-b ${t.verBorder}`}>
                  <button
                    onClick={createNewVersion}
                    className={`w-full px-3 py-2 text-sm text-left rounded-md transition-all flex items-center gap-2 ${t.verNew}`}
                  >
                    <i className="fas fa-plus"></i> 基于当前简历新建
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto auto-scrollbar">
                  {storageData.versions.map(version => (
                    <div
                      key={version.id}
                      className={`group flex items-center gap-2 px-3 py-2 ${t.verItem} ${
                        version.id === storageData.currentVersionId ? t.verItemActive : ''
                      }`}
                    >
                      {editingVersionId === version.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onBlur={saveRename}
                          onKeyDown={e => e.key === 'Enter' && saveRename()}
                          className={`flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 ${t.verInput}`}
                          autoFocus
                        />
                      ) : (
                        <>
                          <button
                            onClick={() => switchVersion(version.id)}
                            className="flex-1 text-left text-sm truncate"
                          >
                            <span className={version.id === storageData.currentVersionId ? t.verCurrent : t.verNormal}>
                              {version.name}
                            </span>
                            <span className={`text-xs ${t.verDate} ml-2`}>
                              {new Date(version.updatedAt).toLocaleDateString()}
                            </span>
                          </button>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startRenaming(version)}
                              className={`p-1 ${t.verAction}`}
                              title="重命名"
                            >
                              <i className="fas fa-pen text-xs"></i>
                            </button>
                            <button
                              onClick={() => duplicateVersion(version.id)}
                              className={`p-1 ${t.verAction}`}
                              title="复制"
                            >
                              <i className="fas fa-copy text-xs"></i>
                            </button>
                            <button
                              onClick={() => deleteVersion(version.id)}
                              className={`p-1 ${t.verDelete}`}
                              title="删除"
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {/* 导入导出按钮 */}
                <div className={`p-2 border-t ${t.verBorder} flex gap-2`}>
                  <button
                    onClick={handleExportData}
                    className={`flex-1 px-3 py-2 text-sm text-center rounded-md transition-all flex items-center justify-center gap-2 ${t.verExport}`}
                    title="导出所有简历数据到本地文件"
                  >
                    <i className="fas fa-download"></i> 导出备份
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 px-3 py-2 text-sm text-center rounded-md transition-all flex items-center justify-center gap-2 ${t.verImport}`}
                    title="从本地文件导入简历数据"
                  >
                    <i className="fas fa-upload"></i> 导入数据
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className={`md:hidden px-4 py-2 rounded-lg text-sm font-bold border ${t.mobileBtn}`}
          >
            {isPreviewOpen ? '编辑资料' : '查看预览'}
          </button>

          <button
            onClick={handleSaveAsDefault}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${t.saveBtn}`}
            title="保存当前数据为默认模板"
          >
            <i className="fas fa-save"></i>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className={`px-3 sm:px-6 py-2 ${isExporting ? 'bg-slate-600' : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500'} text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all text-sm`}
          >
            {isExporting ? (
              <><i className="fas fa-spinner animate-spin"></i><span className="hidden sm:inline"> 生成中...</span></>
            ) : (
              <><i className="fas fa-download"></i><span className="hidden sm:inline"> 下载 PDF</span></>
            )}
          </button>
        </div>
        )}
      </header>

      {/* 主界面布局 */}
      {/* 简历编辑视图 */}
      <main className={`flex-1 flex flex-col md:flex-row overflow-hidden ${activeTab !== 'resume' ? 'hidden' : ''}`}>
        {/* 左侧：内容编辑 */}
        <section className={`flex-1 overflow-y-auto hide-scrollbar no-print ${t.editorBg} ${isPreviewOpen ? 'hidden md:block' : 'block'}`}>
          <div className="max-w-3xl mx-auto py-4 sm:py-8 px-3 sm:px-6">
            <ResumeEditor data={data} onChange={setData} darkMode={darkMode} />
          </div>
        </section>

        {/* 右侧：实时预览 */}
        <section className={`flex-1 overflow-auto hide-scrollbar ${t.previewBg} p-4 md:p-12 flex flex-col items-center ${!isPreviewOpen ? 'hidden md:block' : 'block'}`}>
          <div className="flex-1 w-full flex justify-center">
            {/* 缩放层：仅用于显示，导出时会克隆一份原始比例的 */}
            <div
              id="resume-wrapper"
              className="scale-[0.5] sm:scale-[0.6] md:scale-[0.7] lg:scale-[0.8] xl:scale-95 origin-top shadow-2xl shrink-0"
              style={darkMode ? { filter: 'invert(0.88) hue-rotate(180deg)' } : undefined}
            >
               <ResumePreview data={data} onChange={setData} />
            </div>
          </div>
        </section>
      </main>

      {/* 技能分析视图 */}
      <div className={`flex-1 overflow-hidden ${darkMode ? 'skillforge-theme' : ''} ${activeTab !== 'skillforge' ? 'hidden' : ''}`}>
        <SkillForgeApp darkMode={darkMode} />
      </div>
    </div>
  );
};

export default App;
