VIVAVAULT — DESKTOP HOME PAGE COMPLETE REDESIGN
File: DESKTOP-01 — Home Page Full Redesign

Apply COMMON-01 design system before this prompt. This prompt redesigns the Home page at the root route for desktop screens (above 768px wide).

---

CURRENT PROBLEMS IN THE DESKTOP HOME PAGE

Looking at the screenshot: the top section has a two-column layout where the left shows the VivaVault wordmark and welcome message and filter dropdowns, and the right shows a large card with six feature tiles, a Contribute section, Share button, and Feedback button. This layout works conceptually but has several problems. The feature tile section is very prominent and takes up significant vertical space, pushing the actual course cards far down the page — students must scroll past a large feature grid just to see their courses. The feature grid uses inconsistently sized tiles and the Contribute section feels disconnected from the Share and Feedback items which float separately beside it as two isolated cards. The course cards below have inconsistent sizing and the fourth card (mad2) shows a "Premium" badge overlapping the content with a blurred background effect that looks broken. The filter dropdowns in the top-left are styled as outlined box dropdowns that do not match the premium feel. Overall the page hierarchy puts decorative features before the student's primary task (accessing their courses).

---

DESKTOP HOME PAGE — COMPLETE NEW LAYOUT

The page layout is a full-width single column. The page has 24 pixels horizontal padding on each side (or a maximum content width of 1400 pixels centered if the screen is very wide).

SECTION 1 — SEARCH BAR (full width, very top of content below navbar):
A full-width search bar, 52 pixels tall, white background, 14 pixel radius, 1 pixel border, shadow, with a search icon on the left and placeholder "Search courses, projects, questions..." and a keyboard shortcut hint on the right (showing Cmd+K or Ctrl+K in a small pill). This search bar is the first and most prominent element on the page. Clicking it opens a full-screen command palette overlay for searching.

SECTION 2 — WELCOME AND QUICK STATS ROW (below search bar, 24 pixels margin):
A horizontal row spanning full width. Left side: greeting text "Welcome back, Kunal!" in 22 pixels bold, with "Continue where you left off." below in 14 pixels gray. Right side: a row of three stat chips — the streak chip (fire icon, "1 day streak" in orange pill), the review chip (review icon, "2514 due for review" in purple outlined pill), and the sync status text ("Saved" in 12 pixels gray with checkmark). These chips give the student their most important status at a glance without a separate dashboard.

SECTION 3 — FILTER AND SORT ROW (below welcome row, 16 pixels margin):
A single horizontal row. Left side: three dropdown chips for Branch, Level, and Type — each is 36 pixels tall, pill-shaped, white background, standard border, label and chevron. These are compact and do not take up more than 320 pixels of horizontal space. Right side of this same row: an "Enrolled Only" toggle chip (when active it shows a checkmark and purple background) and a sort dropdown (Newest, alphabetical). All filtering and sorting is on one line.

SECTION 4 — COURSE AND PROJECT GRID (main content area):
Section header: "All Courses and Projects" in 18 pixels bold on the left, a count badge in a gray pill (showing "5 items"), and on the right the Enrolled Only toggle and Newest sort dropdown from Section 3 can optionally be positioned here instead if the row above is too dense.

The course cards display in a responsive grid: 4 columns on large desktop (above 1280px), 3 columns on standard desktop (1024 to 1280px), 2 columns on tablet. Each card is a standard card (white, border, radius, shadow). Inside each card:

Top of card: a row with the course icon (colored square, 44 pixels, with 2-letter abbreviation) on the left, the course name in 15 pixels bold, course description in 13 pixels gray below the name, and a question count badge (e.g., "199 Q") on the far right in a small gray outlined pill.

Middle of card (shown only if enrolled): the progress area. "X studied" text on the left in 13 pixels gray, the percentage on the right in 13 pixels. A thin progress bar (4 pixels tall) between them, purple fill, full-width within the card.

Bottom of card: two buttons side by side. The primary action button (Continue if enrolled, Enroll if not) takes 70% of the card width, purple filled. The secondary action (a small external link icon button in a 44 pixel square) takes the remaining 30%. This means the Resources text is replaced with a clean icon button. Below these two buttons (or integrated into the header area): if the course is premium and locked, show a "Request Access" button instead of Continue and Resources. The premium state should show a small lock icon badge in the top right corner of the card icon area, not a blurred overlay effect.

Locked/premium cards: do NOT use a blurred overlay effect over the card content. Instead, show the card normally but with the content visible and a subtle overlay treatment (a light gray tint overlay at 20% opacity on the content area below the header) and the Request Access button. The card header (icon and title) remains fully visible and clear. The premium badge is a small orange pill "Premium" in the top right corner of the card.

SECTION 5 — FEATURE QUICK LINKS (moved to be less prominent):
Instead of the large feature grid that dominated the right column, reduce this to a collapsible section at the bottom of the page or integrate it as a small horizontal scrollable row of feature chips below the filter row. The chips are: IITM BS Portal, Data Studio, Course Planner, Ace Grade, Discourse, Quiz Practice — each as a 36 pixel tall chip with a small icon and label. They scroll horizontally if they overflow. This keeps the features accessible but does not hide the course grid.

The Contribute section (Submit Questions, Share Notes, Share Resources) and the Share and Feedback buttons are moved to a right-side floating action panel or collapsed into the user profile dropdown. They should not occupy prominent space on the home page because they are secondary actions that most students will rarely use.

SECTION 6 — LOAD MORE (at bottom of course grid):
Instead of infinite scroll (which loses the user's place), use a "Load more" button centered below the grid. 40 pixels tall, outlined secondary button. When all courses are loaded, the button is hidden.

---

DESKTOP HOME PAGE EMPTY STATE

When no courses exist (new user, or all filters return nothing): show a centered empty state in the course grid area. Illustration of an open book or study desk SVG (100 pixels). Heading "No courses found" in 18 pixels. Description "Adjust your filters above or check back when courses are added." in 14 pixels gray. A "Clear filters" button. Do not show the same empty state for "filters active with no results" and "genuinely no courses" — distinguish between these two states with different copy.

---

DESKTOP HOME PAGE INTERACTIONS

Filter dropdowns: changing any dropdown instantly filters the course grid below with a 200 millisecond cross-fade animation on the grid content. No apply button needed.

Search bar: clicking opens a full-screen command palette. The palette darkens the page background with a semi-transparent overlay and shows a centered search panel (600 pixels wide, white, 16 pixel radius, shadow). Recent searches appear below the input immediately. As the user types, results appear in real time grouped by type (Courses, Questions, Notes, Resources). Pressing Escape or clicking outside closes the palette.

Course card hover: the card lifts slightly (the shadow deepens from the base shadow to 0 4px 16px rgba(0,0,0,0.1)) and the primary button becomes slightly more saturated in purple. The hover state transition is 150 milliseconds.

Enrolled Only toggle: when activated, the grid cross-fades to show only enrolled courses. The count badge in the section header updates to show the filtered count.

---

DESKTOP HOME PAGE RESPONSIVE BEHAVIOR

Above 1280px: 4-column course grid, search bar and welcome row side by side (60-40 split).
1024 to 1280px: 3-column course grid, search bar full width, welcome row below.
768 to 1024px: 2-column course grid. Feature chips scroll horizontally.
Below 768px: mobile layout as described in the mobile home prompt.
