/**
 * 微博AI助手 - 内容脚本
 * 为每条微博添加AI分析按钮
 * 适配微博新版界面 (weibo.com) - 支持Vue虚拟滚动
 */

(function() {
  'use strict';

  // 按钮已注入标记
  const PROCESSED_CLASS = 'weibo-ai-processed';
  // 结果容器类名
  const RESULT_CLASS = 'weibo-ai-result';
  // 数据属性标记（用于虚拟滚动场景）
  const DATA_ID_ATTR = 'data-weibo-ai-id';

  /**
   * 检测当前页面类型
   * @returns {string} 'main' | 'search'
   */
  function getPageType() {
    if (location.hostname === 's.weibo.com') {
      return 'search';
    }
    return 'main';
  }

  /**
   * 获取微博卡片的内容文本
   * @param {Element} card - 微博卡片元素
   * @returns {string} 微博文本内容
   */
  function getWeiboContent(card) {
    const pageType = getPageType();

    if (pageType === 'search') {
      // 搜索页面文本选择器
      const searchTextSelectors = [
        'p[node-type="feed_list_content"]',
        'p[node-type="feed_list_content_full"]',
        '.card-feed .txt',
        '.card .txt',
        'p.txt'
      ];

      for (const selector of searchTextSelectors) {
        const textEl = card.querySelector(selector);
        if (textEl && textEl.textContent.trim()) {
          return textEl.textContent.trim();
        }
      }
    }

    // 新版微博文本选择器
    const textSelectors = [
      // Vue动态类名
      '[class*="detail_wbtext"]',
      '[class*="wbtext"]',
      'p[class*="text"]',
      // 通用文本区域
      '.txt',
      'p.txt',
      // 内容区域
      '.content p',
      '[class*="content"] p'
    ];

    for (const selector of textSelectors) {
      const textEl = card.querySelector(selector);
      if (textEl && textEl.textContent.trim()) {
        return textEl.textContent.trim();
      }
    }

    // 备用：获取article内所有文本，过滤掉用户名等
    const article = card.querySelector('article') || card;
    const allText = article.textContent || '';
    
    // 简单过滤，取较长的文本段落
    const paragraphs = allText.split('\n').filter(t => t.trim().length > 20);
    if (paragraphs.length > 0) {
      return paragraphs[0].trim().substring(0, 1000);
    }

    return allText.trim().substring(0, 1000);
  }

  /**
   * 获取微博的唯一ID
   * @param {Element} card - 微博卡片元素
   * @returns {string} 微博ID
   */
  function getWeiboId(card) {
    // 从data属性获取（如果之前已设置）
    const existingId = card.getAttribute(DATA_ID_ATTR);
    if (existingId) return existingId;

    const pageType = getPageType();

    if (pageType === 'search') {
      // 搜索页面：从mid属性获取
      const mid = card.getAttribute('mid');
      if (mid) {
        card.setAttribute(DATA_ID_ATTR, mid);
        return mid;
      }

      // 从action-data中提取mid
      const actionEl = card.querySelector('[action-data*="mid="]');
      if (actionEl) {
        const match = actionEl.getAttribute('action-data').match(/mid=(\d+)/);
        if (match) {
          card.setAttribute(DATA_ID_ATTR, match[1]);
          return match[1];
        }
      }
    }

    // 尝试从链接提取
    const links = card.querySelectorAll('a[href*="/status/"], a[href*="/p/"]');
    for (const link of links) {
      const match = link.href.match(/status\/(\d+)/);
      if (match) {
        card.setAttribute(DATA_ID_ATTR, match[1]);
        return match[1];
      }
    }

    // 尝试从用户链接提取
    const userLink = card.querySelector('a[href*="/u/"]');
    if (userLink) {
      const match = userLink.href.match(/\/u\/(\d+)/);
      if (match) {
        const id = 'user-' + match[1] + '-' + Date.now();
        card.setAttribute(DATA_ID_ATTR, id);
        return id;
      }
    }

    // 使用时间戳+随机数
    const id = 'weibo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    card.setAttribute(DATA_ID_ATTR, id);
    return id;
  }

  /**
   * 创建AI分析按钮
   * @returns {HTMLElement} 按钮元素
   */
  function createAIButton() {
    const button = document.createElement('button');
    button.className = 'weibo-ai-btn';
    button.type = 'button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <span>AI分析</span>
    `;
    return button;
  }

  /**
   * 创建结果展示容器
   * @param {string} weiboId - 微博ID
   * @returns {HTMLElement} 结果容器
   */
  function createResultContainer(weiboId) {
    const container = document.createElement('div');
    container.className = RESULT_CLASS;
    container.id = `weibo-ai-result-${weiboId}`;
    container.innerHTML = '<div class="weibo-ai-loading">AI正在分析中...</div>';
    return container;
  }

  /**
   * 显示分析结果
   * @param {HTMLElement} container - 结果容器
   * @param {string} result - 分析结果
   * @param {string} model - 使用的模型名称
   * @param {boolean} isError - 是否是错误信息
   */
  function showResult(container, result, model = '', isError = false) {
    const modelDisplay = model ? `<span class="weibo-ai-model">${escapeHtml(model)}</span>` : '';
    container.innerHTML = `
      <div class="weibo-ai-result-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <span>AI分析结果</span>
        ${modelDisplay}
        ${!isError ? `
        <button class="weibo-ai-copy-btn" title="复制结果">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span class="weibo-ai-copy-text">复制</span>
        </button>
        ` : ''}
      </div>
      <div class="weibo-ai-result-content ${isError ? 'error' : ''}">${escapeHtml(result)}</div>
    `;

    // 绑定复制按钮事件
    if (!isError) {
      const copyBtn = container.querySelector('.weibo-ai-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          copyToClipboard(result, copyBtn);
        });
      }
    }
  }

  /**
   * 复制文本到剪贴板
   * @param {string} text - 要复制的文本
   * @param {HTMLElement} button - 复制按钮元素
   */
  async function copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const textSpan = button.querySelector('.weibo-ai-copy-text');
      const originalText = textSpan.textContent;
      textSpan.textContent = '已复制';
      button.classList.add('copied');
      setTimeout(() => {
        textSpan.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    } catch (err) {
      // 备用方案：使用传统复制方法
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        const textSpan = button.querySelector('.weibo-ai-copy-text');
        textSpan.textContent = '已复制';
        button.classList.add('copied');
        setTimeout(() => {
          textSpan.textContent = '复制';
          button.classList.remove('copied');
        }, 2000);
      } catch (e) {
        console.error('[微博AI助手] 复制失败:', e);
      }
      document.body.removeChild(textarea);
    }
  }

  /**
   * HTML转义
   * @param {string} text - 原始文本
   * @returns {string} 转义后的文本
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  /**
   * 调用API进行分析
   * @param {string} content - 微博内容
   * @returns {Promise<{result: string, model: string}>} 分析结果和模型名称
   */
  async function analyzeContent(content) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'analyze', content: content },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve({ result: response.result, model: response.model || '' });
          } else {
            reject(new Error(response?.error || '分析失败'));
          }
        }
      );
    });
  }

  /**
   * 处理按钮点击
   * @param {Event} event - 点击事件
   * @param {Element} card - 微博卡片
   * @param {string} weiboId - 微博ID
   */
  async function handleButtonClick(event, card, weiboId) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const content = getWeiboContent(card);

    if (!content || content.length < 5) {
      alert('无法获取微博内容');
      return;
    }

    // 检查是否正在加载中
    if (button.classList.contains('loading')) {
      return;
    }

    // 检查是否已有结果容器
    let resultContainer = document.getElementById(`weibo-ai-result-${weiboId}`);
    
    // 禁用按钮
    button.disabled = true;
    button.classList.add('loading');

    // 如果没有结果容器，创建一个
    if (!resultContainer) {
      resultContainer = createResultContainer(weiboId);
      
      // 找到合适的位置插入结果 - 在footer之前
      const footer = card.querySelector('footer, [class*="footer"], [class*="_footer"]');
      if (footer) {
        footer.parentNode.insertBefore(resultContainer, footer);
      } else {
        // 插入到卡片末尾
        const article = card.querySelector('article');
        if (article) {
          article.appendChild(resultContainer);
        } else {
          card.appendChild(resultContainer);
        }
      }
    } else {
      // 已有结果容器，显示加载状态
      resultContainer.innerHTML = '<div class="weibo-ai-loading">AI正在重新分析中...</div>';
      // 确保结果容器可见
      resultContainer.classList.remove('hidden');
    }

    try {
      const { result, model } = await analyzeContent(content);
      showResult(resultContainer, result, model);
      // 更新按钮文本，提示可以重新生成
      updateButtonText(button, true);
    } catch (error) {
      showResult(resultContainer, error.message, '', true);
    } finally {
      button.disabled = false;
      button.classList.remove('loading');
    }
  }

  /**
   * 更新按钮文本
   * @param {HTMLElement} button - 按钮元素
   * @param {boolean} hasResult - 是否已有结果
   */
  function updateButtonText(button, hasResult) {
    const textSpan = button.querySelector('span');
    if (textSpan) {
      textSpan.textContent = hasResult ? '重新分析' : 'AI分析';
    }
  }

  /**
   * 查找操作栏（点赞、评论、转发区域）
   * @param {Element} card - 微博卡片
   * @returns {Element|null} 操作栏元素
   */
  function findActionBar(card) {
    const pageType = getPageType();

    if (pageType === 'search') {
      // 搜索页面操作栏
      const searchSelectors = [
        '.card-act',
        '.card-act ul',
        '[action-type="feed_list_forward"]',
        '[action-type="feed_list_comment"]',
        '[action-type="feed_list_like"]'
      ];

      for (const selector of searchSelectors) {
        const el = card.querySelector(selector);
        if (el) {
          // 如果找到的是单个按钮，返回其父容器
          if (el.matches('[action-type]')) {
            return el.closest('ul') || el.parentElement;
          }
          return el;
        }
      }
    }

    // 新版微博操作栏选择器
    const selectors = [
      // footer区域（新版）
      'footer',
      '[class*="footer"]',
      // 操作按钮区域
      '[class*="card-act"]',
      '[class*="act_line"]',
      '[class*="footer"]',
      // 包含转发/评论/点赞的区域
      '[class*="_left_"]',
      '[class*="woo-box-flex"]'
    ];

    for (const selector of selectors) {
      const el = card.querySelector(selector);
      if (el && el.querySelector('[class*="retweet"], [class*="comment"], [class*="like"], i[title*="转发"], i[title*="评论"]')) {
        return el;
      }
    }

    return null;
  }

  /**
   * 为单个微博卡片注入按钮
   * @param {Element} card - 微博卡片元素（article或包含article的容器）
   */
  function injectButton(card) {
    // 检查是否已处理
    if (card.classList.contains(PROCESSED_CLASS)) {
      return;
    }

    // 检查是否已存在按钮（防止重复注入）
    if (card.querySelector('.weibo-ai-btn')) {
      card.classList.add(PROCESSED_CLASS);
      return;
    }

    const pageType = getPageType();

    if (pageType === 'search') {
      // 搜索页面：检查是否是微博卡片
      // 通过mid属性或card-feed类来识别
      const isWeiboCard = card.hasAttribute('mid') || 
                          card.querySelector('[mid]') ||
                          card.classList.contains('card-wrap');
      if (!isWeiboCard) {
        return;
      }

      // 检查是否包含文本内容（排除用户推荐卡片等）
      const hasContent = card.querySelector('p[node-type="feed_list_content"], .txt');
      if (!hasContent) {
        return;
      }
    } else {
      // 确保是微博卡片 - 检查是否包含用户头像
      const hasAvatar = card.querySelector('img[class*="avatar"], img[usercard], [class*="woo-avatar"]');
      if (!hasAvatar) {
        return;
      }
    }

    // 获取实际的article元素
    let article = card.querySelector('article');
    if (!article) {
      article = card;
    }

    // 标记为已处理
    card.classList.add(PROCESSED_CLASS);

    // 查找操作栏
    let actionArea = findActionBar(article);
    
    if (!actionArea) {
      // 创建自定义操作区域
      actionArea = document.createElement('div');
      actionArea.className = 'weibo-ai-action-area';
      article.appendChild(actionArea);
    }

    // 再次检查操作栏中是否已有按钮（防止竞态条件）
    if (actionArea.querySelector('.weibo-ai-btn')) {
      return;
    }

    // 创建按钮
    const button = createAIButton();
    const weiboId = getWeiboId(card);

    button.addEventListener('click', (e) => handleButtonClick(e, card, weiboId));

    // 插入按钮
    actionArea.appendChild(button);
    
    console.log('[微博AI助手] 已注入按钮:', weiboId);
  }

  /**
   * 扫描页面并注入按钮
   */
  function scanAndInject() {
    const pageType = getPageType();

    // 微博卡片选择器
    let cardSelectors;

    if (pageType === 'search') {
      // 搜索页面选择器
      cardSelectors = [
        '.card-wrap[mid]',
        '.card-wrap[action-type="feed_list_item"]',
        '.card-wrap'
      ];
    } else {
      // 主站选择器
      cardSelectors = [
        // Vue虚拟滚动列表中的卡片
        '.vue-recycle-scroller__item-view',
        // article元素
        'article[class*="_wrap"]',
        'article[class*="card"]',
        // 旧版卡片
        '.card-wrap',
        '.WB_cardwrap',
        '[mid]'
      ];
    }

    let injectedCount = 0;

    for (const selector of cardSelectors) {
      try {
        const cards = document.querySelectorAll(selector);
        cards.forEach(card => {
          if (!card.classList.contains(PROCESSED_CLASS)) {
            injectButton(card);
            if (card.classList.contains(PROCESSED_CLASS)) {
              injectedCount++;
            }
          }
        });
      } catch (e) {
        // 忽略选择器错误
      }
    }

    if (injectedCount > 0) {
      console.log(`[微博AI助手] 本次注入 ${injectedCount} 个按钮`);
    }
  }

  /**
   * 检查虚拟滚动项是否需要处理
   * 只处理未被标记的项
   */
  function checkVirtualScrollItems() {
    const items = document.querySelectorAll('.vue-recycle-scroller__item-view');
    items.forEach(item => {
      // 只处理未标记的项
      if (!item.classList.contains(PROCESSED_CLASS)) {
        injectButton(item);
      }
    });
  }
  
  /**
   * 初始化MutationObserver监听动态加载的内容
   */
  function initObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (const mutation of mutations) {
        // 检查属性变化（虚拟滚动会改变style属性来移动元素位置）
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target.classList?.contains('vue-recycle-scroller__item-view')) {
            shouldScan = true;
          }
        }
        
        // 检查新增节点
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 检查是否是微博相关元素
              if (node.classList?.contains('vue-recycle-scroller__item-view') ||
                  node.querySelector?.('.vue-recycle-scroller__item-view') ||
                  node.querySelector?.('article') ||
                  node.tagName === 'ARTICLE') {
                shouldScan = true;
                break;
              }
            }
          }
        }
        
        if (shouldScan) break;
      }

      if (shouldScan) {
        clearTimeout(window._weiboAiScanTimer);
        window._weiboAiScanTimer = setTimeout(scanAndInject, 200);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'data-index']
    });
    
    // 定期检查虚拟滚动项（备用方案）
    setInterval(checkVirtualScrollItems, 2000);
    
    console.log('[微博AI助手] 已启动DOM监听');
  }
  /**
   * 初始化
   */
  function init() {
    console.log('[微博AI助手] 初始化中...');
    
    const startScan = () => {
      setTimeout(() => {
        scanAndInject();
        initObserver();
      }, 2000);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startScan);
    } else {
      startScan();
    }

    // 监听路由变化
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('[微博AI助手] URL变化，重新扫描');
        document.querySelectorAll('.' + PROCESSED_CLASS).forEach(el => {
          el.classList.remove(PROCESSED_CLASS);
        });
        setTimeout(scanAndInject, 1500);
      }
    });
    urlObserver.observe(document.body, { subtree: true, childList: true });
  }

  init();
})();