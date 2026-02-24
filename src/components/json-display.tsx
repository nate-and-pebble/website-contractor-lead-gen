interface JsonDisplayProps {
  data: unknown;
  depth?: number;
}

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
    return (
      <dl className={depth === 0 ? "space-y-3" : "space-y-2"}>
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {formatLabel(key)}
            </dt>
            <dd className="mt-0.5">
              <JsonDisplay data={value} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <span className="text-zinc-800">{String(data)}</span>;
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
