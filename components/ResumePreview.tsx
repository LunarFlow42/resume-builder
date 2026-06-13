
import React, { useState, useEffect, useRef } from 'react';
import { ResumeData, ExperienceEntry } from '../types';

// 二维码组件
const QRCodeImage: React.FC<{ url: string; className?: string }> = ({ url, className = "" }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!url) {
      setDataUrl('');
      return;
    }

    let active = true;
    let timerId: any = null;

    const generate = () => {
      // @ts-ignore - 使用 window.QRCode
      const QRCodeLib = window.QRCode;
      if (QRCodeLib) {
        QRCodeLib.toDataURL(url, {
          width: 120,
          margin: 1,
          color: {
            dark: '#333333',
            light: '#ffffff'
          }
        })
          .then((urlStr: string) => {
            if (active) {
              setDataUrl(urlStr);
            }
          })
          .catch((err: any) => {
            console.error('QR code generation failed:', err);
          });
        return true;
      }
      return false;
    };

    // 尝试立即生成
    if (!generate()) {
      // 如果未加载完成，每 100ms 轮询检查一次
      timerId = setInterval(() => {
        if (generate()) {
          clearInterval(timerId);
        }
      }, 100);
    }

    return () => {
      active = false;
      if (timerId) clearInterval(timerId);
    };
  }, [url]);

  if (!dataUrl) return null;
  return <img src={dataUrl} className={className} alt="QR Code" />;
};

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}

// SectionHeader 通栏样式
const SectionHeader: React.FC<{ icon: string; title: string; themeColor: string }> = ({ icon, title, themeColor }) => (
  <div className="flex items-center gap-3 mb-3 pb-2 border-b-2" style={{ borderColor: themeColor }}>
    <div
      className="section-icon text-white shrink-0 flex items-center justify-center"
      style={{
        backgroundColor: themeColor,
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        fontSize: '0.79em',
      }}
    >
      <i className={icon}></i>
    </div>
    <h2 className="font-bold tracking-wide text-slate-800" style={{ fontSize: '1.07em' }}>{title}</h2>
  </div>
);

// EditableText
interface EditableTextProps {
  value: string;
  onSave: (val: string) => void;
  id: string;
  className?: string;
  multiline?: boolean;
  style?: React.CSSProperties;
  editingField: string | null;
  setEditingField: (id: string | null) => void;
  placeholder?: React.ReactNode;
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onSave,
  id,
  className = "",
  multiline = false,
  style = {},
  editingField,
  setEditingField,
  placeholder
}) => {
  const isEditing = editingField === id;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const autoResizeWidth = (el: HTMLInputElement) => {
    const span = document.createElement('span');
    const computed = window.getComputedStyle(el);
    span.style.font = computed.font;
    span.style.letterSpacing = computed.letterSpacing;
    span.style.visibility = 'hidden';
    span.style.position = 'fixed';
    span.style.top = '-9999px';
    span.style.whiteSpace = 'pre';
    span.textContent = el.value || ' ';
    document.body.appendChild(span);
    const width = span.getBoundingClientRect().width;
    document.body.removeChild(span);
    el.style.width = `${Math.ceil(width) + 14}px`;
  };

  // flex-1 和 block 类型的输入框不自动调整宽度（它们由布局控制宽度）
  const shouldAutoWidth = !multiline && !className.includes('flex-1') && !className.includes('block');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline && inputRef.current instanceof HTMLTextAreaElement) {
        autoResize(inputRef.current);
      } else if (inputRef.current instanceof HTMLInputElement) {
        if (shouldAutoWidth) autoResizeWidth(inputRef.current);
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  if (isEditing) {
    const commonProps = {
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onSave(e.target.value);
        if (multiline && e.target instanceof HTMLTextAreaElement) {
          autoResize(e.target);
        } else if (shouldAutoWidth && e.target instanceof HTMLInputElement) {
          autoResizeWidth(e.target);
        }
      },
      onBlur: () => setEditingField(null),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) setEditingField(null);
        if (e.key === 'Escape') setEditingField(null);
      },
      style: style
    };

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          {...commonProps}
          rows={1}
          className={`inline-editor resize-none overflow-hidden ${className}`}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        {...commonProps}
        className={`inline-editor ${className}`}
      />
    );
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setEditingField(id); }}
      className={`editable-field transition-all rounded inline-block min-w-[5px] ${className}`}
      style={style}
    >
      {value || (placeholder !== undefined ? placeholder : <span className="italic opacity-30">...</span>)}
    </div>
  );
};

// 模块配置（默认值和图标）
const DEFAULT_TITLES: Record<string, string> = {
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
};

const SECTION_ICONS: Record<string, string> = {
  education: 'fas fa-graduation-cap',
  projects: 'fas fa-project-diagram',
  campus: 'fas fa-university',
  training: 'fas fa-laptop-code',
  work: 'fas fa-briefcase',
  internship: 'fas fa-user-tie',
  awards: 'fas fa-trophy',
  certificates: 'fas fa-certificate',
  evaluation: 'fas fa-user',
  skills: 'fas fa-tools'
};

const ResumePreview: React.FC<Props> = ({ data, onChange }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
  const { layout } = data;

  // 智能分页：计算分页线位置并避免模块被跨页切割
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isCalculating = false;
    let rafId: number;
    let unlockTimer: ReturnType<typeof setTimeout>;

    const calculate = () => {
      if (isCalculating) return;
      isCalculating = true;

      const pxPerMm = el.offsetWidth / 210;
      const pageH = 297 * pxPerMm;
      if (pageH <= 0) { isCalculating = false; return; }

      // 1. 重置之前的分页避让 margin
      el.querySelectorAll('[data-page-avoid]').forEach((e: Element) => {
        (e as HTMLElement).style.marginTop = '';
        (e as HTMLElement).removeAttribute('data-page-avoid');
      });
      void el.offsetHeight; // 强制回流

      // 2. 收集需要保护的内容块
      const mainEl = el.querySelector('main');
      if (mainEl) {
        const elRect = el.getBoundingClientRect();
        const sections = Array.from(mainEl.querySelectorAll(':scope > section')) as HTMLElement[];

        const blocks: { el: HTMLElement; top: number; height: number }[] = [];

        for (const section of sections) {
          const sRect = section.getBoundingClientRect();
          const sTop = sRect.top - elRect.top;
          const sHeight = sRect.height;

          if (sHeight <= pageH * 0.8) {
            // 小模块：整体保护不跨页
            blocks.push({ el: section, top: sTop, height: sHeight });
          } else {
            // 大模块：保护标题不孤立 & 各子条目不被切割
            const children = Array.from(section.children) as HTMLElement[];
            if (children.length < 2) continue;

            // 标题区保护：确保标题后至少跟 50px 内容在同一页
            const headerRect = children[0].getBoundingClientRect();
            const headerProtectionH = (headerRect.bottom - elRect.top) + 50 - sTop;
            if (headerProtectionH > 0 && headerProtectionH < pageH * 0.5) {
              blocks.push({ el: section, top: sTop, height: headerProtectionH });
            }

            if (children.length === 2) {
              // 单容器子节点（如技能清单的 wrapper、自我评价的文本区）
              const wrapper = children[1];
              const items = Array.from(wrapper.children) as HTMLElement[];
              for (let i = 1; i < items.length; i++) {
                const item = items[i] as HTMLElement;
                const iRect = item.getBoundingClientRect();
                if (iRect.height > 5 && iRect.height < pageH * 0.8) {
                  blocks.push({ el: item, top: iRect.top - elRect.top, height: iRect.height });
                }
              }
            } else {
              // 多条目子节点（如经历、教育条目）
              for (let i = 2; i < children.length; i++) {
                const child = children[i] as HTMLElement;
                const cRect = child.getBoundingClientRect();
                if (cRect.height > 5 && cRect.height < pageH * 0.8) {
                  blocks.push({ el: child, top: cRect.top - elRect.top, height: cRect.height });
                }
              }
            }
          }
        }

        // 按位置排序
        blocks.sort((a, b) => a.top - b.top);

        // 3. 计算并应用避让 margin
        let cumOffset = 0;
        for (const block of blocks) {
          const adjustedTop = block.top + cumOffset;
          const adjustedBottom = adjustedTop + block.height;
          const pageIdx = Math.floor(adjustedTop / pageH);
          const nextPageStart = (pageIdx + 1) * pageH;

          // 块跨越了分页线
          if (adjustedTop < nextPageStart && adjustedBottom > nextPageStart) {
            const onNextPage = adjustedBottom - nextPageStart;
            const margin = nextPageStart - adjustedTop;
            // 仅在：有实质内容被切到下页(>20px) & 浪费空间不超过页高25% & 块能放下一页
            if (onNextPage > 20 && margin < pageH * 0.25 && block.height < pageH * 0.9) {
              block.el.style.marginTop = `${margin}px`;
              block.el.setAttribute('data-page-avoid', 'true');
              cumOffset += margin;
            }
          }
        }
      }

      // 4. 计算最终分页线位置
      void el.offsetHeight;
      const totalHeight = el.scrollHeight;
      const breaks: number[] = [];
      let y = pageH;
      while (y < totalHeight - 10) {
        breaks.push(y);
        y += pageH;
      }
      setPageBreaks(breaks);

      // 延迟释放锁，跳过 DOM 变化触发的 ResizeObserver 回调
      clearTimeout(unlockTimer);
      unlockTimer = setTimeout(() => { isCalculating = false; }, 150);
    };

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculate);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
      clearTimeout(unlockTimer);
    };
  }, [data]);

  // 获取隐藏的模块列表和排序
  const hiddenSections = layout?.hiddenSections || [];
  const hiddenFields = layout?.hiddenFields || [];
  const sectionOrder = layout?.sectionOrder || ['skills', 'projects', 'education'];
  const sectionTitles = layout?.sectionTitles || DEFAULT_TITLES;
  const isSectionVisible = (section: string) => !hiddenSections.includes(section);
  const isFieldVisible = (field: string) => !hiddenFields.includes(field);

  // 子条目隐藏
  const hiddenItems = layout?.hiddenItems || {};
  const isItemHidden = (section: string, itemId: string) => {
    return (hiddenItems[section] || []).includes(itemId);
  };

  // 计算相对字号
  const baseFontSize = layout.fontSize || 14;
  const fontSize = (ratio: number) => `${Math.round(baseFontSize * ratio)}px`;

  // 获取模块标题
  const getSectionTitle = (sectionKey: string) => sectionTitles[sectionKey] || DEFAULT_TITLES[sectionKey] || sectionKey;

  const handleUpdate = (path: string, value: string) => {
    const newData = JSON.parse(JSON.stringify(data));
    const parts = path.split('.');
    let current: any = newData;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    onChange(newData);
  };

  const handleArrayUpdate = (section: keyof ResumeData, id: string, field: string, value: string) => {
    const newList = [...(data[section] as any[])];
    const index = newList.findIndex(item => item.id === id);
    if (index !== -1) {
      newList[index] = { ...newList[index], [field]: value };
      onChange({ ...data, [section]: newList });
    }
  };

  const renderEditable = (
    id: string,
    value: string,
    onSave: (v: string) => void,
    options: { className?: string; multiline?: boolean; style?: React.CSSProperties; placeholder?: React.ReactNode } = {}
  ) => (
    <EditableText
      id={id}
      value={value}
      onSave={onSave}
      editingField={editingField}
      setEditingField={setEditingField}
      className={options.className}
      multiline={options.multiline}
      style={options.style}
      placeholder={options.placeholder}
    />
  );

  // 渲染各个模块
  const renderSection = (sectionKey: string) => {
    if (!isSectionVisible(sectionKey)) return null;

    const icon = SECTION_ICONS[sectionKey] || 'fas fa-folder';
    const title = getSectionTitle(sectionKey);

    switch (sectionKey) {
      case 'education':
        const visibleEdu = data.education.filter(edu => !isItemHidden('education', edu.id));
        if (visibleEdu.length === 0) return null;
        return (
          <section key={sectionKey} className="mb-4">
            <SectionHeader icon={icon} title={title} themeColor={layout.themeColor} />
            {visibleEdu.map((edu) => (
              <div key={edu.id} className="mb-2">
                <div className="flex justify-between items-baseline font-bold mb-0.5" style={{ fontSize: '0.93em' }}>
                  {renderEditable(`edu-time-${edu.id}`, edu.timeline, (v) => handleArrayUpdate('education', edu.id, 'timeline', v), { className: "shrink-0" })}
                  {renderEditable(`edu-school-${edu.id}`, edu.school, (v) => handleArrayUpdate('education', edu.id, 'school', v), { className: "flex-1 text-center px-4" })}
                  {renderEditable(`edu-degree-${edu.id}`, edu.degree, (v) => handleArrayUpdate('education', edu.id, 'degree', v), { className: "shrink-0" })}
                  {renderEditable(`edu-major-${edu.id}`, edu.major, (v) => handleArrayUpdate('education', edu.id, 'major', v), { className: "shrink-0 ml-4" })}
                </div>
                {edu.details && (
                  <div className="text-slate-600 leading-relaxed" style={{ fontSize: '0.79em' }}>
                    {renderEditable(`edu-details-${edu.id}`, edu.details, (v) => handleArrayUpdate('education', edu.id, 'details', v), { className: "block", multiline: true })}
                  </div>
                )}
              </div>
            ))}
          </section>
        );

      case 'projects':
      case 'campus':
      case 'training':
      case 'work':
      case 'internship':
        const expItems = ((data as any)[sectionKey] as ExperienceEntry[] | undefined) || [];
        const visibleExpItems = expItems.filter(item => !isItemHidden(sectionKey, item.id));
        if (visibleExpItems.length === 0) return null;
        return (
          <section key={sectionKey} className="mb-4">
            <SectionHeader icon={icon} title={title} themeColor={layout.themeColor} />
            {visibleExpItems.map((item) => (
              <div key={item.id} className="mb-3 last:mb-0">
                <div className="flex justify-between items-baseline font-bold mb-1" style={{ fontSize: '0.93em' }}>
                  {renderEditable(`${sectionKey}-time-${item.id}`, item.timeline, (v) => handleArrayUpdate(sectionKey as keyof ResumeData, item.id, 'timeline', v), { className: "shrink-0" })}
                  {renderEditable(`${sectionKey}-title-${item.id}`, item.title, (v) => handleArrayUpdate(sectionKey as keyof ResumeData, item.id, 'title', v), { className: "flex-1 text-center px-4" })}
                  {renderEditable(`${sectionKey}-role-${item.id}`, item.role, (v) => handleArrayUpdate(sectionKey as keyof ResumeData, item.id, 'role', v), { className: "shrink-0" })}
                </div>
                <div className="leading-[1.7] text-slate-700 text-justify" style={{ fontSize: '0.79em' }}>
                  {renderEditable(`${sectionKey}-desc-${item.id}`, item.description, (v) => handleArrayUpdate(sectionKey as keyof ResumeData, item.id, 'description', v), { className: "block whitespace-pre-wrap", multiline: true })}
                </div>
              </div>
            ))}
          </section>
        );

      case 'awards':
      case 'certificates':
        const certItems = ((data as any)[sectionKey] as ExperienceEntry[] | undefined) || [];
        const visibleCertItems = certItems.filter(item => !isItemHidden(sectionKey, item.id));
        if (visibleCertItems.length === 0) return null;
        return (
          <section key={sectionKey} className="mb-4">
            <SectionHeader icon={icon} title={title} themeColor={layout.themeColor} />
            <div className="flex flex-wrap gap-x-6 gap-y-2" style={{ fontSize: '0.86em' }}>
              {visibleCertItems.map((item) => (
                <div key={item.id} className="flex items-center gap-1.5">
                  {item.timeline ? (
                    renderEditable(`${sectionKey}-time-${item.id}`, item.timeline, (v) => handleArrayUpdate(sectionKey as keyof ResumeData, item.id, 'timeline', v), { className: "text-slate-500 mr-0.5", placeholder: "" })
                  ) : null}
                  {renderEditable(`${sectionKey}-title-${item.id}`, item.title, (v) => handleArrayUpdate(sectionKey as keyof ResumeData, item.id, 'title', v), { className: "font-bold text-slate-800" })}
                  {item.description ? (
                    <span className="text-slate-500">
                      (
                      {renderEditable(`${sectionKey}-desc-${item.id}`, item.description, (v) => handleArrayUpdate(sectionKey as keyof ResumeData, item.id, 'description', v), { className: "text-slate-600", placeholder: "" })}
                      )
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        );

      case 'evaluation':
        const evalText = (data.evaluation as string | undefined) || '';
        if (!evalText) return null;
        return (
          <section key={sectionKey} className="mb-4">
            <SectionHeader icon={icon} title={title} themeColor={layout.themeColor} />
            <div className="leading-[1.7] text-slate-700 text-justify" style={{ fontSize: '0.86em' }}>
              {renderEditable('evaluation-text', evalText, (v) => onChange({ ...data, evaluation: v }), { className: "block whitespace-pre-wrap", multiline: true })}
            </div>
          </section>
        );

      case 'skills':
        const visibleSkills = (data.skills || []).filter(skill => !isItemHidden('skills', skill.id));
        if (visibleSkills.length === 0) return null;
        return (
          <section key={sectionKey} className="mb-4">
            <SectionHeader icon={icon} title={title} themeColor={layout.themeColor} />
            <div className="space-y-1.5">
              {visibleSkills.map((skill) => {
                const idx = data.skills.findIndex(s => s.id === skill.id);
                return (
                <div key={`skill-row-${skill.id}`} className="flex items-start" style={{ fontSize: '0.86em' }}>
                  <div className="font-bold text-slate-800 shrink-0 w-[60px]">
                    {renderEditable(
                      `skill-cat-${skill.id}`,
                      skill.category,
                      (v) => {
                        const newList = [...data.skills];
                        if (idx !== -1) newList[idx] = { ...newList[idx], category: v };
                        onChange({ ...data, skills: newList });
                      }
                    )}
                  </div>
                  <span className="text-slate-400 font-bold mx-2">:</span>
                  <div className="text-slate-700 leading-normal flex-1">
                    {renderEditable(
                      `skill-cont-${skill.id}`,
                      skill.content,
                      (v) => {
                        const newList = [...data.skills];
                        if (idx !== -1) newList[idx] = { ...newList[idx], content: v };
                        onChange({ ...data, skills: newList });
                      },
                      { className: "block", multiline: true }
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="resume-container bg-white shadow-none"
      id="resume-content"
      style={{
        fontFamily: layout.fontFamily,
        fontSize: `${layout.fontSize}px`,
        lineHeight: layout.lineHeight,
        width: '210mm',
        minHeight: '297mm',
        maxWidth: '210mm',
        boxSizing: 'border-box',
        margin: 0,
        padding: '20px 28px',
        position: 'relative',
      }}
    >
      {/* 顶部个人信息区域 */}
      <header className="mb-5 pb-4 relative">
        {/* 姓名 */}
        <div className="text-center mb-3">
          {renderEditable(
            "pi-name",
            data.personalInfo.name,
            (v) => handleUpdate('personalInfo.name', v),
            { className: "font-bold tracking-[4px] block", style: { color: layout.themeColor, fontSize: '2em' } }
          )}
        </div>

        {/* 求职意向 */}
        {(isFieldVisible('jobIntent.role') || isFieldVisible('jobIntent.type')) && (
          <div className="text-center mb-3 font-medium text-slate-700" style={{ fontSize: '1em' }}>
            {isFieldVisible('jobIntent.role') && renderEditable("pi-role", data.personalInfo.jobIntent.role, (v) => handleUpdate('personalInfo.jobIntent.role', v))}
            {isFieldVisible('jobIntent.role') && isFieldVisible('jobIntent.type') && <span className="mx-2 text-slate-300">|</span>}
            {isFieldVisible('jobIntent.type') && renderEditable("pi-type", data.personalInfo.jobIntent.type, (v) => handleUpdate('personalInfo.jobIntent.type', v))}
          </div>
        )}

        {/* 基本信息网格 */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-slate-600" style={{ fontSize: '0.86em' }}>
          {isFieldVisible('phone') && (
            <div className="flex items-center gap-1">
              <i className="fas fa-phone" style={{ color: layout.themeColor, fontSize: '0.71em' }}></i>
              {renderEditable("pi-phone", data.personalInfo.phone, (v) => handleUpdate('personalInfo.phone', v))}
            </div>
          )}
          {isFieldVisible('email') && (
            <div className="flex items-center gap-1">
              <i className="fas fa-envelope" style={{ color: layout.themeColor, fontSize: '0.71em' }}></i>
              {renderEditable("pi-email", data.personalInfo.email, (v) => handleUpdate('personalInfo.email', v))}
            </div>
          )}
          {isFieldVisible('age') && (
            <div className="flex items-center gap-1">
              <i className="fas fa-birthday-cake" style={{ color: layout.themeColor, fontSize: '0.71em' }}></i>
              {renderEditable("pi-age", data.personalInfo.age, (v) => handleUpdate('personalInfo.age', v))}岁
            </div>
          )}
          {isFieldVisible('experience') && (
            <div className="flex items-center gap-1">
              <i className="fas fa-briefcase" style={{ color: layout.themeColor, fontSize: '0.71em' }}></i>
              {renderEditable("pi-experience", data.personalInfo.experience, (v) => handleUpdate('personalInfo.experience', v))}
            </div>
          )}
          {isFieldVisible('education') && (
            <div className="flex items-center gap-1">
              <i className="fas fa-graduation-cap" style={{ color: layout.themeColor, fontSize: '0.71em' }}></i>
              {renderEditable("pi-education", data.personalInfo.education, (v) => handleUpdate('personalInfo.education', v))}
            </div>
          )}
          {isFieldVisible('hometown') && (
            <div className="flex items-center gap-1">
              <i className="fas fa-home" style={{ color: layout.themeColor, fontSize: '0.71em' }}></i>
              {renderEditable("pi-hometown", data.personalInfo.hometown, (v) => handleUpdate('personalInfo.hometown', v))}
            </div>
          )}
        </div>

        {/* 二维码展示 */}
        {isFieldVisible('qrCodeUrl') && data.personalInfo.qrCodeUrl && (
          <div className="absolute right-0 top-0 flex flex-col items-center gap-1">
            <QRCodeImage url={data.personalInfo.qrCodeUrl} className="w-[60px] h-[60px] border border-slate-100 p-0.5 bg-white rounded shadow-sm" />
            <div className="text-[10px] text-slate-400 font-bold block max-w-[80px] text-center leading-normal break-words overflow-visible">
              {renderEditable("pi-qrCodeLabel", data.personalInfo.qrCodeLabel || '', (v) => handleUpdate('personalInfo.qrCodeLabel', v), { placeholder: "扫码查看" })}
            </div>
          </div>
        )}
      </header>

      {/* 主内容区 - 按 sectionOrder 渲染 */}
      <main>
        {sectionOrder.map(sectionKey => renderSection(sectionKey))}
      </main>

      {/* 分页参考线 */}
      {pageBreaks.map((y, i) => (
        <div
          key={i}
          data-page-break="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${y}px`,
            height: 0,
            borderTop: '1.5px dashed #cbd5e1',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <span style={{
            position: 'absolute',
            right: '4px',
            top: '-16px',
            fontSize: '10px',
            color: '#94a3b8',
            background: 'white',
            padding: '0 4px',
          }}>
            第 {i + 2} 页
          </span>
        </div>
      ))}
    </div>
  );
};

export default ResumePreview;
