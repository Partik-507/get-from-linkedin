

# VivaVault — Mega Feature Expansion Plan

## Summary

This plan covers 7 major workstreams built in parallel: (1) Notes OS — Notion/Obsidian-style workspace, (2) Study Mode — replacing Focus Mode with calendar + habit tracker + timer, (3) Dynamic academic hierarchy with cascading filters, (4) Homepage redesign with new layout, (5) Course access control (public/private/premium), (6) Demo/guest timer system, (7) Admin panel expansion + Bookmarks Firestore migration.

---

## 1. Notes OS (`src/pages/Notes.tsx` — full rewrite)

**Left sidebar**: Folder/file tree with nested folders, drag-and-drop reorder, rename/delete/move context menu, search, expand-all/collapse-all, "New Folder" and "New Page" buttons.

**Main editor**: TipTap block-based editor with slash command menu (`/` trigger) for: Heading 1/2/3, Paragraph, Bullet List, Numbered List, Checkbox, Quote, Code Block, Divider, Table, Image, Embed, Internal Link. Rich paste detection (preserve HTML from clipboard). Toolbar: bold, italic, underline, strikethrough, link, code, highlight.

**Tab system**: Multiple notes open as tabs at top of editor area. Click tab to switch, X to close.

**Note properties panel**: Branch, Level, Course, Tags, Created/Modified dates. Collapsible metadata section at top of each note.

**Graph view** (`src/components/NotesGraph.tsx`): Visualize note links as an interactive node graph. Notes that reference each other are connected. Uses a simple force-directed layout with SVG/Canvas.

**Canvas view**: Freeform board where user can place note cards, text blocks, images. Drag to position, resize. Stored as JSON layout in Firestore.

**Version history**: Each note save creates a snapshot. User can view past versions and restore. Stored in Firestore subcollection `/users/{uid}/notes/{noteId}/versions/{versionId}`.

**Import**: Support markdown (.md) and HTML file import via file picker. Parse and insert into editor.

**Public/Private + Admin approval**: "Share publicly" button sends note to admin review. Admin approves from Admin panel. Public notes visible to all users.

**Firestore storage**: All notes in `/users/{uid}/notes/{noteId}` with fields: title, content (HTML), folderId, parentFolderId, tags[], courseId, branchId, levelId, isPinned, isPublic, status (draft/pending/approved), createdAt, updatedAt. Folders in `/users/{uid}/noteFolders/{folderId}`.

---

## 2. Study Mode (`src/pages/StudyMode.tsx` — NEW, replaces Focus Mode)

**Route**: `/study` (replaces `/focus`). Update navbar: "Focus" → "Study OS".

**Calendar view**: Day, Week, Month views. Central schedule area with time slots. Click to create study block. Drag to move/resize blocks.

**Study block model**: title, description, branchId, levelId, courseId, projectId, topic, sessionType (study/review/quiz/flashcard/project), startTime, endTime, duration, repeatRule (none/daily/weekly), reminderMinutes, priority (low/normal/high), tags[], status (planned/in-progress/completed/missed).

**Timer integration**: Each block has a "Play" button → starts countdown timer for that session's duration. Pause/resume/stop/complete controls. Records actual time studied.

**Habit tracking section** (side panel): Daily check-in, current streak, consistency % (last 7/30 days), goals with completion %, missed sessions count.

**Analytics**: Planned vs completed time chart (bar chart), weekly/monthly summaries, time-per-course breakdown.

**Quick-add floating button**: "+" FAB in bottom-right → opens quick study block creation form.

**Calendar toolbar**: Jump to today, switch views (day/week/month), filter by course/branch, search upcoming sessions.

**Session drawer**: Click any block → opens side drawer with full details, edit, delete, start timer.

**Includes existing Focus features**: Strict/Normal mode, music player, wallpaper picker, dark/light toggle — accessible from within a study session or standalone.

**Firestore**: `/users/{uid}/studySessions/{id}`, `/users/{uid}/studyGoals/{id}`, `/users/{uid}/studyHabits/{id}`.

---

## 3. Dynamic Academic Hierarchy

### Admin side (`Admin.tsx` — new sections):
- **Branch Management**: CRUD for branches (name, shortName, color). Stored in `/branches/{id}`.
- **Level Management**: CRUD for levels within a branch (name, branchId, order). Stored in `/levels/{id}`.
- **Course creation form**: Must select branch + level + type (course/project) + access type (public/private/premium). Fields: title, abbreviation, description, iconColor, status, accessType, unlockConditions.

### Homepage cascading dropdowns (`Index.tsx`):
- Branch dropdown → on change, Level dropdown filters to only levels with matching `branchId` → on change, course grid filters.
- Level dropdown options are dependent on selected branch.
- All filtering is instant, no page reload.

### Firestore sync (`firestoreSync.ts`):
- Add CRUD functions for branches, levels.
- Add `createBranch`, `updateBranch`, `deleteBranch`, `createLevel`, `updateLevel`, `deleteLevel`.

---

## 4. Homepage Redesign (`Index.tsx`)

**Layout change**:
- Left section (40%): App branding ("VivaVault" + description), cascading dropdown filters (Branch → Level → Type)
- Right section (60%): Global search bar (full width, searches courses/notes/resources/questions), feature box with quick access cards for Study OS, Notes OS, Resources, and a "Contribution" dropdown button (Submit Questions, Share Notes, Share Resources)

**Navbar update** (`Layout.tsx`):
- Links: Home, Dashboard, Study OS, Notes OS, Resources, Profile
- Remove "Focus" and "Bookmarks" from top nav (accessible via dashboard/profile)
- Dashboard is a primary nav item

**Course card CTA update** (`CourseCard.tsx`):
- Primary button (Continue/Enroll): 70% width, dominant styling
- Secondary button (Resources): 30% width, subtle outline

---

## 5. Course Access Control

### Course model extension:
- Add `accessType: "public" | "private" | "premium"` field
- Add `unlockConditions: { loginRequired: boolean, subscriptionRequired: boolean }`

### Frontend behavior:
- **Public**: Fully visible and accessible
- **Private**: Hidden from all non-admin users (filtered out on frontend, not returned for non-admins)
- **Premium**: Visible as locked card with lock icon. Click → check conditions → if not logged in: "Sign in to access" prompt. If logged in but no subscription: "Upgrade" prompt. If conditions met: unlock and behave as normal.

### Admin panel:
- Access type selector in course creation/edit form
- Toggle between public/private/premium per course

---

## 6. Demo/Guest Access System

### Auth page (`Auth.tsx`):
- Two options: "Sign In" and "Try Demo"
- Demo starts a 10-minute session

### Demo session:
- `sessionStorage` tracks demo start time
- Persistent countdown timer in navbar (visible as "Demo: 9:42 remaining")
- Limited permissions: can browse courses (public only), view questions (limited), no bookmarks/notes/submissions
- All content cards show "Sign in to access" for restricted features
- When timer expires: warning modal → redirect to `/auth`
- No Firestore writes for demo users

### Backend enforcement:
- `AuthContext` has `isDemo` flag
- `AuthGate` checks demo expiry on every route change

---

## 7. Admin Panel Expansion + Bookmarks Migration

### Admin sidebar navigation (`Admin.tsx`):
- Sections: Overview, Branches & Levels, Courses, Questions Import, Notes Management, Resources, Notifications, User Submissions, Access Requests, Admin Management

### Admin Overview dashboard:
- Stats cards: total users, courses, questions, pending submissions
- Quick action buttons

### Branch/Level CRUD:
- Create/edit/delete branches with color picker
- Create/edit/delete levels with branch selector and order

### Course CRUD:
- Full form: title, abbreviation, type, branch, level, description, iconColor, status, accessType, unlockConditions, guestPreviewFields
- Lock/unlock toggle

### Notifications composer:
- Title, message, target (All/specific course), send button
- History list

### Bookmarks migration (`Bookmarks.tsx`):
- Replace `localStorage` with Firestore via `saveBookmarksToFirestore`/`loadBookmarksFromFirestore`
- Fallback to localStorage for guests
- Update `VivaPrep.tsx` bookmark save/load to use Firestore when user is signed in

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/StudyMode.tsx` | Calendar + habit tracker + timer workspace |
| `src/components/NotesGraph.tsx` | Graph view for note relationships |
| `src/components/NotesCanvas.tsx` | Freeform canvas for notes |
| `src/components/StudyCalendar.tsx` | Calendar component for study blocks |
| `src/components/StudySessionDrawer.tsx` | Side drawer for session details |

## Files to Heavily Modify

| File | Changes |
|------|---------|
| `src/pages/Notes.tsx` | Complete rewrite — Notion-style workspace |
| `src/pages/Index.tsx` | New layout (40/60), cascading filters, contribution dropdown |
| `src/pages/Admin.tsx` | Sidebar nav, branch/level CRUD, course CRUD, notifications, overview |
| `src/pages/Auth.tsx` | Add "Try Demo" option with 10-min session |
| `src/pages/Bookmarks.tsx` | Firestore migration |
| `src/pages/Dashboard.tsx` | Firestore data source for streaks/activity |
| `src/pages/VivaPrep.tsx` | Firestore bookmarks, course sidebar |
| `src/components/Layout.tsx` | Updated nav links (Dashboard, Study OS, Notes OS, Resources), demo timer |
| `src/components/CourseCard.tsx` | 70/30 button split, premium/private states |
| `src/components/MobileBottomNav.tsx` | Updated nav items |
| `src/lib/firestoreSync.ts` | Branch/Level CRUD, study session CRUD, notes CRUD |
| `src/contexts/AuthContext.tsx` | Add `isDemo`, demo timer logic |
| `src/App.tsx` | Add `/study` route, remove `/focus` + `/timer`, add redirects |

## Dependencies to Add
- None new — existing TipTap, framer-motion, Firebase, react-markdown cover everything. Graph view uses SVG with basic force simulation (no external lib needed).

---

## Technical Notes

**Cascading dropdowns**: When branch changes, reset level to "all". Filter `levels` array by `branchId` before rendering level dropdown options. Course grid re-renders via `useMemo`.

**Notes folder tree**: Recursive component rendering. Each folder node has children (sub-folders and notes). Drag-and-drop via HTML5 drag API (`onDragStart`, `onDragOver`, `onDrop`). Update `parentFolderId` in Firestore on drop.

**Study calendar**: Custom grid layout. Day view = 24 hour rows. Week view = 7 columns × 24 rows. Month view = traditional calendar grid with event dots. Blocks rendered as absolutely positioned divs within the grid.

**Demo timer**: `sessionStorage.setItem("vv_demo_start", Date.now())`. On every route change and every 30 seconds, check if 10 minutes elapsed. If yes, clear session and redirect.

**Graph view**: Simple force-directed layout. Parse note content for `[[note-title]]` patterns to detect links. Nodes = notes, edges = links between them. Render with SVG circles and lines. Basic spring physics for positioning.

**Course card 70/30 split**: Primary button gets `basis-[70%]`, secondary gets `basis-[30%]` within `flex` container.

