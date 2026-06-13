import React, { useState, useEffect, useRef } from 'react';
import { JobAnalysisResult, AppState, SkillStatus, AnalyzedJob } from '../../skillforge/types';
import { parseJobDescription, generateSkillRoadmap } from '../../services/skillForgeAI';
import { loadState, saveState, mergeSkills, clearState } from '../../services/skillForgeStorage';
import { AnalysisView } from './AnalysisView';
import { ScannerView } from './ScannerView';
import { SkillDetailPanel } from './SkillDetailPanel';

type ViewMode = 'DASHBOARD' | 'SCANNER';

interface SkillForgeAppProps {
  darkMode: boolean;
}

const SkillForgeApp: React.FC<SkillForgeAppProps> = ({ darkMode }) => {
  // --- State (同步从 localStorage 初始化，避免闪烁) ---
  const [appState, setAppState] = useState<AppState>(() => loadState());
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    loadState().history.length > 0 ? 'DASHBOARD' : 'SCANNER'
  );

  // Scanner State
  const [jdText, setJdText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail Panel State
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [generatingRoadmapFor, setGeneratingRoadmapFor] = useState<string | null>(null);

  // Preheat State
  const [preheatProgress, setPreheatProgress] = useState<{ current: number; total: number } | null>(null);
  const preheatAbortRef = useRef(false);

  // --- Effects ---
  // 跳过首次渲染的保存（初始值已从 localStorage 读取）
  const isFirstMount = React.useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    saveState(appState);
  }, [appState]);

  // --- Handlers ---

  const handleAnalyze = async () => {
    if (!jdText.trim() && !imageBase64) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const result: JobAnalysisResult = await parseJobDescription(jdText, imageBase64 || undefined);

      // Generate job ID first
      const jobId = Date.now().toString();

      // Inject sourceJobIds into new skills before merging
      const taggedSkills = result.skills.map(s => ({
        ...s,
        sourceJobIds: [jobId]
      }));

      // Merge Data
      const mergedSkills = mergeSkills(appState.skills, taggedSkills);

      // Collect merged skill IDs that came from this JD (match by name)
      const newSkillNames = new Set(taggedSkills.map(s => s.name.toLowerCase()));
      const jobSkillIds = mergedSkills
        .filter(s => newSkillNames.has(s.name.toLowerCase()))
        .map(s => s.id);

      const newJobEntry: AnalyzedJob = {
        id: jobId,
        title: result.jobTitle,
        company: result.companyName,
        salary: result.salary || '',
        date: new Date().toLocaleDateString('zh-CN'),
        skillIds: jobSkillIds
      };

      setAppState(prev => ({
        ...prev,
        skills: mergedSkills,
        history: [newJobEntry, ...prev.history]
      }));

      // Switch to Dashboard
      setViewMode('DASHBOARD');
      setJdText('');
      setImageBase64(null);

    } catch (err) {
      setError("职位解析失败，请确保您的 AI 设置有效并重试。");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleStatus = (id: string) => {
    setAppState(prev => {
      const newSkills = prev.skills.map(skill => {
        if (skill.id !== id) return skill;

        let nextStatus = SkillStatus.LOCKED;
        if (skill.status === SkillStatus.LOCKED) nextStatus = SkillStatus.LEARNING;
        else if (skill.status === SkillStatus.LEARNING) nextStatus = SkillStatus.MASTERED;

        return { ...skill, status: nextStatus };
      });
      return { ...prev, skills: newSkills };
    });
  };

  const handleClearData = () => {
    if (confirm("确定要清空所有存档数据吗？这将不可恢复。")) {
      clearState();
      setAppState({ skills: [], history: [], roadmaps: {} });
      setSelectedSkillId(null);
      setViewMode('SCANNER');
      setJdText('');
      setImageBase64(null);
    }
  };

  const handleUpdateJob = (jobId: string, updates: Partial<AnalyzedJob>) => {
    setAppState(prev => ({
      ...prev,
      history: prev.history.map(j => j.id === jobId ? { ...j, ...updates } : j)
    }));
  };

  const handleDeleteJob = (jobId: string) => {
    const job = appState.history.find(j => j.id === jobId);
    if (!job) return;
    if (!confirm(`确定要删除「${job.title}」及其独有技能吗？`)) return;

    setAppState(prev => {
      // Remove job from history
      const newHistory = prev.history.filter(j => j.id !== jobId);

      // Remove jobId from all skills' sourceJobIds
      const updatedSkills = prev.skills.map(s => ({
        ...s,
        sourceJobIds: (s.sourceJobIds || []).filter(id => id !== jobId)
      }));

      // Remove skills that no longer belong to any JD
      const remainingSkills = updatedSkills.filter(s => s.sourceJobIds.length > 0);

      // Clean up orphaned roadmaps
      const remainingIds = new Set(remainingSkills.map(s => s.id));
      const newRoadmaps: typeof prev.roadmaps = {};
      for (const [id, roadmap] of Object.entries(prev.roadmaps)) {
        if (remainingIds.has(id)) newRoadmaps[id] = roadmap;
      }

      // Also remove from remaining jobs' skillIds
      const removedSkillIds = new Set(
        updatedSkills.filter(s => s.sourceJobIds.length === 0).map(s => s.id)
      );
      const cleanedHistory = newHistory.map(j => ({
        ...j,
        skillIds: (j.skillIds || []).filter(id => !removedSkillIds.has(id))
      }));

      return { ...prev, skills: remainingSkills, history: cleanedHistory, roadmaps: newRoadmaps };
    });

    // Close detail panel if selected skill was removed
    if (selectedSkillId) {
      setAppState(prev => {
        if (!prev.skills.find(s => s.id === selectedSkillId)) {
          setSelectedSkillId(null);
        }
        return prev;
      });
    }
  };

  const handleSwitchToScanner = () => {
    setViewMode('SCANNER');
    setError(null);
  };

  const handleSwitchToDashboard = () => {
    setViewMode('DASHBOARD');
  };

  const handleSelectSkill = (id: string) => {
    setSelectedSkillId(id);
    // Auto-generate if no cached roadmap
    if (!appState.roadmaps[id]) {
      handleGenerateRoadmap(id);
    }
  };

  const handleCloseDetail = () => {
    setSelectedSkillId(null);
  };

  const handleGenerateRoadmap = async (skillId: string) => {
    if (generatingRoadmapFor) return; // prevent concurrent generation
    const skill = appState.skills.find(s => s.id === skillId);
    if (!skill) return;

    setGeneratingRoadmapFor(skillId);
    try {
      const latestJobTitle = appState.history.length > 0 ? appState.history[0].title : "目标职位";
      const roadmap = await generateSkillRoadmap(skill, latestJobTitle);
      setAppState(prev => ({
        ...prev,
        roadmaps: { ...prev.roadmaps, [skillId]: roadmap }
      }));
    } catch (err) {
      console.error("Failed to generate roadmap:", err);
    } finally {
      setGeneratingRoadmapFor(null);
    }
  };

  const handleToggleStepComplete = (skillId: string, stepIndex: number) => {
    setAppState(prev => {
      const roadmap = prev.roadmaps[skillId];
      if (!roadmap) return prev;

      const completed = roadmap.completedSteps.includes(stepIndex)
        ? roadmap.completedSteps.filter(i => i !== stepIndex)
        : [...roadmap.completedSteps, stepIndex];

      const totalSteps = roadmap.steps.length;
      let newStatus: SkillStatus;
      if (completed.length === 0) newStatus = SkillStatus.LOCKED;
      else if (completed.length >= totalSteps) newStatus = SkillStatus.MASTERED;
      else newStatus = SkillStatus.LEARNING;

      return {
        ...prev,
        skills: prev.skills.map(s =>
          s.id === skillId ? { ...s, status: newStatus } : s
        ),
        roadmaps: {
          ...prev.roadmaps,
          [skillId]: { ...roadmap, completedSteps: completed }
        }
      };
    });
  };

  const handlePreheatRoadmaps = async () => {
    // If already preheating, abort
    if (preheatProgress) {
      preheatAbortRef.current = true;
      return;
    }

    // Find skills without cached roadmaps (read fresh from state)
    const pending = appState.skills.filter(s => !appState.roadmaps[s.id]);
    if (pending.length === 0) return;

    const latestJobTitle = appState.history.length > 0 ? appState.history[0].title : "目标职位";
    preheatAbortRef.current = false;
    setPreheatProgress({ current: 0, total: pending.length });

    for (let i = 0; i < pending.length; i++) {
      if (preheatAbortRef.current) break;

      const skill = pending[i];
      setPreheatProgress({ current: i, total: pending.length });

      try {
        const roadmap = await generateSkillRoadmap(skill, latestJobTitle);
        setAppState(prev => ({
          ...prev,
          roadmaps: { ...prev.roadmaps, [skill.id]: roadmap }
        }));
      } catch (err) {
        console.error(`Preheat failed for ${skill.name}:`, err);
      }

      // Rate limit: wait 1.5s between requests (skip delay after last one)
      if (i < pending.length - 1 && !preheatAbortRef.current) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setPreheatProgress(null);
  };

  const preheatRemaining = appState.skills.filter(s => !appState.roadmaps[s.id]).length;

  const selectedSkill = selectedSkillId ? appState.skills.find(s => s.id === selectedSkillId) : null;

  // --- Render ---
  if (viewMode === 'DASHBOARD') {
    return (
      <div className="h-full overflow-y-auto">
        <AnalysisView
          skills={appState.skills}
          history={appState.history}
          onToggleStatus={handleToggleStatus}
          onSelectSkill={handleSelectSkill}
          onAddJob={handleSwitchToScanner}
          onDeleteJob={handleDeleteJob}
          onUpdateJob={handleUpdateJob}
          onClearData={handleClearData}
          onPreheatRoadmaps={handlePreheatRoadmaps}
          preheatProgress={preheatProgress}
          preheatRemaining={preheatRemaining}
          darkMode={darkMode}
        />
        {selectedSkill && (
          <SkillDetailPanel
            skill={selectedSkill}
            roadmap={appState.roadmaps[selectedSkill.id] || null}
            isGenerating={generatingRoadmapFor === selectedSkill.id}
            darkMode={darkMode}
            onClose={handleCloseDetail}
            onGenerateRoadmap={handleGenerateRoadmap}
            onToggleStepComplete={handleToggleStepComplete}
          />
        )}
      </div>
    );
  }

  return (
    <ScannerView
      jdText={jdText}
      setJdText={setJdText}
      imageBase64={imageBase64}
      setImageBase64={setImageBase64}
      isAnalyzing={isAnalyzing}
      error={error}
      history={appState.history}
      onAnalyze={handleAnalyze}
      onSwitchToDashboard={handleSwitchToDashboard}
      darkMode={darkMode}
    />
  );
};

export default SkillForgeApp;
