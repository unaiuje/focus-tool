import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Brain,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  Ellipsis,
  House,
  Library,
  Settings,
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
  { to: "/calendario", label: "Exámenes", icon: CalendarDays },
  { to: "/estudio", label: "Estudio", icon: Brain },
  { to: "/asignaturas", label: "Asignaturas", icon: Library },
  { to: "/progreso", label: "Progreso", icon: ChartColumn },
] as const;

// Pestañas fijas de la barra inferior en móvil; el resto (más Ajustes) va en "Más".
const PRIMARY_TO = ["/", "/semana", "/calendario", "/estudio"] as const;

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
  const secondary = [
    ...NAV.filter((n) => !(PRIMARY_TO as readonly string[]).includes(n.to)),
    { to: "/ajustes", label: "Configuración", icon: Settings },
  ] as const;
  const masActivo = secondary.some((n) => n.to === pathname) || pathname.startsWith("/ajustes");

  const evaluacionChip =
    diasEvaluacion !== null && diasEvaluacion <= 14 ? (
      <span
        className="whitespace-nowrap rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"
        title="Días hasta el fin de la evaluación"
      >
        Evaluación: {diasEvaluacion}d
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-background md:pl-60">
      {/* Escritorio/tablet: barra lateral fija. Sin cabecera superior. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-background md:flex">
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link to="/" className="min-w-0 truncate font-heading text-lg font-bold tracking-tight">
            Mi Curso <span className="text-primary">4º ESO</span>
          </Link>
          {evaluacionChip}
        </div>
        <nav aria-label="Navegación principal" className="flex-1 space-y-1 px-2">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                title={label}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t px-2 py-3">
          <Link
            to="/ajustes"
            aria-current={pathname === "/ajustes" ? "page" : undefined}
            title="Configuración"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/ajustes"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Settings className="size-4 shrink-0" />
            Configuración
          </Link>
          {/* El trigger de ProfileMenu es un botón: lo estiramos por CSS. */}
          <div className="[&_button]:w-full [&_button]:justify-start">
            <ProfileMenu />
          </div>
        </div>
      </aside>

      {/* Móvil: cabecera mínima; la navegación vive en la barra inferior. */}
      <header className="sticky top-0 z-20 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="min-w-0 truncate font-heading text-lg font-bold tracking-tight">
            Mi Curso <span className="text-primary">4º ESO</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            {evaluacionChip}
            <Link
              to="/ajustes"
              aria-label="Configuración"
              title="Configuración"
              className={cn(
                "flex size-9 items-center justify-center rounded-full transition-colors",
                pathname === "/ajustes"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Settings className="size-5" />
            </Link>
            <ProfileMenu />
          </div>
        </div>
      </header>

      {/* key: al cambiar de perfil se remontan las rutas (se cierran acordeones,
          Pomodoros y formularios del perfil anterior). */}
      <main
        key={activeId}
        className="mx-auto w-full max-w-4xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 md:pb-10"
      >
        {children}
      </main>

      {/* Barra inferior de navegación en móvil/tablet; en escritorio manda el sidebar. */}
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
