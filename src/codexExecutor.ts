import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import axios from 'axios';

const exec = util.promisify(cp.exec);

// 配置Codex CLI
async function configureCodexCLI(): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('codex-ui');
    const apiKey = config.get<string>('openaiApiKey', '');
    
    if (!apiKey) {
      vscode.window.showWarningMessage('OpenAI API Key 未配置，请在设置中配置您的API Key');
      return;
    }
    
    // 设置环境变量
    process.env.OPENAI_API_KEY = apiKey;
    
    // 创建或更新.codexrc文件
    const homeDir = os.homedir();
    const codexrcPath = path.join(homeDir, '.codexrc');
    
    const codexConfig = {
      api_key: apiKey,
      // 可以添加其他配置项
    };
    
    await fs.promises.writeFile(codexrcPath, JSON.stringify(codexConfig, null, 2));
    
    vscode.window.showInformationMessage('Codex CLI 配置已更新');
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`配置Codex CLI失败: ${error.message}`);
    }
  }
}

export async function executeCodexCommand(prompt: string): Promise<string> {
  try {
    const config = vscode.workspace.getConfiguration('codex-ui');
    const apiProvider = config.get<string>('apiProvider', 'openrouter');
    const approvalMode = config.get<string>('approvalMode', 'manual');
    
    switch (apiProvider) {
      case 'openrouter':
        return await executeWithOpenRouter(prompt, approvalMode);
      case 'qwen':
        return await executeWithQwen(prompt, approvalMode);
      case 'ollama':
        return await executeWithOllama(prompt, approvalMode);
      default:
        throw new Error(`不支持的API提供商: ${apiProvider}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`执行命令失败: ${error.message}`);
      return `错误: ${error.message}`;
    }
    vscode.window.showErrorMessage('执行命令时发生未知错误');
    return '执行命令时发生未知错误';
  }
}

async function executeWithOpenRouter(prompt: string, approvalMode: string): Promise<string> {
  const config = vscode.workspace.getConfiguration('codex-ui');
  const apiKey = config.get<string>('openrouterApiKey', '');
  
  if (!apiKey) {
    throw new Error('请先在设置中配置您的OpenRouter API Key');
  }
  
  try {
    const requestBody = {
      model: "anthropic/claude-3-opus:beta", // 默认使用Claude 3 Opus，可以根据需要更改
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000
    };
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/nigulasikk/codex-ui', // 替换为您的应用URL
        'X-Title': 'Codex UI'
      }
    });
    
    const responseContent = response.data.choices[0].message.content;
    
    if (approvalMode === 'auto') {
      return await executeCodeFromResponse(responseContent);
    } else if (approvalMode === 'manual') {
      return `${responseContent}\n\n[需要手动确认执行]`;
    } else {
      return responseContent;
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`OpenRouter API错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error instanceof Error) {
      throw new Error(`OpenRouter请求失败: ${error.message}`);
    } else {
      throw new Error('OpenRouter请求失败，未知错误');
    }
  }
}

async function executeWithQwen(prompt: string, approvalMode: string): Promise<string> {
  const config = vscode.workspace.getConfiguration('codex-ui');
  const apiKey = config.get<string>('qwenApiKey', '');
  
  if (!apiKey) {
    throw new Error('请先在设置中配置您的通义千问 API Key');
  }
  
  try {
    const requestBody = {
      model: "qwen-max",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000
    };
    
    const response = await axios.post('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const responseContent = response.data.output.text;
    
    if (approvalMode === 'auto') {
      return await executeCodeFromResponse(responseContent);
    } else if (approvalMode === 'manual') {
      return `${responseContent}\n\n[需要手动确认执行]`;
    } else {
      return responseContent;
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`通义千问 API错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error instanceof Error) {
      throw new Error(`通义千问请求失败: ${error.message}`);
    } else {
      throw new Error('通义千问请求失败，未知错误');
    }
  }
}

async function executeWithOllama(prompt: string, approvalMode: string): Promise<string> {
  const config = vscode.workspace.getConfiguration('codex-ui');
  const endpoint = config.get<string>('ollamaEndpoint', 'http://localhost:11434');
  const model = config.get<string>('ollamaModel', 'codellama');
  
  try {
    const requestBody = {
      model: model,
      prompt: prompt,
      stream: false
    };
    
    const response = await axios.post(`${endpoint}/api/generate`, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const responseContent = response.data.response;
    
    if (approvalMode === 'auto') {
      return await executeCodeFromResponse(responseContent);
    } else if (approvalMode === 'manual') {
      return `${responseContent}\n\n[需要手动确认执行]`;
    } else {
      return responseContent;
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Ollama API错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error instanceof Error) {
      throw new Error(`Ollama请求失败: ${error.message}`);
    } else {
      throw new Error('Ollama请求失败，未知错误');
    }
  }
}

async function executeCodeFromResponse(response: string): Promise<string> {
  try {
    const codeBlockRegex = /```(?:bash|sh)?\s*([\s\S]*?)```/g;
    const matches = [...response.matchAll(codeBlockRegex)];
    
    if (matches.length === 0) {
      return `未找到可执行的代码块。响应内容:\n${response}`;
    }
    
    let result = '';
    
    for (const match of matches) {
      const code = match[1].trim();
      if (code) {
        const { stdout, stderr } = await exec(code);
        result += `执行命令: ${code}\n`;
        result += stdout ? `输出:\n${stdout}\n` : '';
        result += stderr ? `错误:\n${stderr}\n` : '';
        result += '\n';
      }
    }
    
    return result || '命令已执行，但没有输出结果';
  } catch (error: any) {
    if (error.stderr) {
      return `执行命令失败:\n${error.stderr}`;
    } else if (error instanceof Error) {
      return `执行命令失败: ${error.message}`;
    }
    return '执行命令失败，未知错误';
  }
}
