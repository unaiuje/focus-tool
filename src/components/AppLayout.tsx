import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  ChartColumn,
  CalendarRange,
  House,
  Library,
} from "lucide-react";
import { hydrateStore } from "@/lib/study-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Hoy", icon: House },
  { to: "/semana", label: "Semana", icon: CalendarRange },
  { to: "/asignaturas", label: "Asignaturas", icon: Library },
  { to: "/calendario", label: "Exámenes", icon: CalendarDays },
  { to: "/progreso", label: "Progreso", icon: ChartColumn },
] as const;

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    hydrateStore();
    setHydrated(true);
  }, []);
  return hydrated;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hydrated = useHydrated();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-heading text-lg font-bold tracking-tight">
            Mi Curso <span className="text-primary">4º ESO</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        {hydrated ? children : <PantallaCarga />}
      </main>
    </div>
  );
}

function PantallaCarga() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">Preparando tu día…</p>
    </div>
  );
}
