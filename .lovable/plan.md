

# VivaVault — Complete Platform Upgrade Plan

## Summary

A comprehensive overhaul of the Viva Prep platform covering: dynamic JSON-driven filtering, bookmark system, visible edit/share/bookmark buttons, filter panel modal, UI bug fix (rogue container on filter bar), and overall visual polish upgrade.

---

## What Will Change

### 1. Fix Filter Bar UI Bug (VivaPrep.tsx)
Remove the visible container/card wrapping the search bar and filter pills. The sticky filter section currently has `bg-background/80 backdrop-blur-2xl border-b border-border/30` which creates a floating panel look. Replace with transparent background so filters sit flush against the page.

### 2. Dynamic JSON-Based Filtering System
Extend the Question interface and import logic to support arbitrary custom fields from JSON. Any key in the JSON beyond the known fields (question, answer, category, etc.) gets treated as a filterable metadata field.

- **Admin import** (`Admin.tsx`): When importing JSON, detect all unique keys across items and store them as `customFields: Record<string, string>` on each question document.
- **VivaPrep page**: Dynamically extract all unique custom field keys and their values from loaded questions, then render them as filter options.

### 3. Dedicated Filter Panel Modal
Add a "Filters" button next to the search bar that opens a slide-in Sheet (right side) showing:
- All standard filters (difficulty, category, proctor)
- All dynamic/custom filters auto-detected from question data
- Multi-select checkboxes for each filter group
- Active filter count badge on the trigger button
- "Clear All" and "Apply" buttons

### 4. Visible Edit, Share, and Bookmark Buttons
Redesign the question card action bar:
- **Edit button**: Always visible (not hidden behind hover), styled as an outlined icon button with "Edit" label
- **Share button**: Prominent with share icon, copies link to clipboard
- **Bookmark button**: New feature — heart/bookmark icon that saves question ID to localStorage collections
- Users can create named bookmark collections stored in localStorage
- A "Bookmarks" section accessible from the navbar showing saved questions grouped by collection

### 5. Bookmark Collections System
- New state in VivaPrep: `bookmarks: Record<string, string[]>` (collection name -> question IDs)
- "Save to Bookmark" button on each card opens a small popover to pick/create a collection
- Bookmarks persisted in localStorage under `vv_bookmarks`
- Add a `/bookmarks` page showing all collections with their questions

### 6. UI/Visual Polish Overhaul

**Cards**: 
- Increase padding, add subtle gradient border on hover
- Question text slightly larger (17px)
- Better spacing between badges

**Filter pills**: 
- Larger touch targets (py-2 px-4)
- Smooth color transitions
- Active state with subtle glow

**Search bar**: 
- Larger (h-12), rounded-xl, search icon animated
- Placeholder: "Search questions, topics, or proctors..."

**Typography**: 
- Headings use Syne font at bolder weights
- Better line-height on question text
- Muted foreground slightly brighter for readability

**Animations**: 
- Cards fade in with stagger
- Filter results transition smoothly
- Toast confirmations for bookmark/share actions

**Responsive**: 
- Mobile: filters collapse, cards stack single column
- Filter panel becomes full-screen sheet on mobile

### 7. Stats & Analytics Bar Enhancement
- Show difficulty distribution as mini colored dots/bar
- Show "X studied" count
- Sort dropdown styled as segmented control

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/VivaPrep.tsx` | Fix filter container bug, add filter panel, bookmark system, dynamic filters, UI polish, visible action buttons |
| `src/pages/Admin.tsx` | Extend JSON import to capture custom fields |
| `src/components/Layout.tsx` | Add Bookmarks nav link |
| `src/App.tsx` | Add bookmarks route |
| `src/pages/Bookmarks.tsx` | **New** — bookmarks page showing saved collections |
| `src/index.css` | Minor tweaks for new component styles |

---

## Technical Details

- **Dynamic filter extraction**: On question load, scan all questions for keys in `customFields`, build a `Map<string, Set<string>>` of filter name -> unique values, render as filter groups in the panel
- **Bookmark storage**: `localStorage.getItem("vv_bookmarks")` → `{ "My Collection": ["id1", "id2"], "Flask Questions": ["id3"] }`
- **Filter panel**: Use existing `Sheet` component (right side), with `ScrollArea` for long filter lists
- **No backend changes** for bookmarks — purely client-side localStorage
- **JSON import change**: Store extra fields as `customFields` object in Firestore alongside existing fields, backward-compatible with existing data

