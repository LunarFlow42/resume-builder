
export interface PersonalInfo {
  name: string;
  age: string;
  experience: string;
  phone: string;
  email: string;
  gender: string;
  education: string;
  hometown: string;
  targetCity: string;
  jobIntent: {
    role: string;
    salary: string;
    type: string;
  };
  selfEvaluation: string;
  qrCodeUrl?: string;
  qrCodeLabel?: string;
}

export interface EducationEntry {
  id: string;
  timeline: string;
  school: string;
  degree: string;
  major: string;
  details: string;
}

export interface ExperienceEntry {
  id: string;
  timeline: string;
  title: string;
  role: string;
  description: string;
}

export interface SkillEntry {
  id: string;
  category: string;
  content: string;
}

export interface LayoutSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  pagePadding: number;
  themeColor: string;
  sectionStyle: 'classic' | 'modern' | 'minimal';
  hiddenSections: string[]; // 隐藏的模块列表
  hiddenFields: string[]; // 隐藏的字段列表
  hiddenItems?: Record<string, string[]>; // 隐藏的子条目 { sectionKey: [itemId, ...] }
  sectionOrder: string[]; // 模块顺序
  sectionTitles: Record<string, string>; // 自定义模块标题
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  education: EducationEntry[];
  projects: ExperienceEntry[];
  campus: ExperienceEntry[];
  training: ExperienceEntry[];
  work: ExperienceEntry[];
  internship: ExperienceEntry[];
  awards: ExperienceEntry[];
  certificates: ExperienceEntry[];
  skills: SkillEntry[];
  evaluation: string;
  layout: LayoutSettings;
}

// 简历版本
export interface ResumeVersion {
  id: string;
  name: string;
  data: ResumeData;
  createdAt: number;
  updatedAt: number;
}

// 存储数据结构
export interface StorageData {
  currentVersionId: string;
  versions: ResumeVersion[];
}
