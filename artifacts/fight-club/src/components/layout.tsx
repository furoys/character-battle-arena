import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Swords, Calendar, Trophy } from "lucide-react";

const navItems = [
  { href: "/", label: "Arena", icon: Swords },
  { href: "/daily", label: "Daily", icon: Calendar },
  { href: "/tournaments", label: "Cup", icon: Trophy },
  // Wager Mode is built but parked for a later release — re-add this tab (and
  // the /wager route in App.tsx, plus bump the nav grid back to grid-cols-4)
  // to bring it back. The page/route/backend code all still exist.
  // { href: "/wager", label: "Wager", icon: Coins },
];

// Hide chrome (header + bottom nav) on full-screen flow pages where the
// match takes over the viewport. The /sign-in and /sign-up screens render
// their own centered layout, so the app shell would only get in the way.
const HIDE_CHROME_PATHS = ["/sign-in", "/sign-up"];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const hideChrome = HIDE_CHROME_PATHS.some((p) => location.startsWith(p));

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (hideChrome) {
    return (
      <div className="h-[100dvh] w-full bg-background text-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background text-foreground overflow-hidden">
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[72px]">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#030308] h-[72px] grid grid-cols-3">
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

