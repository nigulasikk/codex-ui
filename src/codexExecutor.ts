import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
    const apiKey = config.get<string>('openaiApiKey', '');
    const model = config.get<string>('openaiModel', 'gpt-4');
    const approvalMode = config.get<string>('approvalMode', 'manual');
    
    if (!apiKey) {
      throw new Error('请先在设置中配置您的OpenAI API Key');
    }
    
    // 设置环境变量
    process.env.OPENAI_API_KEY = apiKey;
    
    // 构建命令行参数
    let codexArgs = `--model ${model}`;
    
    // 根据执行模式设置参数
    if (approvalMode === 'auto') {
      codexArgs += ' --auto-approve';
    } else if (approvalMode === 'suggest') {
      codexArgs += ' --suggest-only';
    }
    
    // 执行Codex命令
    try {
      const { stdout, stderr } = await exec(`codex ${codexArgs} "${prompt.replace(/"/g, '\\"')}"`);
      
      if (stderr && !stderr.includes('npm WARN')) {
        throw new Error(stderr);
      }
      
      return stdout || '命令已执行，但没有输出结果';
    } catch (error: any) {
      if (error.stderr && error.stderr.includes('OPENAI_API_KEY')) {
        await configureCodexCLI();
        return 'API Key已更新，请重新尝试您的命令';
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`执行Codex命令失败: ${error.message}`);
      return `错误: ${error.message}`;
    }
    vscode.window.showErrorMessage('执行命令时发生未知错误');
    return '执行命令时发生未知错误';
  }
}