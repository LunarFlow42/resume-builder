import { chatWithAIJson, ChatMessage, MessageContentPart } from './gemini';
import { JobAnalysisResult, LearningAdvice, Skill, SkillStatus, RoadmapStep, SkillRoadmap } from '../skillforge/types';
import { SKILL_CATEGORIES } from '../skillforge/constants';
import { normalizeSkillName } from './skillForgeStorage';

const buildJdSystemPrompt = (existingSkills?: string[]) => {
  const existingSection = existingSkills && existingSkills.length > 0
    ? `\n7. 已有技能库参考：当前系统已记录以下技能：[${existingSkills.join(', ')}]。请优先复用已有技能的标准名称（例如若已有 'React'，请统一使用 'React'，不要返回 'React.js'、'React18' 或 'React框架'；若已有 'TypeScript'，不要返回 'TS'）。仅当岗位要求中包含库中不存在的新技术或新能力时，再创建新技能名称。`
    : '';

  return `你是一个职位描述分析专家。请分析用户提供的 JD，提取所需的关键硬技能和软技能。

你必须返回严格的 JSON 对象，格式如下：
{
  "jobTitle": "从 JD 中提取的职位名称",
  "companyName": "公司名称（如果未找到则填空字符串 ''）",
  "salary": "薪资范围（如 '15k-25k'、'20-40万/年'，如果未找到则填空字符串 ''）",
  "summary": "一句话总结该职位的核心要求（中文）",
  "skills": [
    {
      "name": "技能名称（保留通用/行业标准原名，如 React, TypeScript, Java, Docker, Communication）",
      "category": "类别（必须是以下之一：${SKILL_CATEGORIES.join(', ')}）",
      "importance": "High 或 Medium 或 Low",
      "description": "该技能在此职位中的具体应用场景简述（中文）"
    }
  ]
}

注意：
1. summary 和 skills.description 必须用中文输出。
2. skills.category 请尽量匹配给出的中文分类。
3. skills.name 如果是专有名词请保留行业通用命名（如 React, Python, Docker），通用软技能可用中文（如 团队协作, 跨部门沟通）。
4. 根据提及的频率和语气确定技能的重要性。
5. 只返回 JSON，不要有任何其他文字。
6. 如果用户提供的是图片，请识别图片中的职位描述内容并按同样格式分析。${existingSection}`;
};

type ParsedJDData = {
  jobTitle: string;
  companyName: string;
  salary: string;
  summary: string;
  skills: Array<{
    name: string;
    category: string;
    importance: 'High' | 'Medium' | 'Low';
    description: string;
  }>;
};

/**
 * Parses a raw Job Description text (and/or image) into structured data using AI.
 */
export const parseJobDescription = async (
  jdText: string,
  imageBase64?: string,
  existingSkills?: string[]
): Promise<JobAnalysisResult> => {
  const userContent: MessageContentPart[] = [];

  if (imageBase64) {
    userContent.push({ type: 'image_url', image_url: { url: imageBase64 } });
    userContent.push({
      type: 'text',
      text: jdText.trim()
        ? `请结合图片和以下补充文字来分析职位描述：\n\n${jdText}`
        : '请识别并分析图片中的职位描述。'
    });
  } else {
    userContent.push({ type: 'text', text: `请分析以下职位描述：\n\n${jdText}` });
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: buildJdSystemPrompt(existingSkills) },
    { role: 'user', content: userContent }
  ];

  const data = await chatWithAIJson<ParsedJDData>(messages, 'jd-parse');

  // Hydrate with normalized names, IDs and default status
  const hydratedSkills: Skill[] = data.skills.map((s, index) => {
    const normalizedName = normalizeSkillName(s.name);
    return {
      ...s,
      name: normalizedName,
      id: `skill-${index}-${Date.now()}`,
      status: SkillStatus.LOCKED,
      sourceJobIds: []
    };
  });

  return {
    ...data,
    skills: hydratedSkills
  };
};

/**
 * Generates a study plan based on current progress.
 */
export const getLearningAdvice = async (
  jobTitle: string,
  skills: Skill[]
): Promise<LearningAdvice[]> => {
  const mastered = skills.filter(s => s.status === SkillStatus.MASTERED).map(s => s.name);
  const learning = skills.filter(s => s.status === SkillStatus.LEARNING).map(s => s.name);
  const locked = skills.filter(s => s.status === SkillStatus.LOCKED).map(s => s.name);

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一名职业发展教练。请根据用户的技能状态，提供一个简明扼要、可执行的中文学习路线图（最多4个阶段）。

你必须返回严格的 JSON 对象，格式如下：
{
  "steps": [
    {
      "stepName": "学习阶段名称（例如：'夯实基础', '进阶实战'）",
      "description": "做什么以及为什么（中文）",
      "resources": ["2-3 个搜索关键词，例如：'React Hooks 教程', '系统设计面试题'"]
    }
  ]
}

输出语言必须是中文。只返回 JSON，不要有任何其他文字。`
    },
    {
      role: 'user',
      content: `我正在申请 "${jobTitle}" 这个职位。

我目前的状态如下：
- 已掌握技能: ${mastered.join(', ') || "暂无"}
- 正在学习: ${learning.join(', ') || "暂无"}
- 未掌握/未解锁技能: ${locked.join(', ') || "暂无"}

请为我提供学习路线图。`
    }
  ];

  const data = await chatWithAIJson<{ steps: LearningAdvice[] }>(messages, 'skill-advice');
  return data.steps || [];
};

/**
 * Generates a roadmap.sh-style learning roadmap for a single skill.
 */
export const generateSkillRoadmap = async (
  skill: Skill,
  jobTitle: string
): Promise<SkillRoadmap> => {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一名技术学习路线规划专家。请为用户提供一个从基础到进阶的学习路线图，类似 roadmap.sh 的风格。

你必须返回严格的 JSON 对象，格式如下：
{
  "steps": [
    {
      "title": "步骤标题（简洁明确，如：'掌握核心概念', '实战项目练习'）",
      "description": "该步骤的详细说明，包含具体要学什么、为什么要学（中文）",
      "resources": ["2-3 个推荐搜索关键词或资源名称"]
    }
  ]
}

要求：
1. 生成 4-7 个步骤，从入门到精通循序渐进。
2. 每个步骤要具体、可执行，不要泛泛而谈。
3. resources 提供实用的搜索关键词，方便用户查找资料。
4. 所有内容使用中文。
5. 只返回 JSON，不要有任何其他文字。`
    },
    {
      role: 'user',
      content: `我正在准备申请「${jobTitle}」这个职位。请为以下技能生成详细的学习路线图：

技能名称：${skill.name}
技能类别：${skill.category}
技能描述：${skill.description}
当前状态：${skill.status === SkillStatus.MASTERED ? '已掌握' : skill.status === SkillStatus.LEARNING ? '学习中' : '未开始'}`
    }
  ];

  const data = await chatWithAIJson<{ steps: RoadmapStep[] }>(messages, 'skill-roadmap');
  return {
    steps: data.steps || [],
    completedSteps: [],
    generatedAt: Date.now()
  };
};
