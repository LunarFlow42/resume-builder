
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ResumeEditor from './components/ResumeEditor';
import ResumePreview from './components/ResumePreview';
import SkillForgeApp from './components/skillforge/SkillForgeApp';
import { INITIAL_DATA } from './constants';
import { ResumeData, ResumeVersion, StorageData } from './types';
import { loadAISettings, loadAISettingsStore, saveAISettingsStore, normalizeBaseUrl, fetchModelList, AI_MODULES, type AISettings, type AIProfile, type AISettingsStore, type AIModuleKey } from './services/gemini';

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
    // 修正旧的合并标题
    if (d.layout.sectionTitles.work === '工作/实习经历') {
      d.layout.sectionTitles.work = '工作经历';
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

// 导出数据到 JSON 文件
const exportDataToFile = (data: StorageData, filename?: string) => {
  const exportData = {
    ...data,
    exportedAt: Date.now(),
    version: '2.0'
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `简历备份_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // 标记已备份，不再提醒
  localStorage.setItem(BACKUP_REMINDED_KEY, 'true');
};

// 从文件导入数据
const importDataFromFile = (file: File): Promise<StorageData | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // 验证数据结构
        if (parsed.versions && parsed.versions.length > 0 && parsed.currentVersionId) {
          resolve(migrateStorageData(parsed as StorageData));
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
    const s = loadAISettings();
    return s.baseUrl ? normalizeBaseUrl(s.baseUrl) : '';
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
    setUrlPreview(profile?.baseUrl ? normalizeBaseUrl(profile.baseUrl) : '');
  };

  const addProfile = () => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newProfile: AIProfile = { id, name: `配置 ${aiStore.profiles.length + 1}`, baseUrl: '', apiKey: '', model: 'gemini-3-pro-preview-bs' };
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
      setUrlPreview(active?.baseUrl ? normalizeBaseUrl(active.baseUrl) : '');
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
      if (confirm(`成功解析备份文件，包含 ${imported.versions.length} 个简历版本。\n\n是否覆盖当前数据？（当前数据将丢失）`)) {
        setStorageData(imported);
        alert('数据导入成功！');
      }
    } else {
      alert('导入失败：文件格式不正确');
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

    overlay.appendChild(clone);

    // 移除分页参考线（不导出到 PDF）
    clone.querySelectorAll('[data-page-break]').forEach(el => el.remove());

    // 等待渲染，让字体有时间加载和渲染
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // @ts-ignore - 直接使用 html2canvas 和 jsPDF
      const html2canvas = window.html2canvas;
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
        onclone: (clonedDoc: Document) => {
          // html2canvas 对字体垂直位置渲染有偏差，用 padding 补偿
          // 原始居中逻辑：height:18 + paddingBottom:10 = 总高28px
          // 设 width 也为 28px 使 border-radius:50% 渲染为正圆
          const iconContainers = clonedDoc.querySelectorAll('.section-icon');
          iconContainers.forEach((container: any) => {
            container.style.paddingBottom = '10px';
            container.style.paddingTop = '0px';
            container.style.boxSizing = 'content-box';
            container.style.height = '18px';
            container.style.width = '28px';
            container.style.borderRadius = '50%';
          });
        }
      });

      // A4 尺寸 (mm)
      const A4_WIDTH = 210;
      const A4_HEIGHT = 297;

      // 计算总高度对应的页数（减去 15 像素容差，防止 html2canvas 渲染时的 sub-pixel 舍入误差或微小的底边距溢出导致多出一页空白页）
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const pageHeightInCanvas = canvasWidth * (A4_HEIGHT / A4_WIDTH);
      const totalPages = Math.max(1, Math.ceil((canvasHeight - 15) / pageHeightInCanvas));

      // 创建 PDF
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      });

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        // 裁剪当前页对应的 canvas 区域
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        const sliceHeight = Math.min(pageHeightInCanvas, canvasHeight - page * pageHeightInCanvas);
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, page * pageHeightInCanvas,     // source x, y
          canvasWidth, sliceHeight,           // source w, h
          0, 0,                               // dest x, y
          canvasWidth, sliceHeight            // dest w, h
        );

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.98);
        const imgHeight = (sliceHeight / canvasWidth) * A4_WIDTH;
        pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH, imgHeight, undefined, 'FAST');
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
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-emerald-900/30 group-hover:scale-105 transition-transform duration-200">R</div>
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

                    {/* Base URL */}
                    <div>
                      <label className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-1 block`}>Base URL</label>
                      <input
                        type="text"
                        value={activeProfile.baseUrl}
                        placeholder="https://api.openai.com"
                        className={`w-full border p-2 rounded text-sm focus:border-violet-400 outline-none ${
                          darkMode ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-600' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                        }`}
                        onChange={e => {
                          updateActiveProfile({ baseUrl: e.target.value });
                          setUrlPreview(e.target.value.trim() ? normalizeBaseUrl(e.target.value) : '');
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
                      <label className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'} mb-1 block`}>API Key</label>
                      <input
                        type="password"
                        value={activeProfile.apiKey}
                        placeholder="sk-..."
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
                            if (!activeProfile.baseUrl || !activeProfile.apiKey) {
                              setModelError('请先填写 Base URL 和 API Key');
                              return;
                            }
                            setModelLoading(true);
                            setModelError('');
                            try {
                              const models = await fetchModelList(activeProfile.baseUrl, activeProfile.apiKey);
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
                          placeholder="gemini-3-pro-preview-bs"
                          className={`w-full border p-2 rounded text-sm focus:border-violet-400 outline-none ${
                            darkMode ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-600' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                          }`}
                          onChange={e => updateActiveProfile({ model: e.target.value })}
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
                                  placeholder={activeProfile?.model || '默认模型'}
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
                          if (!activeProfile.baseUrl || !activeProfile.apiKey) {
                            alert('请先填写 Base URL 和 API Key');
                            return;
                          }
                          try {
                            const endpoint = normalizeBaseUrl(activeProfile.baseUrl);
                            const res = await fetch(endpoint, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${activeProfile.apiKey}`,
                              },
                              body: JSON.stringify({
                                model: activeProfile.model || 'gemini-3-pro-preview-bs',
                                messages: [{ role: 'user', content: '你好，请回复"连接成功"' }],
                                max_tokens: 20,
                              }),
                            });
                            if (res.ok) {
                              alert('连接测试成功！');
                            } else {
                              const err = await res.text();
                              alert(`连接失败 (${res.status}): ${err}`);
                            }
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
