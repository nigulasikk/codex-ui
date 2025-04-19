# Codex UI

VSCode 扩展，为 OpenAI Codex CLI 提供简洁直观的用户界面，帮助开发者更高效地使用 AI 辅助编码。

A VSCode extension that provides a clean and intuitive interface for OpenAI Codex CLI, helping developers use AI-assisted coding more efficiently.

## 功能特点 (Features)

- **简洁的用户界面**：单一聊天界面，操作简单直观
- **设置弹窗**：通过弹窗轻松配置 OpenAI API Key 和模型
- **加载动画效果**：执行命令时显示思考动画，提供更好的用户体验
- **OpenAI Codex CLI 集成**：直接利用强大的 Codex CLI 功能

## 系统要求 (Requirements)

- Visual Studio Code 1.80.0 或更高版本
- 已安装 OpenAI Codex CLI (`npm install -g @openai/codex`)
- OpenAI API Key
- 网络连接

## 扩展设置 (Extension Settings)

此扩展提供以下设置：

* `codex-ui.openaiApiKey`: OpenAI API Key，用于 Codex CLI
* `codex-ui.openaiModel`: 选择 OpenAI 模型 (gpt-4, gpt-4-turbo, gpt-3.5-turbo)

## 使用方法 (Usage)

1. 打开命令面板 (Ctrl+Shift+P) 并运行 "Open Codex UI"
2. 点击设置按钮，配置您的 OpenAI API Key 和模型
3. 在输入框中输入您的提示
4. 点击"执行"按钮，等待 Codex 生成结果
5. 查看并应用生成的代码或建议

## 安装 Codex CLI

在使用此扩展前，请确保已安装 OpenAI Codex CLI：

```bash
npm install -g @openai/codex
```

## 已知问题 (Known Issues)

- 无

## 版本说明 (Release Notes)

### 0.1.0

- 初始版本
- 简化的用户界面，仅包含聊天功能
- 设置通过弹窗访问
- 集成 OpenAI Codex CLI
- 执行命令时显示加载动画
