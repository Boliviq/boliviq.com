/** Common provider adapter interface for distress data ingestion. */

import type { RawDistressRecord } from "../types";
import type { ProviderConnectionStatus } from "./status";

export type { ProviderConnectionStatus };

export type ProviderAuthConfig = {
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  tokenUrl?: string;
  extraHeaders?: Record<string, string>;
};

export type SyncOptions = {
  mode: "full" | "incremental" | "date_window" | "file" | "webhook";
  countyFips?: string;
  stateCode?: string;
  since?: string;
  until?: string;
  fileContent?: string;
  fileFormat?: "csv" | "json" | "xml";
  pageSize?: number;
  maxPages?: number;
};

export type ProviderFetchPage = {
  records: RawDistressRecord[];
  nextCursor?: string | null;
  raw?: unknown;
};

export type ProviderHealth = {
  status: ProviderConnectionStatus;
  message: string;
  checkedAt: string;
  missingCredentials: string[];
};

export interface DistressProviderAdapter {
  key: string;
  name: string;
  kind: "commercial" | "federal" | "local_government" | "auction" | "demo";
  /** Env var names required to activate this provider. */
  credentialEnvKeys: string[];
  supportsApi: boolean;
  supportsFile: boolean;
  supportsWebhook: boolean;
  supportsIncremental: boolean;
  defaultConfidence: number;

  getHealth(env?: NodeJS.ProcessEnv): ProviderHealth;
  authenticate?(config: ProviderAuthConfig): Promise<void>;
  fetchPage?(options: SyncOptions, cursor?: string | null): Promise<ProviderFetchPage>;
  parseFile?(content: string, format: "csv" | "json" | "xml"): Promise<RawDistressRecord[]>;
  normalizeWebhook?(payload: unknown): Promise<RawDistressRecord[]>;
  withRetry?<T>(fn: () => Promise<T>, attempts?: number): Promise<T>;
}

export function missingCredentials(
  keys: string[],
  env: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {},
): string[] {
  return keys.filter((k) => !env[k] || !String(env[k]).trim());
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseMs = 250,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === attempts - 1) break;
      const wait = baseMs * 2 ** i + Math.floor(Math.random() * 50);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
