// Service worker mínimo: habilita la instalación como app (PWA).
// No cachea nada: la app es SSR y necesita el servidor para funcionar.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // passthrough
});
