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

// 常见技术别名与同义词规范化映射
export const CANONICAL_SKILL_MAP: Record<string, string> = {
  'react.js': 'React',
  'reactjs': 'React',
  'react框架': 'React',
  'vue.js': 'Vue',
  'vuejs': 'Vue',
  'vue3': 'Vue',
  'vue2': 'Vue',
  'vue框架': 'Vue',
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',
  'node': 'Node.js',
  'golang': 'Go',
  'go语言': 'Go',
  'python3': 'Python',
  'python语言': 'Python',
  'k8s': 'Kubernetes',
  'kubernetes': 'Kubernetes',
  'docker容器': 'Docker',
  'docker容器化': 'Docker',
  'git版本控制': 'Git',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'html/css': 'HTML/CSS',
  'html5': 'HTML/CSS',
  'css3': 'HTML/CSS',
};

/**
 * 规范化技能名称（统一格式与常见同义词、去除版本号与泛化后缀）
 */
export const normalizeSkillName = (name: string): string => {
  if (!name) return '';
  let clean = name.trim();

  // 1. 去除尾部版本号（如 'PostgreSQL 15' ➔ 'PostgreSQL', 'Python 3.11' ➔ 'Python', 'Vue 3' ➔ 'Vue'）
  clean = clean.replace(/\s+v?\d+(\.\d+)*$/i, '').trim();

  // 2. 命中预设标准映射词典
  const lower = clean.toLowerCase();
  if (CANONICAL_SKILL_MAP[lower]) {
    return CANONICAL_SKILL_MAP[lower];
  }

  // 3. 通用去除冗余泛化后缀（针对任何冷门/长尾技术，如 'FastAPI框架' ➔ 'FastAPI', 'Unreal引擎' ➔ 'Unreal'）
  const stripped = clean.replace(/(框架|技术|开发|语言|引擎|工具|组件库|平台)$/, '').trim();
  if (stripped) {
    const strippedLower = stripped.toLowerCase();
    if (CANONICAL_SKILL_MAP[strippedLower]) {
      return CANONICAL_SKILL_MAP[strippedLower];
    }
    return stripped;
  }

  return clean;
};

// 提取字符指纹用于符号微差异匹配（如 'Next.js' vs 'NextJS'、'Click-House' vs 'ClickHouse'）
const getFingerprint = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');

// Helper to calculate priority weight
const getPriorityWeight = (p: string) => {
  if (p === 'High') return 3;
  if (p === 'Medium') return 2;
  return 1;
};

/**
 * Merges new skills into the existing skill pool.
 * - Matches by normalized name & symbol-insensitive fingerprint.
 * - Preserves existing 'status' (Mastered/Learning).
 * - Updates 'importance' to the highest value seen so far.
 * - Accumulates 'sourceJobIds' without duplicates.
 */
export const mergeSkills = (currentSkills: Skill[], newSkills: Skill[]): Skill[] => {
  const skillMap = new Map<string, Skill>();
  const fingerprintMap = new Map<string, string>(); // fingerprint -> key

  // Load current skills into map using normalized key and fingerprint
  currentSkills.forEach(s => {
    const norm = normalizeSkillName(s.name);
    const key = norm.toLowerCase();
    const updated = { ...s, name: norm };
    skillMap.set(key, updated);
    fingerprintMap.set(getFingerprint(norm), key);
  });

  newSkills.forEach(newSkill => {
    const normalizedName = normalizeSkillName(newSkill.name);
    const key = normalizedName.toLowerCase();
    const fp = getFingerprint(normalizedName);

    // 先找标准 key，找不到则通过字符指纹寻找匹配已有技能
    const matchedKey = skillMap.has(key) ? key : fingerprintMap.get(fp);

    if (matchedKey && skillMap.has(matchedKey)) {
      const existing = skillMap.get(matchedKey)!;

      // Determine highest importance
      const existingWeight = getPriorityWeight(existing.importance);
      const newWeight = getPriorityWeight(newSkill.importance);
      const higherImportance = newWeight > existingWeight ? newSkill.importance : existing.importance;

      // Merge sourceJobIds (deduplicate)
      const mergedJobIds = Array.from(new Set([
        ...(existing.sourceJobIds || []),
        ...(newSkill.sourceJobIds || [])
      ]));

      // Keep rich context without messy repetitive pipe truncation
      let finalDesc = existing.description;
      if (newSkill.description && !finalDesc.includes(newSkill.description)) {
        if (!finalDesc) {
          finalDesc = newSkill.description;
        } else if (finalDesc.length < 90) {
          finalDesc = `${finalDesc}；${newSkill.description}`;
          if (finalDesc.length > 150) {
            finalDesc = finalDesc.substring(0, 147) + '...';
          }
        }
      }

      skillMap.set(matchedKey, {
        ...existing,
        name: existing.name || normalizedName,
        importance: higherImportance,
        description: finalDesc,
        sourceJobIds: mergedJobIds,
      });
    } else {
      skillMap.set(key, {
        ...newSkill,
        name: normalizedName
      });
      fingerprintMap.set(fp, key);
    }
  });

  return Array.from(skillMap.values());
};
