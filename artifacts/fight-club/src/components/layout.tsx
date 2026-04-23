import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Swords, Trophy, Lightbulb, LogIn } from "lucide-react";
import { Show, useUser } from "@clerk/react";
import { AvaLogo } from "@/components/ava-logo";
import { CharacterAvatar } from "@/components/character-avatar";

const navItems = [
  { href: "/", label: "Arena", icon: Swords },
  { href: "/fights", label: "History", icon: Trophy },
  { href: "/suggest", label: "Suggest", icon: Lightbulb },
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
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[72px]">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-primary/40 bg-background/95 backdrop-blur h-[72px] grid grid-cols-3">
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

// Top header — small (44px) so it doesn't crowd the existing pages, but
// always shows the brand mark and a sign-in / profile button. Tapping the
// avatar when signed-in goes to /profile.
function Header() {
  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-3 h-11 border-b border-primary/15"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <Link href="/">
        <div className="flex items-center cursor-pointer h-full">
          <AvaLogo className="h-7 w-auto" />
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <Show when="signed-out">
          <Link href="/sign-in">
            <button
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border transition-all hover:border-primary/60 hover:text-primary"
              style={{
                color: "rgba(255,255,255,0.55)",
                borderColor: "rgba(255,255,255,0.15)",
              }}
            >
              <LogIn className="h-3 w-3" />
              Sign in
            </button>
          </Link>
        </Show>
        <Show when="signed-in">
          <ProfileButton />
        </Show>
      </div>
    </header>
  );
}

function ProfileButton() {
  const { user } = useUser();
  const name =
    user?.username ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "You";
  const initial = name.charAt(0).toUpperCase();
  return (
    <Link href="/profile">
      <button
        className="flex items-center gap-2 px-1.5 py-0.5 transition-all hover:bg-primary/10 rounded"
        title={`Signed in as ${name}`}
      >
        <span
          className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          {name}
        </span>
        <CharacterAvatar size={28} fallbackInitial={initial} />
      </button>
    </Link>
  );
}
