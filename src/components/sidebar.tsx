"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  PhoneCall,
  Send,
  Handshake,
  MoreHorizontal,
  Users,
  Inbox,
  Settings,
  LogOut,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const mainNav = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Call List", href: "/calls", icon: PhoneCall },
  { name: "Campaign", href: "/campaign", icon: Send },
  { name: "Pipeline", href: "/pipeline", icon: Handshake },
];

const moreNav = [
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Raw Leads", href: "/raw-leads", icon: Inbox },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(() => {
    // Auto-open if user is on one of the "more" pages
    return moreNav.some((item) => {
      if (item.href.includes("?")) return false;
      return pathname.startsWith(item.href) && pathname !== "/";
    });
  });

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.includes("?")) {
      const [path, qs] = href.split("?");
      if (pathname !== path) return false;
      const linkParams = new URLSearchParams(qs);
      for (const [key, val] of linkParams) {
        if (searchParams.get(key) !== val) return false;
      }
      return true;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-zinc-900 text-zinc-400">
      <div className="flex h-14 items-center px-5">
        <h1 className="text-base font-semibold tracking-tight text-white">Sales Engine</h1>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {mainNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          );
        })}

        {/* More section */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
        >
          <MoreHorizontal size={18} />
          More
          {moreOpen ? (
            <ChevronUp size={14} className="ml-auto" />
          ) : (
            <ChevronDown size={14} className="ml-auto" />
          )}
        </button>

        {moreOpen && (
          <div className="ml-3 space-y-0.5 border-l border-zinc-800 pl-3">
            {moreNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-zinc-800 text-white"
                      : "hover:bg-zinc-800/50 hover:text-zinc-200"
                  }`}
                >
                  <item.icon size={16} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <button
          onClick={() => {
            document.cookie = "leads_session=; path=/; max-age=0";
            window.location.href = "/login";
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
