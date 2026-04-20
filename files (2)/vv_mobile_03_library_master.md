VIVAVAULT — MOBILE LIBRARY REDESIGN AND MASTER SUMMARY
File: MOBILE-03 and MASTER — Library Mobile Redesign + All Files Summary and Order

Apply COMMON-01 before this.

---

CURRENT PROBLEMS IN MOBILE LIBRARY

The screenshot shows: a folder icon in the header left, "Library" in header center, a purple plus circle (FAB-style) in the top right corner. Below: a Public/Private segmented switcher with Public active. Below: a search bar with "Search resources..." placeholder. Below: a "Filters" button on the left and a grid view toggle on the right. Below: resource items in list view (each row showing a colored type icon, resource title, type label, and a right chevron).

Problems: The FAB-style plus button in the top-right header area is inconsistent — the FAB should be in the bottom-right corner or in the center of the bottom bar, not in the top header. Having it at the top right creates confusion between a header action and a global floating action. The folder navigation is completely absent on this mobile screen — there is no way to browse folders or filter by folder on mobile. The "Filters" button opens an unexplained set of filters with no visible filter state (the user doesn't know if any filters are active). The list view resource rows are well-structured but each row is about 60 pixels tall which could be tighter. The Public/Private switcher looks good but "Private" should be labeled "My Resources" to be clearer about what that section contains.

---

MOBILE LIBRARY REDESIGN

FIXED HEADER (56 pixels):
Left: a folder icon (24 pixels, opens the folder drawer) with a very subtle label "Folders" in 11 pixels below it — making it clear this is a navigation element. Center: "Library" in 17 pixels semibold. Right: theme and notification icons (removed from here since they are in the global header). Actually the right side should just have a notification bell if this page is deep-linked, otherwise the header icons are handled by the global header.

Wait — since Library is a bottom nav destination, the global header applies. So the Library header shows: Left: folder icon with "Folders" label (or just the folder icon with a tooltip). Center: "Library" in 17 pixels semibold. Right: no additional icons (the global header has theme and notification already). Just have a clean right-side with the global plus FAB from the bottom bar being the primary add action.

BELOW HEADER — PUBLIC/MY RESOURCES SWITCHER:
Full-width segmented control: "Public" on left, "My Resources" on right (not "Private" — "My Resources" is clearer and friendlier). Gray background, sliding white pill, 36 pixels tall, 16 pixels horizontal margin. This is the first content element below the header.

BELOW SWITCHER — SEARCH BAR:
Full-width search input (44 pixels tall, light gray background, 22 pixel radius, "Search resources..." placeholder, search icon inside left). 16 pixels horizontal margin.

BELOW SEARCH — FILTER CONTROLS ROW:
A single horizontal row. Left: a Filters button (36 pixels tall, light gray pill, filter/slider icon, "Filters" label — if any filters are active, the button becomes purple with a count badge showing how many filters are on). Right: a view mode toggle (grid icon / list icon, two 36 by 36 pixel icon buttons, the active one has a light gray background). All in one row, 16 pixels horizontal margin.

BELOW FILTER ROW — RESOURCE LIST/GRID:
In list view (the more practical view for mobile): each resource row is 68 pixels tall, white background, a very subtle bottom border (1 pixel). Left: resource type icon (44 by 44 pixels, colored square with the type icon inside in white). Center: resource title in 14 pixels bold (maximum 2 lines, truncated), resource type and category in 12 pixels gray below. Right: a right chevron (indicating tappable). Row hover (desktop): light gray background. Row tap: navigates to resource detail.

In grid view (2 columns): each card is a standard card at approximately 160 pixels tall. Resource type icon at top (full width, 80 pixels tall, colored background). Below: title in 13 pixels bold (2 lines max). Below: type label in 12 pixels gray.

MY RESOURCES TAB (when Private/My Resources is selected):
If not set up: shows the storage selection screen (same as Notes OS vault setup: two option cards — Viva Vault Cloud and Local Storage, with descriptions). Once set up: shows the user's private resources in the same list/grid layout.

FOLDER DRAWER (left side):
Opens when the user taps the folder icon in the header. 290 pixels wide, white background, slides in from left with dark overlay behind. Drawer header: "Folders" in 16 pixels semibold, close X. Below: a list of folders. "All" at the top (always shown, always first). Below: folder rows (44 pixels tall, folder icon, folder name, item count). Tapping a folder: closes the drawer and filters the resource list to show only resources in that folder. The folder filter is indicated by a small chip below the search bar ("In: Foundation ×") that shows which folder is active and can be tapped to clear the filter.

---

GLOBAL BUG FIXES AND INTERACTION STANDARDS (applicable to all pages)

KEYBOARD COVERAGE FIX: Apply to every page that has text inputs. When the keyboard opens on mobile, add padding-bottom to the scrollable container equal to the keyboard height (detected via VisualViewport API). Scroll the focused input into view using scrollIntoView with behavior smooth. Remove the padding when the keyboard closes.

BOTTOM NAV ACTIVE STATE: The active bottom nav item must always reflect the current page, not a stale state. If the user navigates within a module (from Library to a resource detail), the Library tab in the bottom nav stays active (highlighted). The back chevron in the header takes the user back.

SWIPE GESTURES: On mobile, implement swipe-right from the left edge of any page to go back (same as iOS native back gesture). This works when the user is on a subpage (note editor, resource detail, event detail). On root module pages (the five bottom nav destinations), swipe-right does nothing.

PULL-TO-REFRESH: On any scrollable list page (home course grid, library resource list, notes page list, dashboard), implement pull-to-refresh. The user pulls the list down past a 60-pixel threshold, sees a circular refresh indicator at the top, and releases to trigger a data refresh. The indicator spins in the primary purple color.

SMOOTH PAGE TRANSITIONS: All navigation between bottom nav items uses a horizontal slide (right items slide from right, left items slide from left). All subpage navigation uses a forward slide (new page comes from right, back goes to right). All bottom sheets use an upward slide. All drawers use a left slide. No instant jumps without animation anywhere.

---

MASTER SUMMARY — ORDER TO APPLY ALL PROMPT FILES

Apply all prompt files in this exact order for correct results:

Step 1: Apply COMMON-01 (Design System) — establishes all tokens, navbar, bottom bar, card styles, button styles, form styles, empty states, loading states, toast notifications, typography, color usage rules, spacing rules.

Step 2: Apply DESKTOP-01 (Home Page) — rebuilds the desktop home page with the search bar, greeting, filter chips, feature quick links, and course grid.

Step 3: Apply DESKTOP-02 (Dashboard) — rebuilds the desktop dashboard with metric cards, study activity heatmap, upcoming events, habits, course progress, and recent notes.

Step 4: Apply DESKTOP-03 (Study OS) — rebuilds the desktop Study OS with the redesigned sidebar, calendar week/day/month views, tasks tab, habits tab, focus launcher, and analytics tab.

Step 5: Apply DESKTOP-04 (Notes OS and Resources) — rebuilds the desktop Notes OS sidebar with workspace switcher, recents as list instead of cards, proper page tree differentiation, and the editor redesign. Also rebuilds the Resources page with folder sidebar, filter controls in one row, and improved resource cards.

Step 6: Apply MOBILE-01 (Home and Dashboard Mobile) — rebuilds the mobile home page with correct hierarchy (greeting before search, search before filters, features before courses) and rebuilds the mobile dashboard with fixed data rendering bugs and the new stat cards and quick action tiles.

Step 7: Apply MOBILE-02 (Study OS and Notes OS Mobile) — rebuilds the mobile Study OS with the correct header, horizontal pill tabs, calendar day view with week strip, and the study OS drawer. Also rebuilds the mobile Notes OS with the page list as the first view, the workspace switcher in the correct position, and the full editor with keyboard toolbar.

Step 8: Apply MOBILE-03 (Library Mobile) — rebuilds the mobile library with the folder drawer, correct switcher labels, search and filter row, and list/grid resource views.

After all eight files are applied, verify these specific issues are resolved:
- Dashboard shows "0h 0m" not "oh om"
- Dashboard shows "0 days" not "od"
- Habit names show their full names not single letters
- The mobile Notes OS does not show the workspace switcher in the editor header
- The desktop Notes OS sidebar has the workspace switcher at the top, not in the editor area
- The Study OS mobile header shows "Study OS" not "Calendar"
- All course cards have a 65-35 button split showing both Continue and Resources clearly
- The premium course card shows a lock badge, not a blurred overlay
- All empty states have proper illustrations, headings, descriptions, and CTA buttons
- All forms are protected from keyboard covering the active input
- The bottom navigation bar is solid white with no glass or blur effect
- The FAB is positioned in the center of the bottom bar on mobile
- The "Start Focus" button is removed from the Study OS desktop sidebar bottom
- The "Syncing..." label in the calendar header is replaced with the subtle sync indicator in the shared navbar
- The Resources desktop page shows the folder, search, filters, and view toggle in a clean layout
- The mobile Library says "My Resources" not "Private" in the switcher
