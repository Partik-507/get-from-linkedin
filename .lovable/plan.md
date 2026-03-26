

# VivaVault — Major Feature Expansion Plan

## Important Constraint
Lovable runs React + Vite + Tailwind CSS. Next.js and server-side frameworks are not supported. The app will continue using Firebase for the backend and localStorage for client-side state. All file parsing happens client-side using JavaScript libraries.

---

## Overview of New Features

### 1. Flashcard Mode
New page at `/project/:projectId/flashcards`. Full-screen centered card with flip animation. Front = question, back = answer. Navigation arrows + spacebar to flip. "Known" / "Review Later" buttons. Progress bar showing deck completion. Cards marked "Review Later" are reshuffled before session ends. Summary screen at the end.

### 2. Quiz Mode
New page at `/project/:projectId/quiz`. If a question has a `choices` array in its data, render as multiple choice. Otherwise, render as free-text input. Score summary at end with correct/wrong highlighted. Retry full quiz or retry wrong-only. Results saved to localStorage per session.

### 3. Spaced Repetition (SM-2)
Implemented entirely in localStorage. Track per-question: ease factor, interval, repetitions, next review date. "Due Today" button on the homepage pulls questions due based on SM-2 schedule. Integrated into flashcard and quiz modes — performance updates the schedule.

### 4. Progress Tracking & Stats
New `/progress` page. Shows: total studied, total known, total flagged, study streak (consecutive days), and an activity heatmap calendar (built with a simple grid component). Each project card on the homepage shows a progress bar based on questions marked learned. All data from localStorage.

### 5. Enhanced Admin Import
**Universal Paste Box**: Large textarea in admin panel. On submit, the system scans raw text with regex + recursive `JSON.parse` to extract all valid JSON blocks. Everything else is discarded. Extracted questions shown in preview table before saving.

**Universal File Upload**: Accept any file type (.json, .js, .py, .txt, .csv, etc.). Read as text client-side, apply the same JSON extraction engine. For CSV files, show a column-mapping UI where admin maps CSV headers to question fields.

**Preview & Edit**: All importers show an editable preview table before final save. Admin can delete individual rows or edit fields inline.

### 6. PDF Export
Add "Export to PDF" button on each project's question page. Uses `jspdf` library (client-side). Generates a clean document: project title, numbered Q&A pairs, tips, tags. Downloads immediately. Added as a new dependency.

### 7. Enhanced Resources Section
Add in-portal viewer overlay for resources. YouTube URLs auto-embed as players. Google Drive links use iframe viewer. PDFs use embedded PDF viewer. Fallback "Open in New Tab" button. Admin can add resources via URL paste (auto-detect type) or as custom notes. Pinned resources appear first.

### 8. UI Polish Pass
- Consistent card styling with gradient border hover effects
- Smooth page transitions using framer-motion
- Better empty states with illustrations
- Improved mobile responsiveness on all new pages
- Toast notifications for all user actions
- Loading skeletons on all data-fetching pages

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Flashcards.tsx` | Flashcard mode with flip animation, Known/Review, progress bar, summary |
| `src/pages/Quiz.tsx` | Quiz mode with MCQ and free-text, scoring, retry |
| `src/pages/Progress.tsx` | Stats dashboard with heatmap, streaks, per-project progress |
| `src/lib/spacedRepetition.ts` | SM-2 algorithm + localStorage persistence helpers |
| `src/lib/jsonExtractor.ts` | Universal JSON extraction engine (regex + recursive parse) |
| `src/components/ResourceViewer.tsx` | In-portal overlay for viewing resources (YouTube, Drive, PDF, etc.) |
| `src/components/CsvMapper.tsx` | CSV column-mapping UI for admin import |
| `src/components/ActivityHeatmap.tsx` | Study activity calendar grid |
| `src/components/FlipCard.tsx` | Reusable flip card component with CSS 3D transform |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add routes: `/project/:id/flashcards`, `/project/:id/quiz`, `/progress` |
| `src/components/Layout.tsx` | Add Progress nav link |
| `src/pages/VivaPrep.tsx` | Add Flashcard + Quiz + Export PDF buttons at top. Wire SM-2 into studied tracking |
| `src/pages/Index.tsx` | Add progress bar per project card. Add "Due Today" smart review button |
| `src/pages/Admin.tsx` | Add universal paste box, enhance file upload to accept all types, add CSV mapper, add editable preview table |
| `src/pages/Resources.tsx` | Add in-portal viewer overlay, pinned resources, type-based embed rendering |
| `package.json` | Add `jspdf` dependency |

---

## Technical Details

**SM-2 Algorithm** (localStorage key: `vv_sm2`):
```
{ questionId: { ef: 2.5, interval: 1, reps: 0, nextReview: "2026-03-27" } }
```
After each review: if quality >= 3 (correct), increase interval and reps. If quality < 3, reset to interval=1. Update ease factor per SM-2 formula.

**JSON Extraction Engine**:
1. Scan input text for `[...]` and `{...}` blocks using bracket-matching
2. Attempt `JSON.parse` on each candidate
3. If array, flatten. If object, wrap in array
4. Recursively check nested keys for arrays of objects
5. Return all successfully parsed question objects

**PDF Export**: Use `jspdf` with `autoTable` plugin for clean formatting. Project name as header, questions numbered, answers below each, tips as indented bullets.

**Activity Heatmap**: 365-day grid (like GitHub). Each cell colored by study intensity. Data from localStorage key `vv_activity`: `{ "2026-03-26": 5 }` (count of questions studied that day).

**Flashcard Flip**: CSS `transform: rotateY(180deg)` with `perspective(1000px)` and `backface-visibility: hidden`. Transition 600ms ease.

