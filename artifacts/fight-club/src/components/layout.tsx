import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Swords, Users, Trophy, Lightbulb } from "lucide-react";

const navItems = [
  { href: "/", label: "Arena", icon: Swords },
  { href: "/roster", label: "Roster", icon: Users },
  { href: "/fights", label: "History", icon: Trophy },
  { href: "/suggest", label: "Suggest", icon: Lightbulb },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Game screen content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[72px]">
        {children}
      </main>

      {/* Bottom game navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-primary/40 bg-background/95 backdrop-blur h-[72px] grid grid-cols-4">
        {navItems.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex flex-col items-center justify-center h-full gap-1 transition-all relative
                  ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary" />
                )}
                <item.icon
                  className={`h-6 w-6 transition-transform ${active ? "scale-110" : ""}`}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest ${active ? "text-primary" : ""}`}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
