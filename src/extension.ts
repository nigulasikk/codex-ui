import * as vscode from 'vscode';
import { CodexUIPanel } from './codexUIPanel';
import { executeCodexCommand } from './codexExecutor';

// 创建 CodexViewProvider 类
class CodexViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codex-ui.mainView';

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview();

    // 处理来自 webview 的消息
    webviewView.webview.onDidReceiveMessage(data => {
      switch (data.type) {
        case 'sendMessage':
          // 处理发送消息
          executeCodexCommand(data.value);
          break;
        case 'saveSettings':
          // 保存设置
          const config = vscode.workspace.getConfiguration('codex-ui');
          config.update(data.key, data.value, vscode.ConfigurationTarget.Global);
          break;
      }
    });
  }

  private _getHtmlForWebview() {
    // 获取当前配置
    const config = vscode.workspace.getConfiguration('codex-ui');
    const apiProvider = config.get<string>('apiProvider', 'openrouter');
    const openrouterApiKey = config.get<string>('openrouterApiKey', '');
    const qwenApiKey = config.get<string>('qwenApiKey', '');
    const ollamaEndpoint = config.get<string>('ollamaEndpoint', 'http://localhost:11434');
    const ollamaModel = config.get<string>('ollamaModel', 'codellama');
    const approvalMode = config.get<string>('approvalMode', 'manual');

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Codex UI</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          padding: 0;
          margin: 0;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        .container {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        .tabs {
          display: flex;
          background-color: var(--vscode-editor-background);
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .tab {
          padding: 8px 16px;
          cursor: pointer;
          border: none;
          background: none;
          color: var(--vscode-foreground);
          opacity: 0.7;
        }
        .tab.active {
          opacity: 1;
          border-bottom: 2px solid var(--vscode-focusBorder);
        }
        .tab:hover {
          opacity: 1;
        }
        .content {
          flex: 1;
          overflow: auto;
          padding: 16px;
        }
        .panel {
          display: none;
        }
        .panel.active {
          display: block;
        }
        .chat-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 120px);
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 10px;
          padding: 10px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
        }
        .message {
          margin-bottom: 10px;
          padding: 8px;
          border-radius: 4px;
        }
        .user-message {
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          align-self: flex-end;
          margin-left: 20%;
        }
        .bot-message {
          background-color: var(--vscode-editor-selectionBackground);
          align-self: flex-start;
          margin-right: 20%;
        }
        .input-container {
          display: flex;
          margin-top: 10px;
        }
        #message-input {
          flex: 1;
          padding: 8px;
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
        }
        #send-button {
          margin-left: 10px;
          padding: 8px 16px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        #send-button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        .settings-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .setting-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        label {
          font-weight: bold;
        }
        select, input {
          padding: 8px;
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
        }
        button {
          padding: 8px 16px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        .api-settings {
          display: none;
        }
        .api-settings.active {
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="tabs">
          <button class="tab active" data-panel="chat">Chat</button>
          <button class="tab" data-panel="settings">Settings</button>
        </div>
        <div class="content">
          <div class="panel active" id="chat-panel">
            <div class="chat-container">
              <div class="chat-messages" id="chat-messages">
                <div class="message bot-message">Hi, I'm Devin! How can I help you with your code today?</div>
              </div>
              <div class="input-container">
                <input type="text" id="message-input" placeholder="Type your message here...">
                <button id="send-button">Send</button>
              </div>
            </div>
          </div>
          <div class="panel" id="settings-panel">
            <div class="settings-container">
              <div class="setting-group">
                <label for="api-provider">API Provider</label>
                <select id="api-provider">
                  <option value="openrouter" \${apiProvider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                  <option value="qwen" \${apiProvider === 'qwen' ? 'selected' : ''}>Tongyi Qianwen (通义千问)</option>
                  <option value="ollama" \${apiProvider === 'ollama' ? 'selected' : ''}>Ollama</option>
                </select>
              </div>

              <div id="openrouter-settings" class="api-settings \${apiProvider === 'openrouter' ? 'active' : ''}">
                <div class="setting-group">
                  <label for="openrouter-api-key">OpenRouter API Key</label>
                  <input type="password" id="openrouter-api-key" value="\${openrouterApiKey}">
                </div>
              </div>

              <div id="qwen-settings" class="api-settings \${apiProvider === 'qwen' ? 'active' : ''}">
                <div class="setting-group">
                  <label for="qwen-api-key">Tongyi Qianwen API Key</label>
                  <input type="password" id="qwen-api-key" value="\${qwenApiKey}">
                </div>
              </div>

              <div id="ollama-settings" class="api-settings \${apiProvider === 'ollama' ? 'active' : ''}">
                <div class="setting-group">
                  <label for="ollama-endpoint">Ollama Endpoint</label>
                  <input type="text" id="ollama-endpoint" value="\${ollamaEndpoint}">
                </div>
                <div class="setting-group">
                  <label for="ollama-model">Ollama Model</label>
                  <input type="text" id="ollama-model" value="\${ollamaModel}">
                </div>
              </div>

              <div class="setting-group">
                <label for="approval-mode">Approval Mode</label>
                <select id="approval-mode">
                  <option value="auto" \${approvalMode === 'auto' ? 'selected' : ''}>Auto</option>
                  <option value="manual" \${approvalMode === 'manual' ? 'selected' : ''}>Manual</option>
                  <option value="suggest" \${approvalMode === 'suggest' ? 'selected' : ''}>Suggest</option>
                </select>
              </div>

              <button id="save-button">Save Settings</button>
            </div>
          </div>
        </div>
      </div>
      <script>
        (function() {
          const vscode = acquireVsCodeApi();
          
          // 标签页切换
          const tabs = document.querySelectorAll('.tab');
          const panels = document.querySelectorAll('.panel');
          
          tabs.forEach(tab => {
            tab.addEventListener('click', () => {
              const panelId = tab.dataset.panel;
              
              // 更新标签页状态
              tabs.forEach(t => t.classList.remove('active'));
              tab.classList.add('active');
              
              // 更新面板状态
              panels.forEach(p => p.classList.remove('active'));
              document.getElementById(\`\${panelId}-panel\`).classList.add('active');
            });
          });

          // 聊天功能
          const messageInput = document.getElementById('message-input');
          const sendButton = document.getElementById('send-button');
          const chatMessages = document.getElementById('chat-messages');

          function addMessage(text, isUser) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user-message' : 'bot-message'}\`;
            messageDiv.textContent = text;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }

          function sendMessage() {
            const text = messageInput.value;
            if (text) {
              addMessage(text, true);
              vscode.postMessage({
                type: 'sendMessage',
                value: text
              });
              messageInput.value = '';
            }
          }

          sendButton.addEventListener('click', sendMessage);
          messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          });

          // 设置功能
          const apiProviderSelect = document.getElementById('api-provider');
          const openrouterSettings = document.getElementById('openrouter-settings');
          const qwenSettings = document.getElementById('qwen-settings');
          const ollamaSettings = document.getElementById('ollama-settings');
          const saveButton = document.getElementById('save-button');

          function updateApiSettings() {
            const selectedProvider = apiProviderSelect.value;
            openrouterSettings.classList.toggle('active', selectedProvider === 'openrouter');
            qwenSettings.classList.toggle('active', selectedProvider === 'qwen');
            ollamaSettings.classList.toggle('active', selectedProvider === 'ollama');
          }

          apiProviderSelect.addEventListener('change', updateApiSettings);

          saveButton.addEventListener('click', () => {
            const apiProvider = apiProviderSelect.value;
            const openrouterApiKey = document.getElementById('openrouter-api-key').value;
            const qwenApiKey = document.getElementById('qwen-api-key').value;
            const ollamaEndpoint = document.getElementById('ollama-endpoint').value;
            const ollamaModel = document.getElementById('ollama-model').value;
            const approvalMode = document.getElementById('approval-mode').value;

            // 发送设置到扩展
            vscode.postMessage({
              type: 'saveSettings',
              key: 'apiProvider',
              value: apiProvider
            });

            vscode.postMessage({
              type: 'saveSettings',
              key: 'openrouterApiKey',
              value: openrouterApiKey
            });

            vscode.postMessage({
              type: 'saveSettings',
              key: 'qwenApiKey',
              value: qwenApiKey
            });

            vscode.postMessage({
              type: 'saveSettings',
              key: 'ollamaEndpoint',
              value: ollamaEndpoint
            });

            vscode.postMessage({
              type: 'saveSettings',
              key: 'ollamaModel',
              value: ollamaModel
            });

            vscode.postMessage({
              type: 'saveSettings',
              key: 'approvalMode',
              value: approvalMode
            });
          });

          // 接收来自扩展的消息
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
              case 'addResponse':
                addMessage(message.value, false);
                break;
            }
          });
        }());
      </script>
    </body>
    </html>`;
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Codex UI extension is now active!');

  // 注册主视图
  const codexViewProvider = new CodexViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CodexViewProvider.viewType, codexViewProvider)
  );

  const executeWithFileCommand = vscode.commands.registerCommand('codex-ui.executeWithFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const prompt = await vscode.window.showInputBox({
      placeHolder: 'Enter your prompt for Codex',
      prompt: 'The current file will be referenced as @file'
    });

    if (!prompt) {
      return;
    }

    const fileContent = editor.document.getText();
    const processedPrompt = prompt.replace('@file', fileContent);

    executeCodexCommand(processedPrompt);
  });

  context.subscriptions.push(executeWithFileCommand);
}

export function deactivate() {}
