import type { UserSettings } from "@shared/settings";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { defaultUserSettings } from "@shared/settings";
import { Updater } from "electrobun";

declare const __PROJECT_ROOT__: string;

type SettingsFile = Partial<UserSettings> & {
  vercelApiKey?: unknown;
};

export function getConfigDir(): string {
  const rootDir = homedir();
  const appName = "pexus";

  if (process.platform === "darwin") {
    // ~/Library/Application Support
    return join(rootDir, "Library", "Application Support", appName);
  }

  if (process.platform === "win32") {
    // C:\Users\<user>\AppData\Roaming
    return join(join(rootDir, "AppData", "Roaming"), appName);
  }

  // linux ~/.config/<app_name>
  return join(join(rootDir, ".config"), appName);
}

export async function getSettingsPath(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  return channel === "dev"
    ? resolve(__PROJECT_ROOT__, "settings.dev.json")
    : join(getConfigDir(), "settings.json");
}

function normalizeSettings(value: unknown): UserSettings {
  if (!value || typeof value !== "object") {
    return { ...defaultUserSettings };
  }

  const settings = value as SettingsFile;
  const vercelAiKey = typeof settings.vercelAiKey === "string"
    ? settings.vercelAiKey
    : typeof settings.vercelApiKey === "string"
      ? settings.vercelApiKey
      : defaultUserSettings.vercelAiKey;

  return { vercelAiKey };
}

async function writeSettings(path: string, settings: UserSettings): Promise<void> {
  await mkdir(dirname(path), { recursive: true });

  const temporaryPath = `${path}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  await chmod(temporaryPath, 0o600).catch(() => {});
  try {
    await rename(temporaryPath, path);
  }
  catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
  await chmod(path, 0o600).catch(() => {});
}

export async function loadUserSettings(): Promise<UserSettings> {
  const path = await getSettingsPath();

  try {
    const content = await readFile(path, "utf8");
    try {
      return normalizeSettings(JSON.parse(content));
    }
    catch {
      throw new Error(`Settings file contains invalid JSON: ${path}`);
    }
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    const settings = { ...defaultUserSettings };
    await writeSettings(path, settings);
    return settings;
  }
}

export async function saveUserSettings(settings: UserSettings): Promise<UserSettings> {
  const normalized = {
    vercelAiKey: settings.vercelAiKey.trim(),
  };
  await writeSettings(await getSettingsPath(), normalized);
  return normalized;
}
