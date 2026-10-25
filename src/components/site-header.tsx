import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, History, LogOut, Menu, Moon, Search, Shield, Sun, User } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { NotificationBell } from "@/components/notification-bell";
import { PwaInstallButton } from "@/components/pwa-install-button";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { dark, toggle } = useTheme();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: q || undefined } });
  };
  const links = (
    <>
      <Link to="/search" className="hover:text-foreground">Browse</Link>
      <Link to="/search" search={{ type: "website" }} className="hover:text-foreground">Websites</Link>
      <Link to="/search" search={{ type: "apk" }} className="hover:text-foreground">Android</Link>
      <Link to="/about" className="hover:text-foreground">About</Link>
    </>
  );
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-glass backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <form onSubmit={submit} className="ml-auto hidden w-80 items-center gap-2 rounded-xl bg-secondary px-3 py-2 ring-1 ring-border md:flex">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none" placeholder="Search apps" aria-label="Search apps" />
        </form>
        <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground lg:flex">{links}</nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <PwaInstallButton />
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</Button>
          {user && <NotificationBell userId={user.id} />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account"><User /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/profile"><User />Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/favorites"><Heart />Favorites</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/downloads"><History />Downloads</Link></DropdownMenuItem>
                {isAdmin && <DropdownMenuItem asChild><Link to="/admin"><Shield />Admin</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}><LogOut />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="hidden sm:inline-flex"><Link to="/auth">Sign in</Link></Button>
          )}
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu"><Menu /></Button></SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-6 p-6">
              <Logo />
              <form onSubmit={submit} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 ring-1 ring-border">
                <Search className="size-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent text-sm focus:outline-none" placeholder="Search apps" />
              </form>
              <nav className="flex flex-col gap-4 text-base font-medium text-muted-foreground">
                {links}
                {user ? (
                  <>
                    <Link to="/favorites">Favorites</Link>
                    <Link to="/downloads">Downloads</Link>
                    <Link to="/profile">Profile</Link>
                  </>
                ) : (
                  <Link to="/auth" className="text-primary">Sign in</Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <Logo />
        <div className="flex flex-col items-center gap-1 sm:items-end">
          <p>Independent marketplace · not affiliated with any app store.</p>
          <Link to="/about" className="text-primary hover:underline">About</Link>
        </div>
      </div>
    </footer>
  );
}
