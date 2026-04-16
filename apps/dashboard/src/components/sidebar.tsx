"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faUsers,
  faTags,
  faHashtag,
  faCalendar,
  faRobot,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const navItems: { href: string; label: string; icon: IconDefinition }[] = [
  { href: "/dashboard", label: "Overview", icon: faChartLine },
  { href: "/dashboard/members", label: "Members", icon: faUsers },
  { href: "/dashboard/roles", label: "Roles", icon: faTags },
  { href: "/dashboard/channels", label: "Channels", icon: faHashtag },
  { href: "/dashboard/schedules", label: "Schedules", icon: faCalendar },
  { href: "/dashboard/ai", label: "AI Chat", icon: faRobot },
  { href: "/dashboard/settings", label: "Settings", icon: faGear },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold">BowskyBot</h1>
        <p className="text-sm text-muted-foreground mt-1">Dashboard</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
