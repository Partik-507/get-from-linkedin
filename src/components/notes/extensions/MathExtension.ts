import { Node, Mark, mergeAttributes } from "@tiptap/core";
import katex from "katex";

// ─── Block Math ($$ ... $$) ──────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathBlock: {
      setMathBlock: (latex?: string) => ReturnType;
    };
    mathInline: {
      setMathInline: (latex?: string) => ReturnType;
    };
  }
}

export const MathBlockExtension = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      latex: { default: "E = mc^2" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-math-block]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    let rendered = "";
    try {
      rendered = katex.renderToString(node.attrs.latex, { displayMode: true, throwOnError: false });
    } catch {
      rendered = `<span style="color:red">${node.attrs.latex}</span>`;
    }
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-math-block": "",
        "data-latex": node.attrs.latex,
        style:
          "background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin:12px 0;text-align:center;overflow-x:auto;",
        innerHTML: rendered,
      }),
    ];
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-math-block", "");
      Object.assign(wrapper.style, {
        background: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        padding: "16px",
        margin: "12px 0",
        textAlign: "center",
        overflowX: "auto",
        cursor: "pointer",
      });

      const renderLatex = (latex: string) => {
        try {
          wrapper.innerHTML = katex.renderToString(latex, { displayMode: true, throwOnError: false });
        } catch {
          wrapper.textContent = latex;
        }
      };

      renderLatex(node.attrs.latex);

      wrapper.addEventListener("dblclick", () => {
        const newLatex = window.prompt("Edit LaTeX:", node.attrs.latex);
        if (newLatex !== null && typeof getPos === "function") {
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(getPos(), undefined, { latex: newLatex })
          );
        }
      });

      return { dom: wrapper, update: (updatedNode) => { renderLatex(updatedNode.attrs.latex); return true; } };
    };
  },

  addCommands() {
    return {
      setMathBlock:
        (latex = "E = mc^2") =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: { latex } });
        },
    };
  },
});

// ─── Inline Math ($ ... $) ───────────────────────────────────────────────────

export const MathInlineExtension = Mark.create({
  name: "mathInline",
  inclusive: false,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-math-inline]" }];
  },

  renderHTML({ mark, HTMLAttributes }) {
    let rendered = "";
    try {
      rendered = katex.renderToString(mark.attrs.latex, { displayMode: false, throwOnError: false });
    } catch {
      rendered = mark.attrs.latex;
    }
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-math-inline": "",
        "data-latex": mark.attrs.latex,
        style: "cursor:pointer;",
        innerHTML: rendered,
      }),
    ];
  },

  addCommands() {
    return {
      setMathInline:
        (latex = "x^2") =>
        ({ commands }) => {
          return commands.insertContent({
            type: "text",
            text: latex,
            marks: [{ type: this.name, attrs: { latex } }],
          });
        },
    };
  },
});
