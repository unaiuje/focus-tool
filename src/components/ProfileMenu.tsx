import { useState } from "react";
import { Check, LogOut, Settings2, Trash2, UserRound, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createProfile,
  deleteProfile,
  renameProfile,
  signOut,
  switchProfile,
  useActiveProfileId,
  useProfiles,
} from "@/lib/study-store";
import type { Profile } from "@/lib/study-types";
import { cn } from "@/lib/utils";

/** Selector de perfil de la cabecera: cambia de persona, crea, renombra o borra. */
export function ProfileMenu() {
  const profiles = useProfiles();
  const activeId = useActiveProfileId();
  const active = profiles.find((p) => p.id === activeId) ?? null;

  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-muted-foreground">
            <UserRound className="size-4" />
            <span className="max-w-24 truncate">{active?.name ?? "Perfil"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel>¿Quién estudia?</DropdownMenuLabel>
          {profiles.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => switchProfile(p.id)}
              className="justify-between"
            >
              {p.name}
              {p.id === activeId && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <UserPlus className="size-4" /> Nuevo perfil…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setManageOpen(true)}>
            <Settings2 className="size-4" /> Gestionar perfiles…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut()}>
            <LogOut className="size-4" /> Cambiar de usuario
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewProfileDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ManageProfilesDialog open={manageOpen} onOpenChange={setManageOpen} />
    </>
  );
}

function NewProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setName("");
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createProfile(name);
            onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Nuevo perfil</DialogTitle>
            <DialogDescription>Empezará con las asignaturas de 4º y sin datos.</DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre…"
            maxLength={30}
            autoFocus
          />
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              Crear y entrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManageProfilesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const profiles = useProfiles();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar perfiles</DialogTitle>
          <DialogDescription>
            Cambia el nombre o borra un perfil. Borrar elimina todas sus tareas, exámenes, notas y
            horario.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {profiles.map((p) => (
            <ManageRow key={p.id} profile={p} />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function ManageRow({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name);
  const [confirming, setConfirming] = useState(false);
  const dirty = name.trim() !== profile.name && name.trim() !== "";

  return (
    <li className="flex items-center gap-2 rounded-lg border px-3 py-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => renameProfile(profile.id, name)}
        maxLength={30}
        className="h-8 flex-1"
        aria-label={`Nombre del perfil ${profile.name}`}
      />
      <Button
        size="icon"
        variant="ghost"
        className={cn("size-10 shrink-0", !dirty && "hidden")}
        onClick={() => renameProfile(profile.id, name)}
        aria-label="Guardar nombre"
      >
        <Check className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-10 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setConfirming(true)}
        aria-label={`Borrar perfil ${profile.name}`}
      >
        <Trash2 className="size-4" />
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar el perfil “{profile.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas sus tareas, exámenes, notas, extraescolares y horario. Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                deleteProfile(profile.id);
                setConfirming(false);
              }}
            >
              Borrar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
