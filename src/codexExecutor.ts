import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const exec = util.promisify(cp.exec);

/**
 * 配置 Codex CLI
 * 设置 OpenAI API Key 并创建配置文件
 */
async function configureCodexCLI(): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('codex-ui');
    const apiKey = config.get<string>('openaiApiKey', '');
    
    if (!apiKey) {
      vscode.window.showWarningMessage('OpenAI API Key 未配置，请在设置中配置您的API Key');
      return;
    }
    
    process.env.OPENAI_API_KEY = apiKey;
    
    const homeDir = os.homedir();
    const codexrcPath = path.join(homeDir, '.codexrc');
    
    const codexConfig = {
      api_key: apiKey
    };
    
    await fs.promises.writeFile(codexrcPath, JSON.stringify(codexConfig, null, 2));
    
    vscode.window.showInformationMessage('Codex CLI 配置已更新');
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`配置 Codex CLI 失败: ${error.message}`);
    }
  }
}

/**
 * 执行 Codex 命令
 * @param prompt 用户输入的提示
 * @returns 执行结果
 */
export async function executeCodexCommand(prompt: string): Promise<string> {
  try {
    const config = vscode.workspace.getConfiguration('codex-ui');
    const apiKey = config.get<string>('openaiApiKey', '');
    const model = config.get<string>('openaiModel', 'gpt-4');
    
    if (!apiKey) {
      throw new Error('请先在设置中配置您的 OpenAI API Key');
    }
    
    // 设置环境变量
    process.env.OPENAI_API_KEY = apiKey;
    
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    
    try {
      vscode.window.setStatusBarMessage('正在执行 Codex 命令...', 3000);
      
      const codexPath = path.join(__dirname, '..', 'node_modules', '.bin', 'codex');
      const { stdout, stderr } = await exec(`"${codexPath}" --model ${model} "${escapedPrompt}"`);
      
      if (stderr && !stderr.includes('npm WARN')) {
        throw new Error(stderr);
      }
      
      return stdout || '命令已执行，但没有输出结果';
    } catch (error: any) {
      if (error.stderr && error.stderr.includes('OPENAI_API_KEY')) {
        await configureCodexCLI();
        return 'API Key 已更新，请重新尝试您的命令';
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`执行 Codex 命令失败: ${error.message}`);
      return `错误: ${error.message}`;
    }
    vscode.window.showErrorMessage('执行命令时发生未知错误');
    return '执行命令时发生未知错误';
  }
}
