VIVAVAULT — MOBILE HOME AND DASHBOARD COMPLETE REDESIGN
File: MOBILE-01 — Home Page and Dashboard Mobile Full Redesign

Apply COMMON-01 before this. This redesigns the Home and Dashboard pages for mobile screens below 768px.

---

CURRENT PROBLEMS IN MOBILE HOME PAGE

The screenshot shows: a hamburger menu on the left, VivaVault logo in center, theme/notification icons on right. Below: a full-width search bar. Below: "VivaVault" wordmark and welcome message. Below: filter dropdowns (All Branches, All Levels, All) as three separate full-width-style dropdowns. Below: a 2-column feature grid (IITM BS Portal, Data Studio, Course Planner, Ace Grade, Discourse, Quiz Practice, with a Contribute section and Share button beside it). The FAB is centered in the bottom bar. Bottom navigation: Home (active), Dash, Study, Notes, Library, Me.

Problems: The search bar sits above the wordmark and welcome text which breaks the information hierarchy — greetings should come before actions. The filter dropdowns are three separate large boxes stacked visually, taking up too much space. The feature grid has very small arrow icons on each tile that are difficult to tap. The Contribute section and Share/Feedback sit awkwardly beside the feature grid at different heights. The course section below the feature grid is cut off (not visible in the screenshot), suggesting the student must scroll significantly to reach their courses.

---

MOBILE HOME PAGE — COMPLETE NEW LAYOUT

The page scrolls vertically. The bottom navigation bar is fixed. The header bar is fixed. All content between the header and the bottom bar scrolls.

FIXED HEADER (56 pixels):
Left: VivaVault V logo mark (28 pixels purple rounded square) + "VivaVault" in 16 pixels bold.
Right: Theme toggle icon button, then notification bell with red dot badge.

SCROLLABLE CONTENT (starts below header, ends above bottom bar):

BLOCK 1 — GREETING AND SEARCH (top of scroll content, 20 pixels top padding):
First visible: the greeting row. User avatar circle (36 pixels, shows profile photo or first initial on purple background) on the left. Beside it: "Good morning, Kunal!" in 16 pixels semibold, "Continue where you left off." in 13 pixels gray below. On the far right: streak chip (fire emoji, "1d", orange pill, 28 pixels tall).

Below the greeting (12 pixels margin): the search bar. Full width minus 16 pixels each side. 46 pixels tall. 23 pixel radius. White background. 1 pixel border. Search icon inside left. Placeholder "Search courses, projects, questions...". Tapping opens the command palette overlay.

BLOCK 2 — FILTER CHIPS (below search, 12 pixels margin):
A horizontally scrollable row of filter chips. No visible scrollbar. The chips: All Branches (chevron), All Levels (chevron), All Types (chevron). Each chip is 36 pixels tall, pill shape, white background, standard border. They sit in a row with 8 pixel gap. If they overflow, the row scrolls. Below the filter row: an "Enrolled Only" toggle chip (toggles between outlined and solid purple when tapped).

BLOCK 3 — FEATURE QUICK ACCESS (below filters, 16 pixels margin):
A white card with 12 pixel radius and shadow. Inside: section label "EXPLORE" in 11 pixels semibold gray uppercase. Below: a 2-column grid of feature tiles. Each tile row is 52 pixels tall with a left icon (24 pixels, colored) and the feature name and description. The tile height must be at minimum 48 pixels for comfortable tapping. Arrow icon on the right (16 pixels gray). Features: IITM BS Portal, Data Studio, Course Planner, Ace Grade, Discourse, Quiz Practice. 

Below a thin divider within the same card: a "CONTRIBUTE" label. Below: three rows for Submit Questions, Share Notes, Share Resources. These rows are the same height and style as the feature tiles. On the right side of the contribute section: the Share and Feedback items are NOT shown as separate floating cards — they are moved into the contribute section as additional rows or into a more options link at the bottom of the contribute section.

BLOCK 4 — COURSES AND PROJECTS (below feature card, 20 pixels margin):
Section header: "All Courses & Projects" in 17 pixels bold on the left. Count badge "5 items" in a gray pill. Below the header, on the same row: the Enrolled Only chip (already shown in filters, so this can be removed here to avoid duplication) and the Newest sort dropdown.

Course cards in single column (full width). Each card has: top row with course icon (44 pixels), course name bold, description below in gray, question count badge on the right. Progress bar if enrolled. Two buttons: Continue or Enroll (65% width), and an external link icon button (35% width). The buttons are 44 pixels tall for easy tapping.

BLOCK 5 — LOAD MORE (below course cards):
A "Load more" button centered, full width minus 32 pixels margin, outlined, 44 pixels tall.

---

MOBILE DASHBOARD REDESIGN

CURRENT PROBLEMS IN MOBILE DASHBOARD:

The screenshot shows a different design from the desktop dashboard — it has a greeting "Good evening, Kunal" with an avatar circle showing a fire/streak icon, "Today's Plan" section (showing "Nothing scheduled. Enjoy the calm."), "At a Glance" (3 small stat cards — Focus, Tasks, Habits showing "oh om", "o/o", "o/o"), and "Quick Actions" (4 large colorful buttons — Notes purple, Focus orange, Study blue, Library green). The bottom nav has Dash selected.

Problems: "oh om" should be "0h 0m" — a rendering bug. "o/o" should be "0/0". The stats cards are small (3 in a row) but show zero values for everything — the issue is the data is not displaying correctly. The "Quick Actions" section with four large colorful gradient buttons is actually a good pattern for mobile but the colors (purple, orange, blue, green) are very intense and may not feel premium enough. The gradient buttons look somewhat similar to gaming app shortcuts.

MOBILE DASHBOARD FULL REDESIGN:

FIXED HEADER (56 pixels): "Dashboard" title in 17 pixels semibold on the left. Settings gear icon on the right.

SCROLLABLE CONTENT:

BLOCK 1 — GREETING WITH AVATAR (top of scroll, 20 pixels top padding):
A row: user avatar circle (56 pixels, centered profile photo or initial on purple background). Beside it: "Good evening" in 13 pixels gray, "Kunal" in 24 pixels bold below it, and "Start a streak today" in 13 pixels gray below the name (changes to relevant message based on their data — if they have a streak, shows the streak count; if they have tasks due, shows "3 tasks due today").

BLOCK 2 — TODAY'S PLAN (16 pixels margin):
Section header "Today's Plan" in 17 pixels bold on the left. "All →" link on the right in primary purple (navigates to the Study OS Calendar tab).

If no events today: a card with a gentle empty state. Calendar icon (40 pixels, gray), "Nothing scheduled. Enjoy the calm." in 14 pixels semibold, "Or plan your study sessions in Study →" as a link.

If events exist: a vertical list of today's events as compact rows (48 pixels tall). Each row: colored dot, event title, time range. The card has a visible border and the correct shadow.

BLOCK 3 — AT A GLANCE (16 pixels margin):
Section header "At a Glance" in 17 pixels bold.
Three equal cards in a row (each takes 1/3 width minus gaps):
- Focus card: purple clock icon (32 pixels) centered, "Focus" in 12 pixels gray below, "0h 0m" in 18 pixels bold below. Fix the rendering bug — this must display "0h 0m" not "oh om".
- Tasks card: green checkbox icon, "Tasks" label, "0/0" in 18 pixels bold. Fix rendering — "0/0" not "o/o".
- Habits card: pink heart icon, "Habits" label, "0/0" in 18 pixels bold.

Each card is 80 pixels tall minimum with the standard card style (white background, border, shadow, 12 pixel radius).

BLOCK 4 — QUICK ACTIONS (16 pixels margin):
Section header "Quick Actions" in 17 pixels bold.

Replace the intense gradient colored buttons with a cleaner design. Four tiles in a 2x2 grid. Each tile is a white card with a colored icon (not a full colored background gradient). The icon is 36 pixels in a light tinted circle (Notes: light purple circle, Focus: light orange circle, Study: light blue circle, Library: light green circle). Below the icon: the action name in 15 pixels semibold. The tile taps to navigate to that module.

Tile height: 88 pixels. Grid gap: 12 pixels.

BLOCK 5 — COURSE PROGRESS (16 pixels margin):
Section header "Course Progress" in 17 pixels bold.
A card containing enrolled course rows (same as desktop dashboard but mobile-optimized: 56 pixels per row, course icon 36 pixels, name in 14 pixels bold, progress fraction and percentage in 13 pixels gray, thin progress bar below).

BLOCK 6 — RECENT NOTES (16 pixels margin):
Section header "Recent Notes" in 17 pixels bold.
If no notes: empty state card.
If notes exist: a list of the last 3 notes as rows (52 pixels, note icon, title, time ago).

BLOCK 7 — ACTIVITY FEED (16 pixels margin):
Section header "Recent Activity" in 17 pixels bold.
A scrollable list of the last 5 activity items as compact rows.
