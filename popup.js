/**
 * 微博AI助手 - 弹出页面脚本
 */

// DOM 元素
const elements = {
  apiStatus: document.getElementById('apiStatus'),
  settingsBtn: document.getElementById('settingsBtn')
};

/**
 * 更新API状态显示
 * @param {boolean} isConfigured - 是否已配置
 */
function updateApiStatus(isConfigured) {
  const statusDot = elements.apiStatus.querySelector('.status-dot');
  
  if (isConfigured) {
    elements.apiStatus.className = 'status-value success';
    statusDot.className = 'status-dot success';
    elements.apiStatus.innerHTML = '<span class="status-dot success"></span>已配置';
  } else {
    elements.apiStatus.className = 'status-value warning';
    statusDot.className = 'status-dot warning';
    elements.apiStatus.innerHTML = '<span class="status-dot warning"></span>未配置';
  }
}

/**
 * 加载配置并更新状态
 */
async function loadStatus() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiUrl'], (result) => {
      updateApiStatus(!!result.apiUrl);
      resolve(result);
    });
  });
}

/**
 * 打开设置页面
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// 绑定事件
elements.settingsBtn.addEventListener('click', openSettings);

// 初始化
loadStatus();

// 监听存储变化，实时更新状态
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.apiUrl) {
    updateApiStatus(!!changes.apiUrl.newValue);
  }
});
