/**
 * 微博AI助手 - 设置页面脚本
 */

// 默认配置
const DEFAULT_CONFIG = {
  apiUrl: '',
  apiKey: '',
  models: ['gpt-3.5-turbo'],
  promptTemplate: '请分析以下微博内容，提供简洁的总结和观点：\n\n{content}'
};

// DOM 元素
const elements = {
  apiUrl: document.getElementById('apiUrl'),
  apiKey: document.getElementById('apiKey'),
  models: document.getElementById('models'),
  promptTemplate: document.getElementById('promptTemplate'),
  saveBtn: document.getElementById('saveBtn'),
  statusBadge: document.getElementById('statusBadge'),
  toast: document.getElementById('toast')
};

/**
 * 显示提示消息
 * @param {string} message - 消息内容
 * @param {boolean} isError - 是否是错误消息
 */
function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.className = 'toast' + (isError ? ' error' : '');
  elements.toast.classList.add('show');

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

/**
 * 更新状态标签
 * @param {boolean} isConfigured - 是否已配置
 */
function updateStatusBadge(isConfigured) {
  if (isConfigured) {
    elements.statusBadge.className = 'status-badge configured';
    elements.statusBadge.textContent = '✓ 已配置';
  } else {
    elements.statusBadge.className = 'status-badge not-configured';
    elements.statusBadge.textContent = '未配置';
  }
}

/**
 * 加载保存的配置
 */
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_CONFIG, (result) => {
      resolve(result);
    });
  });
}

/**
 * 保存配置
 * @param {Object} config - 配置对象
 */
async function saveConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(config, () => {
      resolve();
    });
  });
}

/**
 * 验证配置
 * @param {Object} config - 配置对象
 * @returns {string|null} 错误信息，null表示验证通过
 */
function validateConfig(config) {
  if (!config.apiUrl) {
    return '请填写API地址';
  }

  try {
    new URL(config.apiUrl);
  } catch (e) {
    return '请填写有效的API地址';
  }

  return null;
}

/**
 * 初始化页面
 */
async function init() {
  // 加载配置
  const config = await loadConfig();

  // 填充表单
  elements.apiUrl.value = config.apiUrl || '';
  elements.apiKey.value = config.apiKey || '';
  // 将模型数组转为多行文本
  const models = config.models || DEFAULT_CONFIG.models;
  elements.models.value = Array.isArray(models) ? models.join('\n') : models;
  elements.promptTemplate.value = config.promptTemplate || DEFAULT_CONFIG.promptTemplate;

  // 更新状态
  updateStatusBadge(!!config.apiUrl);
}

/**
 * 处理保存按钮点击
 */
async function handleSave() {
  // 解析模型列表：支持换行、逗号、分号分隔
  const modelsText = elements.models.value.trim();
  const models = modelsText
    .split(/[\n,;]+/)
    .map(m => m.trim())
    .filter(m => m.length > 0);

  const config = {
    apiUrl: elements.apiUrl.value.trim(),
    apiKey: elements.apiKey.value.trim(),
    models: models.length > 0 ? models : DEFAULT_CONFIG.models,
    promptTemplate: elements.promptTemplate.value.trim() || DEFAULT_CONFIG.promptTemplate
  };

  // 验证
  const error = validateConfig(config);
  if (error) {
    showToast(error, true);
    return;
  }

  // 禁用按钮
  elements.saveBtn.disabled = true;
  elements.saveBtn.textContent = '保存中...';

  try {
    await saveConfig(config);
    updateStatusBadge(true);
    showToast(`设置已保存，共 ${config.models.length} 个模型`);
  } catch (error) {
    showToast('保存失败：' + error.message, true);
  } finally {
    elements.saveBtn.disabled = false;
    elements.saveBtn.textContent = '保存设置';
  }
}

// 绑定事件
elements.saveBtn.addEventListener('click', handleSave);

// 监听输入变化，实时更新状态
elements.apiUrl.addEventListener('input', () => {
  updateStatusBadge(!!elements.apiUrl.value.trim());
});

// 初始化
init();