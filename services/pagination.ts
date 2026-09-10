/**
 * 简历智能分页与跨页避让引擎
 * 保证在预览缩放状态和 PDF 导出 1:1 状态下，均能精准计算分页并防止内容被跨页割裂。
 */

export interface PaginationResult {
  breaks: number[];    // 各分页线在未缩放容器内的 Y 轴坐标（px）
  totalPages: number;  // 简历总页数
  pageH: number;       // 单页 A4 在当前容器排版下的标准像素高度
}

/**
 * 获取元素相对于容器的未缩放盒模型坐标
 */
function getUnscaledBox(el: HTMLElement, containerRect: DOMRect, scale: number) {
  const r = el.getBoundingClientRect();
  return {
    top: (r.top - containerRect.top) / scale,
    bottom: (r.bottom - containerRect.top) / scale,
    height: r.height / scale,
  };
}

/**
 * 提取某个 Section 内的标题元素及各子条目元素
 */
function getSectionComponents(section: HTMLElement): {
  headerEl: HTMLElement | null;
  items: HTMLElement[];
} {
  const headerEl = (section.querySelector('[data-section-header="true"]') as HTMLElement | null) ||
    (section.firstElementChild as HTMLElement | null);

  // 优先使用明确标记 data-section-item="true" 的元素
  const taggedItems = Array.from(
    section.querySelectorAll('[data-section-item="true"]')
  ) as HTMLElement[];

  if (taggedItems.length > 0) {
    return { headerEl, items: taggedItems };
  }

  // 兜底策略：根据 DOM 结构提取
  const children = Array.from(section.children) as HTMLElement[];
  if (children.length <= 1) {
    return { headerEl, items: [] };
  }

  const remaining = children.slice(1);
  if (remaining.length === 1) {
    const wrapper = remaining[0];
    const wrapperChildren = Array.from(wrapper.children) as HTMLElement[];
    // 若 wrapper 内部有多个块级子元素（如技能列表），取其子元素；否则取 wrapper 自身
    if (wrapperChildren.length > 1 && !wrapper.classList.contains('flex-wrap')) {
      return { headerEl, items: wrapperChildren };
    }
    return { headerEl, items: [wrapper] };
  }

  return { headerEl, items: remaining };
}

/**
 * 对简历容器执行智能分页与跨页避让
 * @param container 简历根 DOM 节点（如 #resume-content 或其导出的克隆体）
 */
export function paginateResume(container: HTMLElement): PaginationResult {
  if (!container) {
    return { breaks: [], totalPages: 1, pageH: 1122.5 };
  }

  // 1. 重置所有之前的避让样式与临时高度
  container.querySelectorAll('[data-page-avoid]').forEach((el) => {
    (el as HTMLElement).style.marginTop = '';
    el.removeAttribute('data-page-avoid');
  });
  container.style.minHeight = '297mm';
  void container.offsetHeight; // 强制重新排版

  const containerRect = container.getBoundingClientRect();
  const offsetWidth = container.offsetWidth;

  if (offsetWidth <= 0 || containerRect.width <= 0) {
    return { breaks: [], totalPages: 1, pageH: 1122.5 };
  }

  // 计算当前容器受到的 CSS Transform 缩放比例（例如预览区 scale-[0.5] ~ scale-95）
  const scale = containerRect.width / offsetWidth;

  // 标准 A4 宽高比为 297 / 210
  const pageH = offsetWidth * (297 / 210);

  // 页面留白缓冲配置：
  // 第 2 页及后续页顶部预留 45px 留白（约 12mm，标准舒适的 A4 页顶边距，解决第2页顶部无留白挤压感）
  // 每一页底部预留 25px 安全避让边距（约 6.6mm）
  const pageTopPadding = 45;
  const pageBottomPadding = 25;
  const maxUsablePageHeight = pageH - pageTopPadding - pageBottomPadding;

  const getExpectedPageTop = (page: number) => {
    return page === 0 ? 20 : page * pageH + pageTopPadding;
  };
  const getExpectedPageBottom = (page: number) => {
    return (page + 1) * pageH - pageBottomPadding;
  };
  const getNextPageTop = (page: number) => {
    return (page + 1) * pageH + pageTopPadding;
  };

  const mainEl = container.querySelector('main');
  const sections = mainEl
    ? (Array.from(mainEl.querySelectorAll(':scope > section')) as HTMLElement[])
    : [];

  // 2. 逐模块计算并应用避让
  for (const section of sections) {
    const { headerEl, items } = getSectionComponents(section);
    if (!headerEl) continue;

    let headerBox = getUnscaledBox(headerEl, containerRect, scale);
    let currentPage = Math.floor(headerBox.top / pageH);
    let pageContentBottom = getExpectedPageBottom(currentPage);
    let nextPageContentTop = getNextPageTop(currentPage);

    if (items.length === 0) {
      // 模块无子条目：若标题本身超出了当页内容区，将模块整体推到下一页
      if (headerBox.bottom > pageContentBottom) {
        const push = nextPageContentTop - headerBox.top;
        const curMargin = parseFloat(section.style.marginTop) || 0;
        section.style.marginTop = `${curMargin + push}px`;
        section.setAttribute('data-page-avoid', 'true');
        void container.offsetHeight;
      }
      continue;
    }

    // 规则 1：防孤儿标题（Keep Header with First Item）
    // 标题必须与该模块的第一个条目在同一页，否则将整个模块推入下一页
    const item0 = items[0];
    let item0Box = getUnscaledBox(item0, containerRect, scale);
    const item0Height = item0Box.height;
    const canItem0FitNextPage = item0Height <= maxUsablePageHeight;

    if (item0Box.bottom > pageContentBottom && canItem0FitNextPage) {
      // 避免当该元素已经在页首时出现重复推迟
      const isAlreadyNearTop = Math.abs(headerBox.top - getExpectedPageTop(currentPage)) < 8;
      if (!isAlreadyNearTop) {
        const push = nextPageContentTop - headerBox.top;
        const curMargin = parseFloat(section.style.marginTop) || 0;
        section.style.marginTop = `${curMargin + push}px`;
        section.setAttribute('data-page-avoid', 'true');
        void container.offsetHeight;

        // 更新坐标状态
        headerBox = getUnscaledBox(headerEl, containerRect, scale);
        currentPage = Math.floor(headerBox.top / pageH);
        pageContentBottom = getExpectedPageBottom(currentPage);
        nextPageContentTop = getNextPageTop(currentPage);
      }
    }

    // 规则 2：遍历后续条目执行原子避让
    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      let itemBox = getUnscaledBox(item, containerRect, scale);
      currentPage = Math.floor(itemBox.top / pageH);
      pageContentBottom = getExpectedPageBottom(currentPage);
      nextPageContentTop = getNextPageTop(currentPage);

      const itemHeight = itemBox.height;
      const canFitNextPage = itemHeight <= maxUsablePageHeight;

      if (itemBox.bottom > pageContentBottom) {
        const isAlreadyNearTop = Math.abs(itemBox.top - getExpectedPageTop(currentPage)) < 8;
        if (!isAlreadyNearTop && (canFitNextPage || itemBox.top > (currentPage * pageH + pageH * 0.5))) {
          const push = nextPageContentTop - itemBox.top;
          const curMargin = parseFloat(item.style.marginTop) || 0;
          item.style.marginTop = `${curMargin + push}px`;
          item.setAttribute('data-page-avoid', 'true');
          void container.offsetHeight;
        }
      }
    }
  }

  // 3. 计算最终总高度与分页线位置
  void container.offsetHeight;

  let maxBottom = 0;
  const elementsToMeasure = container.querySelectorAll(
    'header, section, [data-section-item="true"], [data-page-avoid]'
  );
  elementsToMeasure.forEach((el) => {
    const b = getUnscaledBox(el as HTMLElement, containerRect, scale).bottom;
    if (b > maxBottom) maxBottom = b;
  });

  // 加上底部容器边距
  const totalContentHeight = maxBottom + pageBottomPadding;
  const totalPages = Math.max(1, Math.ceil((totalContentHeight - 5) / pageH));

  const breaks: number[] = [];
  for (let p = 1; p < totalPages; p++) {
    breaks.push(p * pageH);
  }

  // 容器高度设为整页高度的倍数
  container.style.minHeight = `${totalPages * 297}mm`;

  return {
    breaks,
    totalPages,
    pageH,
  };
}
