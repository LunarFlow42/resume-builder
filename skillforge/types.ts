export enum SkillStatus {
  LOCKED = 'LOCKED',       // User doesn't know it yet
  LEARNING = 'LEARNING',   // User is currently studying
  MASTERED = 'MASTERED'    // User is confident
}

export interface Skill {
  id: string;
  name: string;
  category: string; // e.g., "Frontend", "Backend", "Soft Skills"
  importance: 'High' | 'Medium' | 'Low';
  description: string;
  status: SkillStatus;
  sourceJobIds: string[];
}

export interface JobAnalysisResult {
  jobTitle: string;
  companyName: string;
  salary: string;
  skills: Skill[];
  summary: string;
}

export interface AnalyzedJob {
  id: string;
  title: string;
  company: string;
  salary: string;
  date: string;
  skillIds: string[];
}

export interface RoadmapStep {
  title: string;
  description: string;
  resources: string[];
}

export interface SkillRoadmap {
  steps: RoadmapStep[];
  completedSteps: number[];
  generatedAt: number;
}

export interface AppState {
  skills: Skill[];
  history: AnalyzedJob[];
  roadmaps: Record<string, SkillRoadmap>;
}

export interface LearningAdvice {
  stepName: string;
  description: string;
  resources: string[];
}
