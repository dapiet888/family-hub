export const HUB_THEMES = [
  { id: "paper", label: "Paper", hint: "Warm daylight" },
  { id: "spruce", label: "Spruce", hint: "Cool green" },
  { id: "night", label: "Night", hint: "Dim kitchen" },
] as const;

export type HubTheme = (typeof HUB_THEMES)[number]["id"];

export const THEME_COLORS: Record<HubTheme, string> = {
  paper: "#2a4a46",
  spruce: "#1e4d3c",
  night: "#141311",
};

export function isHubTheme(value: unknown): value is HubTheme {
  return HUB_THEMES.some((theme) => theme.id === value);
}
