import { spawn } from "node:child_process";

export type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export async function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}