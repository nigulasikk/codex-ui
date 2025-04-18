import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import axios from 'axios';

const exec = util.promisify(cp.exec);

export async function executeCodexCommand(prompt: string): Promise<string> {
  try {
    const config = vscode.workspace.getConfiguration('codex-ui');
    const apiProvider = config.get<string>('apiProvider', 'openrouter');
    const approvalMode = config.get<string>('approvalMode', 'manual');
    
    let result = '';
    
    switch (apiProvider) {
      case 'openrouter':
        result = await executeWithOpenRouter(prompt, approvalMode);
        break;
      case 'qwen':
        result = await executeWithQwen(prompt, approvalMode);
        break;
      case 'ollama':
        result = await executeWithOllama(prompt, approvalMode);
        break;
      default:
        throw new Error(`Unsupported API provider: ${apiProvider}`);
    }
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Error executing Codex command: ${error.message}`);
      return `Error: ${error.message}`;
    }
    vscode.window.showErrorMessage('Unknown error executing Codex command');
    return 'Unknown error occurred';
  }
}

async function executeWithOpenRouter(prompt: string, approvalMode: string): Promise<string> {
  const config = vscode.workspace.getConfiguration('codex-ui');
  const apiKey = config.get('openrouterApiKey', '');
  
  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured');
  }
  
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-opus:beta',
        messages: [
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const result = response.data.choices[0].message.content;
      
      if (approvalMode === 'auto') {
        return result;
      } else if (approvalMode === 'manual') {
        const applyChanges = await vscode.window.showInformationMessage(
          'Apply the suggested changes?',
          { modal: true },
          'Yes', 'No'
        );
        
        if (applyChanges === 'Yes') {
          return `Changes applied:\n${result}`;
        } else {
          return `Changes not applied:\n${result}`;
        }
      } else {
        return result;
      }
    } else {
      throw new Error('Invalid response from OpenRouter API');
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`OpenRouter API error: ${error.response.status} ${error.response.statusText}`);
    }
    throw error;
  }
}

async function executeWithQwen(prompt: string, approvalMode: string): Promise<string> {
  const config = vscode.workspace.getConfiguration('codex-ui');
  const apiKey = config.get('qwenApiKey', '');
  
  if (!apiKey) {
    throw new Error('Tongyi Qianwen API key is not configured');
  }
  
  try {
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'qwen-max',
        input: {
          prompt: prompt
        },
        parameters: {}
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.output && response.data.output.text) {
      const result = response.data.output.text;
      
      if (approvalMode === 'auto') {
        return result;
      } else if (approvalMode === 'manual') {
        const applyChanges = await vscode.window.showInformationMessage(
          'Apply the suggested changes?',
          { modal: true },
          'Yes', 'No'
        );
        
        if (applyChanges === 'Yes') {
          return `Changes applied:\n${result}`;
        } else {
          return `Changes not applied:\n${result}`;
        }
      } else {
        return result;
      }
    } else {
      throw new Error('Invalid response from Tongyi Qianwen API');
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Tongyi Qianwen API error: ${error.response.status} ${error.response.statusText}`);
    }
    throw error;
  }
}

async function executeWithOllama(prompt: string, approvalMode: string): Promise<string> {
  const config = vscode.workspace.getConfiguration('codex-ui');
  const endpoint = config.get('ollamaEndpoint', 'http://localhost:11434');
  const model = config.get('ollamaModel', 'codellama');
  
  try {
    const response = await axios.post(
      `${endpoint}/api/generate`,
      {
        model: model,
        prompt: prompt,
        stream: false
      }
    );
    
    if (response.data && response.data.response) {
      const result = response.data.response;
      
      if (approvalMode === 'auto') {
        return result;
      } else if (approvalMode === 'manual') {
        const applyChanges = await vscode.window.showInformationMessage(
          'Apply the suggested changes?',
          { modal: true },
          'Yes', 'No'
        );
        
        if (applyChanges === 'Yes') {
          return `Changes applied:\n${result}`;
        } else {
          return `Changes not applied:\n${result}`;
        }
      } else {
        return result;
      }
    } else {
      throw new Error('Invalid response from Ollama API');
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Ollama API error: ${error.response.status} ${error.response.statusText}`);
    }
    throw error;
  }
}
