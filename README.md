# Codex UI

A VSCode extension that wraps around codex-cli to provide a user-friendly interface for AI-assisted coding.

## Features

- **Multiple AI Model Support**: Configure and use different AI models including OpenRouter, Tongyi Qianwen (通义千问), and Ollama.
- **File Reference Support**: Use `@file` in your prompts to reference the current file content.
- **Flexible Approval Modes**: Choose between automatic, manual confirmation, or suggestion-only modes.
- **User-Friendly Interface**: Simple and intuitive UI for interacting with AI models.

## Requirements

- Visual Studio Code 1.80.0 or higher
- Internet connection for API-based models (OpenRouter, Tongyi Qianwen)
- Local Ollama installation for Ollama model support

## Extension Settings

This extension contributes the following settings:

* `codex-ui.apiProvider`: Select the API provider (OpenRouter, Tongyi Qianwen, Ollama)
* `codex-ui.openrouterApiKey`: API key for OpenRouter
* `codex-ui.qwenApiKey`: API key for Tongyi Qianwen (通义千问)
* `codex-ui.ollamaEndpoint`: Endpoint URL for Ollama (default: http://localhost:11434)
* `codex-ui.ollamaModel`: Model name for Ollama (default: codellama)
* `codex-ui.approvalMode`: Select the approval mode (auto, manual, suggest)

## Usage

1. Open the command palette (Ctrl+Shift+P) and run "Open Codex UI"
2. Configure your preferred AI model and settings
3. Enter your prompt in the input box (use @file to reference the current file)
4. Click "Execute" to generate code or get assistance
5. Review and apply the suggested changes

Alternatively, you can use the "Execute Codex with Current File" command to quickly run Codex with the current file as context.

## Known Issues

- None at this time

## Release Notes

### 0.1.0

- Initial release
- Support for OpenRouter, Tongyi Qianwen, and Ollama
- File reference support with @file
- Multiple approval modes (auto, manual, suggest)
