import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  Download,
  Heart,
  Home,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import logoAsset from "@/assets/smart-point-logo.png";
import { CategoryIcon } from "@/components/category-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { categoriesQuery } from "@/lib/catalog";
import {
  getSeenAt,
  markNotificationsSeen,
  newTemplatesQuery,
} from "@/lib/notifications";
import {
  cacheWhopUser,
  getWhopUser,
  type WhopUser,
} from "@/lib/whop";
import { getWhopIdentity } from "@/lib/whop.functions";
import { cn } from "@/lib/utils";

const NAV = [
  {
    to: "/",
    label: "Home",
    icon: Home,
  },
  {
    to: "/favoris",
    label: "Favorites",
    icon: Heart,
  },
  {
    to: "/telechargements",
    label: "Downloads",
    icon: Download,
  },
] as const;

/**
 * The member comes from Whop:
 * server-resolved when embedded, URL/local fallback in preview.
 *
 * Favorites and downloads are keyed on this id.
 */
export function useWhopUser(): WhopUser {
  const [fallback, setFallback] =
    useState<WhopUser>({
      id: "whop-preview-user",
      name: "Member",
      plan: "Premium Member",
    });

  useEffect(() => {
    setFallback(getWhopUser());
  }, []);

  const fetchIdentity =
    useServerFn(getWhopIdentity);

  const identity = useQuery({
    queryKey: ["whop-identity"],
    queryFn: () => fetchIdentity(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (identity.data) {
      cacheWhopUser(identity.data);
    }
  }, [identity.data]);

  return identity.data ?? fallback;
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] =
    useState<string | null>(null);

  const wrapper =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeenAt(getSeenAt());
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        !wrapper.current?.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      onClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        onClick,
      );
    };
  }, []);

  const alerts = useQuery(
    newTemplatesQuery(seenAt),
  );

  const categories = useQuery(
    categoriesQuery(),
  );

  const list = alerts.data ?? [];

  return (
    <div
      className="relative"
      ref={wrapper}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        onClick={() => {
          setOpen((value) => !value);

          if (!open) {
            markNotificationsSeen();
          }
        }}
        className="relative rounded-full text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-5 w-5" />

        {list.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {list.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="panel absolute right-0 top-12 z-40 w-[288px] overflow-hidden p-0 shadow-card">
          <p className="border-b border-border px-4 py-3 text-sm font-semibold">
            Notifications
          </p>

          {list.length === 0 ? (
            <p className="px-4 py-5 text-xs text-muted-foreground">
              You are up to date. We will let
              you know when a category gets 10
              new templates.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((alert) => {
                const category =
                  categories.data?.find(
                    (item) =>
                      item.id ===
                      alert.categoryId,
                  );

                return (
                  <li
                    key={alert.categoryId}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                      <CategoryIcon
                        name={
                          category?.icon ??
                          "briefcase"
                        }
                        className="h-4 w-4"
                      />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {category?.name ??
                          "New templates"}
                      </span>

                      <span className="block text-xs text-muted-foreground">
                        {alert.count} new
                        templates added
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const user = useWhopUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-[68px] items-center gap-4 border-b border-border bg-sidebar/95 px-4 backdrop-blur-xl lg:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-3"
        >
          <img
            src={logoAsset}
            alt="Smart Point"
            className="h-11 w-11 rounded-full object-cover shadow-glow"
          />

          <span className="hidden leading-tight sm:block">
            <span className="block text-base font-extrabold tracking-wide">
              SMART{" "}
              <span className="text-primary">
                POINT
              </span>
            </span>

            <span className="block text-[11px] text-muted-foreground">
              Premium PowerPoint Templates
            </span>
          </span>
        </Link>

        <form
          className="relative mx-auto hidden w-full max-w-2xl md:block"
          onSubmit={(event) =>
            event.preventDefault()
          }
          role="search"
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="search"
            placeholder="Search templates or categories..."
            className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            onChange={(event) => {
              const value = event.target.value;

              window.dispatchEvent(
                new CustomEvent(
                  "smartpoint:search",
                  {
                    detail: value,
                  },
                ),
              );
            }}
          />
        </form>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <NotificationsBell />

          <ThemeToggle />

          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-sm font-semibold">
              {user.name
                .slice(0, 1)
                .toUpperCase()}
            </span>

            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold">
                {user.name}
              </span>

              <span className="block text-[11px] text-muted-foreground">
                ⭐ {user.plan}
              </span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-[232px] shrink-0 border-r border-border bg-sidebar p-4 lg:block">
          <ul className="space-y-1.5">
            {NAV.map((item) => {
              const active =
                pathname === item.to;

              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" />

                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-16">
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-sidebar lg:hidden">
        {NAV.map((item) => {
          const active =
            pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[11px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />

              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}