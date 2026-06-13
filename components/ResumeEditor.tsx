
import React from 'react';
import { ResumeData, EducationEntry, ExperienceEntry, SkillEntry, LayoutSettings } from '../types';
import { chatWithAI, loadAISettings, type ChatMessage } from '../services/gemini';

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  darkMode: boolean;
}

// 模块配置（默认值）
const DEFAULT_TITLES: Record<string, string> = {
  education: '教育背景',
  projects: '项目经历',
  campus: '校园实践',
  training: '培训经历',
  work: '工作经历',
  internship: '实习经历',
  awards: '荣誉奖项',
  certificates: '证书资质',
  evaluation: '自我评价',
  skills: '专业技能'
};

const SECTION_ICONS: Record<string, string> = {
  education: 'fa-graduation-cap',
  projects: 'fa-project-diagram',
  campus: 'fa-university',
  training: 'fa-laptop-code',
  work: 'fa-briefcase',
  internship: 'fa-user-tie',
  awards: 'fa-trophy',
  certificates: 'fa-certificate',
  evaluation: 'fa-user',
  skills: 'fa-tools'
};

const titleMap: Record<string, string> = {
  projects: "项目经历",
  campus: "校园实践",
  training: "培训经历",
  work: "工作经历",
  internship: "实习经历",
  awards: "荣誉奖项",
  certificates: "证书资质"
};

// 编辑器主题
const getTheme = (dark: boolean) => ({
  // 卡片容器
  card: dark ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-md' : 'bg-white border-gray-200 shadow-sm',
  cardSticky: dark ? 'bg-slate-800/80 border-slate-700/50 backdrop-blur-md' : 'bg-white/95 border-gray-200 shadow-sm backdrop-blur-sm',
  // 输入框
  input: dark ? 'bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-gray-50 border-gray-300 text-gray-800 placeholder:text-gray-400',
  // 文字层级
  text1: dark ? 'text-slate-100' : 'text-gray-900',
  text2: dark ? 'text-slate-200' : 'text-gray-700',
  text3: dark ? 'text-slate-400' : 'text-gray-500',
  text4: dark ? 'text-slate-500' : 'text-gray-400',
  text5: dark ? 'text-slate-600' : 'text-gray-300',
  textOff: dark ? 'text-slate-700' : 'text-gray-300',
  // 边框
  border: dark ? 'border-slate-700/50' : 'border-gray-200',
  borderDash: dark ? 'border-slate-600' : 'border-gray-300',
  // 交互按钮
  moveActive: dark ? 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/30' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50',
  moveDisabled: dark ? 'text-slate-700 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed',
  eyeOn: dark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-500 hover:text-emerald-600',
  eyeOff: dark ? 'text-slate-600 hover:text-slate-400' : 'text-gray-400 hover:text-gray-500',
  btnAdd: dark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-500',
  btnDelete: dark ? 'text-red-400/60 hover:text-red-400' : 'text-red-400/60 hover:text-red-500',
  btnAI: dark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
  sectionEdit: dark ? 'text-slate-600 group-hover:text-emerald-400' : 'text-gray-400 group-hover:text-emerald-500',
  // AI 设置
  aiCard: dark ? 'from-violet-900/30 to-fuchsia-900/20 border-violet-500/30' : 'from-violet-50 to-fuchsia-50 border-violet-200',
  aiIcon: dark ? 'text-violet-400' : 'text-violet-500',
  aiBadge: dark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
  aiBadgeWarn: dark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-600',
  aiUrl: dark ? 'text-violet-400' : 'text-violet-500',
  aiFetch: dark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-500 hover:text-violet-600',
  aiTest: dark ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-violet-500 text-white hover:bg-violet-600',
  // 对话框
  dlgOverlay: dark ? 'bg-black/60' : 'bg-black/40',
  dlgBg: dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200 shadow-2xl',
  dlgBorder: dark ? 'border-slate-700' : 'border-gray-200',
  dlgOriginal: dark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700',
  dlgPreset: dark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-violet-900/30 hover:border-violet-500/50 hover:text-violet-300' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700',
  dlgUser: dark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-100 border-gray-200 text-gray-700',
  dlgAi: dark ? 'bg-violet-900/20 border-violet-500/30 text-slate-200' : 'bg-violet-50 border-violet-200 text-gray-800',
  dlgInput: dark ? 'border-slate-700 bg-slate-900/50 text-slate-200 placeholder:text-slate-600' : 'border-gray-300 bg-white text-gray-800 placeholder:text-gray-400',
  dlgFooter: dark ? 'bg-slate-800/50' : 'bg-gray-50',
  dlgSend: dark ? 'bg-violet-600 text-white hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500' : 'bg-violet-500 text-white hover:bg-violet-600 disabled:bg-gray-200 disabled:text-gray-400',
  dlgApply: dark ? 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500' : 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400',
  dlgCancel: dark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700',
  dlgRefine: dark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-violet-900/30 hover:border-violet-500/50 hover:text-violet-300' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-600',
  dlgLoading: dark ? 'text-violet-400' : 'text-violet-500',
  // 已隐藏模块区
  hiddenCard: dark ? 'bg-slate-800/30 border-dashed border-slate-600' : 'bg-gray-50 border-dashed border-gray-300',
  hiddenTitle: dark ? 'text-slate-400' : 'text-gray-500',
  hiddenBtn: dark ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-emerald-900/30 hover:border-emerald-700 hover:text-emerald-400' : 'bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600',
  // 杂项
  colorBorder: dark ? 'border-slate-700' : 'border-gray-300',
  chevron: dark ? 'text-slate-500' : 'text-gray-400',
  savedHint: dark ? 'text-slate-400' : 'text-gray-400',
  // 撤销 Toast
  toast: dark ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-gray-200 text-gray-700 shadow-lg',
  toastUndo: dark ? 'text-emerald-400 hover:text-emerald-300 font-bold' : 'text-emerald-600 hover:text-emerald-500 font-bold',
});

// SectionTitle with editable title and reorder buttons
const SectionTitle: React.FC<{
  title: string;
  sectionKey: string;
  darkMode: boolean;
  onTitleChange?: (newTitle: string) => void;
  onAdd?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}> = ({ title, sectionKey, darkMode, onTitleChange, onAdd, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(title);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const t = getTheme(darkMode);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() && onTitleChange) {
      onTitleChange(editValue.trim());
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex justify-between items-center mb-4 mt-6 border-l-4 border-emerald-500 pl-3">
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setEditValue(title); setIsEditing(false); }
            }}
            className={`text-lg font-bold ${t.text1} border-b-2 border-emerald-400 outline-none bg-transparent px-1`}
          />
        ) : (
          <h3
            className={`text-lg font-bold ${t.text1} cursor-pointer hover:text-emerald-400 group flex items-center gap-1`}
            onClick={() => { setEditValue(title); setIsEditing(true); }}
            title="点击修改标题"
          >
            {title}
            <i className={`fas fa-pen text-[10px] ${t.sectionEdit}`}></i>
          </h3>
        )}
        {/* 排序按钮 */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className={`p-1 rounded ${canMoveUp ? t.moveActive : t.moveDisabled}`}
            title="上移模块"
          >
            <i className="fas fa-chevron-up text-xs"></i>
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className={`p-1 rounded ${canMoveDown ? t.moveActive : t.moveDisabled}`}
            title="下移模块"
          >
            <i className="fas fa-chevron-down text-xs"></i>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onAdd && (
          <button onClick={onAdd} className={`${t.btnAdd} text-sm flex items-center gap-1`}>
            <i className="fas fa-plus"></i> 添加
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className={`${t.btnDelete} text-sm flex items-center gap-1`}
            title="删除此模块"
          >
            <i className="fas fa-trash-alt"></i>
          </button>
        )}
      </div>
    </div>
  );
};

// 简单标题（无排序）
const SimpleSectionTitle: React.FC<{ title: string; darkMode: boolean }> = ({ title, darkMode }) => {
  const t = getTheme(darkMode);
  return (
    <div className="flex justify-between items-center mb-4 mt-6 border-l-4 border-emerald-500 pl-3">
      <h3 className={`text-lg font-bold ${t.text1}`}>{title}</h3>
    </div>
  );
};

// ExperienceItem with reorder buttons
interface ExperienceItemProps {
  item: ExperienceEntry;
  section: 'projects' | 'campus' | 'training' | 'work' | 'internship' | 'awards' | 'certificates';
  index: number;
  total: number;
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  loading: string | null;
  onAI: (text: string, section: string, callback: (val: string) => void) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  darkMode: boolean;
  hidden?: boolean;
  onToggleHidden?: () => void;
  onDelete: () => void;
}

const ExperienceItem: React.FC<ExperienceItemProps> = ({
  item,
  section,
  index,
  total,
  data,
  onChange,
  loading,
  onAI,
  onMoveUp,
  onMoveDown,
  darkMode,
  hidden,
  onToggleHidden,
  onDelete
}) => {
  const t = getTheme(darkMode);
  const isCertOrAward = section === 'certificates' || section === 'awards';

  return (
    <div className={`mb-4 border-b ${t.border} pb-4 last:border-0 relative group ${hidden ? 'opacity-50' : ''}`}>
      {/* 操作按钮 */}
      <div className="absolute top-0 right-0 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {onToggleHidden && (
          <button
            onClick={onToggleHidden}
            className={`p-1 rounded ${hidden ? t.eyeOff : t.eyeOn}`}
            title={hidden ? '点击显示此条目' : '点击隐藏此条目'}
          >
            <i className={`fas ${hidden ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
          </button>
        )}
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className={`p-1 rounded ${index > 0 ? t.moveActive : t.moveDisabled}`}
          title="上移"
        >
          <i className="fas fa-arrow-up text-xs"></i>
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className={`p-1 rounded ${index < total - 1 ? t.moveActive : t.moveDisabled}`}
          title="下移"
        >
          <i className="fas fa-arrow-down text-xs"></i>
        </button>
        <button
          className="p-1 text-red-400 hover:text-red-600"
          onClick={onDelete}
          title="删除"
        >
          <i className="fas fa-trash-alt text-xs"></i>
        </button>
      </div>

      {isCertOrAward ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:pr-20">
          <input
            type="text"
            value={item.timeline}
            placeholder="时间 (例如：2025.12)"
            className={`border ${t.input} p-1.5 rounded text-sm`}
            onChange={e => {
              const newList = [...(data[section] as ExperienceEntry[])];
              newList[index] = { ...newList[index], timeline: e.target.value };
              onChange({ ...data, [section]: newList });
            }}
          />
          <input
            type="text"
            value={item.title}
            placeholder={section === 'certificates' ? "证书名称" : "奖项名称"}
            className={`border ${t.input} p-1.5 rounded text-sm`}
            onChange={e => {
              const newList = [...(data[section] as ExperienceEntry[])];
              newList[index] = { ...newList[index], title: e.target.value };
              onChange({ ...data, [section]: newList });
            }}
          />
          <input
            type="text"
            value={item.description}
            placeholder="颁发机构 / 级别 / 成绩等说明"
            className={`border ${t.input} p-1.5 rounded text-sm`}
            onChange={e => {
              const newList = [...(data[section] as ExperienceEntry[])];
              newList[index] = { ...newList[index], description: e.target.value };
              onChange({ ...data, [section]: newList });
            }}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2 sm:pr-20">
            <input
              type="text"
              value={item.timeline}
              placeholder="时间"
              className={`border ${t.input} p-1 rounded text-sm`}
              onChange={e => {
                const newList = [...(data[section] as ExperienceEntry[])];
                newList[index] = { ...newList[index], timeline: e.target.value };
                onChange({ ...data, [section]: newList });
              }}
            />
            <input
              type="text"
              value={item.title}
              placeholder="项目/单位名称"
              className={`border ${t.input} p-1 rounded text-sm`}
              onChange={e => {
                const newList = [...(data[section] as ExperienceEntry[])];
                newList[index] = { ...newList[index], title: e.target.value };
                onChange({ ...data, [section]: newList });
              }}
            />
            <input
              type="text"
              value={item.role}
              placeholder="担任角色"
              className={`border ${t.input} p-1 rounded text-sm`}
              onChange={e => {
                const newList = [...(data[section] as ExperienceEntry[])];
                newList[index] = { ...newList[index], role: e.target.value };
                onChange({ ...data, [section]: newList });
              }}
            />
          </div>
          <div className="relative">
            <textarea
              value={item.description}
              placeholder="具体描述..."
              className={`w-full border ${t.input} p-2 rounded min-h-[5rem] text-sm resize-none overflow-hidden`}
              rows={1}
              ref={el => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }
              }}
              onChange={e => {
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
                const newList = [...(data[section] as ExperienceEntry[])];
                newList[index] = { ...newList[index], description: e.target.value };
                onChange({ ...data, [section]: newList });
              }}
            />
            <button
              onClick={() => onAI(item.description, titleMap[section] || "板块内容", val => {
                const newList = [...(data[section] as ExperienceEntry[])];
                newList[index] = { ...newList[index], description: val };
                onChange({ ...data, [section]: newList });
              })}
              className={`absolute bottom-2 right-2 ${t.btnAI} px-2 py-1 rounded text-xs`}
              disabled={loading === `${section}-${item.id}`}
            >
              {loading === `${section}-${item.id}` ? '优化中...' : '✨ AI'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const ResumeEditor: React.FC<Props> = ({ data, onChange, darkMode }) => {
  const [loading, setLoading] = React.useState<string | null>(null);

  // 删除撤销栈
  const [undoStack, setUndoStack] = React.useState<{ message: string; snapshot: ResumeData }[]>([]);
  const [undoToast, setUndoToast] = React.useState<{ message: string; timerId: ReturnType<typeof setTimeout> } | null>(null);

  // AI 对话弹窗状态
  const [aiDialog, setAiDialog] = React.useState<{
    open: boolean;
    type: 'experience' | 'skill';
    originalText: string;
    section: string;
    result: string;
    messages: ChatMessage[];
    loading: boolean;
    userInput: string;
    callback: ((text: string) => void) | null;
  }>({
    open: false, type: 'experience', originalText: '', section: '', result: '',
    messages: [], loading: false, userInput: '', callback: null,
  });
  const aiChatEndRef = React.useRef<HTMLDivElement>(null);

  const t = getTheme(darkMode);

  // 所有已知模块
  const ALL_SECTIONS = ['education', 'work', 'internship', 'projects', 'campus', 'training', 'awards', 'certificates', 'evaluation', 'skills'];

  // 获取模块列表和排序
  const hiddenSections = data.layout?.hiddenSections || [];
  const hiddenFields = data.layout?.hiddenFields || [];
  const sectionOrder = data.layout?.sectionOrder || ['skills', 'projects', 'education'];
  const sectionTitles = data.layout?.sectionTitles || DEFAULT_TITLES;

  const isSectionVisible = (section: string) => !hiddenSections.includes(section);
  const isFieldVisible = (field: string) => !hiddenFields.includes(field);
  const visibleSections = sectionOrder.filter(s => isSectionVisible(s));

  // 可添加的模块：不在 visibleSections 中的所有已知模块
  const addableSections = ALL_SECTIONS.filter(s => !visibleSections.includes(s));

  // 切换字段显示/隐藏
  const toggleField = (field: string) => {
    const newHiddenFields = hiddenFields.includes(field)
      ? hiddenFields.filter(f => f !== field)
      : [...hiddenFields, field];
    onChange({
      ...data,
      layout: {
        ...data.layout,
        hiddenFields: newHiddenFields
      }
    });
  };

  // 子条目隐藏
  const hiddenItems = data.layout?.hiddenItems || {};

  const isItemHidden = (section: string, itemId: string) => {
    return (hiddenItems[section] || []).includes(itemId);
  };

  const toggleItemHidden = (section: string, itemId: string) => {
    const sectionHidden = hiddenItems[section] || [];
    const newSectionHidden = sectionHidden.includes(itemId)
      ? sectionHidden.filter(id => id !== itemId)
      : [...sectionHidden, itemId];
    onChange({
      ...data,
      layout: {
        ...data.layout,
        hiddenItems: {
          ...hiddenItems,
          [section]: newSectionHidden
        }
      }
    });
  };

  // 删除并提供撤销
  const deleteWithUndo = (message: string, doDelete: () => void) => {
    const snapshot = JSON.parse(JSON.stringify(data)) as ResumeData;
    setUndoStack(prev => [...prev, { message, snapshot }]);
    doDelete();
    if (undoToast) clearTimeout(undoToast.timerId);
    const timerId = setTimeout(() => setUndoToast(null), 5000);
    setUndoToast({ message, timerId });
  };

  const performUndo = React.useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      onChange(last.snapshot);
      return prev.slice(0, -1);
    });
    setUndoToast(prev => { if (prev) clearTimeout(prev.timerId); return null; });
  }, [onChange]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        performUndo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [performUndo]);

  // 获取模块标题
  const getSectionTitle = (sectionKey: string) => sectionTitles[sectionKey] || DEFAULT_TITLES[sectionKey] || sectionKey;

  // 更新模块标题
  const updateSectionTitle = (sectionKey: string, newTitle: string) => {
    onChange({
      ...data,
      layout: {
        ...data.layout,
        sectionTitles: {
          ...sectionTitles,
          [sectionKey]: newTitle
        }
      }
    });
  };

  // 隐藏模块
  const hideSection = (section: string) => {
    onChange({
      ...data,
      layout: {
        ...data.layout,
        hiddenSections: [...hiddenSections, section]
      }
    });
  };

  // 显示模块（从隐藏恢复，或首次添加到 sectionOrder）
  const showSection = (section: string) => {
    const newHidden = hiddenSections.filter(s => s !== section);
    const newOrder = sectionOrder.includes(section) ? sectionOrder : [...sectionOrder, section];
    onChange({
      ...data,
      layout: {
        ...data.layout,
        hiddenSections: newHidden,
        sectionOrder: newOrder
      }
    });
  };

  // 移动模块
  const moveSectionUp = (section: string) => {
    const idx = sectionOrder.indexOf(section);
    if (idx > 0) {
      const newOrder = [...sectionOrder];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      onChange({
        ...data,
        layout: { ...data.layout, sectionOrder: newOrder }
      });
    }
  };

  const moveSectionDown = (section: string) => {
    const idx = sectionOrder.indexOf(section);
    if (idx < sectionOrder.length - 1) {
      const newOrder = [...sectionOrder];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      onChange({
        ...data,
        layout: { ...data.layout, sectionOrder: newOrder }
      });
    }
  };

  // 移动列表项
  const moveItemUp = (section: keyof ResumeData, index: number) => {
    if (index > 0) {
      const list = [...(data[section] as any[])];
      [list[index - 1], list[index]] = [list[index], list[index - 1]];
      onChange({ ...data, [section]: list });
    }
  };

  const moveItemDown = (section: keyof ResumeData, index: number) => {
    const list = data[section] as any[];
    if (index < list.length - 1) {
      const newList = [...list];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      onChange({ ...data, [section]: newList });
    }
  };

  const updatePersonalInfo = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const updateJobIntent = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: {
        ...data.personalInfo,
        jobIntent: { ...data.personalInfo.jobIntent, [field]: value }
      }
    });
  };

  // AI 预设提示 — 经历类
  const AI_PRESETS = [
    { label: '综合优化', icon: 'fa-magic', prompt: '请综合优化这段简历内容，使其更专业、精炼，突出成就和可量化的结果。' },
    { label: '数据量化', icon: 'fa-chart-bar', prompt: '请为这段内容添加具体的数据和量化指标（如百分比、数量、时间等），让成果更有说服力。如果原文没有具体数字，请根据上下文合理推测。' },
    { label: 'STAR法则', icon: 'fa-star', prompt: '请参考STAR法则（情境-任务-行动-结果）的逻辑重新组织这段内容，使描述更有条理和说服力。注意：不要输出"情境："、"任务："等标签，写成自然流畅的段落。' },
    { label: '精简压缩', icon: 'fa-compress-alt', prompt: '请将这段内容精简压缩到原来的60%左右篇幅，只保留最核心的信息，去掉冗余表达。' },
    { label: '技术深度', icon: 'fa-code', prompt: '请加强这段内容的技术深度描述，突出使用的技术栈、解决的技术难题和技术方案选型。' },
    { label: '领导力', icon: 'fa-users', prompt: '请优化这段内容，突出领导力、团队协作和沟通能力方面的表现。' },
  ];

  // AI 预设提示 — 技能类
  const SKILL_PRESETS = [
    { label: '专业润色', icon: 'fa-pen-fancy', prompt: '请优化这段技能描述，使用更专业的行业术语，提升专业感。保持简洁的列举式风格。' },
    { label: '补充技能', icon: 'fa-plus-circle', prompt: '根据已列出的技能，推断该候选人可能还掌握哪些相关技能，合理补充到描述中。保持同样的格式风格。' },
    { label: '按熟练度排序', icon: 'fa-sort-amount-down', prompt: '请将这些技能按照从核心/熟练到一般/了解的顺序重新排列，把最重要的技能放在前面。' },
    { label: '关键词优化', icon: 'fa-search', prompt: '请优化这段技能描述，确保包含该领域常见的ATS（简历筛选系统）关键词，提高简历通过机器筛选的概率。' },
    { label: '分级描述', icon: 'fa-layer-group', prompt: '请为每项技能加上熟练程度描述（如精通/熟练/掌握/了解），使技能水平更清晰。保持简洁。' },
    { label: '精简合并', icon: 'fa-compress-alt', prompt: '请精简合并这些技能描述，去掉重复和不重要的内容，只保留最有竞争力的技能点。' },
  ];

  // 快捷追问 — 经历类
  const EXPERIENCE_REFINES = [
    { label: '更简洁', prompt: '请在当前版本基础上进一步精简，减少30%篇幅。' },
    { label: '更详细', prompt: '请在当前版本基础上适当展开，补充更多细节。' },
    { label: '加数据', prompt: '请在当前版本基础上补充具体的数据和量化指标。' },
    { label: '换个写法', prompt: '请用完全不同的表达方式重新优化原文，给出另一种版本。' },
  ];

  // 快捷追问 — 技能类
  const SKILL_REFINES = [
    { label: '再精简', prompt: '请进一步精简，去掉不重要的技能点。' },
    { label: '补充更多', prompt: '请再补充几个相关的技能点。' },
    { label: '换种格式', prompt: '请用另一种格式重新组织这些技能（如用逗号分隔、用分号分隔等）。' },
    { label: '更专业', prompt: '请用更专业的术语重新描述这些技能。' },
  ];

  const handleAI = async (text: string, section: string, callback: (newText: string) => void, type: 'experience' | 'skill' = 'experience') => {
    const settings = loadAISettings();
    if (!settings.baseUrl || !settings.apiKey) {
      alert('请先点击顶栏的 AI 设置按钮（机器人图标）配置 API');
      return;
    }
    if (!text.trim()) {
      alert('请先填写内容再使用 AI 优化');
      return;
    }

    const isSkill = type === 'skill';
    const systemMsg: ChatMessage = {
      role: 'system',
      content: isSkill
        ? `你是一名专业的简历优化工具。你的唯一任务是根据用户要求优化简历中的技能描述。

严格规则：
1. 只输出优化后的技能描述文本，不要输出任何其他内容
2. 不要输出问候语、结束语、解释说明、建议备注等任何额外文字
3. 不要使用Markdown格式（如加粗、标题、列表符号等）
4. 保持简洁的列举风格，用逗号或顿号分隔各项技能
5. 保持原文的真实背景信息，不捏造事实
6. 输出必须是可以直接粘贴到简历技能栏的纯文本`
        : `你是一名专业的简历优化工具。你的唯一任务是根据用户要求优化简历文本。

严格规则：
1. 只输出优化后的简历文本本身，不要输出任何其他内容
2. 不要输出问候语、结束语、解释说明、建议备注等任何额外文字
3. 不要使用Markdown格式（如加粗、标题、列表符号等）
4. 不要输出"情境："、"任务："、"行动："、"结果："等结构标签
5. 保持原文的真实背景信息，不捏造事实
6. 输出必须是可以直接粘贴到简历上的纯文本段落`
    };

    setAiDialog({
      open: true, type, originalText: text, section, result: '',
      messages: [systemMsg, { role: 'user', content: `简历板块：${section}\n原始内容：${text}` }],
      loading: false, userInput: '', callback,
    });
  };

  const handleAISend = async (prompt: string) => {
    if (!prompt.trim() || aiDialog.loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: aiDialog.messages.length <= 2
        ? `${prompt}\n\n简历板块：${aiDialog.section}\n原始内容：${aiDialog.originalText}`
        : prompt,
    };

    // 首次发送时 messages 只有 system + context，追加 preset prompt
    // 后续发送时直接追加
    const isFirst = aiDialog.messages.length <= 2;
    const newMessages = isFirst
      ? [aiDialog.messages[0], userMsg]
      : [...aiDialog.messages, userMsg];

    setAiDialog(prev => ({
      ...prev,
      messages: newMessages,
      loading: true,
      userInput: '',
    }));

    try {
      const result = await chatWithAI(newMessages, 'resume');
      setAiDialog(prev => ({
        ...prev,
        loading: false,
        result,
        messages: [...prev.messages, { role: 'assistant', content: result }],
      }));
    } catch (error) {
      setAiDialog(prev => ({
        ...prev,
        loading: false,
        result: prev.result || '',
      }));
      alert(`AI 请求失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleAIRefine = async () => {
    await handleAISend(aiDialog.userInput.trim());
  };

  const handleAIApply = () => {
    if (aiDialog.callback && aiDialog.result) {
      aiDialog.callback(aiDialog.result);
    }
    setAiDialog(prev => ({ ...prev, open: false }));
  };

  const handleAIClose = () => {
    setAiDialog(prev => ({ ...prev, open: false }));
  };

  // 渲染各个模块
  const renderSection = (sectionKey: string, visibleIdx: number) => {
    const canMoveUp = visibleIdx > 0;
    const canMoveDown = visibleIdx < visibleSections.length - 1;
    const title = getSectionTitle(sectionKey);

    switch (sectionKey) {
      case 'education':
        return (
          <div key={sectionKey} className={`${t.card} p-3 sm:p-6 rounded-xl border`}>
            <SectionTitle
              title={title}
              sectionKey={sectionKey}
              darkMode={darkMode}
              onTitleChange={(newTitle) => updateSectionTitle(sectionKey, newTitle)}
              onAdd={() => onChange({ ...data, education: [...data.education, { id: Date.now().toString(), timeline: '', school: '', degree: '', major: '', details: '' }] })}
              onDelete={() => hideSection(sectionKey)}
              onMoveUp={() => moveSectionUp(sectionKey)}
              onMoveDown={() => moveSectionDown(sectionKey)}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
            />
            {data.education.map((edu, idx) => (
              <div key={edu.id} className={`mb-3 border-b ${t.border} pb-3 last:border-0 relative group ${isItemHidden('education', edu.id) ? 'opacity-50' : ''}`}>
                <div className="absolute top-0 right-0 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleItemHidden('education', edu.id)}
                    className={`p-1 rounded ${isItemHidden('education', edu.id) ? t.eyeOff : t.eyeOn}`}
                    title={isItemHidden('education', edu.id) ? '点击显示此条目' : '点击隐藏此条目'}
                  >
                    <i className={`fas ${isItemHidden('education', edu.id) ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                  <button onClick={() => moveItemUp('education', idx)} disabled={idx === 0} className={`p-1 ${idx > 0 ? t.moveActive : t.moveDisabled}`}><i className="fas fa-arrow-up text-xs"></i></button>
                  <button onClick={() => moveItemDown('education', idx)} disabled={idx === data.education.length - 1} className={`p-1 ${idx < data.education.length - 1 ? t.moveActive : t.moveDisabled}`}><i className="fas fa-arrow-down text-xs"></i></button>
                  <button onClick={() => deleteWithUndo('教育经历', () => onChange({ ...data, education: data.education.filter(e => e.id !== edu.id) }))} className="p-1 text-red-400 hover:text-red-600"><i className="fas fa-trash-alt text-xs"></i></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 sm:pr-16">
                  <input type="text" value={edu.timeline} placeholder="时间" className={`border ${t.input} p-1.5 rounded text-sm`} onChange={e => { const newList = [...data.education]; newList[idx] = { ...newList[idx], timeline: e.target.value }; onChange({ ...data, education: newList }); }} />
                  <input type="text" value={edu.school} placeholder="学校" className={`border ${t.input} p-1.5 rounded text-sm`} onChange={e => { const newList = [...data.education]; newList[idx] = { ...newList[idx], school: e.target.value }; onChange({ ...data, education: newList }); }} />
                  <input type="text" value={edu.degree} placeholder="学位" className={`border ${t.input} p-1.5 rounded text-sm`} onChange={e => { const newList = [...data.education]; newList[idx] = { ...newList[idx], degree: e.target.value }; onChange({ ...data, education: newList }); }} />
                  <input type="text" value={edu.major} placeholder="专业" className={`border ${t.input} p-1.5 rounded text-sm`} onChange={e => { const newList = [...data.education]; newList[idx] = { ...newList[idx], major: e.target.value }; onChange({ ...data, education: newList }); }} />
                </div>
                <textarea value={edu.details} placeholder="补充说明" className={`w-full border ${t.input} p-1.5 rounded min-h-[3rem] text-sm resize-none overflow-hidden`} rows={1} ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} onChange={e => { const el = e.target; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; const newList = [...data.education]; newList[idx] = { ...newList[idx], details: e.target.value }; onChange({ ...data, education: newList }); }} />
              </div>
            ))}
          </div>
        );

      case 'projects':
      case 'campus':
      case 'training':
      case 'work':
      case 'internship':
      case 'awards':
      case 'certificates':
        const items = (data[sectionKey as keyof ResumeData] as ExperienceEntry[] | undefined) || [];
        return (
          <div key={sectionKey} className={`${t.card} p-3 sm:p-6 rounded-xl border`}>
            <SectionTitle
              title={title}
              sectionKey={sectionKey}
              darkMode={darkMode}
              onTitleChange={(newTitle) => updateSectionTitle(sectionKey, newTitle)}
              onAdd={() => onChange({ ...data, [sectionKey]: [...items, { id: Date.now().toString(), timeline: '', title: '', role: '', description: '' }] })}
              onDelete={() => hideSection(sectionKey)}
              onMoveUp={() => moveSectionUp(sectionKey)}
              onMoveDown={() => moveSectionDown(sectionKey)}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
            />
            {items.map((item, idx) => (
              <ExperienceItem
                key={item.id}
                item={item}
                section={sectionKey as 'projects' | 'campus' | 'training' | 'work' | 'internship' | 'awards' | 'certificates'}
                index={idx}
                total={items.length}
                data={data}
                onChange={onChange}
                loading={loading}
                onAI={handleAI}
                onMoveUp={() => moveItemUp(sectionKey as keyof ResumeData, idx)}
                onMoveDown={() => moveItemDown(sectionKey as keyof ResumeData, idx)}
                darkMode={darkMode}
                hidden={isItemHidden(sectionKey, item.id)}
                onToggleHidden={() => toggleItemHidden(sectionKey, item.id)}
                onDelete={() => deleteWithUndo(getSectionTitle(sectionKey), () => {
                  onChange({ ...data, [sectionKey]: (data[sectionKey as keyof ResumeData] as ExperienceEntry[]).filter(i => i.id !== item.id) });
                })}
              />
            ))}
          </div>
        );

      case 'evaluation':
        return (
          <div key={sectionKey} className={`${t.card} p-3 sm:p-6 rounded-xl border`}>
            <SectionTitle
              title={title}
              sectionKey={sectionKey}
              darkMode={darkMode}
              onTitleChange={(newTitle) => updateSectionTitle(sectionKey, newTitle)}
              onDelete={() => hideSection(sectionKey)}
              onMoveUp={() => moveSectionUp(sectionKey)}
              onMoveDown={() => moveSectionDown(sectionKey)}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
            />
            <div className="relative">
              <textarea
                value={data.evaluation || ''}
                placeholder="请输入自我评价..."
                className={`w-full border ${t.input} p-2 rounded min-h-[6rem] text-sm resize-none overflow-hidden`}
                rows={1}
                ref={el => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }
                }}
                onChange={e => {
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                  onChange({ ...data, evaluation: e.target.value });
                }}
              />
              <button
                onClick={() => handleAI(data.evaluation || '', getSectionTitle('evaluation'), val => {
                  onChange({ ...data, evaluation: val });
                })}
                className={`absolute bottom-2 right-2 ${t.btnAI} px-2 py-1 rounded text-xs`}
                disabled={loading === 'evaluation'}
              >
                {loading === 'evaluation' ? '优化中...' : '✨ AI'}
              </button>
            </div>
          </div>
        );

      case 'skills':
        return (
          <div key={sectionKey} className={`${t.card} p-3 sm:p-6 rounded-xl border`}>
            <SectionTitle
              title={title}
              sectionKey={sectionKey}
              darkMode={darkMode}
              onTitleChange={(newTitle) => updateSectionTitle(sectionKey, newTitle)}
              onAdd={() => onChange({ ...data, skills: [...data.skills, { id: Date.now().toString(), category: '', content: '' }] })}
              onDelete={() => hideSection(sectionKey)}
              onMoveUp={() => moveSectionUp(sectionKey)}
              onMoveDown={() => moveSectionDown(sectionKey)}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
            />
            {data.skills.map((skill, idx) => (
              <div key={skill.id} className={`flex gap-2 mb-2 items-start group ${isItemHidden('skills', skill.id) ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-2">
                  <button
                    onClick={() => toggleItemHidden('skills', skill.id)}
                    className={`p-0.5 ${isItemHidden('skills', skill.id) ? t.eyeOff : t.eyeOn}`}
                    title={isItemHidden('skills', skill.id) ? '点击显示此条目' : '点击隐藏此条目'}
                  >
                    <i className={`fas ${isItemHidden('skills', skill.id) ? 'fa-eye-slash' : 'fa-eye'} text-[10px]`}></i>
                  </button>
                  <button onClick={() => moveItemUp('skills', idx)} disabled={idx === 0} className={`p-0.5 ${idx > 0 ? t.moveActive : t.moveDisabled}`}><i className="fas fa-arrow-up text-[10px]"></i></button>
                  <button onClick={() => moveItemDown('skills', idx)} disabled={idx === data.skills.length - 1} className={`p-0.5 ${idx < data.skills.length - 1 ? t.moveActive : t.moveDisabled}`}><i className="fas fa-arrow-down text-[10px]"></i></button>
                </div>
                <input type="text" value={skill.category} placeholder="类别" className={`border ${t.input} p-1.5 rounded w-20 font-bold text-sm mt-0.5`} onChange={e => { const newList = [...data.skills]; newList[idx] = { ...newList[idx], category: e.target.value }; onChange({ ...data, skills: newList }); }} />
                <div className="relative flex-1">
                  <textarea value={skill.content} placeholder="描述" className={`border ${t.input} p-1.5 pr-16 rounded w-full text-sm resize-none overflow-hidden min-h-[2.25rem] leading-6`} rows={1} ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} onChange={e => { const el = e.target; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; const newList = [...data.skills]; newList[idx] = { ...newList[idx], content: e.target.value }; onChange({ ...data, skills: newList }); }} />
                  <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleAI(skill.content, skill.category || '专业技能', val => {
                        const newList = [...data.skills];
                        newList[idx] = { ...newList[idx], content: val };
                        onChange({ ...data, skills: newList });
                      }, 'skill')}
                      className={`${t.btnAI} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}
                      disabled={loading === `skills-${idx}`}
                    >
                      {loading === `skills-${idx}` ? '...' : '✨'}
                    </button>
                    <button className="text-red-400 p-0.5" onClick={() => deleteWithUndo('技能行', () => onChange({ ...data, skills: data.skills.filter((_, sidx) => sidx !== idx) }))}><i className="fas fa-times text-xs"></i></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const updateLayout = (field: keyof LayoutSettings, value: any) => {
    onChange({
      ...data,
      layout: {
        ...data.layout,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 快捷排版设置 */}
      <div className={`${t.cardSticky} p-4 rounded-xl border sm:sticky sm:top-0 z-10`}>
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-magic text-emerald-400"></i>
          <h3 className={`text-sm font-bold ${t.text2}`}>快捷排版</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 字体选择 */}
          <div>
            <label className={`text-xs ${t.text4} mb-1 block`}>字体</label>
            <select
              value={data.layout.fontFamily}
              onChange={(e) => updateLayout('fontFamily', e.target.value)}
              className={`w-full border ${t.input} p-1.5 rounded text-sm focus:border-emerald-500 outline-none`}
            >
              <option value="Microsoft YaHei">微软雅黑</option>
              <option value="SimSun">宋体</option>
              <option value="SimHei">黑体</option>
              <option value="KaiTi">楷体</option>
              <option value="FangSong">仿宋</option>
              <option value="Arial">Arial</option>
            </select>
          </div>

          {/* 字号 */}
          <div>
            <label className={`text-xs ${t.text4} mb-1 block`}>字号</label>
            <select
              value={data.layout.fontSize}
              onChange={(e) => updateLayout('fontSize', Number(e.target.value))}
              className={`w-full border ${t.input} p-1.5 rounded text-sm focus:border-emerald-500 outline-none`}
            >
              <option value="12">12px - 小</option>
              <option value="13">13px - 较小</option>
              <option value="14">14px - 标准</option>
              <option value="15">15px - 较大</option>
              <option value="16">16px - 大</option>
            </select>
          </div>

          {/* 行距 */}
          <div>
            <label className={`text-xs ${t.text4} mb-1 block`}>行距</label>
            <select
              value={data.layout.lineHeight}
              onChange={(e) => updateLayout('lineHeight', Number(e.target.value))}
              className={`w-full border ${t.input} p-1.5 rounded text-sm focus:border-emerald-500 outline-none`}
            >
              <option value="1.3">1.3 - 紧凑</option>
              <option value="1.4">1.4 - 较紧</option>
              <option value="1.5">1.5 - 标准</option>
              <option value="1.55">1.55 - 适中</option>
              <option value="1.6">1.6 - 舒适</option>
              <option value="1.8">1.8 - 宽松</option>
            </select>
          </div>

          {/* 主题色 */}
          <div>
            <label className={`text-xs ${t.text4} mb-1 block`}>主题色</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={data.layout.themeColor}
                onChange={(e) => updateLayout('themeColor', e.target.value)}
                className={`w-10 h-8 border ${t.colorBorder} rounded cursor-pointer bg-transparent`}
              />
              <div className="flex-1 flex gap-1">
                {['#2b4766', '#1a5490', '#16a085', '#e74c3c', '#8e44ad', '#2c3e50'].map(color => (
                  <button
                    key={color}
                    onClick={() => updateLayout('themeColor', color)}
                    className={`w-6 h-6 rounded border-2 ${t.colorBorder} hover:scale-110 transition-transform`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 个人信息 */}
      <div className={`${t.card} p-3 sm:p-6 rounded-xl border`}>
        <SimpleSectionTitle title="个人信息" darkMode={darkMode} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: '姓名', key: 'name', canHide: false },
            { label: '年龄', key: 'age', canHide: true },
            { label: '电话', key: 'phone', canHide: true },
            { label: '邮箱', key: 'email', canHide: true },
            { label: '经验', key: 'experience', canHide: true },
            { label: '学历', key: 'education', canHide: true },
            { label: '户籍', key: 'hometown', canHide: true },
            { label: '作品集/项目链接 (生成二维码)', key: 'qrCodeUrl', canHide: true },
            { label: '二维码下说明 (如: 扫码看作品集)', key: 'qrCodeLabel', canHide: true }
          ].map(field => (
            <div key={field.key} className={`${!isFieldVisible(field.key) && field.canHide ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-0.5">
                <label className={`text-xs ${t.text3}`}>{field.label}</label>
                {field.canHide && (
                  <button
                    onClick={() => toggleField(field.key)}
                    className={`text-xs p-0.5 rounded ${isFieldVisible(field.key) ? t.eyeOn : t.eyeOff}`}
                    title={isFieldVisible(field.key) ? '点击隐藏此字段' : '点击显示此字段'}
                  >
                    <i className={`fas ${isFieldVisible(field.key) ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={(data.personalInfo as any)[field.key] || ''}
                onChange={e => updatePersonalInfo(field.key, e.target.value)}
                className={`w-full border ${t.input} p-1.5 rounded text-sm focus:border-emerald-500 outline-none`}
              />
            </div>
          ))}
        </div>

        <SimpleSectionTitle title="求职意向" darkMode={darkMode} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`${!isFieldVisible('jobIntent.role') ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-0.5">
              <label className={`text-xs ${t.text3}`}>期望职位</label>
              <button
                onClick={() => toggleField('jobIntent.role')}
                className={`text-xs p-0.5 rounded ${isFieldVisible('jobIntent.role') ? t.eyeOn : t.eyeOff}`}
                title={isFieldVisible('jobIntent.role') ? '点击隐藏此字段' : '点击显示此字段'}
              >
                <i className={`fas ${isFieldVisible('jobIntent.role') ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>
            <input type="text" value={data.personalInfo.jobIntent.role} onChange={e => updateJobIntent('role', e.target.value)} placeholder="期望职位" className={`w-full border ${t.input} p-1.5 rounded text-sm focus:border-emerald-500 outline-none`} />
          </div>
          <div className={`${!isFieldVisible('jobIntent.type') ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-0.5">
              <label className={`text-xs ${t.text3}`}>求职状态</label>
              <button
                onClick={() => toggleField('jobIntent.type')}
                className={`text-xs p-0.5 rounded ${isFieldVisible('jobIntent.type') ? t.eyeOn : t.eyeOff}`}
                title={isFieldVisible('jobIntent.type') ? '点击隐藏此字段' : '点击显示此字段'}
              >
                <i className={`fas ${isFieldVisible('jobIntent.type') ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>
            <input type="text" value={data.personalInfo.jobIntent.type} onChange={e => updateJobIntent('type', e.target.value)} placeholder="求职状态" className={`w-full border ${t.input} p-1.5 rounded text-sm focus:border-emerald-500 outline-none`} />
          </div>
        </div>
      </div>

      {/* 按 sectionOrder 渲染各模块 */}
      {visibleSections.map((sectionKey, idx) => renderSection(sectionKey, idx))}

      {/* 添加模块 */}
      {addableSections.length > 0 && (
        <div className={`${t.hiddenCard} p-4 rounded-xl border`}>
          <h3 className={`text-sm font-bold ${t.hiddenTitle} mb-3`}>
            <i className="fas fa-plus-circle mr-2"></i>添加模块
          </h3>
          <div className="flex flex-wrap gap-2">
            {addableSections.map(section => (
              <button
                key={section}
                onClick={() => showSection(section)}
                className={`px-3 py-1.5 ${t.hiddenBtn} rounded-lg text-sm transition-all flex items-center gap-2`}
              >
                <i className={`fas ${SECTION_ICONS[section] || 'fa-folder'}`}></i>
                {getSectionTitle(section)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI 对话弹窗 */}
      {aiDialog.open && (
        <div className={`fixed inset-0 ${t.dlgOverlay} backdrop-blur-sm z-50 flex items-center justify-center p-4`} onClick={handleAIClose}>
          <div
            className={`${t.dlgBg} border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col`}
            onClick={e => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${t.dlgBorder}`}>
              <div className="flex items-center gap-2">
                <i className={`fas fa-robot ${t.aiIcon}`}></i>
                <h3 className={`font-bold ${t.text1}`}>AI 优化助手</h3>
                <span className={`text-xs ${t.text4}`}>— {aiDialog.section}</span>
              </div>
              <button onClick={handleAIClose} className={`${t.text4} hover:${t.text2} p-1`}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* 对话内容区 */}
            <div className="flex-1 overflow-y-auto auto-scrollbar px-5 py-4 space-y-4 min-h-0">
              {/* 原文 */}
              <div>
                <div className={`text-xs font-bold ${t.text4} mb-1`}>原文</div>
                <div className={`${t.dlgOriginal} border rounded-lg p-3 text-sm whitespace-pre-wrap`}>
                  {aiDialog.originalText}
                </div>
              </div>

              {/* 预设按钮 — 首次交互时显示 */}
              {aiDialog.messages.length <= 2 && !aiDialog.loading && (
                <div>
                  <div className={`text-xs font-bold ${t.text3} mb-2`}>选择优化方向</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(aiDialog.type === 'skill' ? SKILL_PRESETS : AI_PRESETS).map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => handleAISend(preset.prompt)}
                        className={`flex items-center gap-2 px-3 py-2.5 border ${t.dlgPreset} rounded-lg text-sm transition-all text-left`}
                      >
                        <i className={`fas ${preset.icon} ${t.aiIcon}`}></i>
                        <span className="font-medium">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 对话历史 */}
              {aiDialog.messages.slice(2).map((msg, idx) => {
                const isLastAssistant = msg.role === 'assistant' &&
                  idx === aiDialog.messages.slice(2).length - 1 - [...aiDialog.messages.slice(2)].reverse().findIndex(m => m.role === 'assistant');
                return (
                <div key={idx}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className={`${t.dlgUser} border rounded-lg px-3 py-2 text-sm max-w-[80%]`}>
                        {(() => { const text = typeof msg.content === 'string' ? msg.content : ''; return text.length > 80 ? text.slice(0, 80) + '...' : text; })()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className={`text-xs font-bold ${t.aiIcon} mb-1 flex items-center justify-between`}>
                        <span className="flex items-center gap-1">
                          <i className="fas fa-robot"></i> AI 建议
                        </span>
                        {isLastAssistant && !aiDialog.loading && (
                          <span className={`text-[10px] font-normal ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                            <i className="fas fa-pen text-[8px] mr-1"></i>可直接编辑
                          </span>
                        )}
                      </div>
                      {isLastAssistant && !aiDialog.loading ? (
                        <textarea
                          ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                          value={aiDialog.result}
                          onChange={e => {
                            setAiDialog(prev => ({ ...prev, result: e.target.value }));
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          className={`${t.dlgAi} border rounded-lg p-3 text-sm whitespace-pre-wrap w-full outline-none resize-none focus:ring-1 focus:ring-violet-500/50 overflow-hidden`}
                        />
                      ) : (
                        <div className={`${t.dlgAi} border rounded-lg p-3 text-sm whitespace-pre-wrap ${darkMode ? 'opacity-60' : 'opacity-70'}`}>
                          {msg.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}

              {/* 加载中 */}
              {aiDialog.loading && (
                <div className={`flex items-center gap-2 ${t.dlgLoading} text-sm py-2`}>
                  <i className="fas fa-spinner animate-spin"></i>
                  AI 正在思考...
                </div>
              )}
              <div ref={aiChatEndRef} />
            </div>

            {/* 底部操作区 */}
            <div className={`px-5 py-3 border-t ${t.dlgBorder} ${t.dlgFooter}`}>
              {/* 有结果后显示快捷追问按钮 */}
              {aiDialog.result && !aiDialog.loading && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(aiDialog.type === 'skill' ? SKILL_REFINES : EXPERIENCE_REFINES).map(q => (
                    <button
                      key={q.label}
                      onClick={() => handleAISend(q.prompt)}
                      className={`px-2.5 py-1 border ${t.dlgRefine} rounded-full text-xs transition-all`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}

              {/* 自定义输入 */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={aiDialog.userInput}
                  onChange={e => setAiDialog(prev => ({ ...prev, userInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIRefine(); } }}
                  placeholder="输入自定义修改要求..."
                  className={`flex-1 ${t.dlgInput} border px-3 py-2 rounded-lg text-sm outline-none`}
                  disabled={aiDialog.loading}
                />
                <button
                  onClick={handleAIRefine}
                  disabled={aiDialog.loading || !aiDialog.userInput.trim()}
                  className={`px-4 py-2 ${t.dlgSend} rounded-lg text-sm font-bold transition-all`}
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>

              {/* 采纳/取消 */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleAIClose}
                  className={`px-4 py-2 text-sm ${t.dlgCancel}`}
                >
                  取消
                </button>
                <button
                  onClick={handleAIApply}
                  disabled={aiDialog.loading || !aiDialog.result || aiDialog.result.startsWith('出错了')}
                  className={`px-6 py-2 ${t.dlgApply} rounded-lg text-sm font-bold transition-all flex items-center gap-2`}
                >
                  <i className="fas fa-check"></i> 采纳此版本
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除撤销 Toast */}
      {undoToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg flex items-center gap-3 text-sm ${t.toast}`}>
          <i className="fas fa-trash-alt text-xs opacity-50"></i>
          <span>已删除{undoToast.message}</span>
          <button className={`ml-2 ${t.toastUndo}`} onClick={performUndo}>
            撤销
          </button>
          <span className={`text-xs ${t.text5}`}>Ctrl+Z</span>
        </div>
      )}
    </div>
  );
};

export default ResumeEditor;
