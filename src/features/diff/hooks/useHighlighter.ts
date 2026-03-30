import { useCallback, useEffect, useState } from "react";
import { createHighlighterCore, type HighlighterCore, type ThemedToken } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

type Highlighter = HighlighterCore;

const LANG_IMPORTS: Record<string, () => Promise<unknown>> = {
  javascript: () => import("shiki/langs/javascript.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  c: () => import("shiki/langs/c.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  toml: () => import("shiki/langs/toml.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  dockerfile: () => import("shiki/langs/dockerfile.mjs"),
  vue: () => import("shiki/langs/vue.mjs"),
  svelte: () => import("shiki/langs/svelte.mjs"),
  swift: () => import("shiki/langs/swift.mjs"),
  kotlin: () => import("shiki/langs/kotlin.mjs"),
  ruby: () => import("shiki/langs/ruby.mjs"),
  php: () => import("shiki/langs/php.mjs"),
  lua: () => import("shiki/langs/lua.mjs"),
};

let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLangs = new Set<string>();

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import("shiki/themes/github-dark.mjs"), import("shiki/themes/github-light.mjs")],
      langs: [],
      engine: createOnigurumaEngine(import("shiki/wasm")),
    });
  }
  return highlighterPromise;
}

async function ensureLang(hl: Highlighter, lang: string): Promise<boolean> {
  if (loadedLangs.has(lang)) return true;
  const loader = LANG_IMPORTS[lang];
  if (!loader) return false;
  try {
    const mod = await loader();
    await hl.loadLanguage(mod as never);
    loadedLangs.add(lang);
    return true;
  } catch {
    return false;
  }
}

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  jsx: "jsx",
  rs: "rust",
  py: "python",
  go: "go",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  html: "html",
  htm: "html",
  css: "css",
  scss: "css",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  mdx: "markdown",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  sql: "sql",
  dockerfile: "dockerfile",
  vue: "vue",
  svelte: "svelte",
  swift: "swift",
  kt: "kotlin",
  rb: "ruby",
  php: "php",
  lua: "lua",
};

function detectLang(filePath: string): string | null {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  const base = filePath.split("/").pop()?.toLowerCase() ?? "";
  if (base === "dockerfile") return "dockerfile";
  return EXT_TO_LANG[ext] ?? null;
}

export type HighlightedLine = ThemedToken[];

export function useHighlighter() {
  const [hl, setHl] = useState<Highlighter | null>(null);

  useEffect(() => {
    getHighlighter()
      .then(setHl)
      .catch(() => {});
  }, []);

  const highlightLines = useCallback(
    async (lines: string[], filePath: string, isDark: boolean): Promise<HighlightedLine[] | null> => {
      if (!hl) return null;
      const lang = detectLang(filePath);
      if (!lang) return null;

      const loaded = await ensureLang(hl, lang);
      if (!loaded) return null;

      try {
        const theme = isDark ? "github-dark" : "github-light";
        const code = lines.join("\n");
        const result = hl.codeToTokens(code, { lang, theme });
        return result.tokens;
      } catch {
        return null;
      }
    },
    [hl],
  );

  return { ready: !!hl, highlightLines };
}
