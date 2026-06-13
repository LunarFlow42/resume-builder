import { ResumeData } from './types';

export const INITIAL_DATA: ResumeData = {
  personalInfo: {
    name: "姓名",
    age: "22",
    experience: "应届毕业生",
    phone: "138-0000-0000",
    email: "your.email@example.com",
    gender: "男",
    education: "本科",
    hometown: "湖北省-武汉市",
    targetCity: "深圳市",
    jobIntent: {
      role: "前端开发工程师",
      salary: "10k-15k",
      type: "全职"
    },
    selfEvaluation: "请在此处输入您的自我评价。简要介绍您的专业背景、核心技术优势、学习能力以及工作态度。通过 AI 优化功能，您可以一键将本段文字转化为更加专业、精炼的职业履历表述。",
    qrCodeUrl: "https://github.com/LunarFlow42/resume-builder",
    qrCodeLabel: "扫码查看项目源码"
  },
  education: [
    {
      id: "edu1",
      timeline: "2022.09 - 2026.06",
      school: "某某大学",
      degree: "本科",
      major: "计算机科学与技术",
      details: "主修课程：数据结构与算法、计算机网络原理、操作系统、数据库系统设计、Web 前端开发技术等。"
    }
  ],
  projects: [
    {
      id: "proj1",
      timeline: "2025.03 - 2025.06",
      title: "某某响应式 Web 后台管理系统",
      role: "项目组长 / 前端开发",
      description: "项目描述：构建一个高并发、低延迟的响应式数据看板系统。技术栈基于 React、TypeScript 与 Tailwind CSS。主导了前端架构设计，优化组件加载性能，利用 Webpack/Vite 插件进行资源压缩，使页面首屏加载时间缩短了 30%。"
    }
  ],
  campus: [],
  training: [],
  work: [],
  internship: [],
  awards: [],
  certificates: [
    { id: "cert1", timeline: "", title: "大学英语六级 (CET-6)", role: "", description: "" },
    { id: "cert2", timeline: "", title: "某行业专业技能证书 / 获奖证书", role: "", description: "" }
  ],
  skills: [
    { id: "skill2", category: "专业技能", content: "熟练掌握 React / Vue，熟悉 TypeScript 与 ES6+ 语法" },
    { id: "skill3", category: "工具效率", content: "熟练使用 Git 工具流进行协同开发，熟悉 Docker 与 CI/CD 自动化构建" }
  ],
  evaluation: '',
  layout: {
    fontFamily: 'Microsoft YaHei',
    fontSize: 14,
    lineHeight: 1.55,
    pagePadding: 1,
    themeColor: '#2b4766',
    sectionStyle: 'classic',
    hiddenSections: ['campus', 'training', 'work', 'internship', 'awards'],
    hiddenFields: [],
    sectionOrder: ['skills', 'projects', 'education', 'certificates'],
    sectionTitles: {
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
    }
  }
};
