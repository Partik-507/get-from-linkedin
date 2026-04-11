

# VivaVault — Study OS + Dashboard + Homepage Multi-Tenant Rebuild

## Summary

Complete rebuild of three major modules: Study OS (1869-line monolith → modular 5-system OS with Google Calendar-quality interactions), Dashboard (398 lines → unified command center pulling data from all systems), and Homepage (multi-college tenant isolation). All built in parallel.

---

## Phase 1: Study OS — Layout Shell & Sidebar

Rewrite `StudyMode.tsx` outer structure. Fixed 220px sidebar (collapsible to 48px icon-only with tooltips). Sidebar: collapse toggle, 5 nav items with icons + shortcut badges + purple active pill, mini month calendar with event dots, "TODAY'S TASKS" section with top 3 checkable tasks. Top bar: date display, search input, streak badge, focus time badge, Quick Focus button (opens duration/mode modal before launching).

**Key change from current:** Quick Focus now opens a pre-launch modal (25/50/90/custom + Normal/Strict cards) instead of launching immediately.

## Phase 2: Study OS — Calendar System (Google Calendar Quality)

Complete calendar rebuild with 5 views: Day, Week, Month, Year, Agenda. View selector dropdown matches Google Calendar (Day/Week/Month/Year/Schedule/4 Days + Show weekends/declined/completed toggles).

- **Week view (default):** 7 columns, hourly gridlines 12AM-11PM, red current-time line with dot, all-day events row above grid
- **Day view:** single full-width column, overlapping events split proportionally
- **Month view:** 6-row grid, event pills, "+X more" popover
- **Agenda view:** infinite scroll grouped by date
- **Event blocks:** 20% opacity bg, 3px left border, white text, hover brightens
- **Inline quick-create:** Click empty slot → popover with Event/Task/Appointment tabs, title input, time pre-filled, More Options button
- **Full event form (large modal):** Title, date/time with timezone + all-day + recurrence, Google Meet button, location, multiple reminder rows (type + number + unit), calendar selector, visibility, status, rich text description, guests panel
- **Drag-and-drop:** Drag to move events, drag bottom edge to resize, Firestore update on drop
- **Conflict detection:** Orange border on overlapping events
- **Google Calendar sidebar:** MY CALENDARS section (Personal/Birthdays/Tasks with colored checkboxes), OTHER CALENDARS section with "+ Connect Google Account" (OAuth stub for now, functional UI)

## Phase 3: Study OS — Tasks System

Left sub-panel (200px) with Today/Inbox/Projects/Upcoming views. Right main panel.

- **Today:** Overdue (red) + Today + Later Today sections, summary line "X tasks · estimated Y hours"
- **Inbox:** Unscheduled tasks, quick-add input, Schedule button → date picker
- **Projects:** Accordion sections with progress bars
- **Upcoming:** 14-day chronological grouped by day
- **Quick capture (T key):** Slide-down input with NLP parsing ("tomorrow 3pm high" → parsed fields)
- **Task detail panel:** Right-side sheet with all editable fields, subtasks, "Schedule to Calendar" button showing free slots for next 7 days
- **Task row:** Checkbox with strikethrough animation, priority color dot, due time, project tag, hover actions (play focus, delete)

## Phase 4: Study OS — Habits + Daily Check-in

- **Habit rows:** Icon in colored circle, name, streak (🔥 for 7+), 7-day circles (filled purple/outlined gray), today's circle larger with checkmark
- **New Habit modal:** Name, emoji picker, 8 color swatches, frequency selector, time of day
- **Daily check-in modal:** First open each day → full-screen overlay with greeting, yesterday's habits retroactive logging, today's habits, pick top 3 tasks, "Start My Day" button
- **Calendar integration:** Habit completion dots on month/week views

## Phase 5: Study OS — Focus Engine (Full Rebuild)

- **Entry:** requestFullscreen(), fixed z-[9999] overlay
- **Layout:** Wallpaper bg (cover) + rgba(0,0,0,0.45) overlay + centered content
- **Timer:** 3 styles (Minimal digits, Ring SVG arc, Flip CSS animation)
- **Audio player:** Bottom-left compact player with soundscape selector popover (8 presets + upload)
- **Wallpaper selector:** Bottom-right with category grid (Nature/Abstract/Minimal/Space/Dark/Light) + upload
- **Auto-hide controls:** 3s mouse inactivity → fade to 0.1 opacity, 500ms transition
- **Strict mode exit:** Full blocking overlay, 15s countdown, 40 motivational messages (5 themes), Return/End buttons after countdown
- **Break screen:** After 25/50 min, breathing exercise (animated expand/contract circle), movement prompts, mindfulness moments. Non-skippable in strict.
- **Post-session summary:** Duration, task status, 3 mood emojis, quick note field, save to Firestore

## Phase 6: Study OS — Analytics Brain

5 cards stacked vertically:

1. **Focus Heatmap:** 52×7 grid (14px squares, 2px gap), purple intensity scale, hover tooltips with date/time/sessions, month labels
2. **Daily Patterns:** 24-bar chart (hourly avg focus), peak hour interpretation sentence
3. **Task Completion Rate:** 8-week grouped bar chart (created vs completed), percentage, burnout warning if <60% for 2 weeks
4. **Habit Consistency Matrix:** Habits × 8 weeks table, colored fill cells, hover percentages
5. **Session Quality Trends:** Dual-axis line chart (focus time purple, mood orange), burnout detection warning

All computed client-side from cached Firestore data.

## Phase 7: Dashboard Rebuild

Complete rewrite of `Dashboard.tsx` as unified command center.

- **Row 1:** 4 metric cards (Focus Time today with 7-day sparkline, Streak with longest, Tasks X/Y with progress bar, Habits X/Y with colored dots)
- **Row 2:** Focus Heatmap (50%), Upcoming Events list (25%), Today's Habits with check buttons (25%)
- **Row 3:** Per-Course Progress cards with progress bars + Continue button (60%), Recent Notes list (40%)
- **Row 4:** Recent Activity Feed (full-width, 20 items, grouped by date)
- **Max 5 Firestore reads:** user doc, today's habitLog, today's focusSessions, today's tasks, enrolled courses

## Phase 8: Homepage Multi-College + Global UI Polish

**Multi-tenant:**
- Post-login college selection screen if no `selectedCollegeId` in user doc
- College data at `/colleges/{collegeId}` with name, type, logoUrl, adminUIDs
- Homepage filters scoped to `selectedCollegeId`
- "Switch Institution" in profile dropdown
- Admin panel scoped by college

**Course cards:** Replace "View" with "Continue" (purple) + "Resources" (gray outlined)

**Global UI fixes:**
- Remove box-in-box layouts, single border-radius 12-16px, single box-shadow per card
- Consistent spacing (8px base, 20-24px card padding, 16-20px grid gaps, 32-40px section gaps)
- Font scale: titles 28-32px, sections 18-20px, card titles 16px, body 14-15px, captions 12-13px
- 200ms sidebar collapse, 150ms modal scale-up, 200ms tab fades, 100ms hover states
- Toast: bottom-right, 4s auto-dismiss, colored left border, slide in/out
- Loading skeletons with shimmer everywhere
- Empty states with icon + message + CTA button

---

## Files Modified/Created

| File | Action |
|------|--------|
| `src/pages/StudyMode.tsx` | **Complete rewrite** — modular 5-system OS |
| `src/pages/Dashboard.tsx` | **Complete rewrite** — unified command center |
| `src/pages/Index.tsx` | **Update** — multi-college filter scoping |
| `src/contexts/AuthContext.tsx` | **Update** — add selectedCollegeId check |
| `src/lib/firestoreSync.ts` | **Update** — add college CRUD, scoped queries |
| `src/index.css` | **Update** — animations, font scale, spacing system |
| `src/components/Layout.tsx` | **Update** — global UI consistency |

## Technical Notes

- StudyMode stays as single file but with extracted render functions for each system (renderCalendar, renderTasks, etc.) — same pattern as current but rebuilt
- Calendar event blocks use inline styles for color theming (20% opacity bg, 3px left border)
- Drag-and-drop uses native HTML drag events with pointer position calculation for time slot mapping
- All analytics computed client-side from already-fetched Firestore data — zero additional reads
- Multi-college filtering changes Index.tsx queries to scope by selectedCollegeId
- Firestore offline persistence already enabled — dashboard loads from cache instantly
- 40 motivational messages hardcoded in JS array (5 themes × 8 messages)
- Timer flip animation uses CSS `transform: rotateX()` with `perspective`

