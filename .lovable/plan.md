

# VivaVault — Complete Platform Redesign Plan

## Overview

This is a full rebuild of VivaVault into a production-grade Student Study Operating System for IITM BS students. The redesign covers every page, every interaction, and every data flow — moving from localStorage-based state to full Firestore persistence, adding course enrollment, notifications, branch/level hierarchy, and premium UI polish across the board.

## Current State Assessment

The app already has: Firebase Auth (Google/GitHub/Email), Firestore for questions/projects/resources/submissions, admin panel with JSON import, flashcards, quiz, focus mode, timer mode, notes, bookmarks (localStorage), spaced repetition (localStorage), activity heatmap (localStorage), streak tracking (localStorage), and a basic landing page.

**Key gaps to fill**: Enrollment system, notifications, branch/level hierarchy, course locking, access requests, real-time Firestore listeners, localStorage-to-Firestore migration for bookmarks/progress/streaks, Notion-style notes editor, feedback system, resource submission flow, share functionality, mobile bottom nav, skeleton loading states, and the full design system overhaul.

---

## Phase 1: Design System & Core Infrastructure

### 1A. CSS Design System Overhaul (`index.css`)
- Update CSS variables to match the specified palette: primary `#6D28D9`, background `#F5F4FF`, card `#FFFFFF`
- Refine elevation system: cards get `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`, modals get `0 20px 60px rgba(109,40,217,0.15)`
- Update border-radius: cards 16px, buttons 10px, inputs 10px, badges 9999px
- Add animation utilities: 200ms transitions, modal slide-up, card hover lift, progress bar fill animation, notification pulse
- Add `.skeleton-pulse` animation for loading states
- Keep existing Syne/DM Sans font setup (already correct)

### 1B. Firestore Data Migration Layer (`src/lib/firestoreSync.ts` — NEW)
- Create helper functions to read/write user data to Firestore instead of localStorage
- Functions: `saveUserBookmarks`, `loadUserBookmarks`, `saveUserProgress`, `loadUserProgress`, `saveUserStreak`, `loadUserStreak`, `saveUserActivity`, `loadUserActivity`, `saveUserPreferences`, `loadUserPreferences`
- All functions take `userId` parameter and operate on Firestore subcollections under `/users/{userId}/`
- Fallback: if user is guest, use localStorage as before
- Migrate `spacedRepetition.ts` to use these helpers when a user is signed in

### 1C. AuthContext Enhancement (`AuthContext.tsx`)
- Add `userProfile` state with: name, email, role, branch, level, streak, lastStudied
- On auth state change, fetch/create user profile from Firestore `/users/{uid}`
- Keep existing admin shortcut and RBAC logic
- Add `updateUserProfile` method

---

## Phase 2: Navigation & Layout

### 2A. Navbar Redesign (`Layout.tsx`)
- **Left**: Logo (purple square + "VivaVault" wordmark)
- **Center**: Home, Notes, Bookmarks, Focus — with active purple pill highlight
- **Right**: Streak badge (orange pill), theme toggle (sun/moon), notification bell with red dot badge + dropdown (last 5 notifications from Firestore with real-time listener), user avatar dropdown (Profile, Dashboard, Settings, Sign Out), Sign In button (when not signed in)
- Guest banner at top: lavender tint, graduation cap emoji, sign in CTA
- **Mobile**: Hamburger menu collapse + bottom navigation bar with icons for Home, Notes, Bookmarks, Focus, Profile
- Add mobile bottom nav as a fixed bar (`md:hidden`)

### 2B. Notification System
- Firestore collection `/notifications` with real-time `onSnapshot` listener
- Bell icon in navbar shows unread count badge with pulse animation
- Dropdown panel (not page navigation) shows last 5 notifications
- "View all" link goes to `/notifications` page
- Notifications page: list with unread purple accent border, "Mark all as read" button, empty state
- Admin can compose and send notifications from admin panel

---

## Phase 3: Authentication & Landing

### 3A. Landing Page Rebuild (`Landing.tsx`)
- Premium hero: gradient text "Study smarter, score higher" with Syne font, subtle purple radial glows (not blobs), animated badge "Your complete study companion"
- Feature grid: 8 cards (Question Library, Flashcards, Quiz Mode, Export PDF, Bookmarks, Progress Analytics, Focus Mode, Resource Hub) with hover lift + border glow
- Social proof section: student count, question count, course count
- Final CTA section with "Get Started" button
- Footer with logo, copyright, "Built for IITM BS students"
- Clean light-mode-first, no dark blob backgrounds
- Guest banner at top

### 3B. Auth Page (`Auth.tsx`)
- Keep existing polished Google/GitHub buttons, email/password tabs, forgot password flow, admin shortcut, and guest CTA at bottom
- After registration, show a welcome modal: select branch and level (saved to Firestore profile)
- No structural changes needed — current implementation is solid

---

## Phase 4: Homepage Rebuild

### 4A. Homepage (`Index.tsx`) — Complete Redesign
- **Top Section** — two-column layout:
  - **Left (55%)**: Welcome section with logo wordmark, subtitle (personalized when signed in), stats pills (streak + due count), three filter dropdowns (Branch, Level, Type) dynamically populated from Firestore `/branches` and `/levels` collections, "Show Enrolled" toggle button
  - **Right (42%)**: Quick Actions panel card with search bar (debounced 300ms, searches course/project names), 2x2 quick action grid (Resources, Share Notes, Focus Mode, My Notes), bottom row with Share App dropdown + Feedback modal button
- **Bottom Section** — Course/Project Grid:
  - Section header with title, item count badge, sort dropdown (Newest, A-Z, Most Questions)
  - Cards with: colored icon box, course name, description, question count badge, tags (branch, level), progress bar (for enrolled), footer buttons based on enrollment state (Not Enrolled / Enrolled / Completed / Locked / Guest / Coming Soon — 6 states as specified)
  - Enrollment is instant with optimistic UI + Firestore write + toast
  - Locked courses show lock overlay + access request modal
  - Guest cards show "Sign In to Access" button
  - Empty state with illustration

### 4B. Enrollment System
- Firestore: `/users/{uid}/enrollments/{courseId}` — enrolledAt, progress, lastStudied, studiedCount
- `enrollInCourse(courseId)` function writes to Firestore
- Homepage cards check enrollment status and render accordingly
- Unenroll option in course detail page

### 4C. Branch/Level Hierarchy
- Firestore collections: `/branches/{id}`, `/levels/{id}`
- Admin can CRUD branches and levels from admin panel
- Homepage dropdowns populated dynamically from these collections
- Courses link to branchId and levelId

---

## Phase 5: Dashboard & Profile

### 5A. Unified Dashboard (`Dashboard.tsx`)
- Keep existing structure (already well-built with stats, heatmap, streaks, project progress, bookmarks, submissions)
- **Upgrade**: Pull data from Firestore instead of localStorage for signed-in users
- Add: Study Time Today card (track via Firestore focus session data), Recent Activity Feed (last 10 actions with timestamps)
- Keep streak milestone popup dialog

### 5B. Profile Page (`Profile.tsx`)
- Expand: add branch/level selectors, enrolled courses list with quick links, saved items count, study stats summary, theme preference, danger zone (delete account, sign out)
- Save all profile changes to Firestore `/users/{uid}`

---

## Phase 6: Notes Workspace

### 6A. Notes Page Rebuild (`Notes.tsx`)
- **Two-panel layout**: Left sidebar (folder tree + search + tags filter) + Right editor panel
- Left sidebar: "New Note" and "New Folder" buttons, nested folder/file tree, right-click context menu (rename, move, delete, duplicate)
- Editor: TipTap rich text editor (already in project) with slash commands, toolbar (bold, italic, underline, link, code, highlight), smart paste detection for HTML/markdown content
- Note metadata: branch, level, course, tags, dates
- Note actions: Download as PDF, copy share link, pin, bookmark
- Tab system for multiple open notes
- All notes stored in Firestore `/users/{uid}/notes/{noteId}`
- Public submission flow: "Share publicly" → admin review → approved notes visible to all

---

## Phase 7: Course Workspace & Study Features

### 7A. Course Detail / VivaPrep (`VivaPrep.tsx`)
- Add left sidebar navigation within course: Questions, Notes, Resources, Flashcards, Quiz
- Add right sidebar progress panel: questions studied, completion %, streak for this course, last studied
- Keep existing question cards, dropdown filters (Category, Proctor, Tags), bookmark system, rich text rendering
- Premium action buttons at top: Flashcard Mode, Quiz Mode, Export PDF, Resources, Notes — with shimmer animation

### 7B. Flashcards (`Flashcards.tsx`)
- Keep existing flip card study session
- Add dashboard view: flashcard decks grouped by category/course with deck cards showing name, card count, last studied, mastery %
- Admin creates flashcard decks stored in Firestore

### 7C. Quiz (`Quiz.tsx`)
- Keep existing quiz flow
- Add quiz selection view with filters (course, category, proctor)
- Store all quiz attempts in Firestore `/users/{uid}/quizAttempts/{id}`
- Quiz history with retake option

### 7D. Resources (`Resources.tsx`)
- Keep existing resource cards with View/Open Link buttons
- Add left filter sidebar: branch, level, course, type, tags
- Add "Submit Resource" button → modal → admin review
- Resource titles: multi-line support (already has line-clamp-3)

---

## Phase 8: Focus Mode

### 8A. Focus Mode (`FocusMode.tsx`)
- Keep existing Strict/Normal mode selection
- Strict Mode: fullscreen lockdown, 10-second exit delay with motivational message, study timer, music player, wallpaper picker, theme toggle
- Record focus sessions to Firestore `/users/{uid}/focusSessions/{id}`

### 8B. Timer Mode (`TimerMode.tsx`)
- Keep existing timer with music, wallpaper, theme toggle
- Auto-hide controls after 3 seconds of inactivity, reappear on mouse move
- Multiple timer styles option (minimal digits vs circular arc)

---

## Phase 9: Admin Panel

### 9A. Admin Panel Expansion (`Admin.tsx`)
- Add sidebar navigation: Overview, Courses & Projects, Notes Management, Resources Management, Flashcards, Quizzes, Notifications, User Submissions, Access Requests, Admin Management, Settings
- **Overview dashboard**: total users, courses, questions, pending submissions, recent activity, quick actions
- **Courses Management**: full CRUD form with title, abbreviation, type, branch, level, description, icon color (picker), status (Active/Coming Soon/Locked), guest preview fields, premium flag
- **Course locking**: lock/unlock toggle per course
- **Branch/Level Management**: CRUD for academic hierarchy
- **Notes Management**: view approved, pending submissions, approve/reject
- **Resources Management**: view approved, pending submissions, approve/reject
- **Notifications**: compose form (title, message, target: all/course/project), send, history
- **Access Requests**: list with approve/reject for locked courses
- **Admin Management**: list admins, invite by email, remove, change role (admin/contributor)

---

## Phase 10: New Pages

### 10A. Notifications Page (`src/pages/Notifications.tsx` — NEW)
- List all notifications with title, message, timestamp, read/unread status
- Unread = purple left border accent
- "Mark all as read" button
- Empty state: "You're all caught up!"

### 10B. Feedback System
- Feedback modal accessible from navbar and homepage quick actions
- Form: type selector (Bug, Suggestion, Compliment, Other), text area, optional email
- Saved to Firestore `/feedback/{id}`

### 10C. Share App
- Dropdown from homepage: Copy link, WhatsApp, Email, Twitter/X, LinkedIn
- Uses `navigator.share` API where available, fallback to URL construction

---

## Phase 11: UI Polish & Quality

### 11A. Loading States
- Replace all loading spinners with skeleton screens using `CardSkeleton`, `QuestionSkeleton`, `GridSkeleton` (already exist)
- Add skeleton variants for: notification list, note tree, resource grid

### 11B. Empty States
- Every list/grid that can be empty gets: illustration icon, descriptive message, CTA button
- Already partially implemented — extend to all new sections

### 11C. Micro-interactions
- Card hover: `translateY(-2px)` + shadow deepen (already in `.obsidian-card`)
- Button press: `active:scale-[0.97]`
- Progress bars: animated fill from 0 on mount (600ms)
- Modal: slide up + fade in (framer-motion, already used)
- Toast: bottom-right, auto-dismiss 4s, colored left border (sonner already configured)

### 11D. Dark Mode Audit
- Verify all new components have proper `dark:` variants
- Ensure gradients, cards, dropdowns, and overlays look good in dark theme
- Landing page dark mode: subtle purple mesh background

### 11E. Mobile Responsiveness
- Homepage two-panel → stacks vertically on mobile
- Bottom navigation bar on mobile (Home, Notes, Bookmarks, Focus, Profile)
- All grids collapse to single column on mobile
- Notes two-panel → single panel with sidebar as drawer on mobile

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/firestoreSync.ts` | Firestore read/write helpers for user data |
| `src/pages/Notifications.tsx` | Notifications list page |
| `src/components/MobileBottomNav.tsx` | Bottom nav bar for mobile |
| `src/components/NotificationBell.tsx` | Bell icon + dropdown in navbar |
| `src/components/FeedbackModal.tsx` | Feedback submission modal |
| `src/components/ShareDropdown.tsx` | Share app dropdown |
| `src/components/WelcomeModal.tsx` | Post-registration branch/level setup |
| `src/components/CourseCard.tsx` | Reusable course card with 6 enrollment states |

## Files to Heavily Modify

| File | Scope |
|------|-------|
| `src/index.css` | Design system variables, elevation, animations |
| `src/components/Layout.tsx` | Navbar redesign, mobile bottom nav, notification bell |
| `src/pages/Landing.tsx` | Full redesign with feature grid, social proof, CTA |
| `src/pages/Index.tsx` | Two-panel homepage with filters, quick actions, course grid |
| `src/pages/Dashboard.tsx` | Firestore data source, activity feed, study time |
| `src/pages/Notes.tsx` | Two-panel Notion-style workspace |
| `src/pages/Admin.tsx` | Sidebar nav, overview dashboard, courses CRUD, notifications, branches/levels |
| `src/pages/VivaPrep.tsx` | Course sidebar nav, progress panel |
| `src/pages/Resources.tsx` | Filter sidebar, submit flow |
| `src/pages/Profile.tsx` | Extended profile with branch/level, enrolled courses |
| `src/pages/FocusMode.tsx` | Firestore session logging |
| `src/pages/Flashcards.tsx` | Dashboard view with deck cards |
| `src/pages/Quiz.tsx` | Selection view, Firestore history |
| `src/pages/Bookmarks.tsx` | Firestore-based bookmarks |
| `src/contexts/AuthContext.tsx` | User profile state, Firestore profile sync |
| `src/lib/spacedRepetition.ts` | Firestore sync for signed-in users |
| `src/App.tsx` | New routes (/notifications) |

## Dependencies to Add
- None new required — existing stack (React, Tailwind, Firebase, TipTap, framer-motion, react-markdown, sonner) covers everything

---

## Technical Notes

**Enrollment states**: Computed from Firestore enrollment doc existence + course status field. Six states: not-enrolled, enrolled, completed, locked, guest, coming-soon.

**Real-time notifications**: `onSnapshot(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20)))` in Layout component. Unread tracking via `/users/{uid}/notificationReads/{notifId}`.

**Branch/Level dropdowns**: Fetched once on homepage mount from `/branches` and `/levels` collections. Cached in state. Admin CRUD updates these collections.

**Firestore sync strategy**: For signed-in users, all localStorage-based features (SM-2, activity, streak, bookmarks) sync to Firestore on write and read from Firestore on load. Guest users continue with localStorage only.

**Course locking**: Course doc has `isLocked: boolean`. When locked, card shows lock overlay. Access request writes to `/access_requests/{id}`. Admin approves → auto-enrolls user.

**Auto-hide controls in Focus Mode**: Use `onMouseMove` + `setTimeout(3000)` to toggle a `controlsVisible` state. Apply `opacity-0 pointer-events-none` transition when hidden.

