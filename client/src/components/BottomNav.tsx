import { Link, useLocation } from "wouter";
import { Home, Info, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

const links = [
  { href: "/",      label: "Home",  icon: Home },
  { href: "/about", label: "About", icon: Info },
];

export function BottomNav() {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-slate-100 dark:bg-slate-800 backdrop-blur-md">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 text-xs font-medium transition-colors px-4 py-1",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground dark:hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              {label}
            </Link>
          );
        })}

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle dark mode"
          className="flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors px-4 py-1"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </nav>
  );
}
