

# VivaVault — Notes OS Nav Integration, Editor Typography, & Study OS Complete Rebuild

## Summary

Three major workstreams executed in parallel:
1. **Notes OS navbar integration** — Connect Notes page to the main `<Layout>` navbar while keeping its full-bleed three-panel design
2. **Editor typography & animations** — Add Lora serif font for note content, smooth sidebar/template/view transitions
3. **Study OS complete rebuild** — Transform the 682-line StudyMode into a five-system productivity OS (Calendar, Tasks, Habits, Focus Engine, Analytics)

---

## Phase 1: Notes OS Navbar Integration

**Problem:** Notes.tsx renders `h-screen flex flex-col` with no `<Layout>` wrapper, so the main VivaVault navbar and mobile bottom nav are absent on the /notes route.

**Solution:** Wrap Notes content inside `<Layout>` but override the main area to be full-bleed (no max-w-7xl constraint, no py-6 padding). Add a `fullBleed` prop to Layout that skips the `max-w-7xl mx-auto px-4 py-6` wrapper on `<main>`.

**Files modified:**
- `src/components/Layout.tsx` — Add `fullBleed?: boolean` prop. When true, render `<main className="flex-1 flex flex-col overflow-hidden">` instead of the padded container. Also add `hideBottomNav?: boolean` prop.
- `src/pages/Notes.tsx` — Wrap return in `<Layout fullBleed hideBottomNav>`, remove the outer `h-screen` div, adjust to `flex-1 flex flex-col` so it fills the space below the navbar.

## Phase 2: Editor Typography & Animations

**Add Lora font:**
- `index.html` — Add Google Fonts link for Lora (400, 500, 600, 700)
- `src/index.css` — Add `.font-editor { font-family: 'Lora', serif; }` utility class. Update `.tiptap-editor .ProseMirror` to use `font-family: 'Lora', serif` with `line-height: 1.75` and `font-size: 16px`. Update heading styles inside editor to use Lora bold. Add `letter-spacing: -0.01em` for readability.

**Animations:**
- `src/index.css` — Add keyframes and classes:
  - `.sidebar-transition { transition: width 200ms ease, opacity 150ms ease; }`
  - `.view-fade-enter { animation: fade-in 0.2s ease-out; }`
  - Template picker: `@keyframes scale-up { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`
- `src/components/notes/NotesSidebar.tsx` — Add `transition-all duration-200` to sidebar width container
- `src/components/notes/NoteEditor.tsx` — Apply `font-editor` class to the TipTap content area via the editor's `editorProps.attributes.class`

## Phase 3: Study OS — Calendar System

**Complete rewrite of `src/pages/StudyMode.tsx`** into a Study OS shell with five-system sidebar navigation.

**Layout:** Fixed 220px left sidebar with Calendar/Tasks/Habits/Focus/Analytics nav links, mini month calendar, and today's top 3 tasks. Top bar with date, search, streak, focus time, quick focus button. Main content area renders the active system view.

**Calendar features:**
- Day view: vertical 24h timeline with hourly gridlines, current time red line (updates every minute via setInterval), click-drag to create events, drag to move/resize events
- Week view: 7-column layout with vertical timelines (default view)
- Month view: grid with event pills, "+X more" popover, click day → switch to day view
- Agenda view: infinite scroll list of upcoming events grouped by date

**Event model:** `CalendarEvent` interface with title, description, startTime/endTime (ISO UTC), allDay, eventType (study/assignment/exam/lecture/meeting/personal/break/custom), color, recurrenceRule, recurrenceExceptions, linkedTaskId, focusModeEnabled, focusMode (strict/normal), reminders[], locationOrUrl, createdAt, updatedAt

**Event creation:** Quick-create popover on click empty slot (title + Enter), double-click opens full modal with all fields, FAB button always opens full modal

**Recurrence:** Store rule object `{ frequency, interval, daysOfWeek, endDate }`, expand instances client-side with a `expandRecurrence()` utility function. Exceptions stored as override map keyed by date string.

**Conflict detection:** On create/move, check for time overlap with existing events. Show orange border warning on conflicting events.

**Firestore:** `users/{userId}/calendarEvents/{eventId}` — all times stored as UTC ISO strings

## Phase 4: Study OS — Tasks System

**Task model:** `Task` interface with title, description, dueDate, dueTime, priority (none/low/medium/high/urgent), status (todo/in_progress/done/cancelled), projectId, tags[], estimatedDuration, energyLevel (low/medium/high), subtasks[], recurrenceRule, linkedEventId, createdAt, completedAt, position

**Views:** Today (due today + overdue), Inbox (no due date assigned), Projects (grouped by project with sections and progress bars), Upcoming (next 14 days chronological)

**Quick capture:** Press `T` anywhere in Study OS → floating input with natural language parsing. Parse "tomorrow", "next monday", "at 5pm", "high priority", "in [project]" using regex patterns.

**Schedule to calendar:** Button on any task opens scheduling panel showing free time slots for next 7 days. Recommends best slot based on task duration, priority, and user's peak hours from analytics. Creates linked calendar event.

**Firestore:** `users/{userId}/tasks/{taskId}`, `users/{userId}/projects/{projectId}`

## Phase 5: Study OS — Habit Tracker

**Habit model:** `Habit` with name, icon (emoji), color, frequency (daily/specific_days/x_per_week/x_per_month), daysOfWeek[], timesPerPeriod, timeOfDay, streakCount, longestStreak, archived, createdAt

**Habit logs:** Single document per day at `users/{userId}/habitLogs/{YYYY-MM-DD}` containing `{ [habitId]: boolean }` map. One read per day.

**UI:** Scrollable list of habits with icon, name, streak (🔥 for 7+ days), last-7-days circles (filled/empty). Click today's circle to complete. 24h retroactive window for yesterday.

**Morning check-in:** Modal on first daily open — mark yesterday's habits, set today's top 3 tasks from inbox. Store `lastCheckinDate` in localStorage.

**Streak freezes:** 2 per month on paid plans. Track in habit document.

**Calendar integration:** Habits show as colored dot markers on calendar month/week views below date numbers.

## Phase 6: Study OS — Focus Engine

**Entry points:** Calendar event with focusMode → notification → click opens focus. Click any focus-enabled event → "Start Focus" button. Quick Focus button in top bar → ad-hoc session.

**Fullscreen interface:** Uses `document.documentElement.requestFullscreen()`. Three layers:
- Background: wallpaper with dark overlay (preloaded on Study OS mount)
- Middle: ambient audio player with presets (Lo-fi, Brown noise, Rain, Café, Forest, Ocean, Binaural, Classical) — plays via `<audio>` element with `loop`
- Foreground: session title, timer (3 display styles: Minimal digits, Ring progress SVG, Flip clock CSS), linked task checkbox, action buttons (Skip 5min, Pause [normal only], End), session counter

**Timer styles:** User picks default in settings. Minimal: large monospace digits. Ring: SVG circle with `stroke-dasharray/dashoffset` animation. Flip: CSS flip animation on digit change using `transform: rotateX()`.

**Strict mode:** Intercept Escape, show 15s countdown overlay with curated motivational messages (40 messages, 5 themes), then show Return/End buttons. Record abandoned sessions.

**Post-session summary:** Duration, task completed?, mood (3 emojis: struggled/okay/flow), quick note text field.

**Break enforcement:** After 25min (Pomodoro) or 50min (long), auto-pause with break screen showing breathing exercise (animated circle), movement prompt, or mindfulness moment. Not skippable in strict mode.

**Firestore:** `users/{userId}/focusSessions/{sessionId}` with linkedEventId, linkedTaskId, startTime, endTime, plannedDuration, actualDuration, mode, abandoned, moodRating, note, soundscape, wallpaper

## Phase 7: Study OS — Analytics Brain

**Five sections computed entirely client-side from cached data:**

1. **Focus Heatmap:** GitHub-style 365-day grid. Colors: gray (0min), light purple (1-30), medium (30-90), deep (90-180), near-black (180+). Hover shows date + time + sessions.

2. **Daily Patterns:** Bar chart showing avg focus time per hour across 30 days. One-sentence AI-free interpretation generated by simple rules (e.g., "You focus best between 9-11 AM").

3. **Task Completion Rate:** Weekly bars of created vs completed tasks. Alert if <60% for 2 consecutive weeks.

4. **Habit Consistency Matrix:** Table of habits × weeks with fill-based completion visualization.

5. **Session Quality Trends:** Line chart of mood ratings over time vs focus time. Burnout detection when lines diverge.

**Analytics cache:** `users/{userId}/analytics/cache` — single document updated on session complete with precomputed aggregates. Analytics view loads with 1 read.

## Phase 8: Study OS — Smart Scheduling, Morning Briefing, Settings

**Smart Scheduling Engine:** Browser-side deterministic algorithm. Inputs: free calendar slots (next 7 days), peak hours (from analytics), unscheduled tasks with priority/duration. Algorithm: sort tasks by priority × urgency, place each in the best available slot that matches the user's energy pattern. Output: proposed event list shown in "Smart Week Plan" panel. Accept all or individual suggestions.

**Morning Briefing:** 5-second overlay on first daily open. Shows: greeting, date, tasks due today, first session today, habits to complete, current streak. Skippable by keypress. Uses `lastBriefingDate` in localStorage.

**Settings:** Stored at `users/{userId}/settings` — defaultFocusMode, defaultTimerStyle, workingHoursStart/End, dailyFocusGoalMinutes, morningBriefingEnabled, pomodoroMode, shortBreakDuration, longBreakDuration, sessionsBeforeLongBreak, defaultSoundscape, defaultWallpaper, timeZone.

**Keyboard shortcuts:** `T` quick task capture, `Ctrl+K` search across all systems, `Ctrl+Shift+F` focus search, `1-5` switch between system views.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/Layout.tsx` | Add `fullBleed` and `hideBottomNav` props |
| `src/pages/Notes.tsx` | Wrap in `<Layout fullBleed hideBottomNav>`, adjust height |
| `src/pages/StudyMode.tsx` | Complete rewrite — 5-system Study OS with sidebar, calendar, tasks, habits, focus engine, analytics |
| `src/index.css` | Add Lora font styles for editor, sidebar transition, view animations |
| `index.html` | Add Lora Google Font import |
| `src/components/notes/NoteEditor.tsx` | Apply `font-editor` class to TipTap content |

## Technical Notes

- All Study OS data uses Firebase Firestore with offline persistence (already enabled)
- Habit logs use one-doc-per-day pattern to minimize reads
- Analytics cache is a single precomputed document
- Recurrence expansion is pure JS — no backend needed
- Focus Engine timer uses `requestAnimationFrame` for smooth ring animation
- Smart scheduling is deterministic sorting + greedy slot filling — no AI API calls
- Morning briefing and check-in modals use localStorage date tracking to show once per day
- Study OS wraps in `<Layout>` normally (not full-bleed) since it has standard page structure

