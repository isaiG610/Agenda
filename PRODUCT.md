# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **The course teacher**, during a 10–15 minute live demo of the final project for
  "Programación Orientada a Eventos" (IH050, 3rd semester, Computer Science, Universidad de
  Guadalajara, CUT). The teacher is evaluating, not scheduling: they need to see each rubric
  point happen on screen and understand it while the students explain it.
- **The two students** (Bryan Zuniga De Leon, Isai Gonzalez Nunez), who use the dashboard to
  drive the demo, and who must be able to explain and defend every line of its code.

## Product Purpose

A web agenda for two kinds of items, **meetings** (title, date/time, location, description) and
**reminders** (title, date/time, minutes-before alert, description), with create, read, update
and delete. Its real purpose is to show an event-driven architecture working live: server
timers, CRUD events, a worker thread and Server-Sent Events, all visible as on-screen updates
with no page reload.

Success means that during the demo the teacher can see, without being told where to look:
the dashboard running; a new **live reading** every 10 s; CRUD changes that persist in MySQL
across a server restart; and the table, chart and counters re-rendering after every change,
including in two browser tabs at once and with reminder alerts appearing as pop-ups.

## Positioning

Not a competing calendar product. Every visible change on the dashboard maps to a named
event in the course's event catalog (Timer, System Load, Keyboard, Mouse, Focus/Blur,
Cleanup, Threshold alert, Unhandled exception, CRUD Data Change, GUI render, Worker message).
The interface works as an event monitor: it makes the event flow behind each update legible.

## Operating Context

- Shown live in a classroom, driven by the students while they narrate. The display is
  **undecided**: it could be a projector or a laptop screen, so treat both as possible.
- Internet is available in the classroom, but the app **must still work fully offline**.
  Nothing it needs at runtime may come from the network (no web fonts, CDNs or remote assets).
- Run locally with `npm run dev` at http://localhost:3000, against a local MySQL/MariaDB.
- The demo follows the "Live demo script" in `README.md` and the checklist in section 12 of
  `CLAUDE.md`, which includes a server restart, two tabs open at once, a reminder
  alert, invalid input, MySQL turned off, and Ctrl+C shutdown.
- Individual defense: Bryan presents Event 01 (Timer / live readings), Isai presents Event 10
  (CRUD Data Change). Those two flows must be easy to point at on screen.

## Capabilities and Constraints

- Dashboard regions: item form (type-dependent location / minutes-before fields, Save, Cancel,
  hotkey hint), items table with Edit/Delete and a hover details bar, hand-drawn canvas bar
  chart (items per day, next 7 days) with mouse tooltip, meeting/reminder counters, Live
  readings panel (current values plus last 10 readings), Recent activity list (newest first),
  toast alerts, connection status.
- Fixed stack: Node.js 20+ ES Modules, Express 5, mysql2, dotenv. Frontend is plain HTML, CSS
  and browser-module JavaScript. **No other libraries**: no CSS framework, UI framework,
  chart library, icon library or bundler.
- Simplicity beats cleverness. Code must be readable by 3rd-semester JavaScript beginners
  who will defend it live. Style rules and file-size targets are in `CLAUDE.md` section 4.
- No features beyond those listed in `CLAUDE.md`.
- All UI copy, code and comments are in **English**.
- Form validation is intentionally done by the server models (no HTML `required`), so the
  "empty title → clear error message" demo step shows the server-side error.

## Brand Commitments

- Name: **Event-Driven Agenda** (subtitle references POE IH050). No logo or brand assets exist.
- Tone chosen by the team: **clean, calm, academic, trustworthy**.

## Evidence on Hand

- Four sample rows in `database/schema.sql` (2 meetings, 2 reminders, dates relative to `NOW()`).
- `README.md` with architecture, event catalog, rubric mapping and design decisions.
- No screenshots, user testimonials or external references exist; do not invent them.

## Product Principles

1. **Every event should be visible.** If something happens in the event system, the dashboard
   shows it, labeled clearly enough for the teacher to connect it to the rubric.
2. **Legible at a distance and under narration.** The teacher watches while listening, so the
   state of each region must be readable at a glance, on a projector or a laptop.
3. **Explainable over impressive.** Every visual choice must be something the students can build
   in plain CSS/JS and justify. No trick they couldn't defend.
4. **Works with no network.** The demo must not depend on classroom Wi-Fi.
5. **Calm, not flashy.** Live updates and alerts draw attention to themselves without making
   the rest of the dashboard noisy.
