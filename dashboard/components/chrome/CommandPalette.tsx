"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Users,
  Phone,
  Bot,
  Plug,
  BookOpen,
  Settings,
  PhoneOutgoing,
  ArrowRight,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Operator Cockpit", icon: Radio },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/calls", label: "Calls Archive", icon: Phone },
  { href: "/calls/new", label: "New Dispatch", icon: PhoneOutgoing },
  { href: "/agent", label: "Agent Config", icon: Bot },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh]"
          onClick={onClose}
          style={{
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl mx-4 overflow-hidden shadow-2xl"
            style={{
              background: "#0A0A0A",
              border: "1px solid #1E1E1E",
              boxShadow: "0 0 0 1px rgba(245,158,11,0.08), 0 30px 80px rgba(0,0,0,0.6)",
            }}
          >
            <Command label="Command Palette" shouldFilter>
              <div className="flex items-center gap-2 px-3 border-b border-[#141414]">
                <span className="text-amber-500 text-xs font-bold leading-none">■</span>
                <Command.Input
                  autoFocus
                  placeholder="Search navigation, leads, actions…"
                />
              </div>
              <Command.List>
                <Command.Empty>No results. Try a different query.</Command.Empty>

                <Command.Group heading="Navigate">
                  {nav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.href}
                        value={`nav ${item.label}`}
                        onSelect={() => go(item.href)}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1">{item.label}</span>
                        <ArrowRight className="w-3 h-3 opacity-40" />
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                <Command.Group heading="Actions">
                  <Command.Item value="action dispatch new call" onSelect={() => go("/calls/new")}>
                    <PhoneOutgoing className="w-4 h-4" />
                    <span className="flex-1">Dispatch a new call</span>
                  </Command.Item>
                  <Command.Item value="action connect source integration" onSelect={() => go("/integrations")}>
                    <Plug className="w-4 h-4" />
                    <span className="flex-1">Connect a lead source</span>
                  </Command.Item>
                  <Command.Item value="action create agent" onSelect={() => go("/agent")}>
                    <Bot className="w-4 h-4" />
                    <span className="flex-1">Create an agent config</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>

            <div className="h-8 flex items-center justify-between px-3 border-t border-[#141414] text-[10px] text-stone-600 uppercase tracking-widest">
              <span>
                <kbd className="font-mono px-1 py-[1px] border border-[#1a1a1a] mr-1">↑↓</kbd>
                navigate
              </span>
              <span>
                <kbd className="font-mono px-1 py-[1px] border border-[#1a1a1a] mr-1">↵</kbd>
                select
              </span>
              <span>
                <kbd className="font-mono px-1 py-[1px] border border-[#1a1a1a] mr-1">esc</kbd>
                close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
