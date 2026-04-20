VIVAVAULT — DESKTOP NOTES OS AND RESOURCES COMPLETE REDESIGN
File: DESKTOP-04 — Notes OS and Resources Full Redesign

Apply COMMON-01 before this. This redesigns Notes OS and Resources for desktop.

---

CURRENT PROBLEMS IN DESKTOP NOTES OS

The screenshot shows a left sidebar with NOTES OS label, a purple "+ New Page" button, emoji/folder/import/search icon buttons in a row, a filter input, Pages/Graph/Table view tabs, a RECENTS section showing 4 small thumbnail cards, a PAGES section with a folder tree. The main editor shows a toolbar at the top and the editor content area. In the top right of the editor area: "My Workspace", "Public", "Space" tabs as three separate buttons.

Problems identified: The RECENTS section shows card thumbnails that are too small (approximately 60 pixels wide) with truncated "Untitled" labels below — these tiny cards are not scannable or useful. The sidebar has too many icon buttons in a row (emoji icon, folder icon, import icon, search icon) crammed into a small space — these are unclear to new users. The editor toolbar shows too many options all at once (Lora font, size 16, Bold, Italic, Underline, Strikethrough, Code, Highlight, three alignment options, Link) which is overwhelming. The "My Workspace / Public / Space" tabs in the top right corner of the editor are oddly positioned — they affect the entire sidebar content but sit in the editor area which is confusing.

The PAGES list shows mostly "Untitled" pages with no organization visible, making it impossible to navigate effectively. There is no visual differentiation between the folder items (MAD 1, New Folder, New Folder) and the page items (Canvas, Untitled, Untitled...) in the sidebar tree.

---

DESKTOP NOTES OS SIDEBAR REDESIGN

The sidebar is 280 pixels wide. It has a white background and a 1 pixel right border.

SIDEBAR TOP SECTION:
Section label "NOTES OS" in 11 pixels semibold gray uppercase on the left. On the right: a collapse/expand toggle button (a sideways panel icon, 20 pixels) that collapses the sidebar to 0 width with a smooth animation.

Below the label: the workspace switcher. NOT in the editor area — it belongs in the sidebar since it controls what the sidebar shows. The switcher is a full-width segmented control (gray background, sliding white pill, 34 pixels tall, 3 segments: Mine, Public, Space). Switching changes the sidebar page tree to show the selected workspace content.

Below the switcher: a full-width "+ New Page" button (purple filled, 36 pixels tall, 8 pixel radius, white text, plus icon on the left). This is the primary action.

Below the button: a search input for filtering pages (magnifier icon, placeholder "Filter pages...", 36 pixels tall, light gray background). This is separate from the global search — it only filters the page tree below.

VIEW MODE TABS:
Below the filter input: three small tab buttons in a row — Pages (with a document icon, active by default), Graph (with a graph icon), Table (with a grid icon). These are 32 pixels tall compact tabs with no background, just the icon and label in 12 pixels. Active tab: purple text with a purple underline.

RECENTS SECTION:
Replace the thumbnail card grid with a simple list. Section header "RECENTS" in 11 pixels semibold gray uppercase with a collapse chevron on the right. Below: the last 5 opened pages as list rows (40 pixels tall each). Each row shows: the page icon (emoji or default, 16 pixels), the page title in 14 pixels (truncated if long), and the relative time "2h ago" in 12 pixels gray. This is much more scannable than tiny thumbnail cards.

PAGES SECTION (the tree):
Section header "PAGES" in 11 pixels semibold gray uppercase with a collapse chevron and a collapse/expand-all button. Below: the nested page tree.

VISUAL DIFFERENTIATION between folders and pages in the tree:
Folders: folder icon (closed) in a light amber/orange tint, folder name in 14 pixels. When expanded: the folder icon becomes an open folder. Children are indented by 16 pixels with a faint vertical line connecting them to the parent.
Pages: document icon in a light blue tint, page title in 14 pixels. 
If a page has sub-pages: it shows a right-pointing chevron before the icon that rotates 90 degrees when expanded.

Each tree row is 36 pixels tall with 8 pixels horizontal padding. The active/selected page has a light purple background and purple text. Hover shows a very light gray background and reveals a "..." three-dot button on the far right.

Right-clicking any item shows a context menu: Open, Open in new tab, Rename, Duplicate, Move to, Add to favorites, Copy link, Publish, Delete.

SIDEBAR BOTTOM:
Three small text-icon buttons in a row at the very bottom of the sidebar: Import (upload icon, 12 pixels label), Notion Import (Notion icon), Settings (gear icon). These are small and unobtrusive.

---

DESKTOP NOTES OS EDITOR REDESIGN

EDITOR TOP BAR (replaces the current floating toolbar):
The editor top bar is part of the editor layout, sitting between the workspace tabs area and the editor content. It is not a floating popup — it is a fixed bar at the top of the editor area.

The toolbar contains two groups. Left group (formatting controls): font family dropdown (showing "Lora" as the current font, 100 pixels wide), font size input (showing "16", 50 pixels wide), then a divider, then Bold, Italic, Underline, Strikethrough, Code, Highlight, Link as icon buttons (each 32 by 32 pixels). Then another divider, then text alignment buttons (left, center, right).

Right group (editor actions): aligned to the right edge — word count display ("216w · 2m read" in 12 pixels gray), then icon buttons for: Pin, Bookmark, Split view, Share, Version history, View mode toggle, Fullscreen, More options (...).

Remove the My Workspace / Public / Space tabs from the editor top bar area. They are now in the sidebar as the workspace switcher.

EDITOR CONTENT AREA:
The editor content starts with the page icon (emoji, 48 pixels, in a square with rounded corners, clickable to change). The page title is a large contenteditable input below the icon, 28 pixels bold. Below the title: a tags row (horizontal scrollable row of tag chips, "+ Add tag..." as a placeholder chip). Below the tags: the TipTap editor content area.

The editor content is centered at a maximum width of 720 pixels within the editor panel. This gives comfortable reading and writing width without extending to the full panel width (which would be too wide on large screens).

EDITOR SLASH COMMAND PALETTE:
When the user types "/" anywhere in the editor, a floating command palette appears below the cursor. The palette is a white card (300 pixels wide, maximum 400 pixels tall, scrollable) with a search input at the top, then groups of commands each with a section label, icon, name, and keyboard shortcut. The palette is positioned using the cursor's bounding rect. Arrow keys navigate, Enter selects, Escape closes.

TABS FOR MULTIPLE OPEN PAGES:
At the very top of the editor area (above the toolbar), a thin horizontal tab strip shows open pages. Each tab is 120 pixels wide maximum with the page icon and title. A close X appears on hover. Clicking opens that page. This is identical to browser tab behavior. The tab strip is 32 pixels tall with a 1 pixel bottom border.

---

DESKTOP RESOURCES PAGE REDESIGN

CURRENT PROBLEMS IN DESKTOP RESOURCES:
The screenshot shows a left sidebar (FOLDERS section with All and Foundation items), and a main content area with a search bar, All Courses dropdown, All Categories dropdown, a list/grid toggle, an Add Resource button, and a 3-column grid of resource cards. The problems: the resource cards use the same layout for a View button and an external link button side by side, but the View button is too prominent and the external link button too small, creating visual imbalance. The folder sidebar is minimal (only showing All and Foundation) which is fine currently but needs to look intentional rather than sparse. The cards have no visual differentiation between resource types — a Drive file and a GitHub link look nearly identical.

RESOURCES DESKTOP REDESIGN:

The left sidebar (180 pixels wide) shows the folder tree. Section label "FOLDERS" in 11 pixels gray uppercase with a "+" button on the right (40 pixels, icon only, adds a new folder). Below: the tree. Each folder row: folder icon, folder name, item count badge. Selected folder: light purple background. Hover: very light gray. At the bottom of the folder sidebar: an empty state if no other folders exist (just the All item with a subtle "Add a folder to organize your resources" hint text in 12 pixels gray).

The main content area header: a full-width search bar (same style as all search bars — 44 pixels tall, pill shape, gray background). Below the search bar: a single row with All Courses dropdown (pill chip, 160 pixels), All Categories dropdown (pill chip, 150 pixels), a spacer, the view mode toggle (list/grid icon buttons, 32 pixels each), and the Add Resource button (purple filled, 40 pixels, "+ Add Resource" with a plus icon). All in one horizontal line.

Below this header row: the resource grid or list.

GRID MODE (3 columns on desktop): each resource card is a standard card (white, border, shadow, 12 pixel radius, 16 pixels padding). Inside: top row with resource type icon (48 pixels, colored square — Drive is green, GitHub is dark, Docs is blue, YouTube is red, Link is purple, PDF is red, etc.) and resource type label in 13 pixels gray. Below: resource title in 14 pixels bold (maximum 2 lines, truncated). Below: course and category tags as small pills. At the bottom: a divider, then two actions: "View" button (outlined, 36 pixels tall) and an external link icon button (32 by 32 pixels). The resource type icon color gives immediate visual differentiation between resource types.

LIST MODE (single column): each row is 64 pixels tall. Left: resource type icon (40 pixels). Center: title in 14 pixels bold (one line), course and category tags in 12 pixels gray. Right: "View" button (36 pixels tall, outlined) and external link icon. Row hover: very subtle gray background.

EMPTY STATE for resources: centered book stack illustration SVG (100 pixels), "No resources here yet" in 16 pixels semibold, "Resources will appear here once added." in 14 pixels gray, and an "Add Resource" button.
