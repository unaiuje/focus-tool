// Auditoría responsive: capturas a tamaños de móvil/tablet + detección de
// scroll horizontal en las 7 rutas y los diálogos principales.
//
// Uso (con el dev server arrancado):
//   BASE_URL=http://localhost:5173 node scripts/mobile-audit.mjs
//
// No toca datos reales: bloquea fetch/xhr (la app queda en "modo
// solo-navegador") y siembra un perfil "audit" en localStorage.
// Requiere playwright-core y chrome-headless-shell (mismo método que
// usan las pruebas de este PC: launch() se cuelga, CDP no).

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PW_CORE_PATH ??
    "C:/Users/sonsoles/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core/index.js",
);

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const OUT_DIR = path.resolve("mobile-audit");
const INDEX_KEY = "mi-curso-4eso-v2:index";

const VIEWPORTS = [
  { w: 360, h: 800, dpr: 2 },
  { w: 390, h: 844, dpr: 3 },
  { w: 768, h: 1024, dpr: 2 },
];
const ROUTES = [
  "/",
  "/semana",
  "/asignaturas",
  "/calendario",
  "/estudio",
  "/ajustes",
  "/progreso",
];

// ---------- utilidades ----------

function findHeadlessShell() {
  if (process.env.CHROME_HEADLESS) return process.env.CHROME_HEADLESS;
  const root = path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  const dirs = fs
    .readdirSync(root)
    .filter((d) => d.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse();
  for (const d of dirs) {
    for (const sub of ["chrome-headless-shell-win64", "chrome-headless-shell"]) {
      const p = path.join(root, d, sub, "chrome-headless-shell.exe");
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error("chrome-headless-shell.exe no encontrado (define CHROME_HEADLESS).");
}

function waitForCdp(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get({ host: "127.0.0.1", port, path: "/json/version" }, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() > deadline) reject(new Error("chrome-headless-shell no abrió el CDP"));
          else setTimeout(tick, 250);
        });
    };
    tick();
  });
}

/** Fecha local de hoy como yyyy-MM-dd (mismo formato que todayISO()). */
function localISO(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function isoOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localISO(d);
}

// ---------- semilla de datos (perfil "audit") ----------

function buildSeed() {
  const hoy = isoOffset(0);
  const weekday = new Date().getDay(); // 0 domingo … 6 sábado
  const longWord = "Supercalifragilisticoespialidos sorprendentemente"; // 1ª palabra: 30 chars seguidos
  return {
    index: {
      profiles: [{ id: "audit", name: "Audit", createdAt: new Date().toISOString() }],
      activeId: "audit",
    },
    profile: {
      subjects: [
        { id: "mates", name: "Matemáticas", color: "#2563eb" },
        { id: "fyq", name: "Física y Química", color: "#dc2626" },
        { id: "ingles", name: "Inglés", color: "#7c3aed" },
      ],
      schedule: [
        {
          id: "slot-1",
          subjectId: "mates",
          weekday: weekday === 0 ? 1 : weekday,
          startTime: "08:30",
          endTime: "09:20",
        },
        {
          id: "slot-2",
          subjectId: "fyq",
          weekday: weekday === 0 || weekday === 6 ? 1 : (weekday % 5) + 1,
          startTime: "10:00",
          endTime: "11:00",
        },
      ],
      tasks: [
        {
          id: "t-1",
          subjectId: "mates",
          title:
            "Tarea con un título larguísimo para probar el ajuste de línea en filas de tareas de la aplicación",
          date: hoy,
          kind: "pomodoro",
          done: false,
        },
        {
          id: "t-2",
          subjectId: "fyq",
          title: "Problemas cinemática",
          date: hoy,
          kind: "tarea",
          done: false,
        },
        {
          id: "t-3",
          subjectId: "ingles",
          title: "Vocabulary unit 3",
          date: isoOffset(-1),
          kind: "pomodoro",
          done: true,
        },
      ],
      exams: [
        {
          id: "e-1",
          subjectId: "fyq",
          title: "Cinemática y dinámica",
          date: isoOffset(3),
          topics: "Tema 2 y 3",
        },
        {
          id: "e-2",
          subjectId: "mates",
          title: "Derivadas",
          date: isoOffset(-5),
          topics: "",
          grade: 7.5,
        },
        {
          id: "e-3",
          subjectId: "ingles",
          title: "Phrasal verbs",
          date: isoOffset(-10),
          topics: "",
          grade: 4,
        },
      ],
      extras: [
        {
          id: "x-1",
          name: "Baloncesto",
          weekdays: [weekday === 0 ? 2 : weekday],
          startTime: "18:00",
          endTime: "19:30",
        },
      ],
      sessions: [0, 1, 2, 3, 5, 8].map((back, i) => ({
        id: `s-${i}`,
        date: isoOffset(-back),
        subjectId: "mates",
        minutes: 25 + i * 10,
      })),
      cards: [
        {
          id: "c-1",
          subjectId: "ingles",
          front: "to achieve",
          back: "conseguir, lograr",
          box: 2,
          due: hoy,
          createdAt: new Date().toISOString(),
        },
        {
          id: "c-2",
          subjectId: "fyq",
          front: longWord,
          back: "palabra larguísima sin espacios para probar break-words",
          box: 1,
          due: hoy,
          createdAt: new Date().toISOString(),
        },
      ],
      simulacros: [],
      settings: {
        weeklyGoalMin: 420,
        reminderHour: null,
        termEndDate: isoOffset(10), // chip "Evaluación: Xd" visible en cabecera
      },
      checklistDays: [],
    },
  };
}

// ---------- detección de overflow ----------

const FIND_OFFENDERS = () => {
  const vw = window.innerWidth;
  const bad = [];
  const clippedByAncestor = (el) => {
    // Si un ancestro recorta (p. ej. barra de progreso con translateX dentro
    // de overflow-hidden), el desbordamiento no llega al usuario.
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (/(hidden|clip|auto|scroll)/.test(o.overflowX)) return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if ((r.right > vw + 1 || r.left < -1) && !clippedByAncestor(el)) {
      const cls = String(el.className?.baseVal ?? el.className ?? "")
        .split(/\s+/)
        .slice(0, 3)
        .join(".");
      bad.push(
        `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""} [${Math.round(r.left)}→${Math.round(r.right)}] "${(el.textContent ?? "").trim().slice(0, 30)}"`,
      );
    }
    if (bad.length >= 5) break;
  }
  return {
    docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    offenders: bad,
  };
};

const DIALOG_OVERFLOW = () => {
  const dlg = document.querySelector("[role='dialog']");
  if (!dlg) return { found: false };
  return {
    found: true,
    overflow: dlg.scrollWidth > dlg.clientWidth + 1,
    scrollWidth: dlg.scrollWidth,
    clientWidth: dlg.clientWidth,
  };
};

// ---------- auditoría ----------

const report = { baseUrl: BASE_URL, generatedAt: new Date().toISOString(), results: [] };

/** El shell existe siempre, pero en tablet (md:hidden) está display:none:
 *  hay que esperar "attached", no "visible". */
function waitShell(page) {
  return page.waitForSelector("nav[aria-label='Navegación principal']", {
    state: "attached",
    timeout: 30000,
  });
}

/** Clic seguro con nav inferior fija: sube el elemento al tercio superior
 *  antes de hacer clic (si no, scrollIntoView lo deja bajo la nav). */
async function clickScrollSafe(page, loc) {
  await loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.35 });
  });
  await loc.click();
}

async function auditRoute(page, vp, route, slug) {
  await page.goto(BASE_URL + route, { waitUntil: "networkidle", timeout: 90000 });
  await waitShell(page);
  await page.waitForTimeout(400);
  const ov = await page.evaluate(FIND_OFFENDERS);
  const file = path.join(String(vp.w), `${slug}.png`);
  await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
  report.results.push({ viewport: `${vp.w}x${vp.h}`, route, ...ov, screenshot: file });
  console.log(
    `${ov.docOverflow ? "✗ OVERFLOW" : "✓ ok     "} ${vp.w}x${vp.h} ${route}${
      ov.offenders.length ? ` → ${ov.offenders.length} culpables` : ""
    }`,
  );
  for (const o of ov.offenders) console.log(`    · ${o}`);
  return ov;
}

async function auditDialog(page, vp, openBy, slug, label) {
  try {
    await openBy();
    await page.waitForSelector("[role='dialog']", { state: "visible", timeout: 8000 });
    await page.waitForTimeout(450); // animación de entrada
    const ov = await page.evaluate(DIALOG_OVERFLOW);
    const file = path.join(String(vp.w), `${slug}.png`);
    await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
    report.results.push({
      viewport: `${vp.w}x${vp.h}`,
      route: slug,
      docOverflow: ov.overflow ?? false,
      offenders: ov.found
        ? [`dialog scrollWidth=${ov.scrollWidth} clientWidth=${ov.clientWidth}`]
        : [],
      screenshot: file,
    });
    console.log(`${ov.found && ov.overflow ? "✗ OVERFLOW" : "✓ ok     "} ${vp.w}x${vp.h} ${label}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } catch (err) {
    console.log(`! skip    ${vp.w}x${vp.h} ${label}: ${String(err).split("\n")[0]}`);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const shell = findHeadlessShell();
  const port = 30000 + Math.floor(Math.random() * 20000);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-chrome-"));
  const proc = spawn(shell, [
    "--headless",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "about:blank",
  ]);
  proc.stderr.on("data", () => {}); // ruido de arranque
  try {
    await waitForCdp(port);
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const seed = buildSeed();

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: vp.dpr,
        isMobile: true,
        hasTouch: true,
      });
      // 1) sin red de funciones de servidor: localStorage manda y no se toca SQLite
      await context.route("**/*", (route) => {
        const t = route.request().resourceType();
        if (t === "fetch" || t === "xhr") return route.abort();
        return route.continue();
      });
      // 2) semilla antes de que corra el bundle
      await context.addInitScript(
        ({ index, profile, key }) => {
          localStorage.setItem(key, JSON.stringify(index));
          localStorage.setItem(
            `mi-curso-4eso-v2:profile:${index.activeId}`,
            JSON.stringify(profile),
          );
        },
        { index: seed.index, profile: seed.profile, key: INDEX_KEY },
      );

      const page = await context.newPage();
      const errors = [];
      const expectedNetError = (t) =>
        t.includes("net::ERR_FAILED") || t.includes("Failed to load resource");
      page.on("pageerror", (e) => !expectedNetError(String(e)) && errors.push(String(e)));
      page.on(
        "console",
        (m) => m.type() === "error" && !expectedNetError(m.text()) && errors.push(m.text()),
      );

      for (const route of ROUTES) {
        const slug = route === "/" ? "inicio" : route.slice(1);
        await auditRoute(page, vp, route, slug);
      }

      // Diálogos y flujos interactivos
      await page.goto(BASE_URL + "/", { waitUntil: "networkidle", timeout: 60000 });
      await waitShell(page);
      await auditDialog(
        page,
        vp,
        () => clickScrollSafe(page, page.getByRole("button", { name: /Empezar Pomodoro/ }).first()),
        "dialog-pomodoro",
        "PomodoroDialog",
      );
      await auditDialog(
        page,
        vp,
        () => page.getByRole("button", { name: "Más secciones" }).click(),
        "sheet-mas",
        "Sheet «Más»",
      );

      await page.goto(BASE_URL + "/calendario", { waitUntil: "networkidle", timeout: 60000 });
      await waitShell(page);
      await auditDialog(
        page,
        vp,
        () => clickScrollSafe(page, page.getByRole("button", { name: /simulacro/i }).first()),
        "dialog-simulacro",
        "SimulacroDialog",
      );

      await page.goto(BASE_URL + "/estudio", { waitUntil: "networkidle", timeout: 60000 });
      await waitShell(page);
      try {
        await clickScrollSafe(page, page.getByRole("button", { name: /Empezar repaso/ }).first());
        await page.getByRole("button", { name: "Ver respuesta" }).click({ timeout: 8000 });
        await page.waitForTimeout(400);
        const ov = await page.evaluate(FIND_OFFENDERS);
        const file = path.join(String(vp.w), "sesion-repaso.png");
        await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
        report.results.push({
          viewport: `${vp.w}x${vp.h}`,
          route: "sesion-repaso",
          ...ov,
          screenshot: file,
        });
        console.log(
          `${ov.docOverflow ? "✗ OVERFLOW" : "✓ ok     "} ${vp.w}x${vp.h} sesión de repaso`,
        );
      } catch (err) {
        console.log(`! skip    ${vp.w}x${vp.h} sesión de repaso: ${String(err).split("\n")[0]}`);
      }

      if (errors.length) {
        console.log(`  ⚠ ${errors.length} errores de consola en ${vp.w}px`);
        report.results.push({ viewport: `${vp.w}x${vp.h}`, route: "_console", errors });
      }
      await context.close();
    }

    await browser.close();
  } finally {
    proc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // windows a veces mantiene el dir un instante: no es crítico
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  const overflows = report.results.filter((r) => r.docOverflow).length;
  console.log(`\nHecho: ${report.results.length} comprobaciones, ${overflows} con overflow.`);
  console.log(`Capturas en ${OUT_DIR}/ · informe en ${OUT_DIR}/report.json`);
}

main().catch((err) => {
  console.error("Auditoría fallida:", err);
  process.exit(1);
});
