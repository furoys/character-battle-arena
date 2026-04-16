import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Swords, Users, Trophy, Plus, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const navItems = [
    { href: "/", label: "Arena", icon: Swords },
    { href: "/roster", label: "Roster", icon: Users },
    { href: "/fights", label: "History", icon: Trophy },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b-4 border-primary/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Swords className="h-6 w-6 text-primary group-hover:text-secondary transition-colors" />
            <span className="font-display text-2xl tracking-wider uppercase glitch-text">
              Fight Club
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span className={`text-lg font-bold tracking-wider uppercase hover:text-primary transition-colors cursor-pointer ${
                  location === item.href ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>
              </Link>
            ))}
            <Link href="/new-character">
              <Button variant="secondary" size="sm" className="font-display text-lg rounded-none uppercase shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> Add Fighter
              </Button>
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background p-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span 
                  className={`flex items-center gap-2 text-xl font-bold uppercase p-2 ${
                    location === item.href ? "bg-primary/10 text-primary border-l-4 border-primary" : "text-foreground"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </span>
              </Link>
            ))}
            <Link href="/new-character" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="secondary" className="w-full font-display text-lg rounded-none uppercase shadow-sm">
                <Plus className="mr-2 h-5 w-5" /> Add Fighter
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
