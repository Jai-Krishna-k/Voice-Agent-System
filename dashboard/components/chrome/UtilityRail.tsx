"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radio,
  Users,
  Phone,
  Bot,
  Plug,
  BookOpen,
  Settings,
  LogOut,
  PhoneOutgoing,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Operator", key: "O", icon: Radio },
  { href: "/leads", label: "Leads", key: "L", icon: Users },
  { href: "/calls", label: "Calls", key: "C", icon: Phone },
  { href: "/calls/new", label: "Dispatch", key: "N", icon: PhoneOutgoing },
  { href: "/agent", label: "Agents", key: "A", icon: Bot },
  { href: "/integrations", label: "Sources", key: "I", icon: Plug },
  { href: "/knowledge-base", label: "Knowledge", key: "K", icon: BookOpen },
  { href: "/settings", label: "Settings", key: "S", icon: Settings },
];

export function UtilityRail() {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className="w-12 flex flex-col items-center py-2 shrink-0 relative z-20"
      style={{ background: "#060606", borderRight: "1px solid #141414" }}
    >
      <nav className="flex-1 flex flex-col gap-0.5 mt-1">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/calls/new" &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={`${item.label}  ·  G ${item.key}`}
              className="group relative w-12 h-10 flex items-center justify-center"
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-amber-500" />
              )}
              <item.icon
                className={`w-[16px] h-[16px] transition-colors ${
                  isActive
                    ? "text-amber-500"
                    : "text-stone-600 group-hover:text-stone-200"
                }`}
              />
              <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 text-[10px] uppercase tracking-widest text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50"
                style={{ background: "#0C0C0C", border: "1px solid #181818" }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={signOut}
        title="Sign out"
        className="w-12 h-10 flex items-center justify-center text-stone-700 hover:text-stone-300 transition-colors"
      >
        <LogOut className="w-[15px] h-[15px]" />
      </button>
    </aside>
  );
}
