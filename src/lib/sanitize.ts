import DOMPurify from "dompurify";

/**
 * Sanitize untrusted HTML before injecting via dangerouslySetInnerHTML.
 * Strips <script>, event handlers, javascript: URLs, and other XSS vectors
 * while preserving rich-text formatting.
 */
export const safeHtml = (html: string | undefined | null): string => {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, mathMl: true, svg: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "formaction"],
  });
};
