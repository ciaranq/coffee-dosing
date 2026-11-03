"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dial-in", label: "Dial in", Icon: Scale },
  { href: "/history", label: "History", Icon: History },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <ul className="glass grid grid-cols-2 gap-1 rounded-3xl p-1.5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-medium transition-colors",
                  active ? "bg-crema text-espresso" : "text-milk/70 active:bg-white/10",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
