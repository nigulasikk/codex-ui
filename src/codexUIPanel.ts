import * as vscode from 'vscode';
import { executeCodexCommand } from './codexExecutor';
import { getNonce } from './utils';

/**
 * Codex UI 面板类
 * 管理 VSCode 扩展的 WebView 界面
 */
export class CodexUIPanel {
  public static currentPanel: CodexUIPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionContext: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];

  /**
   * 创建或显示 Codex UI 面板
   * @param context 扩展上下文
   */
  public static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (CodexUIPanel.currentPanel) {
      CodexUIPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'codexUI',
      'Codex UI',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(context.extensionPath + '/media')
        ]
      }
    );

    CodexUIPanel.currentPanel = new CodexUIPanel(panel, context);
  }

  /**
   * 构造函数
   * @param panel WebView 面板
   * @param context 扩展上下文
   */
  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._extensionContext = context;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'executeCodex':
            let prompt = message.text;
            
            this._panel.webview.postMessage({ command: 'startLoading' });
            
            const result = await executeCodexCommand(prompt);
            
            this._panel.webview.postMessage({ command: 'result', text: result });
            break;
          
          case 'saveSettings':
            const config = vscode.workspace.getConfiguration('codex-ui');
            await config.update('openaiApiKey', message.apiKey, vscode.ConfigurationTarget.Global);
            await config.update('openaiModel', message.model, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage('Codex UI 设置已保存');
            break;
            
          case 'openSettings':
            const currentConfig = vscode.workspace.getConfiguration('codex-ui');
            const currentApiKey = currentConfig.get<string>('openaiApiKey', '');
            const currentModel = currentConfig.get<string>('openaiModel', 'gpt-4');
            
            this._panel.webview.postMessage({ 
              command: 'showSettings', 
              apiKey: currentApiKey,
              model: currentModel
            });
            break;
        }
      },
      null,
      this._disposables
    );
  }

  /**
   * 释放资源
   */
  public dispose() {
    CodexUIPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * 更新面板内容
   */
  private _update() {
    this._panel.title = 'Codex UI';
    this._panel.webview.html = this._getHtmlForWebview();
  }

  /**
   * 生成 WebView HTML 内容
   * @returns HTML 字符串
   */
  private _getHtmlForWebview() {
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <title>Codex UI</title>
      <style>
        body {
          padding: 20px;
          color: var(--vscode-foreground);
          font-family: var(--vscode-font-family);
          background-color: var(--vscode-editor-background);
        }
        .container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title {
          font-size: 1.5em;
          font-weight: bold;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        label {
          font-weight: bold;
        }
        input, select, textarea {
          padding: 8px;
          border: 1px solid var(--vscode-input-border);
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border-radius: 2px;
        }
        textarea {
          min-height: 100px;
          resize: vertical;
        }
        button {
          padding: 8px 16px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
          border-radius: 2px;
        }
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        .result {
          margin-top: 20px;
          padding: 10px;
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          border-radius: 2px;
          white-space: pre-wrap;
        }
        .hidden {
          display: none;
        }
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 100;
          justify-content: center;
          align-items: center;
        }
        .modal-content {
          background-color: var(--vscode-editor-background);
          padding: 20px;
          border-radius: 4px;
          width: 80%;
          max-width: 500px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .modal-title {
          font-size: 1.2em;
          font-weight: bold;
        }
        .close-button {
          background: none;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          color: var(--vscode-foreground);
        }
        .loading {
          display: inline-block;
        }
        @keyframes thinking {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        .thinking-text {
          animation: thinking 1.5s infinite;
          display: inline-block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">Codex UI</div>
          <button id="settings-button">设置</button>
        </div>
        
        <div class="chat-container">
          <div class="input-group">
            <label for="prompt">输入您的提示:</label>
            <textarea id="prompt" placeholder="请输入您的代码问题或需求..."></textarea>
          </div>
          <button id="execute">执行</button>
          <div id="result" class="result hidden"></div>
        </div>
      </div>
      
      <!-- 设置弹窗 -->
      <div id="settings-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">设置</div>
            <button class="close-button" id="close-settings">&times;</button>
          </div>
          <div class="input-group">
            <label for="openai-api-key">OpenAI API Key:</label>
            <input type="password" id="openai-api-key" />
          </div>
          <div class="input-group">
            <label for="openai-model">OpenAI 模型:</label>
            <select id="openai-model">
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
          <button id="save-settings" style="margin-top: 15px;">保存设置</button>
        </div>
      </div>
      
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        const settingsButton = document.getElementById('settings-button');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettings = document.getElementById('close-settings');
        const executeButton = document.getElementById('execute');
        const promptTextarea = document.getElementById('prompt');
        const resultDiv = document.getElementById('result');
        const saveSettingsButton = document.getElementById('save-settings');
        const openaiApiKeyInput = document.getElementById('openai-api-key');
        const openaiModelSelect = document.getElementById('openai-model');
        
        settingsButton.addEventListener('click', () => {
          vscode.postMessage({ command: 'openSettings' });
          settingsModal.style.display = 'flex';
        });
        
        closeSettings.addEventListener('click', () => {
          settingsModal.style.display = 'none';
        });
        
        window.addEventListener('click', (event) => {
          if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
          }
        });
        
        executeButton.addEventListener('click', () => {
          const prompt = promptTextarea.value;
          if (!prompt) {
            return;
          }
          
          resultDiv.innerHTML = '<div class="loading"><span class="thinking-text">思考中</span></div>';
          resultDiv.classList.remove('hidden');
          
          vscode.postMessage({
            command: 'executeCodex',
            text: prompt
          });
        });
        
        saveSettingsButton.addEventListener('click', () => {
          const apiKey = openaiApiKeyInput.value;
          const model = openaiModelSelect.value;
          
          vscode.postMessage({
            command: 'saveSettings',
            apiKey,
            model
          });
          
          settingsModal.style.display = 'none';
        });
        
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.command) {
            case 'result':
              resultDiv.textContent = message.text;
              resultDiv.classList.remove('hidden');
              break;
              
            case 'showSettings':
              openaiApiKeyInput.value = message.apiKey || '';
              openaiModelSelect.value = message.model || 'gpt-4';
              break;
              
            case 'startLoading':
              resultDiv.innerHTML = '<div class="loading"><span class="thinking-text">思考中</span></div>';
              resultDiv.classList.remove('hidden');
              break;
          }
        });
      </script>
    </body>
    </html>`;
  }
}
