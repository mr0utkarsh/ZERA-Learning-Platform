import OpenAI from "openai";
import fs from "fs";
import path from "path";
import readline from "readline";
import { exec } from "child_process";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const ROOT = process.cwd();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SYSTEM = `
You are the ZERA Learning Platform coding agent.

You work inside the current ZERA project folder.

Rules:
- Inspect existing code before changing anything.
- Never expose secrets or API keys.
- Never modify .env files unless explicitly requested.
- Keep changes focused.
- Preserve existing functionality.
- Use the available tools when necessary.
- If the user asks for an audit, inspect code and report findings.
- If the user asks for changes, make the actual changes and test them when possible.
`;

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function safePath(filePath) {
  const full = path.resolve(ROOT, filePath);

  if (
    full !== ROOT &&
    !full.startsWith(ROOT + path.sep)
  ) {
    throw new Error("Access outside ZERA project is not allowed.");
  }

  return full;
}

function listFiles(dir = ROOT) {
  const result = [];

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      item.name === "node_modules" ||
      item.name === ".git" ||
      item.name === ".qwen"
    ) {
      continue;
    }

    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      result.push(...listFiles(full));
    } else {
      result.push(path.relative(ROOT, full));
    }
  }

  return result;
}

function readFile(filePath) {
  const full = safePath(filePath);

  const stat = fs.statSync(full);

  if (stat.size > 20000) {
    throw new Error(
      `File is too large (${stat.size} bytes). Read a smaller relevant file instead.`
    );
  }

  return fs.readFileSync(full, "utf8");
}

function writeFile(filePath, content) {
  const full = safePath(filePath);

  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");

  return `Successfully wrote ${filePath}`;
}

function runCommand(command) {
  return new Promise(resolve => {
    exec(
      command,
      {
        cwd: ROOT,
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        resolve(
          JSON.stringify({
            success: !error,
            stdout: stdout.slice(0, 12000),
            stderr: stderr.slice(0, 12000),
          })
        );
      }
    );
  });
}

const tools = [
  {
    type: "function",
    function: {
      name: "list_files",
      description:
        "List project files. Use this to discover the project structure.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },

  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read a relevant project file. Only read files necessary for the current task.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
          },
        },
        required: ["path"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Create or replace a project file when the user has requested a code change.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
          },
          content: {
            type: "string",
          },
        },
        required: ["path", "content"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Run a PowerShell command in the ZERA project directory.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
          },
        },
        required: ["command"],
      },
    },
  },
];

async function executeTool(toolCall) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments || "{}");

  try {
    if (name === "list_files") {
      return JSON.stringify(listFiles(), null, 2);
    }

    if (name === "read_file") {
      return readFile(args.path);
    }

    if (name === "write_file") {
      return writeFile(args.path, args.content);
    }

    if (name === "run_command") {
      return await runCommand(args.command);
    }

    return "Unknown tool.";
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

async function runAgent(userPrompt) {
  /*
   * IMPORTANT:
   * Every user request starts with a fresh conversation.
   *
   * This prevents old file contents and old tool results
   * from accumulating and exceeding Groq's 8K TPM limit.
   */
  const messages = [
    {
      role: "system",
      content: SYSTEM,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  let rounds = 0;

  while (rounds < 6) {
    rounds++;

    const response =
      await client.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: 1200,
      });

    const message = response.choices[0].message;

    if (!message.tool_calls?.length) {
      return message.content || "(No response)";
    }

    /*
     * Keep only the current tool interaction.
     * Do NOT keep accumulating the entire previous
     * project inspection history.
     */

    const toolResults = [];

    for (const toolCall of message.tool_calls) {
      console.log(`\n🔧 ${toolCall.function.name}`);

      const result = await executeTool(toolCall);

      /*
       * Limit tool output before sending it back to Groq.
       */
      const trimmed =
        result.length > 6000
          ? result.slice(0, 6000) +
            "\n...[tool output truncated]"
          : result;

      toolResults.push({
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: trimmed,
      });
    }

    /*
     * Replace conversation with a compact summary of
     * the current interaction instead of keeping huge
     * previous file contents.
     */

    const toolSummary = toolResults
      .map(
        x =>
          `Tool ${x.name} result:\n${x.content}`
      )
      .join("\n\n");

    messages.length = 0;

    messages.push({
      role: "system",
      content: SYSTEM,
    });

    messages.push({
      role: "user",
      content:
        userPrompt +
        "\n\nLatest inspection results:\n" +
        toolSummary +
        "\n\nContinue the task. Do not repeat already inspected information.",
    });
  }

  return "The task requires more inspection steps than the current request budget allows. Please continue with a smaller focused request.";
}

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY is not set.");
    console.error(
      'Run: $env:GROQ_API_KEY="YOUR_NEW_KEY"'
    );
    process.exit(1);
  }

  console.log("\n🤖 ZERA Groq Coding Agent");
  console.log("📁 " + ROOT);
  console.log("🧠 openai/gpt-oss-20b");
  console.log("💡 Fresh context is used for every prompt.");
  console.log("Type 'exit' to quit.\n");

  while (true) {
    const prompt = await ask("ZERA > ");

    if (!prompt.trim()) continue;

    if (prompt.trim().toLowerCase() === "exit") {
      break;
    }

    try {
      const result = await runAgent(prompt);

      console.log("\n" + result);
    } catch (error) {
      console.error("\n❌ API Error:", error.message);
    }
  }

  rl.close();
}

main();