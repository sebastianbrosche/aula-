export function resolveSha(...candidates: Array<string | undefined>): string {
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "unknown";
}

let current = "unknown";

export function setAppSha(sha: string) {
  current = resolveSha(sha);
}

export function appSha(): string {
  return current;
}
