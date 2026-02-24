export function success(msg: string): void {
  console.log(`[ok] ${msg}`);
}

export function error(msg: string): void {
  console.error(`[error] ${msg}`);
}

export function info(msg: string): void {
  console.log(msg);
}

export function table(rows: Record<string, string>): void {
  const maxKey = Math.max(...Object.keys(rows).map((k) => k.length));
  for (const [key, value] of Object.entries(rows)) {
    console.log(`  ${key.padEnd(maxKey)}  ${value}`);
  }
}
