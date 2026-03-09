# Weibo AI Assistant

English | [简体中文](./README.md)

A browser extension that adds AI analysis functionality to Weibo, with support for custom prompts and multi-model load balancing.

## Features

- 🔘 **AI Analysis Button** - Automatically adds an "AI Analysis" button to each Weibo post
- 🤖 **Multi-Model Support** - Configure multiple models with random selection for load balancing
- 🔄 **Model Rotation** - Intelligently excludes the last used model, ensuring different models for each analysis
- 🔁 **Re-analysis** - Click "Re-analyze" button to generate a new version of the analysis result
- ✏️ **Custom Prompts** - Configure analysis prompts through the settings page
- 📋 **One-Click Copy** - Analysis results can be copied to clipboard with one click
- 🎨 **UI Adaptation** - Compatible with the new Weibo interface, supports virtual scrolling
- 🌙 **Dark Mode** - Automatically adapts to system dark mode

## Installation

### Chrome / Edge

1. Download or clone this project to your local machine
2. Open the browser extensions management page
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder
5. Click the extension icon to access the settings page and configure your API

## Configuration

Click the extension icon to access the settings page and configure:

| Setting | Description |
|---------|-------------|
| API URL | Full URL of the LLM API (OpenAI compatible format) |
| API Key | API key (some APIs may not require this) |
| Model Names | Support multiple models, one per line, randomly selected |
| Prompt Template | Custom analysis prompt, use `{content}` as placeholder |

### Model Configuration Example

```
gpt-3.5-turbo
gpt-4
claude-3-sonnet
deepseek-chat
```

Each API call randomly selects one model for load balancing. Additionally, the system remembers the last used model and automatically excludes it from the next random selection, ensuring consecutive analyses use different models for diverse perspectives.

### Prompt Template Example

```
Analyze the following Weibo post and provide your insights:

{content}

Please analyze from the following perspectives:
1. Main points
2. Sentiment
3. Potential controversies
```

## Usage

1. Visit any page on [Weibo](https://weibo.com)
2. An "AI Analysis" button will appear in the action bar of each post
3. Click the button and wait for the AI analysis to complete
4. Results will be displayed below the post content
5. Click the "Copy" button to copy the analysis result
6. To re-analyze, click the "Re-analyze" button, and the system will use a different model to generate a new analysis result

## Technical Architecture

```
weibo_ai_assistant/
├── manifest.json      # Extension config (Manifest V3)
├── content.js         # Content script (button injection, interaction handling)
├── background.js      # Background service (API calls, model selection)
├── options.html/js    # Settings page
├── popup.html/js      # Popup page
├── styles.css         # Styles
└── icons/             # Extension icons
```

### Key Technical Points

- **Manifest V3** - Using the latest browser extension standard
- **Virtual Scrolling Adaptation** - Handles DOM reuse in Weibo's Vue virtual scroll list
- **MutationObserver** - Monitors dynamically loaded Weibo content
- **OpenAI Compatible API** - Supports various OpenAI-format compatible LLM APIs

## Compatibility

- Chrome 88+
- Edge 88+
- Other Chromium-based browsers

## Development

```bash
# Clone the project
git clone https://github.com/your-username/weibo-ai-assistant.git

# Load the extension in browser for debugging
# After modifying code, refresh the extension in the extensions management page
```

## License

[MIT License](./LICENSE)

## Contributing

Issues and Pull Requests are welcome!

## Disclaimer

This extension is for learning and research purposes only. Users must comply with Weibo's terms of service. The developer is not responsible for any issues arising from the use of this extension.
