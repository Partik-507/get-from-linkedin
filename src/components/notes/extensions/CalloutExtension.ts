import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutType = "info" | "warning" | "success" | "error" | "tip";

const CALLOUT_STYLES: Record<CalloutType, { emoji: string; bg: string; border: string; text: string }> = {
  info:    { emoji: "ℹ️",  bg: "#EFF6FF", border: "#3B82F6", text: "#1D4ED8" },
  warning: { emoji: "⚠️",  bg: "#FFFBEB", border: "#F59E0B", text: "#B45309" },
  success: { emoji: "✅",  bg: "#F0FDF4", border: "#22C55E", text: "#15803D" },
  error:   { emoji: "❌",  bg: "#FEF2F2", border: "#EF4444", text: "#B91C1C" },
  tip:     { emoji: "💡",  bg: "#FAF5FF", border: "#A855F7", text: "#7E22CE" },
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type?: CalloutType) => ReturnType;
    };
  }
}

export const CalloutExtension = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  isolating: true,

  addAttributes() {
    return {
      type: { default: "info" as CalloutType },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = CALLOUT_STYLES[node.attrs.type as CalloutType] || CALLOUT_STYLES.info;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": node.attrs.type,
        style: `background:${style.bg};border-left:4px solid ${style.border};border-radius:8px;padding:12px 16px;margin:12px 0;`,
      }),
      [
        "div",
        { style: "display:flex;align-items:flex-start;gap:10px;" },
        ["span", { style: `font-size:18px;line-height:1.4;flex-shrink:0;` }, style.emoji],
        ["div", { style: `flex:1;color:${style.text};`, class: "callout-content" }, 0],
      ],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (type: CalloutType = "info") =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [{ type: "paragraph" }],
          });
        },
    };
  },
});
