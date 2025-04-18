import * as vscode from 'vscode';
import { CodexUIPanel } from './codexUIPanel';
import { executeCodexCommand } from './codexExecutor';

export function activate(context: vscode.ExtensionContext) {
  console.log('Codex UI extension is now active!');

  const openCodexUICommand = vscode.commands.registerCommand('codex-ui.openCodexUI', () => {
    CodexUIPanel.createOrShow(context);
  });

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

  context.subscriptions.push(openCodexUICommand);
  context.subscriptions.push(executeWithFileCommand);
}

export function deactivate() {}
