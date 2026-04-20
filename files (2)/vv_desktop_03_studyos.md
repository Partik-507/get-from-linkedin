VIVAVAULT — DESKTOP STUDY OS COMPLETE REDESIGN
File: DESKTOP-03 — Study OS Page Full Redesign

Apply COMMON-01 before this. This redesigns the Study OS page at /study-os for desktop.

---

CURRENT PROBLEMS IN THE DESKTOP STUDY OS

The screenshot shows a functional two-panel layout with a left sidebar (STUDY OS label, focus time, streak, Calendar/Tasks/Habits/Focus/Analytics navigation, mini calendar, My Calendars, Other Calendars sections, and a Start Focus button pinned at the bottom) and a main content area (calendar week view with April 19-25, 2026 displayed, with a + Create button and Syncing... status). The problems are:

The sidebar has a "Start Focus" button pinned at the very bottom in solid purple that takes 100% of the sidebar width. This button placement feels intrusive and disconnected from the context — it should only appear when in the Focus tab or be accessible from the top bar.

The calendar shows "Syncing..." status in the top right of the calendar area which is alarming and should be a subtle indicator, not a visible loading state.

The overall sidebar visual treatment does not match the rest of the app well. The sidebar background should match the page background color, not be a slightly different shade that creates a jarring separation.

The calendar week view is empty — this is fine as a data issue but the empty state of the calendar (no events) needs a visual treatment that guides the user to click to create an event.

The mini calendar in the sidebar shows dates but tapping a date should be clearly interactive. Currently there is no visual affordance that dates are clickable.

---

STUDY OS DESKTOP SIDEBAR REDESIGN

The sidebar is 220 pixels wide. Its background matches the page background color exactly (no separation line needed, just the natural visual grouping of its contents).

TOP OF SIDEBAR:
Section label "STUDY OS" in 11 pixels semibold gray uppercase. Below: two stat chips in a row — a focus time chip (clock icon, "9h 17m" in 13 pixels bold, shown in a light gray pill) and a streak chip (fire icon, "1d streak" in 13 pixels bold, shown in a light orange pill). These are informational only, not clickable.

NAVIGATION SECTION (below stats, 12 pixels margin):
Five navigation items stacked vertically. Each item is 40 pixels tall, 12 pixels horizontal padding, 8 pixel radius. Icon on the left (20 pixels), label in 14 pixels medium weight. Active item: light purple background and purple text. Hover: very light gray background. Items: Calendar (with a badge showing 1 upcoming event if any), Tasks, Habits, Focus, Analytics. The badge is a small purple circle with a white number inside it, positioned at the right edge of the row.

MINI CALENDAR (below navigation, separated by a subtle 1 pixel divider):
The mini calendar shows the current month. Month name and year on one line with left and right arrow buttons. Day-of-week headers (S M T W T F S) in 11 pixels gray. Each day cell is 28 pixels square. Today's date has a purple filled circle with white text. Days with events have a small purple dot below the date number. Days in previous/next month are shown in a lighter gray. Clicking any date navigates the main calendar to that date and switches to the Day view. Add a "Today" link below the calendar that jumps back to the current day.

MY CALENDARS SECTION:
Section label "MY CALENDARS" in 11 pixels semibold gray uppercase. Below: a list of connected calendars. Each calendar is a row with a colored checkbox (16 pixels, rounded, the calendar's color) and the calendar name in 13 pixels. Checking or unchecking hides or shows that calendar's events on the main grid.

OTHER CALENDARS SECTION:
Section label "OTHER CALENDARS" in 11 pixels semibold gray uppercase. Below: connected Google account calendars listed the same way as My Calendars. A "+ Connect Google Calendar" button at the bottom of this section (outlined, 32 pixels tall, full sidebar width). 

Remove the "Start Focus" button from the sidebar bottom. Instead, the Focus navigation item in the sidebar is sufficient. The Focus Engine is launched from within the Focus tab content area.

---

STUDY OS DESKTOP MAIN CONTENT — CALENDAR VIEW

CALENDAR HEADER ROW (full width of the main content area):
Left: left arrow button (navigate back), "Today" button (outlined, 36 pixels), right arrow button. Then the date range label "April 19 – 25, 2026" in 18 pixels bold.
Right: a "+ Create" button (solid purple, 40 pixels, with a plus icon) and a "Week" dropdown button (outlined, shows the current view name and a chevron, clicking opens a dropdown with Day, Week, Month, Year, Schedule, 4 Days view options, and toggles for Show weekends and Show completed tasks).

Remove the "Syncing..." status from the calendar header. If Google Calendar is syncing, show only the subtle "Saving..." text in the shared navbar sync indicator as described in COMMON-01.

CALENDAR WEEK VIEW:
The week grid occupies the full main content area. At the top: an all-day events row (hidden if no all-day events). Below: the scrollable hourly timeline.

The hourly timeline: left column 56 pixels wide showing hour labels in 12 pixels gray (12 PM, 1 PM, 2 PM through 11 PM). Each hour row is 60 pixels tall. The current time is a red horizontal line with a red circle dot on the left edge. The seven day columns are equal width, separated by faint 1 pixel vertical lines.

The empty calendar day columns need a visual interaction hint. When hovering over an empty time slot, the slot should show a very subtle light purple fill (5% opacity purple) and a faint "+" symbol appears, indicating the user can click to create an event. This makes it immediately clear how to add events without any text instruction.

Event blocks: background at 15% opacity of the calendar color, solid 3 pixel left border at 100% of the calendar color, event title in 13 pixels white bold, time in 12 pixels at 80% opacity. Minimum event block height of 24 pixels regardless of short duration. Events display the full title if the block is tall enough, otherwise truncate with ellipsis.

CALENDAR DAY VIEW (when Day is selected):
The single day fills the entire main content width. The column is much wider (full width minus 56 pixels for hour labels). This makes events easier to read and create.

CALENDAR MONTH VIEW:
A 6-row grid. Each day cell expands to fill available height. Day number in the top left of each cell, small colored event pills below it. Today's date has a purple circle around the number. Clicking a day navigates to the Day view for that date.

CALENDAR EMPTY STATE:
When the calendar is empty (no events), show a centered overlay within the visible timeline area (not blocking the timeline, but appearing within it): a subtle message "Your calendar is empty. Click any time slot to create an event, or connect Google Calendar from the sidebar." This message fades out the first time the user creates an event or connects a calendar, and never shows again.

---

TASKS TAB CONTENT

When the user clicks Tasks in the sidebar, the main content area shows the Tasks module. Layout: a header with "Tasks" on the left and a "+ New Task" button on the right. Below: four horizontal tab buttons (Today, Inbox, Projects, Upcoming). Each tab shows a count badge. The active tab has an underline in purple.

Today tab: shows overdue tasks in a red-labeled section and today's tasks in a normal section. Each task row: circular checkbox (24 pixels, priority color), task title (14 pixels), priority color dot, due time if set, project tag pill, three-dot menu on far right. Checking marks the task done with an animation.

---

HABITS TAB CONTENT

When the user clicks Habits, the main content area shows the Habits module. Header: "Habits" on the left, "+ New Habit" on the right. Below: horizontal tabs (Today, All Habits, Analytics, History). Today tab shows habit cards with completion toggles. Analytics tab shows consistency charts.

---

FOCUS TAB CONTENT

When the user clicks Focus, the main content area shows the Focus launcher. A large centered card with: "Start a Focus Session" heading, duration presets (25 min, 50 min, 90 min as clickable pill buttons), mode selection (Normal and Strict as two card options), theme selection (a horizontal strip of wallpaper thumbnails), and a "Start Focus" primary button. Below: a section showing today's completed sessions as a list.

---

ANALYTICS TAB CONTENT

When the user clicks Analytics, the main content area shows the analytics section. Five cards stacked or in a grid layout as described in previous prompt files.
