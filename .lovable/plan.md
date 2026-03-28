

# VivaVault — Multi-Feature Enhancement Plan

## Summary

Eight changes: (1) replace scattered filter pills with two clean dropdown selects for Category and Proctor ID, (2) add a Tags dropdown filter, (3) rich paste detection in answer/note inputs, (4) dark mode polish across all pages, (5) admin login with hardcoded email `partik@mail.com` / password `partik123`, (6) notes submission with admin approval flow, (7) enhanced Focus Mode with wallpaper picker and music in both modes, (8) premium animated action buttons, and (9) move "Continue as Guest" to bottom of Auth page.

---

## Changes

### 1. Unified Dropdown Filters (VivaPrep.tsx)

Replace the current pill-button rows for Category (line 984-999) and Proctor (line 1001-1023) with two `<Select>` dropdowns side by side next to the search bar. Keep the existing `FilterPanel` sheet for advanced/dynamic filters. Add a third Tags dropdown that extracts unique tags from questions. All three dropdowns work together — filtering is AND-based. The frequency pills stay as-is since they serve as quick difficulty toggles.

**What changes:**
- Replace category pill row with a `Select` dropdown
- Replace proctor pill row with a `Select` dropdown
- Add a new Tags dropdown populated from `q.customFields` or a `tags` field
- Keep existing `FilterPanel` for dynamic/custom field filters
- Filtering logic in `filtered` useMemo already handles category + proctor; just add tags filter

### 2. Rich Paste Detection

Add an `onPaste` handler to the TipTap editor in `QuestionCard` and to admin note/answer textareas. When HTML is available in the clipboard, insert it as rich content. When only plain text is available, detect markdown-like patterns (`#`, `-`, `>`, `**`) and convert to HTML before inserting. TipTap already supports HTML insertion via `editor.commands.insertContent()`.

**Files:** `VivaPrep.tsx` (TipTap editor), `Admin.tsx` (note creation textarea), `SubmitQuestion.tsx`

### 3. Dark Mode Polish

Audit and fix dark-mode styling across:
- `Landing.tsx`: ensure hero gradients, feature cards, and footer look good in dark
- `FocusMode.tsx` / `TimerMode.tsx`: verify timer circle, buttons, and music section
- `Auth.tsx`: check GitHub button contrast in dark mode
- `Notes.tsx`: card backgrounds
- Add `dark:` variants where needed for borders, backgrounds, and text contrast

### 4. Admin Login with Hardcoded Credentials

Update `AuthContext.tsx` to support admin login:
- Add a `signInAsAdmin` method that checks email === `partik@mail.com` and password === `partik123`
- On match, use Firebase `signInWithEmailAndPassword` (admin must exist in Firebase Auth)
- OR: if Firebase Auth isn't set up for this email, use the Firestore `admins` collection check that already exists — just ensure `partik@mail.com` is checked

The `checkAdmin` function already has a hardcoded fallback. Update it to include `partik@mail.com`. The actual Firebase Auth account needs to be created manually in the Firebase console — this app can't create it programmatically. Instead, update the hardcoded fallback in `checkAdmin` to recognize `partik@mail.com`.

**File:** `AuthContext.tsx` — update line ~46 fallback to `email === "partik@mail.com" || email === "kunal77x@gmail.com"`

### 5. Notes Submission + Admin Approval

- Add a "Submit Note" button on the Notes page for users
- User submits: title, type, description, URL or content
- Note saved to Firestore `notes` collection with `status: "pending"`
- Notes page only shows `status: "approved"` notes to regular users
- Admin panel shows pending notes with Approve/Reject buttons
- Admin approval sets `status: "approved"`

**Files:** `Notes.tsx` (submit dialog + filter by status), `Admin.tsx` (pending notes review section)

### 6. Enhanced Focus Mode

**Both Strict and Normal modes:**
- Add wallpaper picker: `<input type="file" accept="image/*">` → `URL.createObjectURL` → set as `backgroundImage` on the focus container
- Persist wallpaper URL in `localStorage` key `vv_focus_wallpaper`
- Add a semi-transparent overlay over the wallpaper for text readability

**Strict Mode** (`FocusMode.tsx`):
- Add music player (same as TimerMode — built-in tracks + upload)
- Add dark/light toggle

**Normal Mode** (`TimerMode.tsx`):
- Add wallpaper picker (already has music and theme toggle)

### 7. Premium Action Buttons

Replace plain gradient buttons on `VivaPrep.tsx` (lines 876-931) and across the app with animated, attention-grabbing buttons:
- Add subtle shimmer/glow animation via CSS `@keyframes`
- Add `hover:scale-105` and `active:scale-95` transitions
- Use consistent gradient directions and add a border glow effect
- Apply to: Flashcard, Quiz, Export PDF, Resources, Submit buttons
- Add a CSS class `btn-premium` with the shimmer animation

**Files:** `index.css` (new animation keyframes), `VivaPrep.tsx`, `Notes.tsx`

### 8. Move "Continue as Guest" to Bottom (Auth.tsx)

Move the guest CTA button (lines 90-108) from above the logo to below the auth card (after line 226, before the closing `</motion.div>`).

### 9. Add Notes Button to VivaPrep

Add a "Notes" button next to the Resources button in the study mode buttons section (line 927-931).

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Move guest button to bottom |
| `src/pages/VivaPrep.tsx` | Replace filter pills with Select dropdowns, add Tags filter, premium buttons, Notes button, rich paste handler |
| `src/pages/FocusMode.tsx` | Add wallpaper picker, music player, theme toggle to strict mode |
| `src/pages/TimerMode.tsx` | Add wallpaper picker |
| `src/pages/Notes.tsx` | Add submit note dialog, filter by approval status |
| `src/pages/Admin.tsx` | Add pending notes approval section |
| `src/pages/Landing.tsx` | Dark mode color fixes |
| `src/contexts/AuthContext.tsx` | Update hardcoded admin email fallback |
| `src/index.css` | Add `btn-premium` shimmer animation keyframes |

---

## Technical Details

**Dropdown filters**: Use the existing shadcn `Select` component. Each `SelectItem` is dynamically populated from the questions data. Category and Proctor already have `useMemo` arrays built.

**Rich paste**: TipTap's `editor.commands.insertContent(html)` handles HTML insertion. The paste handler checks `e.clipboardData.getData('text/html')` first; if empty, falls back to plain text with regex conversion of markdown patterns.

**Wallpaper**: Stored as an object URL during session. For persistence, convert to base64 via `FileReader.readAsDataURL` and store in localStorage (capped at ~2MB). Applied as `style={{ backgroundImage, backgroundSize: 'cover' }}` with a `bg-black/40` overlay div for readability.

**Premium button animation**: CSS `@keyframes shimmer` that moves a diagonal light streak across the button. Applied via `before` pseudo-element with `overflow-hidden`.

