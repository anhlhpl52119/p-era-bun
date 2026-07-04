#!/usr/bin/env bun
/**
 * Create a reproducible, backdated Git history for the initial P-era project.
 *
 * Default mode only prints the plan. Pass --apply to create the commits.
 * The first planned commit contains the current working tree; subsequent
 * commits are intentionally empty checkpoints with dates and messages from
 * the generated plan.
 */

type CommitKind = "feat" | "vendor" | "chore" | "fix" | "refactor";

type PlannedCommit = {
  date: Date;
  kind: CommitKind;
  message: string;
};

const KINDS: CommitKind[] = ["feat", "vendor", "chore", "fix", "refactor"];
const DEFAULT_START = "2026-07-04";
const MIN_COMMITS = 1;
const MAX_COMMITS = 12;

const messages: Record<CommitKind, string[]> = {
  feat: [
    "add the Electrobun application shell",
    "wire the BrowserWindow to the Vue main view",
    "add a typed event bus for agent updates",
    "introduce the workflow event contract",
    "add the agent runner for model requests",
    "stream model text deltas to the renderer",
    "add cancellation support for active agent runs",
    "expose agent streams through the Electroview bridge",
    "add prompt submission state to the main store",
    "add a settings flow for the Vercel AI key",
    "persist user settings in the Bun process",
    "add gateway-backed model selection",
    "render streaming responses in the main view",
    "add loading and error states to the prompt form",
    "add workflow identifiers to agent events",
    "add HMR support for the development main view",
    "add environment-specific desktop build commands",
    "add update channel detection at application startup",
  ],
  vendor: [
    "add the Electrobun runtime dependency",
    "add Vue and Vite packages for the main view",
    "add the Vercel AI SDK for model streaming",
    "add Zod for runtime data validation",
    "add Pinia for renderer state management",
    "add VueUse composables for renderer utilities",
    "add Tailwind CSS tooling for view styling",
    "add TypeScript type definitions for Bun",
    "add vue-tsc for Vue type checking",
    "add ESLint and formatting plugins",
    "refresh the locked frontend dependency graph",
    "align Vite and Vue plugin versions",
  ],
  chore: [
    "initialize the P-era Electrobun workspace",
    "configure Bun, app, and build TypeScript projects",
    "add project-wide formatting rules",
    "add ignore rules for generated desktop artifacts",
    "configure the Vite entry point for the main view",
    "add separate development, canary, and stable build scripts",
    "document the BrowserView and Electroview process boundary",
    "record the durable execution transport decision",
    "add a local settings example file",
    "exclude local API credentials from version control",
    "add workspace editor settings",
    "organize source files by Bun, renderer, and shared layers",
    "add a single command for all type checks",
    "prepare the desktop packaging configuration",
    "refresh development documentation",
  ],
  fix: [
    "handle a missing Vercel AI key before starting a workflow",
    "dispose active stream subscriptions on view teardown",
    "prevent stale requests from updating the renderer",
    "clear the previous response before a new prompt starts",
    "report workflow failures through the shared event bus",
    "stop cancelled streams before releasing their resources",
    "reset loading state after a failed stream request",
    "handle a completed stream while subscribing to events",
    "preserve cancellation errors from the agent runner",
    "avoid using the HMR server when it is unavailable",
    "guard optional webview RPC access during startup",
    "surface model request errors in the prompt UI",
    "release stream listeners after terminal workflow events",
  ],
  refactor: [
    "centralize agent event emission in the Bun process",
    "extract user settings loading from the agent runner",
    "separate Electroview transport code from UI composables",
    "consolidate workflow lifecycle event handling",
    "simplify active stream cleanup in the renderer",
    "move shared model contracts into the shared layer",
    "clarify the boundary between RPC and event streaming",
    "group desktop startup configuration in the main process",
    "reuse error normalization for agent failures",
    "split renderer infrastructure from presentation code",
    "normalize stream disposal across completion and cancellation",
    "tighten type definitions for workflow events",
    "reduce duplicate loading-state transitions",
  ],
};

function usage(exitCode = 0): never {
  console.log(`Usage: bun scripts/backfill-commit-history.ts [options]

Generate 1-12 randomly distributed commits for every day in a date range.
Without --apply, the command only prints the plan.

Options:
  --apply                 Create the planned commits (requires a repo with no commits)
  --start YYYY-MM-DD      First day (default: ${DEFAULT_START})
  --end YYYY-MM-DD        Last day, inclusive (default: today)
  --seed NUMBER           Reuse an exact random schedule (default: current timestamp)
  --min NUMBER            Minimum commits per day (default: ${MIN_COMMITS})
  --max NUMBER            Maximum commits per day (default: ${MAX_COMMITS})
  --help                  Show this message

Examples:
  bun scripts/backfill-commit-history.ts --seed 20260704
  bun scripts/backfill-commit-history.ts --seed 20260704 --apply`);
  process.exit(exitCode);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string | boolean> = { apply: false };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help") usage();
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (!arg.startsWith("--")) usage(1);
    const value = args[++index];
    if (!value || value.startsWith("--")) usage(1);
    options[arg.slice(2)] = value;
  }

  return options;
}

function parseDate(value: string, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`${label} is not a valid calendar date.`);
  }
  return date;
}

function localToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

function dateKey(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function gitDate(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  return `${dateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}${sign}${hours}:${minutes}`;
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomItem<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function randomInt(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function buildPlan(start: Date, end: Date, min: number, max: number, seed: number): PlannedCommit[] {
  const random = createRandom(seed);
  const plan: PlannedCommit[] = [];
  const current = new Date(start);
  const usedMessages = new Set<string>();

  while (current <= end) {
    const count = randomInt(min, max, random);
    const dayStart = new Date(current);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(current);
    dayEnd.setHours(18, 0, 0, 0);

    for (let index = 0; index < count; index++) {
      // Spread commits across working hours, with a small random offset.
      const ratio = (index + 1) / (count + 1);
      const timestamp = dayStart.getTime() + (dayEnd.getTime() - dayStart.getTime()) * ratio;
      const jitter = randomInt(-20, 20, random) * 60_000;
      const date = new Date(timestamp + jitter);
      const kind = randomItem(KINDS, random);
      let body = randomItem(messages[kind], random);
      let attempts = 0;
      while (usedMessages.has(`${kind}: ${body}`) && attempts++ < 20) {
        body = randomItem(messages[kind], random);
      }
      usedMessages.add(`${kind}: ${body}`);
      plan.push({ date, kind, message: `${kind}: ${body}` });
    }

    current.setDate(current.getDate() + 1);
  }

  // Guarantee every requested prefix appears. The initial snapshot is a chore.
  if (plan[0]) {
    plan[0].kind = "chore";
    plan[0].message = "chore: initialize the P-era Electrobun workspace";
  }
  const remainingKinds = KINDS.filter(kind => kind !== "chore");
  for (let index = 0; index < Math.min(remainingKinds.length, plan.length - 1); index++) {
    const kind = remainingKinds[index]!;
    plan[index + 1]!.kind = kind;
    plan[index + 1]!.message = `${kind}: ${messages[kind][index % messages[kind].length]}`;
  }

  plan.sort((left, right) => left.date.getTime() - right.date.getTime());
  return plan;
}

function runGit(command: string[], env: Record<string, string> = {}): string {
  const result = Bun.spawnSync({
    cmd: ["git", ...command],
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });
  if (result.exitCode !== 0) {
    throw new Error(`git ${command.join(" ")} failed:\n${new TextDecoder().decode(result.stderr)}`);
  }
  return new TextDecoder().decode(result.stdout).trim();
}

function applyPlan(plan: PlannedCommit[]) {
  try {
    runGit(["rev-parse", "--is-inside-work-tree"]);
  }
  catch {
    throw new Error("Run this command from inside a Git repository.");
  }

  try {
    runGit(["rev-parse", "--verify", "HEAD"]);
    throw new Error("Refusing to append synthetic history: this repository already has commits.");
  }
  catch (error) {
    if (error instanceof Error && error.message.includes("Refusing")) throw error;
  }

  runGit(["var", "GIT_AUTHOR_IDENT"]);
  runGit(["add", "-A"]);

  plan.forEach((commit, index) => {
    const message = index === 0 ? "chore: initialize the P-era Electrobun workspace" : commit.message;
    const env = { GIT_AUTHOR_DATE: gitDate(commit.date), GIT_COMMITTER_DATE: gitDate(commit.date) };
    const command = index === 0
      ? ["commit", "--no-verify", "-m", message]
      : ["commit", "--allow-empty", "--no-verify", "-m", message];
    runGit(command, env);
  });
}

try {
  const options = parseArgs();
  const start = parseDate(String(options.start ?? DEFAULT_START), "--start");
  const end = parseDate(String(options.end ?? dateKey(localToday())), "--end");
  const min = Number(options.min ?? MIN_COMMITS);
  const max = Number(options.max ?? MAX_COMMITS);
  const seed = Number(options.seed ?? Date.now());

  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 12 || min > max) {
    throw new Error("--min and --max must be integers in the range 1 through 12.");
  }
  if (!Number.isInteger(seed)) throw new Error("--seed must be an integer.");
  if (start > end) throw new Error("--start must not be after --end.");

  const plan = buildPlan(start, end, min, max, seed);
  console.log(`Seed: ${seed} | Range: ${dateKey(start)} to ${dateKey(end)} | Commits: ${plan.length}`);
  for (const commit of plan) console.log(`${gitDate(commit.date)}  ${commit.message}`);

  if (options.apply) {
    applyPlan(plan);
    console.log(`\nCreated ${plan.length} commits.`);
  }
  else {
    console.log("\nDry run only. Re-run with --apply to create these commits.");
  }
}
catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
