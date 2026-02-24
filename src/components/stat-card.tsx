import Link from "next/link";

interface StatCardProps {
  title: string;
  value: number;
  href: string;
  color?: "blue" | "green" | "amber" | "red" | "zinc";
}

const colorMap: Record<string, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-green-200 bg-green-50 text-green-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
  zinc: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

export function StatCard({ title, value, href, color = "zinc" }: StatCardProps) {
  return (
    <Link href={href} className="group">
      <div
        className={`rounded-xl border p-5 transition-shadow group-hover:shadow-md ${colorMap[color]}`}
      >
        <p className="text-sm font-medium opacity-80">{title}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
      </div>
    </Link>
  );
}
