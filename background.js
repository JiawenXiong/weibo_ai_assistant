/**
 * 微博AI助手 - 后台服务
 * 处理API请求和配置管理
 */

// 默认配置
const DEFAULT_CONFIG = {
  apiUrl: '',
  apiKey: '',
  models: ['gpt-3.5-turbo'],
  promptTemplate: '请分析以下微博内容，提供简洁的总结和观点：\n\n{content}'
};

/**
 * 随机选择一个模型（排除上次使用的模型）
 * @param {string[]} models - 模型列表
 * @returns {Promise<string>} 随机选择的模型
 */
async function getRandomModel(models) {
  if (!models || models.length === 0) {
    return DEFAULT_CONFIG.models[0];
  }

  // 如果只有一个模型，直接返回
  if (models.length === 1) {
    return models[0];
  }

  // 获取上次使用的模型
  const storage = await chrome.storage.local.get(['lastUsedModel']);
  const lastModel = storage.lastUsedModel;

  // 过滤掉上次使用的模型
  let availableModels = models;
  if (lastModel && models.includes(lastModel)) {
    availableModels = models.filter(m => m !== lastModel);
    console.log(`[微博AI助手] 排除上次使用的模型: ${lastModel}，剩余 ${availableModels.length} 个可选`);
  }

  // 随机选择
  const index = Math.floor(Math.random() * availableModels.length);
  const selectedModel = availableModels[index];

  // 记录本次使用的模型
  await chrome.storage.local.set({ lastUsedModel: selectedModel });

  return selectedModel;
}

/**
 * 获取用户配置
 * @returns {Promise<Object>} 配置对象
 */
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_CONFIG, (result) => {
      resolve(result);
    });
  });
}

/**
 * 构建请求消息
 * @param {string} content - 微博内容
 * @param {string} promptTemplate - 提示词模板
 * @returns {string} 完整的提示词
 */
function buildPrompt(content, promptTemplate) {
  return promptTemplate.replace('{content}', content);
}

/**
 * 调用AI API
 * @param {string} content - 微博内容
 * @returns {Promise<{result: string, model: string}>} 分析结果和使用的模型
 */
async function callAPI(content) {
  const config = await getConfig();

  if (!config.apiUrl) {
    throw new Error('请先在插件设置中配置API地址');
  }

  // 随机选择一个模型（排除上次使用的）
  const selectedModel = await getRandomModel(config.models);
  console.log(`[微博AI助手] 从 ${config.models.length} 个模型中随机选择: ${selectedModel}`);

  const prompt = buildPrompt(content, config.promptTemplate);

  const headers = {
    'Content-Type': 'application/json'
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const body = {
    model: selectedModel,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  };

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API请求失败 (${response.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch (e) {
      // 无法解析错误信息，使用默认消息
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // 兼容OpenAI格式和其他API格式
  let result;
  if (data.choices && data.choices[0]?.message?.content) {
    result = data.choices[0].message.content.trim();
  } else if (data.response) {
    result = data.response.trim();
  } else if (data.result) {
    result = data.result.trim();
  } else if (typeof data === 'string') {
    result = data.trim();
  } else {
    throw new Error('无法解析API响应');
  }

  return { result, model: selectedModel };
}

/**
 * 监听来自content script的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    callAPI(request.content)
      .then(data => {
        sendResponse({ success: true, result: data.result, model: data.model });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    // 返回true表示异步发送响应
    return true;
  }
});

/**
 * 插件安装时的初始化
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // 首次安装，设置默认配置
    await chrome.storage.sync.set(DEFAULT_CONFIG);
    console.log('微博AI助手已安装，请配置API设置');
  }
});
