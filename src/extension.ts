import * as vscode from 'vscode';
import { executeCodexCommand } from './codexExecutor';

// 创建 CodexViewProvider 类
class CodexViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codex-ui.mainView';
  private executionCancelled = false;
  private executionInProgress = false;
  
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
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'sendMessage':
          try {
            if (this.executionInProgress) {
              return;
            }
            
            this.executionInProgress = true;
            this.executionCancelled = false;
            
            // 通知 WebView 执行开始
            webviewView.webview.postMessage({
              type: 'executionStarted'
            });
            
            // 先发送模拟数据
            webviewView.webview.postMessage({
              type: 'addResponse',
              value: '这是一个模拟响应，实际请求正在处理中...'
            });
            
            // const response = await executeCodexCommand(data.value);
            
            // if (this.executionCancelled) {
            //   return;
            // }
            
            // // 将响应发送回 WebView
            // webviewView.webview.postMessage({
            //   type: 'addResponse',
            //   value: response
            // });
          } catch (error) {
            if (!this.executionCancelled) {
              if (error instanceof Error) {
                webviewView.webview.postMessage({
                  type: 'addResponse',
                  value: `错误: ${error.message}`
                });
              } else {
                webviewView.webview.postMessage({
                  type: 'addResponse',
                  value: "发生未知错误"
                });
              }
            }
          } finally {
            this.executionInProgress = false;
            webviewView.webview.postMessage({
              type: 'executionEnded'
            });
          }
          break;
        case 'cancelExecution':
          this.executionCancelled = true;
          webviewView.webview.postMessage({
            type: 'addResponse',
            value: "请求已取消"
          });
          break;
        case 'saveSettings':
          // 保存设置
          const config = vscode.workspace.getConfiguration('codex-ui');
          await config.update(data.key, data.value, vscode.ConfigurationTarget.Global);
          
          // 通知保存成功
          webviewView.webview.postMessage({
            type: 'settingsSaved'
          });
          break;
      }
    });
  }

  private _getHtmlForWebview() {
    // 获取当前配置
    const config = vscode.workspace.getConfiguration('codex-ui');
    const openaiApiKey = config.get<string>('openaiApiKey', '');
    const openaiModel = config.get<string>('openaiModel', 'gpt-4');
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
          position: relative;
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
          transition: all 0.3s ease;
        }
        #send-button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        #send-button.cancel {
          background-color: transparent;
          color: #ff5555;
          border: 2px solid #ff5555;
          box-shadow: 0 0 5px #ff5555;
        }
        #send-button.cancel:hover {
          background-color: rgba(255, 85, 85, 0.1);
        }
        .status-container {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-bottom: 10px;
          color: var(--vscode-descriptionForeground);
          font-size: 12px;
        }
        .status-indicator {
          margin-left: 5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #4CAF50;
          display: none;
        }
        .status-text {
          display: none;
        }
        .running .status-indicator,
        .running .status-text {
          display: block;
        }
        /* 添加 cooking 计时器样式 */
        .cooking-timer {
          position: relative;
          display: none;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          padding: 6px 12px;
          background: #111;
          border-radius: 4px;
          font-size: 14px;
        }
        .running.cooking-timer {
          display: flex;
        }
        .shine-text {
          position: relative;
          display: inline-block;
          font-size: 14px;
          font-weight: bold;
          color: #777;
          overflow: hidden;
          margin-right: 10px;
        }
        .shine-text::before {
          content: attr(data-text);
          position: absolute;
          left: 0; top: 0;
          width: 100%; height: 100%;
          color: transparent;
          background: linear-gradient(
            120deg,
            transparent 0%,
            rgba(255,255,255,0.8) 50%,
            transparent 100%
          ) no-repeat;
          background-size: 200% 100%;
          -webkit-background-clip: text;
                  background-clip: text;
          animation: shine 1.4s linear infinite;
        }
        @keyframes shine {
          0%   { background-position:  100% 0; }
          100% { background-position: -100% 0; }
        }
        .timer-count {
          color: #fff;
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
          margin-top: 10px;
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 4px;
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
        }
        .api-settings.active {
          display: block;
        }
        .settings-notification {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #4CAF50; /* 绿色背景 */
          color: white;
          padding: 12px 24px;
          border-radius: 4px;
          border: 1px solid #43A047;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          z-index: 1000;
          transition: all 0.5s ease;
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          opacity: 0; /* 初始时透明 */
          min-width: 200px;
        }
        .settings-title {
          font-size: 1.2rem;
          margin-bottom: 0.5rem;
          color: var(--vscode-foreground);
        }
        .settings-description {
          margin-bottom: 1rem;
          opacity: 0.8;
          font-size: 0.9rem;
        }
        .api-key-group {
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          padding: 12px;
          border-radius: 4px;
          border-left: 3px solid var(--vscode-focusBorder);
        }
        .key-hint {
          font-size: 0.8rem;
          opacity: 0.7;
          margin-top: 4px;
        }
        .save-button {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .save-button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="tabs">
          <button class="tab active" data-panel="chat">聊天</button>
          <button class="tab" data-panel="settings">设置</button>
        </div>
        <div class="content">
          <div class="panel active" id="chat-panel">
            <div class="chat-container">
              <div class="status-container">
                <span class="status-text">运行中</span>
                <span class="status-indicator"></span>
              </div>
           
              <div class="chat-messages" id="chat-messages">
                <div class="message bot-message">你好，我是Codex-UI，我可以帮您使用AI完成编程任务。请在下方输入您的指令。</div>
              </div>
                <div class="cooking-timer">
                    <span class="shine-text" data-text="cooking...">cooking...</span>
                    <span class="timer-count">0:00</span>
                  </div>
              <div class="input-container">
                
                <input type="text" id="message-input" placeholder="输入您的指令...">
                <button id="send-button">发送</button>
              </div>
            </div>
          </div>
          <div class="panel" id="settings-panel">
            <div class="settings-container">
              <h2 class="settings-title">配置您的 OpenAI Codex 设置</h2>
              <p class="settings-description">请输入您的 OpenAI API Key 以使用 Codex CLI 功能</p>
              
              <div class="setting-group api-key-group">
                <label for="openai-api-key">OpenAI API Key</label>
                <input type="password" id="openai-api-key" value="\${openaiApiKey}" placeholder="输入您的 OpenAI API key">
                <div class="key-hint">请在此处输入您的 OpenAI API Key</div>
              </div>

              <div class="setting-group">
                <label for="openai-model">OpenAI 模型</label>
                <select id="openai-model">
                  <option value="gpt-4" \${openaiModel === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                  <option value="gpt-4-turbo" \${openaiModel === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo" \${openaiModel === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
                </select>
              </div>

              <div class="setting-group">
                <label for="approval-mode">命令执行模式</label>
                <select id="approval-mode">
                  <option value="auto" \${approvalMode === 'auto' ? 'selected' : ''}>自动执行</option>
                  <option value="manual" \${approvalMode === 'manual' ? 'selected' : ''}>手动确认</option>
                  <option value="suggest" \${approvalMode === 'suggest' ? 'selected' : ''}>仅建议</option>
                </select>
                <div class="key-hint">自动执行：直接运行生成的命令；手动确认：在执行前确认；仅建议：只显示命令不执行</div>
              </div>

              <button id="save-button" class="save-button">保存设置</button>
            </div>
          </div>
        </div>
      </div>
      <script>
        (function() {
          const vscode = acquireVsCodeApi();
          
          let timerInterval;
          let startTime;
          let timerElement;
          
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
          const statusContainer = document.querySelector('.status-container');
          const cookingTimer = document.querySelector('.cooking-timer');
          let isExecuting = false;

          function addMessage(text, isUser) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user-message' : 'bot-message'}\`;
            messageDiv.textContent = text;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }

          function sendMessage() {
            const text = messageInput.value;
            if (text ) {
            
              addMessage(text, true);
              cookingTimer.classList.add('running');
              startExecutionTimer();
              setTimeout(() => {
                  vscode.postMessage({
                    type: 'sendMessage',
                    value: text
                  });
              },10000)
          
              messageInput.value = '';
            }
          }

          function cancelExecution() {
            vscode.postMessage({
              type: 'cancelExecution'
            });
          }

          sendButton.addEventListener('click', () => {
          
              sendMessage();
          });
          
          messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isExecuting) {
              sendMessage();
            }
          });

          // 设置功能
          const saveButton = document.getElementById('save-button');
          
          function startExecutionTimer() {
            timerElement = document.querySelector('.timer-count');
            startTime = Date.now();
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
          }
          
          function stopExecutionTimer() {
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
          }
          
          function updateTimer() {
            if (!timerElement) return;
            
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            
            timerElement.textContent = minutes + ':' + seconds.toString().padStart(2, '0');
          }

          saveButton.addEventListener('click', () => {
            const openaiApiKey = document.getElementById('openai-api-key').value;
            const openaiModel = document.getElementById('openai-model').value;
            const approvalMode = document.getElementById('approval-mode').value;

            // 显示保存中状态
            saveButton.disabled = true;
            saveButton.textContent = '保存中...';

            // 发送设置到扩展
            vscode.postMessage({
              type: 'saveSettings',
              key: 'openaiApiKey',
              value: openaiApiKey
            });
            
            vscode.postMessage({
              type: 'saveSettings',
              key: 'openaiModel',
              value: openaiModel
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
              case 'executionStarted':
                isExecuting = true;
                statusContainer.classList.add('running');
                sendButton.textContent = '取消';
                sendButton.classList.add('cancel');
                messageInput.disabled = true;
                startExecutionTimer();
                break;
              case 'executionEnded':
                isExecuting = false;
                statusContainer.classList.remove('running');
                sendButton.textContent = '发送';
                sendButton.classList.remove('cancel');
                messageInput.disabled = false;
                stopExecutionTimer();
                break;
              case 'addResponse':
                addMessage(message.value, false);
                break;
              case 'settingsSaved':
                // 恢复保存按钮状态
                const saveButton = document.getElementById('save-button');
                if (saveButton) {
                  saveButton.disabled = false;
                  saveButton.textContent = '保存配置';
                }
                
                // 显示保存成功的提示
                const notification = document.createElement('div');
                notification.className = 'settings-notification';
                notification.innerHTML = '✓ 配置已成功保存';
                document.body.appendChild(notification);
                
                // 淡入效果
                setTimeout(() => {
                  notification.style.opacity = '1';
                }, 10);
                
                // 3秒后淡出并移除
                setTimeout(() => {
                  notification.style.opacity = '0';
                  setTimeout(() => {
                    if (notification.parentNode) {
                      document.body.removeChild(notification);
                    }
                  }, 500);
                }, 3000);
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
