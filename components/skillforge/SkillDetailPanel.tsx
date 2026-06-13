import React from 'react';
import { Skill, SkillStatus, SkillRoadmap } from '../../skillforge/types';

const SE_STORAGE_KEY = 'skillforge-search-engine';
const getSearchUrl = (q: string) => {
  try { if (localStorage.getItem(SE_STORAGE_KEY) === 'bing') return `https://www.bing.com/search?q=${encodeURIComponent(q)}`; } catch {}
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
};

const getDetailTheme = (dark: boolean) => ({
  overlay: dark ? 'bg-black/50' : 'bg-black/30',
  panel: dark ? 'bg-slate-900 border-l border-slate-700' : 'bg-white border-l border-gray-200',
  closeBtn: dark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100',
  skillName: dark ? 'text-white' : 'text-gray-900',
  categoryBadge: dark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-gray-100 text-gray-600 border border-gray-200',
  description: dark ? 'text-slate-400' : 'text-gray-500',
  sectionTitle: dark ? 'text-white' : 'text-gray-900',
  regenBtn: dark ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-900/30' : 'text-violet-600 hover:text-violet-500 hover:bg-violet-50',
  // Timeline
  lineColor: dark ? 'bg-slate-700' : 'bg-gray-200',
  stepTitle: dark ? 'text-slate-200' : 'text-gray-800',
  stepDesc: dark ? 'text-slate-400' : 'text-gray-500',
  resourceTag: dark ? 'bg-slate-800 text-indigo-300 border border-slate-700' : 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  checkbox: dark ? 'border-slate-600 hover:border-emerald-500' : 'border-gray-300 hover:border-emerald-500',
  checkboxChecked: dark ? 'bg-emerald-600 border-emerald-600' : 'bg-emerald-500 border-emerald-500',
  // Progress bar
  progressBg: dark ? 'bg-slate-800' : 'bg-gray-200',
  progressText: dark ? 'text-slate-400' : 'text-gray-500',
  // Skeleton
  skeleton: dark ? 'bg-slate-800' : 'bg-gray-200',
  // Importance
  importanceHigh: dark ? 'border-red-500/50 text-red-300 bg-red-900/20' : 'border-red-300 text-red-600 bg-red-50',
  importanceMedium: dark ? 'border-blue-500/50 text-blue-300 bg-blue-900/20' : 'border-blue-300 text-blue-600 bg-blue-50',
  importanceLow: dark ? 'border-slate-500/50 text-slate-300 bg-slate-900/20' : 'border-gray-300 text-gray-500 bg-gray-50',
  // Status buttons
  statusLocked: dark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-gray-100 text-gray-500 border border-gray-200',
  statusLearning: dark ? 'bg-amber-900/30 text-amber-300 border border-amber-500/50' : 'bg-amber-50 text-amber-700 border border-amber-300',
  statusMastered: dark ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-300',
});

interface SkillDetailPanelProps {
  skill: Skill;
  roadmap: SkillRoadmap | null;
  isGenerating: boolean;
  darkMode: boolean;
  onClose: () => void;
  onGenerateRoadmap: (skillId: string) => void;
  onToggleStepComplete: (skillId: string, stepIndex: number) => void;
}

export const SkillDetailPanel: React.FC<SkillDetailPanelProps> = ({
  skill,
  roadmap,
  isGenerating,
  darkMode,
  onClose,
  onGenerateRoadmap,
  onToggleStepComplete,
}) => {
  const t = getDetailTheme(darkMode);

  const getImportanceClass = (importance: string) => {
    switch (importance) {
      case 'High': return t.importanceHigh;
      case 'Medium': return t.importanceMedium;
      default: return t.importanceLow;
    }
  };

  const getImportanceLabel = (importance: string) => {
    switch (importance) {
      case 'High': return '高优先级';
      case 'Medium': return '中优先级';
      default: return '低优先级';
    }
  };

  const getStatusClass = (status: SkillStatus) => {
    switch (status) {
      case SkillStatus.MASTERED: return t.statusMastered;
      case SkillStatus.LEARNING: return t.statusLearning;
      default: return t.statusLocked;
    }
  };

  const getStatusLabel = (status: SkillStatus) => {
    switch (status) {
      case SkillStatus.MASTERED: return '已掌握';
      case SkillStatus.LEARNING: return '学习中';
      default: return '未开始';
    }
  };

  const completedCount = roadmap?.completedSteps.length ?? 0;
  const totalSteps = roadmap?.steps.length ?? 0;

  const getStepState = (index: number): 'completed' | 'current' | 'pending' => {
    if (!roadmap) return 'pending';
    if (roadmap.completedSteps.includes(index)) return 'completed';
    // "current" is the first non-completed step
    const firstIncomplete = roadmap.steps.findIndex((_, i) => !roadmap.completedSteps.includes(i));
    if (index === firstIncomplete) return 'current';
    return 'pending';
  };

  const handleRegenerate = () => {
    if (confirm('重新生成将覆盖当前路线图和进度，确定继续吗？')) {
      onGenerateRoadmap(skill.id);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className={`fixed inset-0 ${t.overlay} z-40`} onClick={onClose} />

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[480px] ${t.panel} z-50 flex flex-col sf-animate-slide-in-right shadow-2xl`}>
        {/* Header */}
        <div className="flex-shrink-0 p-6 pb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h2 className={`text-xl font-bold ${t.skillName} truncate`}>{skill.name}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${t.categoryBadge}`}>
                {skill.category}
              </span>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ml-2 ${t.closeBtn}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Importance + Status */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getImportanceClass(skill.importance)}`}>
              {getImportanceLabel(skill.importance)}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusClass(skill.status)}`}>
              {getStatusLabel(skill.status)}
            </span>
          </div>

          {/* Description */}
          <p className={`text-sm ${t.description} leading-relaxed`}>{skill.description}</p>
        </div>

        {/* Divider */}
        <div className={`mx-6 h-px ${t.lineColor}`} />

        {/* Roadmap Section */}
        <div className="flex-1 overflow-y-auto auto-scrollbar p-6 pt-4">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className={`text-sm font-bold ${t.sectionTitle}`}>学习路线图</h3>
            {roadmap && !isGenerating && (
              <button
                onClick={handleRegenerate}
                className={`text-xs px-2 py-1 rounded transition-colors ${t.regenBtn}`}
              >
                重新生成
              </button>
            )}
          </div>

          {/* Loading Skeleton */}
          {isGenerating && (
            <div className="space-y-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className={`w-4 h-4 rounded-full ${t.skeleton} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-4 ${t.skeleton} rounded w-1/3`} />
                    <div className={`h-3 ${t.skeleton} rounded w-full`} />
                    <div className={`h-3 ${t.skeleton} rounded w-2/3`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Roadmap Timeline */}
          {!isGenerating && roadmap && roadmap.steps.length > 0 && (
            <div className="relative">
              {roadmap.steps.map((step, index) => {
                const state = getStepState(index);
                const isLast = index === roadmap.steps.length - 1;

                return (
                  <div key={index} className="flex gap-4 relative">
                    {/* Timeline column */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      {/* Node */}
                      <div className={`
                        w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                        ${state === 'completed'
                          ? 'bg-emerald-500 border-emerald-500'
                          : state === 'current'
                            ? 'bg-violet-500 border-violet-500 animate-pulse'
                            : darkMode
                              ? 'bg-transparent border-slate-600'
                              : 'bg-transparent border-gray-300'
                        }
                      `}>
                        {state === 'completed' && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      {/* Line */}
                      {!isLast && (
                        <div className={`w-0.5 flex-1 my-1 ${
                          state === 'completed' ? 'bg-emerald-500' : t.lineColor
                        }`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-6 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-semibold ${
                          state === 'completed' ? 'text-emerald-500 line-through opacity-70' : t.stepTitle
                        }`}>
                          {step.title}
                        </h4>
                        {/* Checkbox */}
                        <button
                          onClick={() => onToggleStepComplete(skill.id, index)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            state === 'completed' ? t.checkboxChecked : t.checkbox
                          }`}
                        >
                          {state === 'completed' && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${t.stepDesc}`}>
                        {step.description}
                      </p>
                      {step.resources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {step.resources.map((res, rIdx) => (
                            <a key={rIdx} href={getSearchUrl(res)} target="_blank" rel="noopener noreferrer" className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${t.resourceTag}`}>
                              {res}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state – no roadmap yet, not loading */}
          {!isGenerating && !roadmap && (
            <div className={`text-center py-10 ${t.description}`}>
              <p className="text-sm">正在准备生成学习路线图...</p>
            </div>
          )}
        </div>

        {/* Footer progress bar */}
        {roadmap && !isGenerating && totalSteps > 0 && (
          <div className="flex-shrink-0 p-6 pt-4">
            <div className={`flex items-center gap-3`}>
              <div className={`flex-1 h-2 ${t.progressBg} rounded-full overflow-hidden`}>
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                  style={{ width: `${totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0}%` }}
                />
              </div>
              <span className={`text-xs whitespace-nowrap ${t.progressText}`}>
                {completedCount}/{totalSteps} 步骤已完成
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
