import * as fs from 'fs/promises';
import * as path from 'path';

export interface ToolExecutionResult {
  tool_call_id: string;
  name: string;
  content: string;
  is_error?: boolean;
}

export class ToolOrchestrator {
  private allowedDirectories: string[];

  constructor(allowedDirectories: string[] = [process.cwd(), '/workspace']) {
    this.allowedDirectories = allowedDirectories.map(dir => path.resolve(dir));
  }

  private isPathAllowed(targetPath: string): boolean {
    const resolvedPath = path.resolve(targetPath);
    return this.allowedDirectories.some(dir => resolvedPath.startsWith(dir));
  }

  async executeTool(toolCallId: string, name: string, args: Record<string, any>): Promise<ToolExecutionResult> {
    try {
      let content = '';

      switch (name) {
        case 'file_read':
          content = await this.handleFileRead(args.path);
          break;
        case 'file_list':
          content = await this.handleFileList(args.path || '.');
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        tool_call_id: toolCallId,
        name,
        content
      };
    } catch (error) {
      return {
        tool_call_id: toolCallId,
        name,
        content: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true
      };
    }
  }

  private async handleFileRead(filePath: string): Promise<string> {
    if (!filePath) throw new Error('path argument is required');
    
    const resolvedPath = path.resolve(filePath);
    if (!this.isPathAllowed(resolvedPath)) {
      throw new Error(`Access denied to path: ${filePath}`);
    }

    try {
      const content = await fs.readFile(resolvedPath, 'utf-8');
      return content;
    } catch (err: any) {
      throw new Error(`Failed to read file ${filePath}: ${err.message}`);
    }
  }

  private async handleFileList(dirPath: string): Promise<string> {
    const resolvedPath = path.resolve(dirPath);
    if (!this.isPathAllowed(resolvedPath)) {
      throw new Error(`Access denied to path: ${dirPath}`);
    }

    try {
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const formatted = entries.map(entry => {
        const type = entry.isDirectory() ? 'DIR ' : 'FILE';
        return `[${type}] ${entry.name}`;
      });
      return formatted.join('\n') || 'Empty directory';
    } catch (err: any) {
      throw new Error(`Failed to list directory ${dirPath}: ${err.message}`);
    }
  }
}

export const toolOrchestrator = new ToolOrchestrator();
