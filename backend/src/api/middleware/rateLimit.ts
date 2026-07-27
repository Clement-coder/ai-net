import type { Request, Response, NextFunction } from "express";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

interface Window {
  timestamps: number[];
}

const windows = new Map<string, Window>();

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let win = windows.get(ip);
  if (!win) {
    win = { timestamps: [] };
    windows.set(ip, win);
  }

  win.timestamps = win.timestamps.filter((t: number) => t > cutoff);

  if (win.timestamps.length >= MAX_REQUESTS) {
    const oldest = win.timestamps[0]!;
    const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: { message: "Too many requests", code: "RATE_LIMITED" } });
    return;
  }

  win.timestamps.push(now);
  next();
}
