import { appendFile, chmod, mkdir, stat, truncate } from "node:fs/promises";
import { join } from "node:path";
import { getConfigDir } from "./user-settings";

const MAX_LOG_BYTES = 1_000_000;
const LOG_FILE_NAME = "agent-errors.log";

function redact(value: string): string {
  return value
    .replace(/\b(?:vck|sk)_[\w-]+\b/g, "[REDACTED_API_KEY]")
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,]+/gi, "$1[REDACTED]");
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const details = error as Error & {
      responseBody?: unknown;
      statusCode?: unknown;
      url?: unknown;
    };
    const apiDetails = [
      typeof details.statusCode === "number" ? `HTTP status: ${details.statusCode}` : null,
      typeof details.url === "string" ? `URL: ${details.url}` : null,
      typeof details.responseBody === "string" ? `Response body: ${details.responseBody}` : null,
    ].filter((value): value is string => value !== null);
    const cause = "cause" in error && error.cause
      ? `\nCaused by: ${formatError(error.cause)}`
      : "";
    const suffix = apiDetails.length > 0 ? `\n${apiDetails.join("\n")}` : "";
    return redact(error.stack || error.message) + suffix + cause;
  }

  if (typeof error === "string") {
    return redact(error);
  }

  try {
    return redact(JSON.stringify(error));
  }
  catch {
    return redact(String(error));
  }
}

export function getAgentErrorLogPath(): string {
  return join(getConfigDir(), "logs", LOG_FILE_NAME);
}

/**
 * Records internal failures outside stdout/stderr, which are not visible when
 * the packaged desktop application is launched from Finder.
 */
export async function logAgentError(context: string, error: unknown): Promise<string | null> {
  const path = getAgentErrorLogPath();

  try {
    await mkdir(join(getConfigDir(), "logs"), { recursive: true });
    const current = await stat(path).catch(() => null);
    if (current && current.size >= MAX_LOG_BYTES) {
      await truncate(path, 0);
    }

    const entry = [
      `[${new Date().toISOString()}] ERROR ${context}`,
      formatError(error),
      "",
    ].join("\n");
    await appendFile(path, entry, "utf8");
    await chmod(path, 0o600).catch(() => {});
    return path;
  }
  catch (loggingError) {
    console.error("Could not write AI diagnostic log:", loggingError);
    return null;
  }
}
