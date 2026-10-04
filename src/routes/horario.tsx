import { createFileRoute, redirect } from "@tanstack/react-router";

// El horario se edita ahora desde Ajustes.
export const Route = createFileRoute("/horario")({
  beforeLoad: () => {
    throw redirect({ to: "/ajustes", replace: true });
  },
});
