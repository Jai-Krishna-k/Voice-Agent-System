"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  Bot,
  BookOpen,
  Settings,
  PhoneOutgoing,
  LogOut,
  Plug,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/calls/new", label: "New Call", icon: PhoneOutgoing },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/agent", label: "Agent Config", icon: Bot },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-sidebar border-r border-sidebar-border flex flex-col z-40">
      <div className="h-14 flex items-center px-5 border-b border-sidebar-border shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Aryantra
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
