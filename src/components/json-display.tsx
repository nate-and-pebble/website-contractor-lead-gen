interface JsonDisplayProps {
  data: unknown;
  depth?: number;
}

const borderColors = [
  "border-zinc-300",
  "border-zinc-200",
  "border-zinc-100",
];

export function JsonDisplay({ data, depth = 0 }: JsonDisplayProps) {
  if (data === null || data === undefined) {
    return <span className="text-zinc-400 italic">None</span>;
  }

  if (typeof data === "string") {
    if (data.startsWith("http://") || data.startsWith("https://")) {
      return (
        <a href={data} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
          {data}
        </a>
      );
    }
    return <span className="text-zinc-800">{data}</span>;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return <span className="font-mono text-zinc-800">{String(data)}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-zinc-400 italic">Empty list</span>;
    }
    if (data.every((item) => typeof item === "string" || typeof item === "number")) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {data.map((item, i) => (
            <span key={i} className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className={depth < 2 ? "rounded-lg border border-zinc-100 bg-zinc-50/50 p-3" : ""}>
            <JsonDisplay data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-zinc-400 italic">No data</span>;
    }

    // Top-level: spacious layout with prominent labels
    if (depth === 0) {
      return (
        <dl className="space-y-3">
          {entries.map(([key, value]) => {
            const isNested = isComplexValue(value);
            return (
              <div key={key}>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {formatLabel(key)}
                </dt>
                <dd className={isNested ? `ml-0.5 border-l-2 ${borderColors[0]} pl-3` : ""}>
                  <JsonDisplay data={value} depth={depth + 1} />
                </dd>
              </div>
            );
          })}
        </dl>
      );
    }

    // Nested: compact with indentation lines
    const border = borderColors[Math.min(depth, borderColors.length - 1)];
    return (
      <dl className="space-y-2">
        {entries.map(([key, value]) => {
          const isNested = isComplexValue(value);
          return (
            <div key={key}>
              <dt className="text-[11px] font-medium text-zinc-400">
                {formatLabel(key)}
              </dt>
              <dd className={isNested ? `mt-0.5 ml-0.5 border-l-2 ${border} pl-3` : "mt-0.5"}>
                <JsonDisplay data={value} depth={depth + 1} />
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }

  return <span className="text-zinc-800">{String(data)}</span>;
}

function isComplexValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0 && !value.every((item) => typeof item === "string" || typeof item === "number");
  if (typeof value === "object" && value !== null) return Object.keys(value).length > 0;
  return false;
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
