import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProfile, hasLegacyData, switchProfile, useProfiles } from "@/lib/study-store";

const AVATAR_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#ca8a04", "#0891b2"];

function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? "#2563eb";
}

/** Pantalla "¿Quién eres?": cada persona entra a su propio espacio. */
export function ProfileGate() {
  const profiles = useProfiles();
  const legacy = hasLegacyData();
  const [name, setName] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 py-10">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Mi Curso <span className="text-primary">4º ESO</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profiles.length > 0
              ? "¿Quién eres? Cada perfil tiene su propio espacio."
              : "Crea tu perfil para empezar. Todo se guarda solo en este dispositivo."}
          </p>
        </div>

        {legacy && profiles.length === 0 && (
          <p className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            Encontramos los datos que ya tenías: se colocarán en el primer perfil que crees.
          </p>
        )}

        {profiles.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => switchProfile(p.id)}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card px-3 py-4 transition-colors hover:bg-accent"
              >
                <span
                  className="flex size-12 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: avatarColor(p.name) }}
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-full truncate text-sm font-medium">{p.name}</span>
              </button>
            ))}
          </div>
        )}

        <form
          className="space-y-2 rounded-xl border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createProfile(name);
            setName("");
          }}
        >
          <label htmlFor="nuevo-perfil" className="text-sm font-medium">
            Nuevo perfil
          </label>
          <div className="flex gap-2">
            <Input
              id="nuevo-perfil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre…"
              maxLength={30}
              autoFocus={profiles.length === 0}
            />
            <Button type="submit" disabled={!name.trim()}>
              <Plus className="size-4" /> Crear
            </Button>
          </div>
        </form>

        {!legacy && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => createProfile("Ejemplo", { withExamples: true })}
            >
              <Sparkles className="size-4" />
              Explorar con datos de ejemplo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
