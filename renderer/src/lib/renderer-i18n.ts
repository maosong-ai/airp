import { rendererConfig } from "@/config/renderer-config";
import { matchLocaleInList } from "@/lib/locale-match";
import { THEME_PRESETS } from "@/lib/themes";

export type RendererUiKey =
  | "appTitle"
  | "uploadJson"
  | "reuploadJson"
  | "exportMenu"
  | "exportHtml"
  | "exportHtmlAll"
  | "exportMarkdown"
  | "exportFailed"
  | "dropHint"
  | "dropActive"
  | "themeMenu"
  | "themePresetSection"
  | "themeModeSection"
  | "localeMenu"
  | "colorLight"
  | "colorDark"
  | "colorSystem"
  | "emptyHint"
  | "emptyHintDetail";

type UiTable = Record<RendererUiKey, string>;

const UI: Record<string, UiTable> = {
  "ja-JP": {
    appTitle: "AIRP Renderer",
    uploadJson: "JSON をアップロード",
    reuploadJson: "JSON を再アップロード",
    exportMenu: "エクスポート",
    exportHtml: "HTML",
    exportHtmlAll: "すべての言語",
    exportMarkdown: "Markdown",
    exportFailed: "エクスポートに失敗しました",
    dropHint: ".airp.json をここにドラッグ",
    dropActive: "離してアップロード",
    themeMenu: "テーマ",
    themePresetSection: "スキン",
    themeModeSection: "表示モード",
    localeMenu: "言語",
    colorLight: "ライト",
    colorDark: "ダーク",
    colorSystem: "システム",
    emptyHint: "AIRP Report Viewer",
    emptyHintDetail:
      ".airp.json をアップロードしてレポートを表示します。言語はドキュメントの対応言語から選択できます。",
  },
  "zh-CN": {
    appTitle: "AIRP 渲染器",
    uploadJson: "上传 JSON",
    reuploadJson: "重新上传 JSON",
    exportMenu: "导出",
    exportHtml: "HTML",
    exportHtmlAll: "所有语言",
    exportMarkdown: "Markdown",
    exportFailed: "导出失败",
    dropHint: "拖拽 .airp.json 到此处",
    dropActive: "释放以上传",
    themeMenu: "主题",
    themePresetSection: "皮肤",
    themeModeSection: "明暗",
    localeMenu: "语言",
    colorLight: "浅色",
    colorDark: "深色",
    colorSystem: "跟随系统",
    emptyHint: "AIRP 报告查看器",
    emptyHintDetail: "上传 .airp.json 文件以渲染报告。语言选项来自文档支持的语言列表。",
  },
  en: {
    appTitle: "AIRP Renderer",
    uploadJson: "Upload JSON",
    reuploadJson: "Re-upload JSON",
    exportMenu: "Export",
    exportHtml: "HTML",
    exportHtmlAll: "All Languages",
    exportMarkdown: "Markdown",
    exportFailed: "Export failed",
    dropHint: "Drop .airp.json here",
    dropActive: "Release to upload",
    themeMenu: "Theme",
    themePresetSection: "Skin",
    themeModeSection: "Appearance",
    localeMenu: "Language",
    colorLight: "Light",
    colorDark: "Dark",
    colorSystem: "System",
    emptyHint: "AIRP Report Viewer",
    emptyHintDetail:
      "Upload a .airp.json file to render your report. Language options come from the document.",
  },
};

export const LOCALE_DISPLAY_NAMES: Record<string, string> = {
  "ja-JP": "日本語",
  ja: "日本語",
  "zh-CN": "中文",
  zh: "中文",
  en: "English",
  "en-US": "English",
};

const LOCALE_FLAG_EMOJI: Record<string, string> = {
  "ja-JP": "🇯🇵",
  ja: "🇯🇵",
  "zh-CN": "🇨🇳",
  zh: "🇨🇳",
  en: "🇺🇸",
  "en-US": "🇺🇸",
  "en-GB": "🇬🇧",
};

export function localeDisplayName(code: string): string {
  return LOCALE_DISPLAY_NAMES[code] ?? LOCALE_DISPLAY_NAMES[normalizeKey(code)] ?? code;
}

export function localeFlagEmoji(code: string): string {
  return (
    LOCALE_FLAG_EMOJI[code] ??
    LOCALE_FLAG_EMOJI[normalizeKey(code)] ??
    "🌐"
  );
}

function normalizeKey(code: string): string {
  const parts = code.split(/[-_]/);
  if (parts.length === 1) {
    return parts[0]!.toLowerCase();
  }
  return `${parts[0]!.toLowerCase()}-${parts[1]!.toUpperCase()}`;
}

export function tRenderer(uiLocale: string, key: RendererUiKey): string {
  const resolved =
    matchLocaleInList(uiLocale, rendererConfig.locales) ??
    rendererConfig.defaultLocale;
  const table = UI[resolved] ?? UI[rendererConfig.defaultLocale]!;
  return table[key];
}

/** Localized theme preset labels (renderer chrome). */
export function themePresetLabel(
  uiLocale: string,
  preset: string
): string {
  const labels: Record<string, Record<string, string>> = {
    "ja-JP": {
      default: "オーシャンスレート",
      paper: "暖色羊皮紙",
      blueprint: "設計図ブルー",
      editorial: "新聞印刷",
      terminal: "蛍光ターミナル",
      "data-dense": "分析ダッシュボード",
    },
    "zh-CN": {
      default: "海岩蓝",
      paper: "暖色羊皮纸",
      blueprint: "工程蓝图",
      editorial: "报刊印刷",
      terminal: "荧光终端",
      "data-dense": "分析看板",
    },
    en: {
      default: "Ocean Slate",
      paper: "Warm Parchment",
      blueprint: "Engineering Blueprint",
      editorial: "Editorial Print",
      terminal: "Phosphor Terminal",
      "data-dense": "Analytics Dashboard",
    },
  };
  const loc =
    matchLocaleInList(uiLocale, rendererConfig.locales) ??
    rendererConfig.defaultLocale;
  return labels[loc]?.[preset] ?? labels.en![preset] ?? preset;
}

/** Serialized chrome copy for static HTML (`airp-chrome.js`). */
export type StaticChromeI18nTable = {
  appTitle: string;
  themePresetSection: string;
  themeModeSection: string;
  localeMenu: string;
  colorLight: string;
  colorDark: string;
  colorSystem: string;
  themePresets: Record<string, string>;
};

export function buildStaticChromeI18n(): Record<string, StaticChromeI18nTable> {
  const out: Record<string, StaticChromeI18nTable> = {};
  for (const loc of rendererConfig.locales) {
    out[loc] = {
      appTitle: tRenderer(loc, "appTitle"),
      themePresetSection: tRenderer(loc, "themePresetSection"),
      themeModeSection: tRenderer(loc, "themeModeSection"),
      localeMenu: tRenderer(loc, "localeMenu"),
      colorLight: tRenderer(loc, "colorLight"),
      colorDark: tRenderer(loc, "colorDark"),
      colorSystem: tRenderer(loc, "colorSystem"),
      themePresets: Object.fromEntries(
        THEME_PRESETS.map((p) => [p, themePresetLabel(loc, p)])
      ),
    };
  }
  return out;
}
