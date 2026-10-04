import { createFileRoute, redirect } from "@tanstack/react-router";

// La sección de tarjetas vive ahora en /estudio (pestaña Repaso).
export const Route = createFileRoute("/tarjetas")({
  beforeLoad: () => {
    throw redirect({ to: "/estudio", replace: true });
  },
});
