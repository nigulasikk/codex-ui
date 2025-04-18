import * as vscode from 'vscode';
import { executeCodexCommand } from './codexExecutor';
import { getNonce } from './utils';

export class CodexUIPanel {
  public static currentPanel: CodexUIPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionContext: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];

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
            if (prompt.includes('@file')) {
              const editor = vscode.window.activeTextEditor;
              if (editor) {
                const fileContent = editor.document.getText();
                prompt = prompt.replace('@file', fileContent);
              } else {
                vscode.window.showErrorMessage('No active editor found for @file reference');
                return;
              }
            }
            
            const result = await executeCodexCommand(prompt);
            
            this._panel.webview.postMessage({ command: 'result', text: result });
            break;
          
          case 'saveSettings':
            const config = vscode.workspace.getConfiguration('codex-ui');
            await config.update('apiProvider', message.apiProvider, vscode.ConfigurationTarget.Global);
            
            switch (message.apiProvider) {
              case 'openrouter':
                await config.update('openrouterApiKey', message.apiKey, vscode.ConfigurationTarget.Global);
                break;
              case 'qwen':
                await config.update('qwenApiKey', message.apiKey, vscode.ConfigurationTarget.Global);
                break;
              case 'ollama':
                await config.update('ollamaEndpoint', message.endpoint, vscode.ConfigurationTarget.Global);
                await config.update('ollamaModel', message.model, vscode.ConfigurationTarget.Global);
                break;
            }
            
            await config.update('approvalMode', message.approvalMode, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage('Codex UI settings saved');
            break;
        }
      },
      null,
      this._disposables
    );
  }

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

  private _update() {
    this._panel.title = 'Codex UI';
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview() {
    const config = vscode.workspace.getConfiguration('codex-ui');
    const apiProvider = config.get<string>('apiProvider', 'openrouter');
    const openrouterApiKey = config.get<string>('openrouterApiKey', '');
    const qwenApiKey = config.get<string>('qwenApiKey', '');
    const ollamaEndpoint = config.get<string>('ollamaEndpoint', 'http://localhost:11434');
    const ollamaModel = config.get<string>('ollamaModel', 'codellama');
    const approvalMode = config.get<string>('approvalMode', 'manual');

    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
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
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .tab {
          padding: 8px 16px;
          cursor: pointer;
          border: 1px solid transparent;
          border-bottom: none;
        }
        .tab.active {
          background-color: var(--vscode-tab-activeBackground);
          border-color: var(--vscode-panel-border);
          border-bottom: 1px solid var(--vscode-tab-activeBackground);
          margin-bottom: -1px;
        }
        .tab-content {
          display: none;
          padding: 20px 0;
        }
        .tab-content.active {
          display: block;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="tabs">
          <div class="tab active" data-tab="chat">Chat</div>
          <div class="tab" data-tab="settings">Settings</div>
        </div>
        
        <div class="tab-content active" id="chat-tab">
          <div class="input-group">
            <label for="prompt">Enter your prompt (use @file to reference the current file):</label>
            <textarea id="prompt" placeholder="Ask Codex to help you with coding tasks..."></textarea>
          </div>
          <button id="execute">Execute</button>
          <div id="result" class="result hidden"></div>
        </div>
        
        <div class="tab-content" id="settings-tab">
          <div class="input-group">
            <label for="api-provider">API Provider:</label>
            <select id="api-provider">
              <option value="openrouter" ${apiProvider === "openrouter" ? 'selected' : ''}>OpenRouter</option>
              <option value="qwen" ${apiProvider === "qwen" ? 'selected' : ''}>Tongyi Qianwen (通义千问)</option>
              <option value="ollama" ${apiProvider === "ollama" ? 'selected' : ''}>Ollama</option>
            </select>
          </div>
          
          <div id="openrouter-settings" class="${apiProvider === 'openrouter' ? '' : 'hidden'}">
            <div class="input-group">
              <label for="openrouter-api-key">OpenRouter API Key:</label>
              <input type="password" id="openrouter-api-key" value="${openrouterApiKey}" />
            </div>
          </div>
          
          <div id="qwen-settings" class="${apiProvider === "qwen" ? '' : 'hidden'}">
            <div class="input-group">
              <label for="qwen-api-key">Tongyi Qianwen API Key:</label>
              <input type="password" id="qwen-api-key" value="${qwenApiKey}" />
            </div>
          </div>
          
          <div id="ollama-settings" class="${apiProvider === "ollama" ? '' : 'hidden'}">
            <div class="input-group">
              <label for="ollama-endpoint">Ollama Endpoint:</label>
              <input type="text" id="ollama-endpoint" value="${ollamaEndpoint}" />
            </div>
            <div class="input-group">
              <label for="ollama-model">Ollama Model:</label>
              <input type="text" id="ollama-model" value="${ollamaModel}" />
            </div>
          </div>
          
          <div class="input-group">
            <label for="approval-mode">Approval Mode:</label>
            <select id="approval-mode">
              <option value="auto" ${approvalMode === 'auto' ? 'selected' : ''}>Automatic</option>
              <option value="manual" ${approvalMode === 'manual' ? 'selected' : ''}>Manual Confirmation</option>
              <option value="suggest" ${approvalMode === 'suggest' ? 'selected' : ''}>Suggestion Only</option>
            </select>
          </div>
          
          <button id="save-settings">Save Settings</button>
        </div>
      </div>
      
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        const apiProviderSelect = document.getElementById('api-provider');
        const openrouterSettings = document.getElementById('openrouter-settings');
        const qwenSettings = document.getElementById('qwen-settings');
        const ollamaSettings = document.getElementById('ollama-settings');
        const executeButton = document.getElementById('execute');
        const promptTextarea = document.getElementById('prompt');
        const resultDiv = document.getElementById('result');
        const saveSettingsButton = document.getElementById('save-settings');
        
        tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId + '-tab').classList.add('active');
          });
        });
        
        apiProviderSelect.addEventListener('change', () => {
          const provider = apiProviderSelect.value;
          
          openrouterSettings.classList.add('hidden');
          qwenSettings.classList.add('hidden');
          ollamaSettings.classList.add('hidden');
          
          if (provider === 'openrouter') {
            openrouterSettings.classList.remove('hidden');
          } else if (provider === 'qwen') {
            qwenSettings.classList.remove('hidden');
          } else if (provider === 'ollama') {
            ollamaSettings.classList.remove('hidden');
          }
        });
        
        executeButton.addEventListener('click', () => {
          const prompt = promptTextarea.value;
          if (!prompt) {
            return;
          }
          
          resultDiv.textContent = 'Processing...';
          resultDiv.classList.remove('hidden');
          
          vscode.postMessage({
            command: 'executeCodex',
            text: prompt
          });
        });
        
        saveSettingsButton.addEventListener('click', () => {
          const apiProvider = apiProviderSelect.value;
          let apiKey = '';
          let endpoint = '';
          let model = '';
          
          if (apiProvider === 'openrouter') {
            apiKey = document.getElementById('openrouter-api-key').value;
          } else if (apiProvider === 'qwen') {
            apiKey = document.getElementById('qwen-api-key').value;
          } else if (apiProvider === 'ollama') {
            endpoint = document.getElementById('ollama-endpoint').value;
            model = document.getElementById('ollama-model').value;
          }
          
          const approvalMode = document.getElementById('approval-mode').value;
          
          vscode.postMessage({
            command: 'saveSettings',
            apiProvider,
            apiKey,
            endpoint,
            model,
            approvalMode
          });
        });
        
        window.addEventListener('message', event => {
          const message = event.data;
          
          switch (message.command) {
            case 'result':
              resultDiv.textContent = message.text;
              resultDiv.classList.remove('hidden');
              break;
          }
        });
      </script>
    </body>
    </html>`;
  }
}
