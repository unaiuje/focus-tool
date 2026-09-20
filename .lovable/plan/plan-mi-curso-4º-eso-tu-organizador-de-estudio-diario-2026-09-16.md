# Plan: "Mi Curso 4º ESO" — tu organizador de estudio diario

Una app web en español, simple y directa, pensada para usarse 10-15 minutos al día. Diseñada para tu perfil: te cuesta empezar y concentrarte, pero aprendes rápido. Objetivo: máxima nota en 4º y base sólida para Bachillerato.

## Las técnicas de estudio que la app aplicará (investigación)

1. **Regla de los 2 minutos / "solo empieza"** — para vencer la procrastinación: cada sesión empieza con una micro-tarea ridículamente fácil. La app siempre te dice UNA sola cosa para empezar.
2. **Pomodoro** — 25 min de foco + 5 de descanso, para tu problema de concentración. Temporizador integrado.
3. **Repetición espaciada** — la app programa repasos automáticos (1 día, 3 días, 1 semana antes del examen) para no estudiar todo el día anterior.
4. **Active recall** — en vez de releer, auto-test: al cerrar un tema marcas "¿me lo sé? (fácil / regular / mal)" y la app te lo vuelve a poner si va mal.
5. **Prioridad simple (urgente/importante)** — sin sistemas complicados: la app ordena sola qué toca hoy según exámenes cercanos y asignaturas flojas.

## Qué verás al abrirla cada día (pantalla principal)

- **"Hoy toca"**: 3-5 tareas concretas ya ordenadas (ej: "Pomodoro de Mates — tema 3", "Repaso de Inglés"). Solo eso, sin ruido.
- **Botón Empezar**: abre el temporizador Pomodoro con la tarea elegida. Al terminar, marcas cómo fue.
- **Racha y barra de progreso semanal**: datos visuales simples (días seguidos estudiando, % de tareas hechas).

## Otras pantallas

- **Asignaturas**: tus 11 asignaturas (Mates, Castellano, Catalán, Sociales, Inglés, Tecno, Economía, Filosofía, Ética, Ed. Física) con color propio. En cada una: temas, tareas y notas de exámenes.
- **Calendario de exámenes**: añades fecha + temas; la app genera sola el plan de repaso espaciado los días previos.
- RECORDATORIO QUE TAMBIEN TENGO EXTRAESCOLARES
- **Notas y progreso**: registras la nota de cada examen y ves gráficas por asignatura (visual con datos, como pediste): evolución de notas, tiempo de estudio por semana, asignaturas que más atención necesitan.
- **Plan semanal**: vista de la semana para repartir carga y no saturar días.

## Diseño

Limpio y directo, sin distracciones (tú mismo dices que te distraes fácil): fondo claro, mucha calma visual, una sola acción principal en cada pantalla, gráficas sencillas. Sin gamificación pesada ni adornos.

## Detalles técnicos

- TanStack Start + Tailwind CSS v4, todo en español.
- Datos guardados **en tu propio dispositivo** (sin registro ni login: abres y usas, cero fricción). Si más adelante quieres usarla desde móvil y PC a la vez, se puede añadir Lovable Cloud con cuenta.
- Gráficas con Recharts. Temporizador Pomodoro con aviso sonoro.
- Rutas: `/` (hoy), `/asignaturas`, `/calendario`, `/progreso`, `/semana`.
- Datos de ejemplo iniciales con tus asignaturas reales para que la veas funcionando desde el primer momento.

## Fases

1. Estructura, diseño base y pantalla "Hoy" con Pomodoro.
2. Asignaturas, tareas y calendario de exámenes con plan de repaso automático.
3. Registro de notas y pantalla de progreso con gráficas.
4. Revisión visual final y pulido.
