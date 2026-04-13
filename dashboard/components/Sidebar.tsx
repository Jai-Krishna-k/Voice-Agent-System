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
import { useEffect, useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calls/new", label: "New Call", icon: PhoneOutgoing },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/agent", label: "Agent Config", icon: Bot },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-52 flex flex-col z-40"
      style={{ background: "#060606", borderRight: "1px solid #141414" }}>
      {/* Logo */}
      <div className="h-12 flex items-center px-4 shrink-0"
        style={{ borderBottom: "1px solid #141414" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="text-amber-500 text-base font-bold leading-none select-none">■</span>
          <span className="text-[10px] font-semibold tracking-widest text-stone-200 uppercase">
            Aryantra
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/calls/new" &&
              pathname.startsWith(item.href)) ||
            (item.href === "/calls/new" && pathname === "/calls/new");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "flex items-center gap-3 py-2 text-[13px] font-medium text-amber-500 bg-amber-500/[0.06] border-l-2 border-amber-500 -ml-px pl-[11px] pr-4 transition-colors"
                  : "flex items-center gap-3 px-3 py-2 text-[13px] text-stone-500 hover:text-stone-200 transition-colors"
              }
            >
              <item.icon className="w-[15px] h-[15px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop: "1px solid #141414" }}>
        {email && (
          <div className="text-[10px] text-stone-700 truncate px-0.5 mb-2">{email}</div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-0.5 py-1 text-[12px] text-stone-600 hover:text-stone-300 transition-colors w-full"
        >
          <LogOut className="w-[14px] h-[14px] shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
