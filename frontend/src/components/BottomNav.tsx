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
    <nav aria-label="Main" className="shrink-0 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
      <ul className="glass grid grid-cols-2 gap-1.5 rounded-3xl p-1.5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-all duration-150 active:scale-[0.98]",
                  active
                    ? "bg-crema text-espresso shadow-[0_6px_20px_-4px_rgb(238_55_64_/_0.55)]"
                    : "text-milk/75 hover:text-milk active:bg-white/10",
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
