import { promises as fsp } from "fs";
import path from "path";
import os from "os";
import { createHash } from "crypto";

/**
 * Tiny best-effort JSON cache on disk (defaults to the OS temp dir, usable on
 * Vercel's /tmp too). Survives server restarts where the in-memory caches
 * don't. Every read/write is fault-tolerant: failures are silently ignored.
 */

const CACHE_DIR = path.join(process.env.FROOD_CACHE_DIR ?? path.join(os.tmpdir(), "frood-cache"));

type DiskEntry<T> = { v: 1; ts: number; data: T };

function fileFor(namespace: string, key: string): string {
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 24);
  return path.join(CACHE_DIR, `${namespace}-${digest}.json`);
}

async function ensureDir(): Promise<void> {
  try {
    await fsp.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export async function readDiskCache<T>(namespace: string, key: string, maxAgeMs: number): Promise<T | null> {
  try {
    const raw = await fsp.readFile(fileFor(namespace, key), "utf8");
    const entry = JSON.parse(raw) as DiskEntry<T>;
    if (entry.v !== 1) return null;
    if (Date.now() - entry.ts > maxAgeMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export async function writeDiskCache<T>(namespace: string, key: string, data: T): Promise<void> {
  try {
    await ensureDir();
    const entry: DiskEntry<T> = { v: 1, ts: Date.now(), data };
    await fsp.writeFile(fileFor(namespace, key), JSON.stringify(entry), "utf8");
  } catch {
    // ignore
  }
}