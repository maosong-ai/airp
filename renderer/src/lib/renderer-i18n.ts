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
  | "emptyHintDetail"
  | "fileTreeToolbarTitle"
  | "fileTreeExpandAll"
  | "fileTreeCollapseAll"
  | "fileTreeDirLabel"
  | "fileTreeFileLabel";

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
    fileTreeToolbarTitle: "構成",
    fileTreeExpandAll: "すべて展開",
    fileTreeCollapseAll: "すべて折りたたむ",
    fileTreeDirLabel: "DIR",
    fileTreeFileLabel: "FILE",
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
    fileTreeToolbarTitle: "目录结构",
    fileTreeExpandAll: "全部展开",
    fileTreeCollapseAll: "全部折叠",
    fileTreeDirLabel: "目录",
    fileTreeFileLabel: "文件",
    emptyHint: "AIRP 报告查看器",
    emptyHintDetail: "上传 .airp.json 文件以渲染报告。语言选项来自文档支持的语言列表。",
  },
  "ko-KR": {
    appTitle: "AIRP 렌더러",
    uploadJson: "JSON 업로드",
    reuploadJson: "JSON 다시 업로드",
    exportMenu: "내보내기",
    exportHtml: "HTML",
    exportHtmlAll: "모든 언어",
    exportMarkdown: "Markdown",
    exportFailed: "내보내기에 실패했습니다",
    dropHint: ".airp.json 파일을 여기에 드래그하세요",
    dropActive: "놓아서 업로드",
    themeMenu: "테마",
    themePresetSection: "스킨",
    themeModeSection: "표시 모드",
    localeMenu: "언어",
    colorLight: "라이트",
    colorDark: "다크",
    colorSystem: "시스템",
    fileTreeToolbarTitle: "구조",
    fileTreeExpandAll: "모두 펼치기",
    fileTreeCollapseAll: "모두 접기",
    fileTreeDirLabel: "폴더",
    fileTreeFileLabel: "파일",
    emptyHint: "AIRP Report Viewer",
    emptyHintDetail:
      ".airp.json 파일을 업로드해 리포트를 렌더링하세요. 언어 옵션은 문서의 지원 언어를 따릅니다.",
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
    fileTreeToolbarTitle: "Structure",
    fileTreeExpandAll: "Expand all",
    fileTreeCollapseAll: "Collapse all",
    fileTreeDirLabel: "DIR",
    fileTreeFileLabel: "FILE",
    emptyHint: "AIRP Report Viewer",
    emptyHintDetail:
      "Upload a .airp.json file to render your report. Language options come from the document.",
  },
  "de-DE": {
    appTitle: "AIRP Renderer",
    uploadJson: "JSON hochladen",
    reuploadJson: "JSON erneut hochladen",
    exportMenu: "Exportieren",
    exportHtml: "HTML",
    exportHtmlAll: "Alle Sprachen",
    exportMarkdown: "Markdown",
    exportFailed: "Export fehlgeschlagen",
    dropHint: ".airp.json hier ablegen",
    dropActive: "Zum Hochladen loslassen",
    themeMenu: "Thema",
    themePresetSection: "Skin",
    themeModeSection: "Darstellung",
    localeMenu: "Sprache",
    colorLight: "Hell",
    colorDark: "Dunkel",
    colorSystem: "System",
    fileTreeToolbarTitle: "Struktur",
    fileTreeExpandAll: "Alle aufklappen",
    fileTreeCollapseAll: "Alle einklappen",
    fileTreeDirLabel: "ORDNER",
    fileTreeFileLabel: "DATEI",
    emptyHint: "AIRP Report Viewer",
    emptyHintDetail:
      "Lade eine .airp.json hoch, um den Bericht zu rendern. Sprachoptionen kommen aus dem Dokument.",
  },
  "fr-FR": {
    appTitle: "AIRP Renderer",
    uploadJson: "Importer JSON",
    reuploadJson: "Réimporter JSON",
    exportMenu: "Exporter",
    exportHtml: "HTML",
    exportHtmlAll: "Toutes les langues",
    exportMarkdown: "Markdown",
    exportFailed: "Échec de l'export",
    dropHint: "Déposez .airp.json ici",
    dropActive: "Relâchez pour importer",
    themeMenu: "Thème",
    themePresetSection: "Skin",
    themeModeSection: "Apparence",
    localeMenu: "Langue",
    colorLight: "Clair",
    colorDark: "Sombre",
    colorSystem: "Système",
    fileTreeToolbarTitle: "Structure",
    fileTreeExpandAll: "Tout développer",
    fileTreeCollapseAll: "Tout réduire",
    fileTreeDirLabel: "DOSSIER",
    fileTreeFileLabel: "FICHIER",
    emptyHint: "AIRP Report Viewer",
    emptyHintDetail:
      "Importez un fichier .airp.json pour afficher le rapport. Les langues disponibles viennent du document.",
  },
  "ru-RU": {
    appTitle: "AIRP Renderer",
    uploadJson: "Загрузить JSON",
    reuploadJson: "Загрузить JSON заново",
    exportMenu: "Экспорт",
    exportHtml: "HTML",
    exportHtmlAll: "Все языки",
    exportMarkdown: "Markdown",
    exportFailed: "Не удалось выполнить экспорт",
    dropHint: "Перетащите .airp.json сюда",
    dropActive: "Отпустите для загрузки",
    themeMenu: "Тема",
    themePresetSection: "Скин",
    themeModeSection: "Режим",
    localeMenu: "Язык",
    colorLight: "Светлая",
    colorDark: "Тёмная",
    colorSystem: "Системная",
    fileTreeToolbarTitle: "Структура",
    fileTreeExpandAll: "Развернуть все",
    fileTreeCollapseAll: "Свернуть все",
    fileTreeDirLabel: "ПАПКА",
    fileTreeFileLabel: "ФАЙЛ",
    emptyHint: "AIRP Report Viewer",
    emptyHintDetail:
      "Загрузите .airp.json, чтобы отрисовать отчёт. Список языков берется из документа.",
  },
  "es-ES": {
    appTitle: "AIRP Renderer",
    uploadJson: "Subir JSON",
    reuploadJson: "Volver a subir JSON",
    exportMenu: "Exportar",
    exportHtml: "HTML",
    exportHtmlAll: "Todos los idiomas",
    exportMarkdown: "Markdown",
    exportFailed: "La exportación falló",
    dropHint: "Suelta .airp.json aquí",
    dropActive: "Suelta para subir",
    themeMenu: "Tema",
    themePresetSection: "Skin",
    themeModeSection: "Apariencia",
    localeMenu: "Idioma",
    colorLight: "Claro",
    colorDark: "Oscuro",
    colorSystem: "Sistema",
    fileTreeToolbarTitle: "Estructura",
    fileTreeExpandAll: "Expandir todo",
    fileTreeCollapseAll: "Contraer todo",
    fileTreeDirLabel: "CARPETA",
    fileTreeFileLabel: "ARCHIVO",
    emptyHint: "AIRP Report Viewer",
    emptyHintDetail:
      "Sube un archivo .airp.json para renderizar el informe. Las opciones de idioma provienen del documento.",
  },
  "pt-BR": {
    appTitle: "AIRP Renderer",
    uploadJson: "Enviar JSON",
    reuploadJson: "Reenviar JSON",
    exportMenu: "Exportar",
    exportHtml: "HTML",
    exportHtmlAll: "Todos os idiomas",
    exportMarkdown: "Markdown",
    exportFailed: "Falha ao exportar",
    dropHint: "Solte .airp.json aqui",
    dropActive: "Solte para enviar",
    themeMenu: "Tema",
    themePresetSection: "Skin",
    themeModeSection: "Aparência",
    localeMenu: "Idioma",
    colorLight: "Claro",
    colorDark: "Escuro",
    colorSystem: "Sistema",
    fileTreeToolbarTitle: "Estrutura",
    fileTreeExpandAll: "Expandir tudo",
    fileTreeCollapseAll: "Recolher tudo",
    fileTreeDirLabel: "PASTA",
    fileTreeFileLabel: "ARQUIVO",
    emptyHint: "AIRP Report Viewer",
    emptyHintDetail:
      "Envie um arquivo .airp.json para renderizar o relatório. As opções de idioma vêm do documento.",
  },
  "it-IT": {
    appTitle: "AIRP Renderer",
    uploadJson: "Carica JSON",
    reuploadJson: "Ricarica JSON",
    exportMenu: "Esporta",
    exportHtml: "HTML",
    exportHtmlAll: "Tutte le lingue",
    exportMarkdown: "Markdown",
    exportFailed: "Esportazione non riuscita",
    dropHint: "Trascina .airp.json qui",
    dropActive: "Rilascia per caricare",
    themeMenu: "Tema",
    themePresetSection: "Skin",
    themeModeSection: "Aspetto",
    localeMenu: "Lingua",
    colorLight: "Chiaro",
    colorDark: "Scuro",
    colorSystem: "Sistema",
    fileTreeToolbarTitle: "Struttura",
    fileTreeExpandAll: "Espandi tutto",
    fileTreeCollapseAll: "Comprimi tutto",
    fileTreeDirLabel: "CARTELLA",
    fileTreeFileLabel: "FILE",
    emptyHint: "AIRP Report Viewer",
    emptyHintDetail:
      "Carica un file .airp.json per renderizzare il report. Le opzioni lingua provengono dal documento.",
  },
};

export const LOCALE_DISPLAY_NAMES: Record<string, string> = {
  "ja-JP": "日本語",
  ja: "日本語",
  "zh-CN": "中文",
  zh: "中文",
  "ko-KR": "한국어",
  ko: "한국어",
  en: "English",
  "en-US": "English",
  "de-DE": "Deutsch",
  de: "Deutsch",
  "fr-FR": "Français",
  fr: "Français",
  "ru-RU": "Русский",
  ru: "Русский",
  "es-ES": "Español",
  es: "Español",
  "pt-BR": "Português (Brasil)",
  pt: "Português",
  "it-IT": "Italiano",
  it: "Italiano",
};

const LOCALE_FLAG_EMOJI: Record<string, string> = {
  "ja-JP": "🇯🇵",
  ja: "🇯🇵",
  "zh-CN": "🇨🇳",
  zh: "🇨🇳",
  "ko-KR": "🇰🇷",
  ko: "🇰🇷",
  en: "🇺🇸",
  "en-US": "🇺🇸",
  "en-GB": "🇬🇧",
  "de-DE": "🇩🇪",
  de: "🇩🇪",
  "fr-FR": "🇫🇷",
  fr: "🇫🇷",
  "ru-RU": "🇷🇺",
  ru: "🇷🇺",
  "es-ES": "🇪🇸",
  es: "🇪🇸",
  "pt-BR": "🇧🇷",
  pt: "🇵🇹",
  "it-IT": "🇮🇹",
  it: "🇮🇹",
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
    "ko-KR": {
      default: "오션 슬레이트",
      paper: "웜 파치먼트",
      blueprint: "엔지니어링 블루프린트",
      editorial: "에디토리얼 프린트",
      terminal: "포스퍼 터미널",
      "data-dense": "애널리틱스 대시보드",
    },
    en: {
      default: "Ocean Slate",
      paper: "Warm Parchment",
      blueprint: "Engineering Blueprint",
      editorial: "Editorial Print",
      terminal: "Phosphor Terminal",
      "data-dense": "Analytics Dashboard",
    },
    "de-DE": {
      default: "Ocean Slate",
      paper: "Warmes Pergament",
      blueprint: "Technische Blaupause",
      editorial: "Editorial Print",
      terminal: "Phosphor-Terminal",
      "data-dense": "Analyse-Dashboard",
    },
    "fr-FR": {
      default: "Ocean Slate",
      paper: "Parchemin chaud",
      blueprint: "Plan d'ingénierie",
      editorial: "Impression éditoriale",
      terminal: "Terminal phosphore",
      "data-dense": "Tableau analytique",
    },
    "ru-RU": {
      default: "Ocean Slate",
      paper: "Тёплый пергамент",
      blueprint: "Инженерный чертёж",
      editorial: "Редакционная печать",
      terminal: "Фосфорный терминал",
      "data-dense": "Аналитическая панель",
    },
    "es-ES": {
      default: "Ocean Slate",
      paper: "Pergamino cálido",
      blueprint: "Plano de ingeniería",
      editorial: "Impresión editorial",
      terminal: "Terminal de fósforo",
      "data-dense": "Panel analítico",
    },
    "pt-BR": {
      default: "Ocean Slate",
      paper: "Pergaminho quente",
      blueprint: "Blueprint de engenharia",
      editorial: "Impressão editorial",
      terminal: "Terminal de fósforo",
      "data-dense": "Painel analítico",
    },
    "it-IT": {
      default: "Ocean Slate",
      paper: "Pergamena calda",
      blueprint: "Blueprint ingegneristico",
      editorial: "Stampa editoriale",
      terminal: "Terminale fosforo",
      "data-dense": "Dashboard analitica",
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
