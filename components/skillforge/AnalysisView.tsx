import React, { useState, useMemo, useEffect } from 'react';
import { Skill, SkillStatus, LearningAdvice, AnalyzedJob } from '../../skillforge/types';
import { SkillCard } from './SkillCard';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getLearningAdvice } from '../../services/skillForgeAI';

const getSfTheme = (dark: boolean) => ({
  // Header card
  header: dark ? 'bg-slate-800/50 backdrop-blur-md border border-slate-700/50' : 'bg-white border border-gray-200 shadow-sm',
  badge: dark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-gray-100 text-gray-600 border border-gray-200',
  desc: dark ? 'text-slate-400' : 'text-gray-500',
  // Buttons
  btnPrimary: dark ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-200',
  btnSecondary: dark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  btnDanger: dark ? 'bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-800' : 'bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300',
  // History
  historyBg: dark ? 'bg-slate-900/50 border border-slate-800' : 'bg-gray-50 border border-gray-200',
  historyLabel: dark ? 'text-slate-500' : 'text-gray-400',
  historyCard: dark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200 shadow-sm',
  historyTitle: dark ? 'text-emerald-100' : 'text-gray-800',
  historyCompany: dark ? 'text-slate-400' : 'text-gray-500',
  historyDate: dark ? 'text-slate-500' : 'text-gray-400',
  // Progress
  progressBg: dark ? 'bg-slate-900/30' : 'bg-gray-100',
  progressText: dark ? 'text-emerald-400' : 'text-emerald-600',
  progressTrack: dark ? 'bg-slate-800' : 'bg-gray-200',
  // Cards
  card: dark ? 'bg-slate-800/30 border border-slate-700/50' : 'bg-white border border-gray-200 shadow-sm',
  cardLabel: dark ? 'text-slate-300' : 'text-gray-700',
  // AI Coach
  aiCoach: dark ? 'bg-gradient-to-br from-violet-900/40 to-fuchsia-900/40 border border-violet-500/30' : 'bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200',
  aiCoachTitle: dark ? 'text-white' : 'text-gray-900',
  aiCoachDesc: dark ? 'text-slate-300' : 'text-gray-600',
  aiCoachBtn: dark ? 'bg-white text-black hover:bg-slate-200' : 'bg-violet-600 text-white hover:bg-violet-500',
  aiCoachSpinner: dark ? 'text-black' : 'text-white',
  // Advice
  adviceCard: dark ? 'bg-slate-800/80' : 'bg-white border border-gray-200 shadow-sm',
  adviceTitle: dark ? 'text-indigo-300' : 'text-indigo-600',
  adviceDesc: dark ? 'text-slate-300' : 'text-gray-600',
  adviceTag: dark ? 'bg-slate-900 text-indigo-200' : 'bg-indigo-50 text-indigo-600',
  // Tabs
  tabActive: dark ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-emerald-600 text-white shadow-md',
  tabInactive: dark ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200',
  // Empty state
  empty: dark ? 'text-slate-500' : 'text-gray-400',
  // Chart
  gridStroke: dark ? '#334155' : '#e5e7eb',
  tickFill: dark ? '#94a3b8' : '#6b7280',
  tooltipBg: dark ? '#1e293b' : '#ffffff',
  tooltipBorder: dark ? '#334155' : '#e5e7eb',
  tooltipColor: dark ? '#fff' : '#111827',
});

const SEARCH_ENGINES = {
  google: { label: 'Google', url: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`, icon: 'fa-google' },
  bing: { label: 'Bing', url: (q: string) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`, icon: 'fa-microsoft' },
} as const;
type SearchEngineKey = keyof typeof SEARCH_ENGINES;
const SE_STORAGE_KEY = 'skillforge-search-engine';
const loadSearchEngine = (): SearchEngineKey => {
  try { const v = localStorage.getItem(SE_STORAGE_KEY); if (v === 'bing') return 'bing'; } catch {}
  return 'google';
};

interface AnalysisViewProps {
  skills: Skill[];
  history: AnalyzedJob[];
  onToggleStatus: (id: string) => void;
  onSelectSkill: (id: string) => void;
  onAddJob: () => void;
  onDeleteJob: (jobId: string) => void;
  onUpdateJob: (jobId: string, updates: Partial<AnalyzedJob>) => void;
  onClearData: () => void;
  onPreheatRoadmaps: () => void;
  preheatProgress: { current: number; total: number } | null;
  preheatRemaining: number;
  darkMode: boolean;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  skills,
  history,
  onToggleStatus,
  onSelectSkill,
  onAddJob,
  onDeleteJob,
  onUpdateJob,
  onClearData,
  onPreheatRoadmaps,
  preheatProgress,
  preheatRemaining,
  darkMode
}) => {
  const [advice, setAdvice] = useState<LearningAdvice[] | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'learning' | 'mastered'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchEngine, setSearchEngine] = useState<SearchEngineKey>(loadSearchEngine);

  const toggleSearchEngine = () => {
    setSearchEngine(prev => {
      const next = prev === 'google' ? 'bing' : 'google';
      localStorage.setItem(SE_STORAGE_KEY, next);
      return next;
    });
  };
  const searchUrl = SEARCH_ENGINES[searchEngine].url;

  // Reset filter if selected job was deleted
  useEffect(() => {
    if (selectedJobId && !history.some(j => j.id === selectedJobId)) {
      setSelectedJobId(null);
    }
  }, [history, selectedJobId]);

  const t = getSfTheme(darkMode);

  // Stats Calculation
  const stats = useMemo(() => {
    const total = skills.length;
    const mastered = skills.filter(s => s.status === SkillStatus.MASTERED).length;
    const learning = skills.filter(s => s.status === SkillStatus.LEARNING).length;
    const progress = total === 0 ? 0 : Math.round((mastered / total) * 100);
    return { total, mastered, learning, progress };
  }, [skills]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const categories = Array.from(new Set(skills.map(s => s.category)));
    return categories.map(cat => {
      const catSkills = skills.filter(s => s.category === cat);
      const score = catSkills.reduce((acc, s) => {
        if (s.status === SkillStatus.MASTERED) return acc + 1;
        if (s.status === SkillStatus.LEARNING) return acc + 0.5;
        return acc;
      }, 0);
      return {
        subject: cat,
        A: (score / catSkills.length) * 100,
        fullMark: 100
      };
    });
  }, [skills]);

  const handleGetAdvice = async () => {
    setIsLoadingAdvice(true);
    setAdvice(null);
    try {
      const latestJobTitle = history.length > 0 ? history[0].title : "前端开发工程师";
      const result = await getLearningAdvice(latestJobTitle, skills);
      setAdvice(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  const filteredSkills = skills.filter(s => {
    // Filter by JD source
    if (selectedJobId && !(s.sourceJobIds || []).includes(selectedJobId)) return false;
    // Filter by status tab
    if (activeTab === 'learning') return s.status === SkillStatus.LEARNING;
    if (activeTab === 'mastered') return s.status === SkillStatus.MASTERED;
    return true;
  });

  const getTabLabel = (tab: string) => {
    switch(tab) {
        case 'all': return '全部';
        case 'learning': return '学习中';
        case 'mastered': return '已掌握';
        default: return tab;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 pb-20 sf-animate-fade-in">
      {/* Header */}
      <header className={`${t.header} p-6 rounded-2xl flex flex-col gap-6`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                综合技能概览
              </h1>
              <span className={`text-xs ${t.badge} px-2 py-1 rounded`}>
                已分析 {history.length} 个职位
              </span>
            </div>
            <p className={`${t.desc} text-sm`}>
              这是根据您所有历史 JD 分析生成的聚合技能树。
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
             <button
               onClick={onAddJob}
               className={`${t.btnPrimary} px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2`}
             >
               <span>+</span> 解析新职位
             </button>
             {preheatProgress ? (
               <button
                 onClick={onPreheatRoadmaps}
                 className={`${t.btnSecondary} px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2`}
                 title="点击取消"
               >
                 <svg className="animate-spin h-3.5 w-3.5 opacity-70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 {preheatProgress.current + 1}/{preheatProgress.total}
               </button>
             ) : preheatRemaining > 0 ? (
               <button
                 onClick={onPreheatRoadmaps}
                 className={`${t.btnSecondary} px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2`}
                 title={`预热 ${preheatRemaining} 个技能的路线图`}
               >
                 <i className="fas fa-fire text-xs"></i><span className="hidden sm:inline"> 预热路线图</span>
                 <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                   darkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'
                 }`}>{preheatRemaining}</span>
               </button>
             ) : skills.length > 0 ? (
               <button
                 disabled
                 className={`${t.btnSecondary} px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 opacity-50 cursor-default`}
               >
                 <i className="fas fa-check text-xs text-emerald-500"></i><span className="hidden sm:inline"> 路线图已就绪</span>
               </button>
             ) : null}
             <button
                onClick={() => setShowHistory(!showHistory)}
                className={`${t.btnSecondary} px-4 py-2 rounded-lg text-sm transition-all`}
             >
                {showHistory ? '隐藏历史' : '查看历史'}
             </button>
             <button
                onClick={onClearData}
                className={`${t.btnDanger} px-3 py-2 rounded-lg text-sm transition-all`}
                title="清空数据"
             >
                🗑️
             </button>
             <button
                onClick={toggleSearchEngine}
                className={`${t.btnSecondary} px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-1.5`}
                title={`当前搜索引擎: ${SEARCH_ENGINES[searchEngine].label}，点击切换`}
             >
                <i className={`fab ${SEARCH_ENGINES[searchEngine].icon} text-xs`}></i>
                <span className="hidden sm:inline text-xs">{SEARCH_ENGINES[searchEngine].label}</span>
             </button>
          </div>
        </div>

        {/* History Drawer */}
        {showHistory && (
            <div className={`${t.historyBg} rounded-xl p-4 sf-animate-slide-down`}>
                <h3 className={`text-xs font-bold ${t.historyLabel} uppercase mb-2`}>最近解析的 JD</h3>
                <div className="flex gap-3 overflow-x-auto auto-scrollbar pb-2">
                    {history.map(job => (
                        <div key={job.id} className={`min-w-[200px] ${t.historyCard} p-3 rounded-lg flex-shrink-0 relative group`}>
                            <button
                              onClick={() => onDeleteJob(job.id)}
                              className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${
                                darkMode
                                  ? 'bg-slate-700 hover:bg-red-900 text-slate-400 hover:text-red-300'
                                  : 'bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500'
                              }`}
                              title="删除此 JD"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                            <div className={`font-bold text-sm ${t.historyTitle} truncate pr-5`}>{job.title}</div>
                            {job.company && job.company !== 'Unknown' && (
                              <div className={`text-xs ${t.historyCompany} truncate`}>{job.company}</div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <div className={`text-[10px] ${t.historyDate}`}>{job.date}</div>
                              {job.salary ? (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                                    darkMode ? 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                  }`}
                                  onClick={() => {
                                    const val = prompt('编辑薪资', job.salary);
                                    if (val !== null) onUpdateJob(job.id, { salary: val });
                                  }}
                                  title="点击编辑薪资"
                                >
                                  {job.salary}
                                </span>
                              ) : (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                                    darkMode ? 'text-slate-600 hover:text-slate-400 hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                  }`}
                                  onClick={() => {
                                    const val = prompt('添加薪资（如 15k-25k）');
                                    if (val) onUpdateJob(job.id, { salary: val });
                                  }}
                                  title="添加薪资"
                                >
                                  + 薪资
                                </span>
                              )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Progress Bar */}
        <div className={`flex items-center gap-4 ${t.progressBg} p-4 rounded-xl`}>
             <div className={`text-sm font-mono ${t.progressText} whitespace-nowrap`}>
                总掌握度 {stats.progress}%
             </div>
             <div className={`w-full h-2 ${t.progressTrack} rounded-full overflow-hidden`}>
                <div
                    className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{ width: `${stats.progress}%` }}
                />
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Actions */}
        <div className="space-y-6">
          {/* Radar Chart */}
          <div className={`${t.card} rounded-2xl p-4 flex flex-col items-center`}>
            <h3 className={`text-sm font-bold ${t.cardLabel} w-full mb-4`}>全栈技能雷达</h3>
            <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke={t.gridStroke} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: t.tickFill, fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="我的技能"
                        dataKey="A"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="#10b981"
                        fillOpacity={0.3}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, color: t.tooltipColor }}
                        itemStyle={{ color: '#10b981' }}
                    />
                </RadarChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* AI Coach Action */}
          <div className={`${t.aiCoach} p-6 rounded-2xl`}>
            <h3 className={`text-lg font-bold ${t.aiCoachTitle} mb-2`}>🤖 AI 职业教练</h3>
            <p className={`text-sm ${t.aiCoachDesc} mb-4`}>
              基于您当前的技能库和最新解析的职位需求，定制下一阶段学习计划。
            </p>
            <button
              onClick={handleGetAdvice}
              disabled={isLoadingAdvice}
              className={`w-full py-3 ${t.aiCoachBtn} font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
            >
              {isLoadingAdvice ? (
                <>
                  <svg className={`animate-spin h-4 w-4 ${t.aiCoachSpinner}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  分析中...
                </>
              ) : (
                '生成进阶计划'
              )}
            </button>
          </div>

          {/* Advice Results */}
          {advice && (
            <div className="space-y-4 sf-animate-fade-in">
              {advice.map((step, idx) => (
                <div key={idx} className={`${t.adviceCard} border-l-4 border-indigo-500 p-4 rounded-r-lg`}>
                  <h4 className={`font-bold ${t.adviceTitle}`}>{step.stepName}</h4>
                  <p className={`text-sm ${t.adviceDesc} mt-1`}>{step.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {step.resources.map((res, rIdx) => (
                      <a key={rIdx} href={searchUrl(res)} target="_blank" rel="noopener noreferrer" className={`text-xs ${t.adviceTag} px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity`}>
                        {res}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Skill Grid */}
        <div className="lg:col-span-2">
            {/* JD Source Filter */}
            {history.length > 1 && (
              <div className="flex items-center gap-2 mb-4 overflow-x-auto auto-scrollbar pb-2">
                <button
                  onClick={() => setSelectedJobId(null)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                    ${selectedJobId === null ? t.tabActive : t.tabInactive}
                  `}
                >
                  全部职位
                  <span className="ml-1.5 text-xs opacity-60">{history.length}</span>
                </button>
                {history.map(job => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                      ${selectedJobId === job.id ? t.tabActive : t.tabInactive}
                    `}
                  >
                    {job.title}
                    <span className="ml-1.5 text-xs opacity-60">
                      {skills.filter(s => (s.sourceJobIds || []).includes(job.id)).length}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mb-6 overflow-x-auto auto-scrollbar pb-2">
                {(['all', 'learning', 'mastered'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
                            px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                            ${activeTab === tab ? t.tabActive : t.tabInactive}
                        `}
                    >
                        {getTabLabel(tab)}
                        <span className="ml-2 text-xs opacity-60">
                            {tab === 'all' ? skills.length :
                             tab === 'learning' ? stats.learning : stats.mastered}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSkills.map(skill => (
                    <SkillCard
                        key={skill.id}
                        skill={skill}
                        onToggleStatus={onToggleStatus}
                        onClick={() => onSelectSkill(skill.id)}
                        darkMode={darkMode}
                    />
                ))}
            </div>

            {filteredSkills.length === 0 && (
                <div className={`text-center py-20 ${t.empty}`}>
                    <p>该分类下暂无技能。</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
