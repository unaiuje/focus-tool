import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarClock,
  CalendarDays,
  ChartColumn,
  CalendarRange,
  Ellipsis,
  House,
  Layers,
  Library,
} from "lucide-react";
import { ProfileGate } from "@/components/ProfileGate";
import { ProfileMenu } from "@/components/ProfileMenu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDailyReminder } from "@/hooks/use-daily-reminder";
import { hydrateStore, useActiveProfileId, useStudyStore } from "@/lib/study-store";
import { daysToTermEnd } from "@/lib/study-utils";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Hoy", icon: House },
  { to: "/semana", label: "Semana", icon: CalendarRange },
  { to: "/asignaturas", label: "Asignaturas", icon: Library },
  { to: "/calendario", label: "Exámenes", icon: CalendarDays },
  { to: "/tarjetas", label: "Tarjetas", icon: Layers },
  { to: "/horario", label: "Horario", icon: CalendarClock },
  { to: "/progreso", label: "Progreso", icon: ChartColumn },
] as const;

// Pestañas fijas de la barra inferior en móvil; el resto va en "Más".
const PRIMARY_TO = ["/", "/semana", "/asignaturas", "/calendario"] as const;

export function useAppReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    hydrateStore();
    setReady(true);
  }, []);
  return ready;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ready = useAppReady();
  const activeId = useActiveProfileId();
  const state = useStudyStore();
  useDailyReminder();
  // Chip de urgencia solo en el tramo final de la evaluación
  const diasEvaluacion = daysToTermEnd(state);

  if (!ready) return <PantallaCarga />;
  // Sin perfil activo: solo la pantalla "¿Quién eres?", sin navegación.
  if (!activeId) return <ProfileGate />;

  const primary = NAV.filter((n) => (PRIMARY_TO as readonly string[]).includes(n.to));
  const secondary = NAV.filter((n) => !(PRIMARY_TO as readonly string[]).includes(n.to));
  const masActivo = secondary.some((n) => n.to === pathname);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-1">
            <Link to="/" className="min-w-0 truncate font-heading text-lg font-bold tracking-tight">
              Mi Curso <span className="text-primary">4º ESO</span>
            </Link>
            <ProfileMenu />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {diasEvaluacion !== null && diasEvaluacion <= 14 && (
              <span
                className="whitespace-nowrap rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"
                title="Días hasta el fin de la evaluación"
              >
                Evaluación: {diasEvaluacion}d
              </span>
            )}
            {/* En móvil/tablet la navegación vive en la barra inferior; aquí solo a partir de md. */}
            <nav className="hidden items-center gap-0.5 md:flex">
              {NAV.map(({ to, label, icon: Icon }) => {
                const active = pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    title={label}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="hidden lg:inline">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      {/* key: al cambiar de perfil se remontan las rutas (se cierran acordeones,
          Pomodoros y formularios del perfil anterior). */}
      <main
        key={activeId}
        className="mx-auto max-w-4xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 md:pb-8"
      >
        {children}
      </main>
      {/* Barra inferior de navegación en móvil/tablet; en escritorio manda la de arriba. */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-4xl grid-cols-5">
          {primary.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                title={label}
                className={cn(
                  "flex h-16 min-w-0 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {/* tracking-tight: «Asignaturas» cabe a 13px en pantallas de 360px */}
                <span className="w-full truncate text-center tracking-tight">{label}</span>
              </Link>
            );
          })}
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Más secciones"
                title="Más secciones"
                className={cn(
                  "flex h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-xs font-medium",
                  masActivo ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Ellipsis className="size-5 shrink-0" aria-hidden />
                <span>Más</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
              <SheetHeader className="text-left">
                <SheetTitle>Más secciones</SheetTitle>
              </SheetHeader>
              <ul className="grid gap-1 pb-2">
                {secondary.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <SheetClose asChild>
                      <Link
                        to={to}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
                          to === pathname ? "bg-accent text-foreground" : "hover:bg-accent",
                        )}
                      >
                        <Icon className="size-5 text-muted-foreground" aria-hidden />
                        {label}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}

function PantallaCarga() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Preparando tu día…</p>
    </div>
  );
}
