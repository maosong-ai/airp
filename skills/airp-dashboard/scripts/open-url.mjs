import { spawn } from "node:child_process";

export function openUrl(url) {
  const platform = process.platform;
  if (platform === "darwin") {
    return spawn("open", [url], { stdio: "ignore", detached: true }).unref();
  }
  if (platform === "linux") {
    return spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  }
  if (platform === "win32") {
    // `start` is a cmd builtin.
    return spawn("cmd", ["/c", "start", "", url], {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    }).unref();
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

