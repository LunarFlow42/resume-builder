
import React from 'react';
import { ResumeData, EducationEntry, ExperienceEntry, SkillEntry, LayoutSettings } from '../types';
import { chatWithAI, loadAISettings, type ChatMessage } from '../services/ai';

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
    {
      label: 'Google XYZ 重构',
      desc: '动词+方案+量化成果',
      icon: 'fa-gem',
      prompt: '请基于 Google XYZ 原则（通过 [方案Z] 达成 [成果Y] 解决 [痛点X]）重构这段经历。\n\n具体要求：\n1. 输出 2-3 条精炼有力的「•」要点（Bullet Points）；\n2. 每条要点必须以硬核主导型动作动词开头（如：主导、重构、设计、调优、封装、落地、沉淀），坚决避免“负责”、“参与”等弱动词；\n3. 突出采用的技术方案、工具库与业务/工程成效，严禁无中生有编造夸张虚假的业务数据；\n4. 若原文缺少明确数据，请从工程指标（首屏时间、打包体积、组件复用度、代码覆盖率等）切入，或使用 [提升约 X%] 清晰占位；\n5. 只输出纯文本要点，直接可用于简历，不要任何解释说明。'
    },
    {
      label: 'STAR 深度拆解',
      desc: '情境-任务-行动-结果闭环',
      icon: 'fa-star',
      prompt: '请运用 STAR 原则（情境-任务-行动-结果）深度梳理重构这段经历。\n\n具体要求：\n1. 提炼为 2-3 条「•」要点，完整体现技术背景/瓶颈（S/T）、攻坚举措与方案（A）、最终带来的技术收益或业务价值（R）；\n2. 严禁出现"情境："、"行动："等机械标签，融合成自然有力的高信息密度语句；\n3. 突出个人在解决问题过程中的核心贡献与关键技术抉择；\n4. 只输出优化后的纯文本要点。'
    },
    {
      label: '大厂硬核技术深度',
      desc: '深挖原理/架构与调优攻坚',
      icon: 'fa-microchip',
      prompt: '请针对大厂技术面试重点，强化这段经历的技术壁垒与工程深度。\n\n具体要求：\n1. 深入挖掘架构设计思想、核心机制与底层原理、技术选型权衡、难点攻坚以及性能调优全过程；\n2. 规范融入核心技术专有名词与技术生态；\n3. 输出 2-3 条高技术密度的「•」分点，展现攻坚复杂工程问题的硬实力；\n4. 只输出优化后的纯文本要点。'
    },
    {
      label: '数据与工程量化',
      desc: '突出真实指标与可衡量收益',
      icon: 'fa-chart-line',
      prompt: '请对这段经历进行工程指标与成果收益的量化提炼。\n\n具体要求：\n1. 重点提炼可度量的工程指标（如首屏耗时降幅、打包体积缩减、接口响应 QPS/耗时、组件复用率、CI 构建提效等）；\n2. 若原文无明确数据，请给出合理的工程度量维度，并在数值处使用「[X%]」或「[约 X ms]」清晰占位，严禁虚假捏造离谱的商业数据；\n3. 输出为 2-3 条「•」要点，每条以强动词开头；\n4. 只输出优化后的纯文本。'
    },
    {
      label: 'ATS 高频词提纯',
      desc: '大厂初筛匹配度最大化',
      icon: 'fa-bullseye',
      prompt: '请优化这段描述以全面契合主流招聘 ATS（简历筛选系统）的高频匹配算法。\n\n具体要求：\n1. 提炼并强化该岗位最核心的专业术语与技术栈关键词，提升初筛匹配权重；\n2. 语言表达专业地道，贴合头部科技公司对该岗位的通用能力模型；\n3. 结构清晰，输出为 2-3 条「•」要点；\n4. 只输出优化后的纯文本。'
    },
    {
      label: '一页纸极限精简',
      desc: '去粗取精，极致压缩篇幅',
      icon: 'fa-compress-alt',
      prompt: '请以“高密度、零废话”为原则大幅精炼压缩这段内容，使其适应一页纸排版。\n\n具体要求：\n1. 剔除所有“负责”、“参与”等套话废话，只保留最硬核的技术方案与成果主干；\n2. 压缩为 2 条极简的「•」要点，每条一句话讲清核心价值；\n3. 语言极具力量感，直接输出纯文本。'
    },
  ];

  // AI 预设提示 — 技能类
  const SKILL_PRESETS = [
    {
      label: '大厂专业句式',
      desc: '熟练度+技术栈+底层原理',
      icon: 'fa-layer-group',
      prompt: '请将技能描述重构为大厂技术面试认可的专业句式。\n\n具体要求：\n1. 采用“熟练掌握 [技术栈]，深入理解 [底层核心原理]，具备 [实战场景/调优] 经验”的标准句式改写；\n2. 突出技术深度与原理认知（如源码机制、架构设计、性能调优等），杜绝单词简单罗列；\n3. 专有名词使用官方标准大小写（如 TypeScript, React, Docker）；\n4. 只输出优化后的纯文本描述。'
    },
    {
      label: '系统分类整合',
      desc: '按模块维度结构化归类',
      icon: 'fa-sitemap',
      prompt: '请将当前技能点按专业技术维度分类整理（如：【核心基础】、【框架生态】、【工程化构建】、【服务端与工具】等）。\n\n具体要求：\n1. 每个分类提炼为 1 句高信息密度的专业描述；\n2. 层次分明，逻辑连贯，展现系统的全栈/专业知识树；\n3. 只输出优化后的纯文本描述。'
    },
    {
      label: '底层原理深挖',
      desc: '突出源码理解与底层机制',
      icon: 'fa-code-branch',
      prompt: '请在现有技能基础上，深入挖掘并突出核心机制与底层原理。\n\n具体要求：\n1. 重点补充对底层运行机制、设计模式、源码架构、并发控制或性能优化的理解；\n2. 展现从“API 使用者”到“底层原理通晓者”的技术深度；\n3. 语言严谨专业，只输出优化后的纯文本。'
    },
    {
      label: '补充关联技能',
      desc: '推断补充一线团队必备技能',
      icon: 'fa-plus-circle',
      prompt: '结合当前核心技术栈，推断并合理补充该技术方向在头部团队中最受青睐的高价值配套技术与工具（如自动化测试、CI/CD、微前端、构建优化、监控告警等）。\n\n具体要求：\n1. 以专业的行业通用句式自然融入；\n2. 避免盲目堆砌，只补充最相关、最有含金量的技能；\n3. 只输出优化后的纯文本。'
    },
    {
      label: 'ATS 关键词规范',
      desc: '校准专有名词与高频术语',
      icon: 'fa-spell-check',
      prompt: '请全面校准所有技能专有名词的大小写与行业官方标准拼写，并补充该领域 ATS 筛选最高频的核心技术关键词，提高简历初筛通过率。只输出优化后的纯文本。'
    },
    {
      label: '紧凑提纯合并',
      desc: '剔除基础项，只留核心杀手锏',
      icon: 'fa-compress',
      prompt: '请去粗取精，剔除基础或过时的技能点，只保留最具竞争力的 3-4 项核心硬核技能，提炼为精炼干练的专业语句。只输出优化后的纯文本。'
    },
  ];

  // 快捷追问 — 经历类
  const EXPERIENCE_REFINES = [
    { label: '更强动词开头', prompt: '请将所有要点的开头动词升级为更具主导力和冲击力的硬核动词（如主导、重构、推演、攻克、落地），提升主动性和影响力。' },
    { label: '强化底层原理', prompt: '请在此版本基础上，深入补充攻坚该问题时所运用的底层技术原理、设计模式或核心机制。' },
    { label: '提炼为2个要点', prompt: '请将当前内容进一步提炼整合，只保留最硬核、最有说服力的 2 条「•」要点。' },
    { label: '加入度量占位', prompt: '请在技术成果部分补充具体的工程量化指标，若不确定可用 [提升约 X%] 占位提醒填入。' },
    { label: '换种写法', prompt: '请换一种完全不同的切入角度与叙述风格重新组织改写。' },
  ];

  // 快捷追问 — 技能类
  const SKILL_REFINES = [
    { label: '增加原理深度', prompt: '请为主要技术栈增加对底层运行机制、设计哲学或性能优化的理解表述。' },
    { label: '更精简一句话', prompt: '请压缩字数，精简为更紧凑有力的单句表达。' },
    { label: '补充主流生态', prompt: '请补充该技术栈最常见的一线工程化工具或主流周边生态。' },
    { label: '规范名词大小写', prompt: '请严格校对所有技术专有名词的官方标准大小写与专业拼写。' },
    { label: '按熟练度排序', prompt: '请将技能按掌握深度从核心精通到熟悉熟练重新排序。' },
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
        ? `你是一名大厂技术面试官与资深职业顾问。你的任务是优化简历中的专业技能描述。

【核心准则】：
1. 采用专业句式（如：“熟练掌握 [技术栈]，深入理解 [底层原理/机制]，具备 [实战场景/调优] 经验”），拒绝无区分度的简单罗列。
2. 专有名词务必严格遵守官方大小写规范（如 TypeScript, React, Vue 3, Docker, Node.js, Webpack, Git）。
3. 实事求是，按掌握深度客观表述，体现技术进阶与技术攻坚深度。
4. 只输出优化后的纯文本，严禁输出任何问候语、说明、解释或 Markdown 格式，确保内容可直接粘贴到简历中。`
        : `你是一名顶级科技企业资深技术面试官与招聘专家。你的任务是重构和打磨简历中的经历描述。

【核心准则】：
1. 遵循 Google XYZ 黄金法则：Accomplished [X], as measured by [Y], by doing [Z]（通过采用 [技术方案/架构选型 Z]，解决了 [痛点问题 X]，达成了 [可衡量的技术或业务成果 Y]）。
2. 每项均以硬核动作动词开头（如：主导、重构、设计、调优、封装、落地、沉淀），坚决避免“负责”、“参与”等弱动词。
3. 默认采用清晰的「•」分项输出（Bullet Points），每项 1~2 行，信息密度高、易于速读。
4. 严禁无中生有编造夸张虚假的业务数据；若原文缺乏量化指标，应引导从工程质量指标（首屏时间、打包体积、组件复用度、代码覆盖率等）切入，或用 [提升约 X%] 规范占位。
5. 只输出优化后的纯文本要点，严禁输出任何问候语、说明、标签（如“情境：”、“行动：”）或 Markdown 标题代码块，确保内容可直接粘贴到简历中。`
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
                <input type="text" value={skill.category} placeholder="类别" className={`border ${t.input} p-1.5 rounded w-32 sm:w-40 font-bold text-sm mt-0.5 shrink-0`} onChange={e => { const newList = [...data.skills]; newList[idx] = { ...newList[idx], category: e.target.value }; onChange({ ...data, skills: newList }); }} />
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
            <label className={`text-xs ${t.text4} mb-1 block`}>字号 (pt / 磅)</label>
            <select
              value={data.layout.fontSize ?? 10.5}
              onChange={(e) => updateLayout('fontSize', Number(e.target.value))}
              className={`w-full border ${t.input} p-1.5 rounded text-sm focus:border-emerald-500 outline-none`}
            >
              <option value="9.5">9.5 pt (小五) - 紧凑精简</option>
              <option value="10">10 pt - 常用适中</option>
              <option value="10.5">10.5 pt (五号) - 简历黄金标准</option>
              <option value="11">11 pt - 饱满清晰</option>
              <option value="12">12 pt (小四) - 经历较少适用</option>
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
            { label: '性别', key: 'gender', canHide: true },
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
                  <div className={`text-xs font-bold ${t.text3} mb-2`}>选择专业优化方向</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {(aiDialog.type === 'skill' ? SKILL_PRESETS : AI_PRESETS).map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => handleAISend(preset.prompt)}
                        className={`flex items-start gap-2.5 p-3 border ${t.dlgPreset} rounded-xl text-sm transition-all text-left group hover:scale-[1.01] hover:border-emerald-500/60`}
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 mt-0.5 shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                          <i className={`fas ${preset.icon} text-xs`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-xs sm:text-sm ${t.text1}`}>{preset.label}</div>
                          {preset.desc && (
                            <div className={`text-[11px] ${t.text4} mt-0.5 line-clamp-1`}>{preset.desc}</div>
                          )}
                        </div>
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
