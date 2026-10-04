import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ClassSlotsSection } from "@/components/ClassSlotsSection";
import { Extraescolares } from "@/components/Extraescolares";
import { NotebooklmExport } from "@/components/NotebooklmExport";
import { SubjectsAdmin } from "@/components/SubjectsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSettings, useStudyStore } from "@/lib/study-store";
import { daysToTermEnd } from "@/lib/study-utils";
import { selectClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Configura tu horario de clases, extraescolares, asignaturas, recordatorio diario y fin de evaluación.",
      },
      { property: "og:title", content: "Ajustes — Mi Curso 4º ESO" },
      {
        property: "og:description",
        content: "Todo lo que configuras una vez: horario, asignaturas y rutina.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AjustesPage,
});

function AjustesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Ajustes</h1>
          <p className="text-sm text-muted-foreground">
            Lo que configuras una vez y la app respeta todos los días. Los perfiles se cambian desde
            el menú de arriba.
          </p>
        </div>

        <ClassSlotsSection />
        <Extraescolares />
        <SubjectsAdmin />
        <Rutina />
        <NotebooklmExport />
      </div>
    </AppLayout>
  );
}

const HORAS_RECORDATORIO = [14, 15, 16, 17, 18, 19, 20, 21, 22];

/** Ajustes de hábitos: recordatorio diario y fin de la evaluación. */
function Rutina() {
  const state = useStudyStore();
  const [horaElegida, setHoraElegida] = useState(17);
  const [permissionMsg, setPermissionMsg] = useState("");
  const reminderHour = state.settings.reminderHour;
  const termEnd = state.settings.termEndDate;
  const dias = daysToTermEnd(state);

  const activar = async () => {
    if (typeof Notification === "undefined") {
      setPermissionMsg("Este navegador no soporta notificaciones.");
      return;
    }
    const perm =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm === "granted") {
      updateSettings({ reminderHour: horaElegida });
      setPermissionMsg("");
    } else {
      setPermissionMsg("Notificaciones bloqueadas: permítelas en el navegador.");
    }
  };

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-heading text-lg font-semibold">Tu rutina</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Recordatorio diario</p>
          {reminderHour === null ? (
            <>
              <p className="text-sm text-muted-foreground">
                Un aviso a la hora que elijas con lo que te queda del día.
              </p>
              <div className="flex items-center gap-2">
                <select
                  className={cn(selectClass, "w-28")}
                  value={horaElegida}
                  onChange={(e) => setHoraElegida(Number(e.target.value))}
                  aria-label="Hora del recordatorio"
                >
                  {HORAS_RECORDATORIO.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
                <Button variant="secondary" size="sm" onClick={activar}>
                  Activar
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Aviso a las{" "}
                <span className="font-semibold text-foreground">
                  {String(reminderHour).padStart(2, "0")}:00
                </span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => updateSettings({ reminderHour: null })}
              >
                Desactivar
              </Button>
            </div>
          )}
          {permissionMsg && <p className="text-xs text-destructive">{permissionMsg}</p>}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Fin de la evaluación</p>
          <Input
            type="date"
            value={termEnd ?? ""}
            onChange={(e) => updateSettings({ termEndDate: e.target.value || null })}
            className="w-44"
            aria-label="Fecha de fin de evaluación"
          />
          {dias !== null && (
            <p className="text-sm text-muted-foreground">
              Quedan{" "}
              <span className="font-semibold text-foreground">
                {dias} día{dias === 1 ? "" : "s"}
              </span>{" "}
              para cerrar evaluación.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
