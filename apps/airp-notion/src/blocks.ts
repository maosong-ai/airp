/**
 * The block catalog the `/` menu reads: a name and a group for each type.
 *
 * The schema owns *which* types exist and *which fields* they have (see
 * `schema.ts`). This file owns only how they are presented, which the schema
 * cannot say: a JSON Schema has no opinion about what a Chinese reader should see
 * or which group a type belongs in.
 *
 * The groups follow the ones the authoring skill uses, but ordered for a menu
 * rather than for a specification: the blocks a writer reaches for daily come
 * first, and the engineering inventories come last. A type the schema declares
 * but this file does not is still insertable — it falls back to its raw name —
 * and a test pins that every name here is a type the schema really has.
 */

export type BlockGroup = "basic" | "layout" | "engineering" | "media";

export interface BlockMeta {
  group: BlockGroup;
  label: string;
}

export const BLOCK_GROUPS: readonly { group: BlockGroup; label: string }[] = [
  { group: "basic", label: "基本块" },
  { group: "layout", label: "版式" },
  { group: "engineering", label: "工程" },
  { group: "media", label: "图表与引用" },
];

const BLOCK_META: Readonly<Record<string, BlockMeta>> = {
  // 基本块 —— 天天用的那些，放最前
  paragraph: { group: "basic", label: "段落" },
  heading: { group: "basic", label: "标题" },
  bulletList: { group: "basic", label: "无序列表" },
  numberedList: { group: "basic", label: "有序列表" },
  checklist: { group: "basic", label: "检查清单" },
  blockquote: { group: "basic", label: "引用" },
  callout: { group: "basic", label: "提示" },
  divider: { group: "basic", label: "分隔线" },
  code: { group: "basic", label: "代码" },
  table: { group: "basic", label: "表格" },
  image: { group: "basic", label: "图片" },
  collapsible: { group: "basic", label: "折叠" },

  // 版式
  lead: { group: "layout", label: "导语" },
  hero: { group: "layout", label: "指标首屏" },
  section: { group: "layout", label: "章节" },
  group: { group: "layout", label: "分组" },
  pullQuote: { group: "layout", label: "醒目引文" },
  definitionList: { group: "layout", label: "定义列表" },
  comparison: { group: "layout", label: "对比" },
  collection: { group: "layout", label: "卡片集" },
  keyValueList: { group: "layout", label: "键值列表" },
  statusBoard: { group: "layout", label: "状态板" },
  tabs: { group: "layout", label: "分页签" },
  appendix: { group: "layout", label: "附录" },
  spacer: { group: "layout", label: "留白" },

  // 工程
  decision: { group: "engineering", label: "决策" },
  risk: { group: "engineering", label: "风险" },
  assumption: { group: "engineering", label: "假设" },
  constraint: { group: "engineering", label: "约束" },
  openQuestion: { group: "engineering", label: "待决问题" },
  timeline: { group: "engineering", label: "时间线" },
  roadmap: { group: "engineering", label: "路线图" },
  flowSteps: { group: "engineering", label: "步骤流" },
  requirementTrace: { group: "engineering", label: "需求追溯" },
  testResult: { group: "engineering", label: "测试结果" },
  apiInventory: { group: "engineering", label: "接口清单" },
  codeDiff: { group: "engineering", label: "代码差异" },
  fileTree: { group: "engineering", label: "文件树" },
  fileChangeList: { group: "engineering", label: "文件变更" },

  // 图表与引用
  mermaid: { group: "media", label: "Mermaid 图" },
  architectureOverview: { group: "media", label: "架构总览" },
  linkList: { group: "media", label: "链接列表" },
  glossary: { group: "media", label: "术语表" },
  citation: { group: "media", label: "出处" },
  embed: { group: "media", label: "外链嵌入" },
  agentNote: { group: "media", label: "代理备注" },
};

/** Types this file names, for the guard test. */
export const NAMED_TYPES: readonly string[] = Object.keys(BLOCK_META);

/** Display metadata for a type; unknown types fall back to the raw name. */
export function blockMeta(type: string): BlockMeta {
  return BLOCK_META[type] ?? { group: "engineering", label: type };
}

/** Every type the schema declares, grouped for the `/` menu. */
export function menuGroups(types: readonly string[]): {
  group: BlockGroup;
  items: { label: string; type: string }[];
  label: string;
}[] {
  const byGroup = new Map<BlockGroup, { label: string; type: string }[]>();
  for (const type of types) {
    const meta = blockMeta(type);
    const bucket = byGroup.get(meta.group);
    const item = { label: meta.label, type };
    if (bucket === undefined) {
      byGroup.set(meta.group, [item]);
    } else {
      bucket.push(item);
    }
  }
  return BLOCK_GROUPS.filter((entry) => byGroup.has(entry.group)).map(
    (entry) => ({
      group: entry.group,
      items: byGroup.get(entry.group) ?? [],
      label: entry.label,
    })
  );
}
