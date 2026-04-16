import { Mark, mergeAttributes } from "@tiptap/core";

export interface PageLinkOptions {
  // Callback to get page title from id
  getPageTitle?: (pageId: string) => string;
  onNavigate?: (pageId: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageLink: {
      setPageLink: (pageId: string, title: string) => ReturnType;
    };
  }
}

export const PageLinkExtension = Mark.create<PageLinkOptions>({
  name: "pageLink",
  inclusive: false,
  excludes: "_",

  addOptions() {
    return {
      getPageTitle: (id: string) => id,
      onNavigate: undefined,
    };
  },

  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-page-link]" }];
  },

  renderHTML({ mark, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-page-link": mark.attrs.pageId,
        "data-title": mark.attrs.title,
        class: "page-link-chip",
        style:
          "display:inline-flex;align-items:center;gap:4px;background:#EDE9FE;color:#6D28D9;border-radius:9999px;padding:1px 10px 1px 8px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;border:1px solid #DDD6FE;transition:background 150ms;white-space:nowrap;",
        title: `Go to: ${mark.attrs.title}`,
        onclick: `window.dispatchEvent(new CustomEvent('notes-navigate-page', {detail:'${mark.attrs.pageId}'}))`,
      }),
      ["span", { style: "font-size:11px;opacity:0.7;" }, "📄"],
      mark.attrs.title || mark.attrs.pageId,
    ];
  },

  addCommands() {
    return {
      setPageLink:
        (pageId: string, title: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "text",
            text: title,
            marks: [{ type: this.name, attrs: { pageId, title } }],
          });
        },
    };
  },
});
