export const THEME_PRESETS = [
  "default",
  "paper",
  "blueprint",
  "editorial",
  "terminal",
  "data-dense",
] as const;

export type ThemePreset = (typeof THEME_PRESETS)[number];

export const THEME_LABELS: Record<ThemePreset, string> = {
  default: "Ocean Slate",
  paper: "Warm Parchment",
  blueprint: "Engineering Blueprint",
  editorial: "Editorial Print",
  terminal: "Phosphor Terminal",
  "data-dense": "Analytics Dashboard",
};

/** Mini preview gradient for toolbar skin swatches (identity, not live tokens). */
export const THEME_PRESET_SWATCH: Record<ThemePreset, string> = {
  default:
    "linear-gradient(145deg, #e4edf7 0%, #e4edf7 42%, #2f5f9a 42%, #2f5f9a 100%)",
  paper:
    "linear-gradient(145deg, #f3e4c8 0%, #f3e4c8 42%, #6b4a2a 42%, #6b4a2a 100%)",
  blueprint:
    "linear-gradient(145deg, #b8d4f0 0%, #b8d4f0 42%, #163a6e 42%, #163a6e 100%)",
  editorial:
    "linear-gradient(145deg, #f5f5f5 0%, #f5f5f5 42%, #b91c3c 42%, #b91c3c 100%)",
  terminal:
    "linear-gradient(145deg, #0c160c 0%, #0c160c 42%, #3dff7a 42%, #3dff7a 100%)",
  "data-dense":
    "linear-gradient(145deg, #eceef8 0%, #eceef8 42%, #5b4fcf 42%, #5b4fcf 100%)",
};
