import React from 'react';
import { Skill, SkillStatus } from '../../skillforge/types';

interface SkillCardProps {
  skill: Skill;
  onToggleStatus: (id: string) => void;
  onClick?: () => void;
  darkMode: boolean;
}

export const SkillCard: React.FC<SkillCardProps> = ({ skill, onToggleStatus, onClick, darkMode }) => {
  const getStatusColor = (status: SkillStatus) => {
    if (darkMode) {
      switch (status) {
        case SkillStatus.MASTERED:
          return 'border-emerald-500 bg-emerald-900/20 text-emerald-100 shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]';
        case SkillStatus.LEARNING:
          return 'border-amber-500 bg-amber-900/20 text-amber-100 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]';
        default:
          return 'border-slate-700 bg-slate-800/50 text-slate-400 grayscale hover:grayscale-0 hover:border-slate-500';
      }
    } else {
      switch (status) {
        case SkillStatus.MASTERED:
          return 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-md shadow-emerald-100';
        case SkillStatus.LEARNING:
          return 'border-amber-400 bg-amber-50 text-amber-800 shadow-md shadow-amber-100';
        default:
          return 'border-gray-200 bg-white text-gray-500 shadow-sm grayscale hover:grayscale-0 hover:border-gray-300';
      }
    }
  };

  const getStatusIcon = (status: SkillStatus) => {
    switch (status) {
      case SkillStatus.MASTERED: return '\u2728';
      case SkillStatus.LEARNING: return '\u26A1';
      default: return '\uD83D\uDD12';
    }
  };

  const getPriorityLabel = (importance: string) => {
    switch(importance) {
      case 'High': return '高优先级';
      case 'Medium': return '中优先级';
      case 'Low': return '低优先级';
      default: return importance;
    }
  };

  const getPriorityClasses = (importance: string) => {
    if (darkMode) {
      switch (importance) {
        case 'High': return 'border-red-500/50 text-red-300 bg-red-900/20';
        case 'Medium': return 'border-blue-500/50 text-blue-300 bg-blue-900/20';
        default: return 'border-slate-500/50 text-slate-300 bg-slate-900/20';
      }
    } else {
      switch (importance) {
        case 'High': return 'border-red-300 text-red-600 bg-red-50';
        case 'Medium': return 'border-blue-300 text-blue-600 bg-blue-50';
        default: return 'border-gray-300 text-gray-500 bg-gray-50';
      }
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative group cursor-pointer transition-all duration-300 ease-out
        border rounded-xl p-4 flex flex-col gap-2
        hover:-translate-y-1 select-none
        ${getStatusColor(skill.status)}
      `}
    >
      <div className="flex justify-between items-start">
        <span className="text-xs font-mono uppercase tracking-wider opacity-70">
          {skill.category}
        </span>
        <span className="text-lg">{getStatusIcon(skill.status)}</span>
      </div>

      <h3 className="font-bold text-lg leading-tight">
        {skill.name}
      </h3>

      <p className="text-xs opacity-80 line-clamp-2">
        {skill.description}
      </p>

      {/* Importance Badge */}
      <div className="mt-2 flex">
        <span className={`
          text-[10px] px-2 py-0.5 rounded-full border
          ${getPriorityClasses(skill.importance)}
        `}>
          {getPriorityLabel(skill.importance)}
        </span>
      </div>

      {/* Status Toggle Button (Hover Only) */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleStatus(skill.id); }}
        className={`
          absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded-lg font-semibold
          opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200
          ${darkMode
            ? 'bg-slate-700/90 text-slate-200 hover:bg-slate-600'
            : 'bg-white/90 text-gray-700 hover:bg-gray-100 shadow-sm'
          }
        `}
        title={skill.status === SkillStatus.LOCKED ? '开始学习' :
               skill.status === SkillStatus.LEARNING ? '标记完成' : '重置状态'}
      >
        {skill.status === SkillStatus.LOCKED ? '开始学习' :
         skill.status === SkillStatus.LEARNING ? '标记完成' : '重置'}
      </button>
    </div>
  );
};
