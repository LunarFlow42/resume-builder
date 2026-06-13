import { AppState, Skill } from "../skillforge/types";

const STORAGE_KEY = "career_skill_forge_v1";

const DEFAULT_STATE: AppState = {
  skills: [],
  history: [],
  roadmaps: {}
};

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return DEFAULT_STATE;
    const parsed = JSON.parse(serialized);
    // Backward compat: ensure sourceJobIds on skills and skillIds on jobs
    const rawSkills: any[] = parsed.skills || [];
    const rawHistory: any[] = parsed.history || [];

    // Detect if migration is needed: any skill missing sourceJobIds means old data
    const needsMigration = rawSkills.length > 0 && rawHistory.length > 0
      && rawSkills.some((s: any) => !s.sourceJobIds || s.sourceJobIds.length === 0);

    const allJobIds = rawHistory.map((j: any) => j.id);
    const allSkillIds = rawSkills.map((s: any) => s.id);

    const skills = rawSkills.map((s: any) => ({
      ...s,
      sourceJobIds: s.sourceJobIds && s.sourceJobIds.length > 0
        ? s.sourceJobIds
        : needsMigration ? [...allJobIds] : []
    }));
    const history = rawHistory.map((j: any) => ({
      ...j,
      salary: j.salary || '',
      skillIds: j.skillIds && j.skillIds.length > 0
        ? j.skillIds
        : needsMigration ? [...allSkillIds] : []
    }));
    return { ...DEFAULT_STATE, ...parsed, skills, history, roadmaps: parsed.roadmaps || {} };
  } catch (e) {
    console.error("Failed to load state", e);
    return DEFAULT_STATE;
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};

export const clearState = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Helper to calculate priority weight
const getPriorityWeight = (p: string) => {
  if (p === 'High') return 3;
  if (p === 'Medium') return 2;
  return 1;
};

/**
 * Merges new skills into the existing skill pool.
 * - Matches by Name (case-insensitive).
 * - Preserves existing 'status' (Mastered/Learning).
 * - Updates 'importance' to the highest value seen so far.
 * - Updates 'description' to the latest one (context might change).
 */
export const mergeSkills = (currentSkills: Skill[], newSkills: Skill[]): Skill[] => {
  const skillMap = new Map<string, Skill>();

  // Load current skills into map
  currentSkills.forEach(s => skillMap.set(s.name.toLowerCase(), s));

  newSkills.forEach(newSkill => {
    const key = newSkill.name.toLowerCase();

    if (skillMap.has(key)) {
      const existing = skillMap.get(key)!;

      // Determine highest importance
      const existingWeight = getPriorityWeight(existing.importance);
      const newWeight = getPriorityWeight(newSkill.importance);
      const higherImportance = newWeight > existingWeight ? newSkill.importance : existing.importance;

      // Merge sourceJobIds (deduplicate)
      const mergedJobIds = Array.from(new Set([
        ...(existing.sourceJobIds || []),
        ...(newSkill.sourceJobIds || [])
      ]));

      const mergedDesc = `${existing.description} | ${newSkill.description}`;
      const finalDesc = mergedDesc.length > 150 ? mergedDesc.substring(0, 147) + '...' : mergedDesc;

      skillMap.set(key, {
        ...existing,
        importance: higherImportance,
        description: finalDesc,
        sourceJobIds: mergedJobIds,
      });
    } else {
      skillMap.set(key, newSkill);
    }
  });

  return Array.from(skillMap.values());
};
