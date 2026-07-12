# 🚀 AI Resume Builder Pro & SkillForge
### 🌟 智能简历专家 Pro & AI 技能熔炉 🌟

[![React](https://img.shields.io/badge/React-19.2-blue.svg?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38BDB8.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-AGPL--3.0--only-orange.svg)](LICENSE)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/LunarFlow42/resume-builder)

一个基于 **React 19 + TypeScript + Vite** 构建的现代化、高性能的智能简历构建与职业发展规划平台。
融合 **AI 大模型** 强大能力，首创 **SkillForge (技能熔炉)** 模块，不仅帮助求职者编写高质量简历，更能为目标岗位进行技能差距分析并生成定制化学习路径。

---

## 🌟 核心特色模块

### 1. ✍️ 模块化简历编辑器 (Resume Builder)
*   **多版本管理**：支持创建多份不同的简历版本，随时一键切换、重命名或快速复制。
*   **极致排版控制**：支持自定义全局字体、字体大小、行高、页面边距以及主题色配置。
*   **灵活的模块定义**：
    *   预设教育背景、项目经历、工作经历、实习经历、专业技能、荣誉奖项、证书资质、校园实践和自我评价等多个专业模块。
    *   支持**自由拖拽重排模块顺序**，以及一键**隐藏/显示**特定模块或子条目。
    *   所有模块标题均支持自定义重命名，完美适应不同求职方向。
*   **双栏实时预览**：编辑左侧，右侧实时渲染 A4 格式预览，支持即时修改即时体现。

### 2. 🔥 SkillForge AI 技能熔炉 (Skill Analysis & Roadmap)
*   **JD 智能解析 (JD Scanner)**：
    *   支持直接粘贴目标岗位描述 (JD) 文本，或**上传 JD 截图**（利用 AI 多模态视觉解析能力）。
    *   AI 自动解析职位名称、公司名称、薪资水平，并智能提取核心硬技能与软技能。
*   **技能熟练度追踪**：可标记技能状态为 `未开始 (LOCKED)`、`学习中 (LEARNING)`、`已掌握 (MASTERED)`。
*   **定制化学习路线 (Skill Roadmap)**：
    *   针对任意特定技能，AI 可一键生成类似 `roadmap.sh` 风格的专属学习路线。
    *   提供循序渐进的系统学习步骤，并附带针对性的实用搜索关键词和学习资源。
    *   支持对路线图的各步骤进行打卡标记，并联动自动更新技能熟练度状态。
*   **全局备考与职业指导**：
    *   基于当前求职者的技能差距（已掌握 vs 学习中 vs 缺失技能），AI 教练一键生成专属的备考与阶段性学习建议。

### 3. 🤖 多配置 AI 引擎中心 (AI Engine Settings)
*   **多 Profile 配置管理**：支持配置多个 AI 接口预设（如测试、生产、本地 Ollama / LM Studio 或不同的 API 厂商），一键无缝切换。
*   **OpenAI 兼容协议**：支持输入自定义 Base URL 及 API Key，完美兼容各类主流大模型 API。
*   **模型列表智能获取**：输入 Base URL 和 Key 后，支持一键拉取并同步云端可用模型列表。
*   **精细化模型重写 (Model Overrides)**：
    *   允许为不同 AI 模块（简历优化、职位解析、学习建议、路线图生成）独立设置不同的模型，最大化兼顾速度与质量。
*   **一键连接测试**：内置网络测试工具，即时反馈接口配置状态。

### 4. 🖨️ 高保真 PDF 导出 (PDF Export Engine)
*   **精确分页控制**：通过 `html2canvas` 与 `jsPDF` 联动，支持生成一页或多页 PDF。
*   **打印级样式优化**：自动计算排版元素高度，适配标准的 210mm x 297mm (A4) 规格，导出无错位。
*   **精美主题渲染**：导出时完美保留个性化主题色、模块间隔样式。

---

## 🛠️ 技术栈

*   **核心框架**：React 19.2.3 (基于更现代化的 React 新特性构建)
*   **开发语言**：TypeScript 5.8
*   **构建工具**：Vite 6.2 (极致的冷启动与热更新体验)
*   **样式表现**：Tailwind CSS v3 (通过 CDN 引入实现零编译负担) + Vanilla CSS
*   **图表展示**：Recharts v3 (基于 ESM 方式载入，用于直观呈现技能熟练度饼图与雷达图)
*   **数据导出**：jsPDF + html2canvas + html2pdf.js

---

## 🚀 本地运行指南

### 前期准备
确保您的计算机上已安装 [Node.js](https://nodejs.org/) (推荐 v18+ 或更高版本)。

### 安装与运行

1.  **克隆或下载项目到本地**：
    ```bash
    git clone https://github.com/LunarFlow42/resume-builder.git
    cd resume-builder
    ```

2.  **安装项目依赖**：
    支持 `pnpm` 或 `npm` 安装：
    ```bash
    # 使用 pnpm 安装
    pnpm install

    # 或者使用 npm 安装
    npm install
    ```

3.  **运行本地开发服务器**：
    ```bash
    pnpm dev
    # 或者
    npm run dev
    ```
    启动后，在浏览器中打开命令行输出的本地地址 (通常为 `http://localhost:5173`) 即可体验。

4.  **配置 AI 密钥**：
    进入页面后，点击右上角的 **机器人 (AI 设置)** 图标，填入您的 Base URL、API Key，并测试连接成功后，即可启用简历优化与 SkillForge 技能熔炉的全部 AI 功能。

---

## 📦 打包与部署

### 构建生产环境包
运行以下命令进行项目的打包编译：
```bash
pnpm build
# 或者
npm run build
```
打包生成的内容将存放于根目录下的 `dist/` 文件夹中，支持部署至 Netlify、Vercel、GitHub Pages 或您自己的静态服务器。

---

## 🔒 数据安全与隐私

*   **本地存储**：本项目为**无后端架构**。您的简历数据、AI 配置项、职位历史记录等所有敏感信息全部安全地保存在您的浏览器本地 (LocalStorage) 中，绝不上传至任何第三方服务器。
*   **本地备份**：系统内置**本地备份提醒横幅**，支持一键将当前所有简历及配置导出为本地 `.json` 文件备份，并在需要时随时一键导入恢复。

---

## 📄 开源协议

本项目采用 [AGPL-3.0-only](LICENSE) 协议开源。

---

## 🤝 Friends / Links

<table border="0">
  <tbody>
    <tr>
      <td width="200" align="center">
        <a href="https://linux.do" target="_blank" style="text-decoration:none;">
          <img src="https://img.shields.io/badge/LINUX.DO-Community-000000?style=for-the-badge&logo=linux&logoColor=white" alt="LINUX.DO" />
        </a>
      </td>
      <td align="left">
        <strong><a href="https://linux.do" target="_blank">LINUX.DO</a></strong><br/>
        真诚、友善、团结、专业，共建你我引以为荣之社区。
      </td>
    </tr>
  </tbody>
</table>
