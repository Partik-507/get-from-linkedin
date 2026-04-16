import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
    };
  }
}

export const ToggleExtension = Node.create({
  name: "toggle",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      open: { default: false },
      summary: { default: "Click to expand" },
    };
  },

  parseHTML() {
    return [{ tag: "details[data-toggle]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, {
        "data-toggle": "",
        open: node.attrs.open || undefined,
        style:
          "border:1px solid #E5E7EB;border-radius:8px;padding:4px 12px;margin:8px 0;cursor:pointer;",
      }),
      ["summary", { style: "font-weight:500;padding:6px 0;list-style:none;user-select:none;" }, node.attrs.summary],
      ["div", { style: "padding:8px 0 4px 0;" }, 0],
    ];
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { open: false, summary: "Click to expand" },
            content: [{ type: "text", text: "Content here..." }],
          });
        },
    };
  },
});
