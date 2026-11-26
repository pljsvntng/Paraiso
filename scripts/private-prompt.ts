import { createInterface } from "node:readline";
import { Writable } from "node:stream";

/** Read a password locally without echoing it or putting it in shell history. */
export async function privatePrompt(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      "Run password recovery in an interactive VS Code terminal.",
    );
  const output = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const terminal = createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  process.stdout.write(label);
  try {
    return await new Promise<string>((resolve, reject) => {
      const cancel = () =>
        reject(new Error("Password reset cancelled. No password was changed."));
      terminal.once("SIGINT", cancel);
      terminal.once("close", cancel);
      terminal.question("", (answer) => {
        terminal.removeListener("SIGINT", cancel);
        terminal.removeListener("close", cancel);
        resolve(answer);
      });
    });
  } finally {
    terminal.close();
    output.destroy();
    process.stdout.write("\n");
  }
}
