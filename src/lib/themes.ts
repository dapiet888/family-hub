export const HUB_THEMES = [
  { id: "paper", label: "Paper", dots: ["#c45c3e", "#2a4a46", "#b0894f", "#5e8f88", "#6b5344"] },
  { id: "midnight", label: "Midnight", dots: ["#7c6cf0", "#3ec6c6", "#f0c24b", "#e25b7a", "#8b9cff"] },
  { id: "boardroom", label: "Boardroom", dots: ["#1e3a5f", "#3d5a80", "#8d99ae", "#c44536", "#edf2f4"] },
  { id: "slate", label: "Slate", dots: ["#2563eb", "#0ea5e9", "#64748b", "#94a3b8", "#f59e0b"] },
  { id: "carbon", label: "Carbon", dots: ["#f59e0b", "#fb923c", "#facc15", "#a3a3a3", "#525252"] },
  { id: "obsidian", label: "Obsidian", dots: ["#f43f5e", "#22d3ee", "#a3e635", "#eab308", "#a78bfa"] },
  { id: "aurora", label: "Aurora", dots: ["#22d3ee", "#818cf8", "#f472b6", "#facc15", "#34d399"] },
  { id: "fjord", label: "Fjord", dots: ["#0f4c81", "#5b7c99", "#94a3b8", "#cbd5e1", "#b45309"] },
  { id: "spruce", label: "Spruce", dots: ["#1e4d3c", "#3f6212", "#65a30d", "#a3b18a", "#d4a373"] },
  { id: "sage", label: "Sage", dots: ["#3f6212", "#4d7c0f", "#a16207", "#78716c", "#44403c"] },
  { id: "terracotta", label: "Terracotta", dots: ["#9a3412", "#c2410c", "#b45309", "#78716c", "#44403c"] },
  { id: "ink", label: "Ink", dots: ["#7f1d1d", "#44403c", "#57534e", "#1c1917", "#a8a29e"] },
  { id: "cobalt", label: "Cobalt", dots: ["#1d4ed8", "#2563eb", "#38bdf8", "#64748b", "#0ea5e9"] },
  { id: "mono", label: "Mono", dots: ["#ea580c", "#171717", "#525252", "#a3a3a3", "#e5e5e5"] },
  { id: "meridian", label: "Meridian", dots: ["#14532d", "#166534", "#a16207", "#78716c", "#44403c"] },
  { id: "night", label: "Night", dots: ["#d6d3d1", "#a8a29e", "#78716c", "#57534e", "#292524"] },
  { id: "forest", label: "Forest", dots: ["#166534", "#3f6212", "#65a30d", "#a3e635", "#ecfccb"] },
  { id: "graphite", label: "Graphite", dots: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#64748b"] },
  { id: "coral", label: "Coral", dots: ["#be123c", "#fb7185", "#fdba74", "#38bdf8", "#94a3b8"] },
  { id: "velvet", label: "Velvet", dots: ["#a21caf", "#7c3aed", "#22d3ee", "#facc15", "#f472b6"] },
] as const;

export type HubTheme = (typeof HUB_THEMES)[number]["id"];

export const THEME_COLORS: Record<HubTheme, string> = {
  paper: "#2a4a46",
  midnight: "#161226",
  boardroom: "#1e3a5f",
  slate: "#334155",
  carbon: "#111111",
  obsidian: "#0a0a0a",
  aurora: "#12182e",
  fjord: "#0f4c81",
  spruce: "#1e4d3c",
  sage: "#3f6212",
  terracotta: "#9a3412",
  ink: "#1c1917",
  cobalt: "#1d4ed8",
  mono: "#171717",
  meridian: "#14532d",
  night: "#141311",
  forest: "#14532d",
  graphite: "#27272a",
  coral: "#9f1239",
  velvet: "#3b0764",
};

export function isHubTheme(value: unknown): value is HubTheme {
  return HUB_THEMES.some((theme) => theme.id === value);
}
