import { Link, useLocation } from "wouter";
import { Home, Info, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/",          label: "Home",        icon: Home      },
  { href: "/about",     label: "About",       icon: Info      },
  { href: "/advertise", label: "Advertising", icon: Megaphone },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 text-xs font-medium transition-colors px-4 py-1",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
