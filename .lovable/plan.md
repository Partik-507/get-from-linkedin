

# VivaVault — Complete Platform Rebuild Plan

## Summary

Full rebuild covering: build error fix, Firebase admin role system, unified dashboard, professional landing page, auth polish, focus mode, timer mode, notes page, flashcard admin, navbar overhaul, resource improvements, rich text rendering, light-mode default, and UI polish. All using existing React + Vite + Tailwind + Firebase stack.

---

## Phase 1: Critical Fixes

### 1a. Fix firebase.ts syntax error (line 7)
Fix the duplicate `authDomain` value. Change admin email to support Firestore-based admin roles.

### 1b. Firestore Admin Role System
- Create an `admins` Firestore collection storing `{ email: string, grantedBy: string, grantedAt: timestamp }`
- Update `AuthContext.tsx`: check if `user.email` exists in `admins` collection (instead of hardcoded `ADMIN_EMAIL`)
- Add admin management section in `Admin.tsx`: list admins, add new admin by email, remove admin
- Seed initial admin email "partik" (user will need to sign up with this email in Firebase Auth)

### 1c. Default to Light Mode
- Change `ThemeContext.tsx` default from `"system"` to `"light"`
- Remove "System" option from theme toggle — only Light and Dark

---

## Phase 2: Auth & Landing Page

### 2a. Professional Landing Page (`src/pages/Landing.tsx`)
- New route `/` for unauthenticated users — the current `Index.tsx` becomes the authenticated home
- Hero section with gradient text, app description, CTA buttons
- Feature cards highlighting: Flashcards, Quiz Mode, PDF Export, Resources, Bookmarks, Progress Tracking, Focus Mode, Categories
- Clean light-mode-first design with modern spacing and typography
- Footer with links

### 2b. Auth Page Polish (`Auth.tsx`)
- Redesign Google button with official Google colors/logo
- Redesign GitHub button with GitHub's dark style
- Add **Forgot Password** flow using Firebase `sendPasswordResetEmail`
- Guest banner: when browsing as guest, show a persistent top banner "Sign in with your student email to unlock all features"

---

## Phase 3: Unified Dashboard

### 3a. Merge Dashboard + Progress (`Dashboard.tsx`)
Combine all content from both pages into one unified hub:
- **Stats row**: Total studied, Due today, Current streak, Total reviews, Overall mastery, Longest streak, Flagged
- **Activity heatmap** (from Progress page)
- **Streak tracking** with motivational popups on day 1 and milestone days (day 7, 30, etc.)
- **Preparation progress** per project with progress bars
- **Bookmarked questions** card
- **Your submissions** card
- Remove `/progress` route entirely — redirect to `/dashboard`

### 3b. Navbar Overhaul (`Layout.tsx`)
- **User profile menu**: Avatar dropdown showing name, email, "View Profile", "Edit Profile", "Sign Out"
- **Profile page** (`/profile`): view/edit display name, email, study stats
- **Streak indicator**: "🔥 Day X" badge in navbar
- **Motivational popup**: Dialog on milestone streaks (day 1, 7, 30, 100) with encouraging messages
- **Feedback button**: Link/button in navbar opening a feedback form or external form URL
- Remove duplicate "Progress" nav link
- Add "Notes" and "Focus" nav links

---

## Phase 4: Focus Mode

### 4a. Focus Mode Entry (`src/pages/FocusMode.tsx`)
- Accessible from navbar button "Focus"
- Choice dialog: **Strict Mode** or **Normal Mode**

### 4b. Strict Mode
- Full-screen overlay (uses `document.requestFullscreen`)
- Shows only the study session (flashcards or question browser for selected project)
- No visible exit button initially
- When user presses Escape or clicks exit area:
  - Show motivational message: "Stay focused! You're doing great."
  - 10-second countdown timer before "Exit" button becomes clickable
  - Confirmation dialog before actually exiting

### 4c. Normal Mode (Timer Only) (`src/pages/TimerMode.tsx`)
- Minimal UI: large countdown/countup timer
- Light/dark mode toggle
- **Music player**:
  - 3-4 built-in study music options (lo-fi, nature sounds, white noise, classical) — use free audio URLs or embedded YouTube players
  - "Upload from device" button using `<input type="file" accept="audio/*">` + `URL.createObjectURL`
- Play/pause, volume control
- Clean, distraction-free layout

---

## Phase 5: Content & Study Features

### 5a. Rich Text Rendering
- Add `react-markdown` + `remark-gfm` dependencies
- In `VivaPrep.tsx` answer display: render answers through ReactMarkdown instead of plain text
- Support: headings, tables, quotes, dividers, lists, code blocks, bold/italic
- Apply in flashcard answers, quiz correct answers, and notes content

### 5b. Flashcard Admin & Dedicated Page
- **Admin**: New section in Admin panel to create/manage flashcard topics (separate from project questions)
  - Each topic: name, description, tags
  - Each topic contains multiple flashcard items (question + answer)
  - Stored in Firestore `flashcard_topics` and `flashcard_items` collections
- **User page** (`/flashcards`): Shows all flashcard topics as cards. Click to enter flashcard study session for that topic.
- Update existing `/project/:id/flashcards` to continue working for project-based flashcards

### 5c. Notes Page (`src/pages/Notes.tsx`)
- Route: `/notes`
- Displays notes as cards (PDFs, docs, HTML pages, custom notes)
- Each note: title, type badge, description, preview button, open-link button
- Notes stored in Firestore `notes` collection
- Admin can create notes with rich text content or link to external documents
- In-portal viewer for PDFs/docs, external link button for others

### 5d. Resource Improvements (`Resources.tsx`)
- Add explicit **"Open Link"** button alongside **"View"** button on each resource card
- "Open Link" opens the real URL in a new browser tab
- Resource titles: remove `truncate`, use `line-clamp-3` to allow 2-3 lines
- Add Resources button to project detail/viva page alongside Flashcard and Quiz buttons

### 5e. Project Page Action Buttons (`VivaPrep.tsx`)
- Add prominent action buttons at top: **Flashcard Mode**, **Quiz Mode**, **Export PDF**, **Resources**
- Style as gradient/outlined buttons with icons, not plain text
- Add hover effects and visual emphasis

---

## Phase 6: UI Polish

### 6a. Overall Theme
- Light mode default everywhere
- Clean, premium spacing (increase padding on cards)
- Consistent border-radius and shadows
- Smooth transitions on all interactive elements

### 6b. Guest Experience
- Persistent banner for guests: "Sign in to save your progress across devices"
- All features accessible, but with clear upgrade messaging

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Landing.tsx` | Professional landing page for unauthenticated users |
| `src/pages/FocusMode.tsx` | Focus mode entry + strict mode |
| `src/pages/TimerMode.tsx` | Timer-only normal focus mode with music |
| `src/pages/Notes.tsx` | Notes page with cards and viewer |
| `src/pages/Profile.tsx` | User profile view/edit page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/firebase.ts` | Fix syntax error, remove hardcoded ADMIN_EMAIL |
| `src/contexts/AuthContext.tsx` | Firestore-based admin check, add forgot password |
| `src/contexts/ThemeContext.tsx` | Default to light, remove system option |
| `src/App.tsx` | Add new routes, landing page logic, remove /progress |
| `src/components/Layout.tsx` | Profile menu, streak badge, feedback button, updated nav |
| `src/pages/Dashboard.tsx` | Merge Progress content (heatmap, streaks, stats, project progress) |
| `src/pages/Auth.tsx` | Polish buttons, add forgot password flow |
| `src/pages/Admin.tsx` | Admin role management, flashcard topic CRUD, notes CRUD |
| `src/pages/VivaPrep.tsx` | Action buttons, rich text rendering, resource link |
| `src/pages/Resources.tsx` | Open Link button, title wrapping |
| `src/pages/Flashcards.tsx` | Support standalone flashcard topics |
| `src/pages/Index.tsx` | Becomes authenticated home (project list) |
| `package.json` | Add `react-markdown`, `remark-gfm` |

---

## Technical Details

**Firestore Admin Roles**: Collection `admins` with docs keyed by email. On auth state change, query `admins` where `email == user.email`. Cache result in AuthContext. Admin panel includes "Manage Admins" section with add/remove.

**Focus Strict Mode**: Uses `document.documentElement.requestFullscreen()`. Listens for `fullscreenchange` event. Exit flow: overlay with countdown using `setInterval`, button disabled until timer hits 0.

**Timer Music**: Built-in options use free ambient audio URLs (e.g., from freesound.org or similar CDN). Local files use `<input type="file">` + `URL.createObjectURL()` for in-memory playback. `<audio>` element controlled via React refs.

**Rich Text**: `react-markdown` with `remark-gfm` plugin renders markdown in answer sections. Wrap in `prose` class from `@tailwindcss/typography` (already in devDependencies).

**Streak Motivational Popup**: On dashboard load, check streak milestones (1, 7, 14, 30, 60, 100). If current streak matches a milestone and hasn't been shown today (tracked in localStorage `vv_streak_popup_last`), show a Dialog with encouraging message.

