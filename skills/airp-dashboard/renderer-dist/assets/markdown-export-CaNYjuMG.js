const g={locales:["en","ja-JP","zh-CN","ko-KR","de-DE","fr-FR","ru-RU","es-ES","pt-BR","it-IT"],defaultLocale:"en",defaultTheme:"default",defaultThemeMode:"system",storageKeys:{uiLocale:"airp-ui-locale",theme:"airp-theme",themeMode:"airp-theme-mode"}};function A(e){const r=e.trim().split(/[-_]/);return r.length===1?r[0].toLowerCase():`${r[0].toLowerCase()}-${r[1].toUpperCase()}`}function F(){if(typeof navigator>"u")return"en";const e=navigator.languages?.length?navigator.languages:[navigator.language];for(const r of e)if(r)return A(r);return"en"}function $(e,r,o){if(e===void 0)return"";if(typeof e=="string")return e;const a=Object.keys(e);if(e[r])return e[r];const i=o.i18n.defaultLocale;if(e[i])return e[i];for(const n of o.i18n.locales)if(e[n])return e[n];const t=a[0];return t?e[t]??"":""}function J(e,r,o,a){const i=e.i18n.ui?.[r]?.[o];return i||(e.i18n.ui?.[e.i18n.defaultLocale]?.[o]??a)}function D(e,r,o){return e===void 0?"":typeof e=="string"?e:Array.isArray(e)?e.map(a=>{switch(a.type){case"text":return a.value;case"code":return`\`${a.value}\``;case"strong":return`**${a.children.map(i=>i.type==="text"?i.value:"").join("")}**`;case"link":return`[${a.children.map(i=>i.type==="text"?i.value:"").join("")}](${a.href})`;default:return""}}).join(""):$(e,r,o)}function U(e){return e.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g,"-").replace(/^-+|-+$/g,"").slice(0,64)}function I(e,r){return{locale:r,doc:e,t:o=>$(o,r,e),tr:o=>D(o,r,e),ui:(o,a)=>J(e,r,o,a)}}function E(e,r){if(!r.length)return null;const o=A(e),a=r.find(n=>A(n)===o);if(a)return a;const i=o.split("-")[0];return r.find(n=>A(n).split("-")[0]===i)??null}const v=["default","paper","blueprint","editorial","terminal","data-dense"],V={default:"linear-gradient(145deg, #e4edf7 0%, #e4edf7 42%, #2f5f9a 42%, #2f5f9a 100%)",paper:"linear-gradient(145deg, #f3e4c8 0%, #f3e4c8 42%, #6b4a2a 42%, #6b4a2a 100%)",blueprint:"linear-gradient(145deg, #b8d4f0 0%, #b8d4f0 42%, #163a6e 42%, #163a6e 100%)",editorial:"linear-gradient(145deg, #f5f5f5 0%, #f5f5f5 42%, #b91c3c 42%, #b91c3c 100%)",terminal:"linear-gradient(145deg, #0c160c 0%, #0c160c 42%, #3dff7a 42%, #3dff7a 100%)","data-dense":"linear-gradient(145deg, #eceef8 0%, #eceef8 42%, #5b4fcf 42%, #5b4fcf 100%)"},L={"ja-JP":{appTitle:"AIRP Renderer",uploadJson:"JSON をアップロード",reuploadJson:"JSON を再アップロード",exportMenu:"エクスポート",exportHtml:"HTML",exportHtmlAll:"すべての言語",exportMarkdown:"Markdown",exportFailed:"エクスポートに失敗しました",dropHint:".airp.json をここにドラッグ",dropActive:"離してアップロード",themeMenu:"テーマ",themePresetSection:"スキン",themeModeSection:"表示モード",localeMenu:"言語",colorLight:"ライト",colorDark:"ダーク",colorSystem:"システム",fileTreeToolbarTitle:"構成",fileTreeExpandAll:"すべて展開",fileTreeCollapseAll:"すべて折りたたむ",emptyHint:"AIRP Report Viewer",emptyHintDetail:".airp.json をアップロードしてレポートを表示します。言語はドキュメントの対応言語から選択できます。"},"zh-CN":{appTitle:"AIRP 渲染器",uploadJson:"上传 JSON",reuploadJson:"重新上传 JSON",exportMenu:"导出",exportHtml:"HTML",exportHtmlAll:"所有语言",exportMarkdown:"Markdown",exportFailed:"导出失败",dropHint:"拖拽 .airp.json 到此处",dropActive:"释放以上传",themeMenu:"主题",themePresetSection:"皮肤",themeModeSection:"明暗",localeMenu:"语言",colorLight:"浅色",colorDark:"深色",colorSystem:"跟随系统",fileTreeToolbarTitle:"目录结构",fileTreeExpandAll:"全部展开",fileTreeCollapseAll:"全部折叠",emptyHint:"AIRP 报告查看器",emptyHintDetail:"上传 .airp.json 文件以渲染报告。语言选项来自文档支持的语言列表。"},"ko-KR":{appTitle:"AIRP 렌더러",uploadJson:"JSON 업로드",reuploadJson:"JSON 다시 업로드",exportMenu:"내보내기",exportHtml:"HTML",exportHtmlAll:"모든 언어",exportMarkdown:"Markdown",exportFailed:"내보내기에 실패했습니다",dropHint:".airp.json 파일을 여기에 드래그하세요",dropActive:"놓아서 업로드",themeMenu:"테마",themePresetSection:"스킨",themeModeSection:"표시 모드",localeMenu:"언어",colorLight:"라이트",colorDark:"다크",colorSystem:"시스템",fileTreeToolbarTitle:"구조",fileTreeExpandAll:"모두 펼치기",fileTreeCollapseAll:"모두 접기",emptyHint:"AIRP Report Viewer",emptyHintDetail:".airp.json 파일을 업로드해 리포트를 렌더링하세요. 언어 옵션은 문서의 지원 언어를 따릅니다."},en:{appTitle:"AIRP Renderer",uploadJson:"Upload JSON",reuploadJson:"Re-upload JSON",exportMenu:"Export",exportHtml:"HTML",exportHtmlAll:"All Languages",exportMarkdown:"Markdown",exportFailed:"Export failed",dropHint:"Drop .airp.json here",dropActive:"Release to upload",themeMenu:"Theme",themePresetSection:"Skin",themeModeSection:"Appearance",localeMenu:"Language",colorLight:"Light",colorDark:"Dark",colorSystem:"System",fileTreeToolbarTitle:"Structure",fileTreeExpandAll:"Expand all",fileTreeCollapseAll:"Collapse all",emptyHint:"AIRP Report Viewer",emptyHintDetail:"Upload a .airp.json file to render your report. Language options come from the document."},"de-DE":{appTitle:"AIRP Renderer",uploadJson:"JSON hochladen",reuploadJson:"JSON erneut hochladen",exportMenu:"Exportieren",exportHtml:"HTML",exportHtmlAll:"Alle Sprachen",exportMarkdown:"Markdown",exportFailed:"Export fehlgeschlagen",dropHint:".airp.json hier ablegen",dropActive:"Zum Hochladen loslassen",themeMenu:"Thema",themePresetSection:"Skin",themeModeSection:"Darstellung",localeMenu:"Sprache",colorLight:"Hell",colorDark:"Dunkel",colorSystem:"System",fileTreeToolbarTitle:"Struktur",fileTreeExpandAll:"Alle aufklappen",fileTreeCollapseAll:"Alle einklappen",emptyHint:"AIRP Report Viewer",emptyHintDetail:"Lade eine .airp.json hoch, um den Bericht zu rendern. Sprachoptionen kommen aus dem Dokument."},"fr-FR":{appTitle:"AIRP Renderer",uploadJson:"Importer JSON",reuploadJson:"Réimporter JSON",exportMenu:"Exporter",exportHtml:"HTML",exportHtmlAll:"Toutes les langues",exportMarkdown:"Markdown",exportFailed:"Échec de l'export",dropHint:"Déposez .airp.json ici",dropActive:"Relâchez pour importer",themeMenu:"Thème",themePresetSection:"Skin",themeModeSection:"Apparence",localeMenu:"Langue",colorLight:"Clair",colorDark:"Sombre",colorSystem:"Système",fileTreeToolbarTitle:"Structure",fileTreeExpandAll:"Tout développer",fileTreeCollapseAll:"Tout réduire",emptyHint:"AIRP Report Viewer",emptyHintDetail:"Importez un fichier .airp.json pour afficher le rapport. Les langues disponibles viennent du document."},"ru-RU":{appTitle:"AIRP Renderer",uploadJson:"Загрузить JSON",reuploadJson:"Загрузить JSON заново",exportMenu:"Экспорт",exportHtml:"HTML",exportHtmlAll:"Все языки",exportMarkdown:"Markdown",exportFailed:"Не удалось выполнить экспорт",dropHint:"Перетащите .airp.json сюда",dropActive:"Отпустите для загрузки",themeMenu:"Тема",themePresetSection:"Скин",themeModeSection:"Режим",localeMenu:"Язык",colorLight:"Светлая",colorDark:"Тёмная",colorSystem:"Системная",fileTreeToolbarTitle:"Структура",fileTreeExpandAll:"Развернуть все",fileTreeCollapseAll:"Свернуть все",emptyHint:"AIRP Report Viewer",emptyHintDetail:"Загрузите .airp.json, чтобы отрисовать отчёт. Список языков берется из документа."},"es-ES":{appTitle:"AIRP Renderer",uploadJson:"Subir JSON",reuploadJson:"Volver a subir JSON",exportMenu:"Exportar",exportHtml:"HTML",exportHtmlAll:"Todos los idiomas",exportMarkdown:"Markdown",exportFailed:"La exportación falló",dropHint:"Suelta .airp.json aquí",dropActive:"Suelta para subir",themeMenu:"Tema",themePresetSection:"Skin",themeModeSection:"Apariencia",localeMenu:"Idioma",colorLight:"Claro",colorDark:"Oscuro",colorSystem:"Sistema",fileTreeToolbarTitle:"Estructura",fileTreeExpandAll:"Expandir todo",fileTreeCollapseAll:"Contraer todo",emptyHint:"AIRP Report Viewer",emptyHintDetail:"Sube un archivo .airp.json para renderizar el informe. Las opciones de idioma provienen del documento."},"pt-BR":{appTitle:"AIRP Renderer",uploadJson:"Enviar JSON",reuploadJson:"Reenviar JSON",exportMenu:"Exportar",exportHtml:"HTML",exportHtmlAll:"Todos os idiomas",exportMarkdown:"Markdown",exportFailed:"Falha ao exportar",dropHint:"Solte .airp.json aqui",dropActive:"Solte para enviar",themeMenu:"Tema",themePresetSection:"Skin",themeModeSection:"Aparência",localeMenu:"Idioma",colorLight:"Claro",colorDark:"Escuro",colorSystem:"Sistema",fileTreeToolbarTitle:"Estrutura",fileTreeExpandAll:"Expandir tudo",fileTreeCollapseAll:"Recolher tudo",emptyHint:"AIRP Report Viewer",emptyHintDetail:"Envie um arquivo .airp.json para renderizar o relatório. As opções de idioma vêm do documento."},"it-IT":{appTitle:"AIRP Renderer",uploadJson:"Carica JSON",reuploadJson:"Ricarica JSON",exportMenu:"Esporta",exportHtml:"HTML",exportHtmlAll:"Tutte le lingue",exportMarkdown:"Markdown",exportFailed:"Esportazione non riuscita",dropHint:"Trascina .airp.json qui",dropActive:"Rilascia per caricare",themeMenu:"Tema",themePresetSection:"Skin",themeModeSection:"Aspetto",localeMenu:"Lingua",colorLight:"Chiaro",colorDark:"Scuro",colorSystem:"Sistema",fileTreeToolbarTitle:"Struttura",fileTreeExpandAll:"Espandi tutto",fileTreeCollapseAll:"Comprimi tutto",emptyHint:"AIRP Report Viewer",emptyHintDetail:"Carica un file .airp.json per renderizzare il report. Le opzioni lingua provengono dal documento."}},R={"ja-JP":"日本語",ja:"日本語","zh-CN":"中文",zh:"中文","ko-KR":"한국어",ko:"한국어",en:"English","en-US":"English","de-DE":"Deutsch",de:"Deutsch","fr-FR":"Français",fr:"Français","ru-RU":"Русский",ru:"Русский","es-ES":"Español",es:"Español","pt-BR":"Português (Brasil)",pt:"Português","it-IT":"Italiano",it:"Italiano"},x={"ja-JP":"🇯🇵",ja:"🇯🇵","zh-CN":"🇨🇳",zh:"🇨🇳","ko-KR":"🇰🇷",ko:"🇰🇷",en:"🇺🇸","en-US":"🇺🇸","en-GB":"🇬🇧","de-DE":"🇩🇪",de:"🇩🇪","fr-FR":"🇫🇷",fr:"🇫🇷","ru-RU":"🇷🇺",ru:"🇷🇺","es-ES":"🇪🇸",es:"🇪🇸","pt-BR":"🇧🇷",pt:"🇵🇹","it-IT":"🇮🇹",it:"🇮🇹"};function q(e){return R[e]??R[w(e)]??e}function K(e){return x[e]??x[w(e)]??"🌐"}function w(e){const r=e.split(/[-_]/);return r.length===1?r[0].toLowerCase():`${r[0].toLowerCase()}-${r[1].toUpperCase()}`}function c(e,r){const o=E(e,g.locales)??g.defaultLocale;return(L[o]??L[g.defaultLocale])[r]}function _(e,r){const o={"ja-JP":{default:"オーシャンスレート",paper:"暖色羊皮紙",blueprint:"設計図ブルー",editorial:"新聞印刷",terminal:"蛍光ターミナル","data-dense":"分析ダッシュボード"},"zh-CN":{default:"海岩蓝",paper:"暖色羊皮纸",blueprint:"工程蓝图",editorial:"报刊印刷",terminal:"荧光终端","data-dense":"分析看板"},"ko-KR":{default:"오션 슬레이트",paper:"웜 파치먼트",blueprint:"엔지니어링 블루프린트",editorial:"에디토리얼 프린트",terminal:"포스퍼 터미널","data-dense":"애널리틱스 대시보드"},en:{default:"Ocean Slate",paper:"Warm Parchment",blueprint:"Engineering Blueprint",editorial:"Editorial Print",terminal:"Phosphor Terminal","data-dense":"Analytics Dashboard"},"de-DE":{default:"Ocean Slate",paper:"Warmes Pergament",blueprint:"Technische Blaupause",editorial:"Editorial Print",terminal:"Phosphor-Terminal","data-dense":"Analyse-Dashboard"},"fr-FR":{default:"Ocean Slate",paper:"Parchemin chaud",blueprint:"Plan d'ingénierie",editorial:"Impression éditoriale",terminal:"Terminal phosphore","data-dense":"Tableau analytique"},"ru-RU":{default:"Ocean Slate",paper:"Тёплый пергамент",blueprint:"Инженерный чертёж",editorial:"Редакционная печать",terminal:"Фосфорный терминал","data-dense":"Аналитическая панель"},"es-ES":{default:"Ocean Slate",paper:"Pergamino cálido",blueprint:"Plano de ingeniería",editorial:"Impresión editorial",terminal:"Terminal de fósforo","data-dense":"Panel analítico"},"pt-BR":{default:"Ocean Slate",paper:"Pergaminho quente",blueprint:"Blueprint de engenharia",editorial:"Impressão editorial",terminal:"Terminal de fósforo","data-dense":"Painel analítico"},"it-IT":{default:"Ocean Slate",paper:"Pergamena calda",blueprint:"Blueprint ingegneristico",editorial:"Stampa editoriale",terminal:"Terminale fosforo","data-dense":"Dashboard analitica"}},a=E(e,g.locales)??g.defaultLocale;return o[a]?.[r]??o.en[r]??r}function W(){const e={};for(const r of g.locales)e[r]={appTitle:c(r,"appTitle"),themePresetSection:c(r,"themePresetSection"),themeModeSection:c(r,"themeModeSection"),localeMenu:c(r,"localeMenu"),colorLight:c(r,"colorLight"),colorDark:c(r,"colorDark"),colorSystem:c(r,"colorSystem"),themePresets:Object.fromEntries(v.map(o=>[o,_(r,o)]))};return e}const O={html:"html",markdown:"md"};function N(e,r,o){return`${($(e.meta.title,r,e)||"report").toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g,"-").replace(/^-+|-+$/g,"").slice(0,64)||"report"}.${O[o]}`}function u(e,r){const o=Math.min(Math.max(e,1),6);return`${"#".repeat(o)} ${r}

`}function h(e,r){return`\`\`\`${r??""}
${e}
\`\`\`

`}function H(e,r){return e==null?"":typeof e=="string"?e.replace(/\|/g,"\\|").replace(/\n/g," "):typeof e=="number"||typeof e=="boolean"?String(e):Array.isArray(e)?r.tr(e).replace(/\|/g,"\\|").replace(/\n/g," "):typeof e=="object"&&e!==null&&"label"in e?r.t(e.label):typeof e=="object"&&e!==null?r.t(e).replace(/\|/g,"\\|").replace(/\n/g," "):String(e)}function B(e){return e.replace(/^\d+\.\s*/,"")}function j(e,r){return!e||e.length!==1||e[0]?.type!=="bulletList"?null:e[0].items.map(o=>r.tr(o))}function y(e,r){return{...e,headingLevel:Math.min(r+1,6)}}function m(e,r){const o=n=>n.replace(/\|/g,"\\|"),a=`| ${e.map(o).join(" | ")} |`,i=`| ${e.map(()=>"---").join(" | ")} |`,t=r.map(n=>`| ${n.map(o).join(" | ")} |`).join(`
`);return`${a}
${i}
${t}

`}function f(e,r,o=0){return e.map(a=>M(a,r,o)).join("")}function M(e,r,o=0){const{t:a,tr:i}=r;switch(e.type){case"hero":{let t="";for(const n of e.metrics??[]){const l=n.title?a(n.title):"",s=n.value!=null?String(n.value):"",p=n.unit?a(n.unit):"",d=n.description?i(n.description):"";t+=`- **${l}**: ${s}${p?` ${p}`:""}${d?` — ${d}`:""}
`}return e.badges?.length&&(t+=e.badges.map(n=>`- _${a(n.label)}_
`).join("")),`${t}
`}case"section":{const t=(e.level??2)+o;let n=u(t,a(e.title));return e.lead&&(n+=`> ${i(e.lead).replace(/\n/g,`
> `)}

`),n+=f(e.children??[],y(r,t),0),n}case"group":{const t=!!e.title;let n=t?u(r.headingLevel,a(e.title)):"";const l=t?y(r,r.headingLevel):r;return n+=f(e.children??[],l,o),n}case"divider":return e.label?`---

_${a(e.label)}_

`:`---

`;case"spacer":return`
`;case"heading":return u(e.level+o,a(e.text));case"paragraph":return`${i(e.text)}

`;case"lead":return`> ${i(e.text).replace(/\n/g,`
> `)}

`;case"pullQuote":{let t=`> ${a(e.text)}
`;return e.attribution&&(t+=`>
> — ${a(e.attribution)}
`),`${t}
`}case"blockquote":return`> ${i(e.text).replace(/\n/g,`
> `)}

`;case"callout":return`> ${e.title?`**${a(e.title)}**

`:""}${i(e.body).replace(/\n/g,`
> `)}

`;case"bulletList":return e.items.map(t=>`- ${i(t)}
`).join("")+`
`;case"numberedList":return e.items.map((t,n)=>`${n+1}. ${i(t)}
`).join("")+`
`;case"checklist":return e.items.map(t=>{const n=t.checked?"x":" ",l=t.note?` — ${i(t.note)}`:"";return`- [${n}] ${i(t.label)}${l}
`}).join("")+`
`;case"definitionList":return e.items.map(t=>`**${a(t.term)}**:
${i(t.definition)}

`).join("")+`
`;case"table":{const t=e.columns??[],n=t.map(p=>a(p.label)),l=(e.rows??[]).map(p=>t.map(d=>H(p[d.key],r)));let s=e.caption?`_${a(e.caption)}_

`:"";if(s+=m(n,l),e.footerRow){const p=t.map(d=>H(e.footerRow[d.key],r));s+=m(n,[p])}return s}case"comparison":{const t=e.labelBefore?a(e.labelBefore):"Before",n=e.labelAfter?a(e.labelAfter):"After",l=j(e.before,r),s=j(e.after,r);if(l&&s){const d=Math.max(l.length,s.length),T=[];for(let S=0;S<d;S++)T.push([l[S]??"",s[S]??""]);return m([t,n],T)}let p=u(r.headingLevel,t);return p+=f(e.before??[],r,o),p+=u(r.headingLevel,n),p+=f(e.after??[],r,o),p}case"collection":{let t=e.title?u(r.headingLevel,a(e.title)):"";for(const n of e.items??[]){const l=n.title?a(n.title):"",s=n.value!=null?`${n.value}${n.unit?` ${a(n.unit)}`:""}`:"",p=n.description?i(n.description):"";t+=`- **${l}**${s?`: ${s}`:""}${p?` — ${p}`:""}
`}return`${t}
`}case"keyValueList":return m(["Key","Value"],e.items.map(t=>[a(t.key),i(t.value)]));case"statusBoard":return m(["Item","Status","Detail"],e.items.map(t=>[a(t.label),t.status,t.detail?i(t.detail):""]));case"code":return(e.filename?`\`${e.filename}\`

`:"")+h(e.code,e.language);case"codeDiff":{let t=e.filename?`\`${e.filename}\`

`:"";const n=e.language??"diff";if(e.unified)return t+h(e.unified,n);const l=[e.filename?`--- a/${e.filename}`:"--- a/file",e.filename?`+++ b/${e.filename}`:"+++ b/file",e.before?`-${e.before.split(`
`).join(`
-`)}`:"",e.after?`+${e.after.split(`
`).join(`
+`)}`:""].filter(Boolean).join(`
`);return t+h(l,n)}case"fileTree":{let t=function(s,p){const d=s.annotation?` (${a(s.annotation)})`:"";n.push(`${p}${s.name}${d}`);for(const T of s.children??[])t(T,`${p}  `)};const n=[];t(e.root,"");let l=u(r.headingLevel,r.ui("fileTreeToolbarTitle",c(r.locale,"fileTreeToolbarTitle")));return e.caption&&(l+=`_${a(e.caption)}_

`),l+h(n.join(`
`),"text")}case"fileChangeList":return m(["Path","Change","Note"],e.items.map(t=>[t.path,t.change,t.note?i(t.note):""]));case"mermaid":{let t=e.title?`${a(e.title)}

`:"";return t+=h(e.source,"mermaid"),t}case"architectureOverview":{let t="";return e.overview?.source&&(t+=h(e.overview.source,"mermaid")),e.modules?.length&&(t+=M({type:"collection",items:e.modules},r,o)),t}case"flowSteps":return e.steps.map((t,n)=>{const l=B(a(t.title)),s=t.status?` (${t.status})`:"",p=t.description?`
  ${i(t.description)}`:"";return`${n+1}. **${l}**${s}${p}
`}).join("").concat(`
`);case"decision":{let t=u(r.headingLevel,a(e.title));if(t+=`_Status: ${e.status}_

`,e.context&&(t+=`${i(e.context)}

`),e.chosen&&(t+=`**Chosen:** ${a(e.chosen)}

`),e.rationale&&(t+=`${i(e.rationale)}

`),e.options?.length){for(const n of e.options)t+=`- **${a(n.label)}**`,n.pros&&(t+=`
  - Pros: ${i(n.pros)}`),n.cons&&(t+=`
  - Cons: ${i(n.cons)}`),t+=`
`;t+=`
`}return t}case"risk":{let t=u(r.headingLevel,a(e.title));return t+=`_Severity: ${e.severity}_`,e.status&&(t+=` · _Status: ${e.status}_`),t+=`

`,e.description&&(t+=`${i(e.description)}

`),e.mitigation&&(t+=`**Mitigation:** ${i(e.mitigation)}

`),t}case"assumption":return`- ${e.validated?"[x]":"[ ]"} ${i(e.statement)}

`;case"constraint":{const t=e.nonNegotiable?" _(non-negotiable)_":"";return`- ${i(e.rule)}${t}

`}case"openQuestion":{const t=e.blocking?" _(blocking)_":"";return`- ${i(e.question)}${t}

`}case"timeline":return e.events.map(t=>{const n=t.date?`${t.date}: `:"",l=t.status?` (${t.status})`:"",s=t.description?`
  ${i(t.description)}`:"";return`- ${n}**${a(t.title)}**${l}${s}
`}).join("").concat(`
`);case"roadmap":return e.phases.map(t=>{let n=u(r.headingLevel+1,`${a(t.title)}${t.timeframe?` (${a(t.timeframe)})`:""}`);return t.status&&(n+=`_Status: ${t.status}_

`),t.goals?.length&&(n+=t.goals.map(l=>`- ${i(l)}
`).join(""),n+=`
`),n}).join("");case"requirementTrace":return m(["ID","Summary","Status","Evidence"],e.items.map(t=>[t.reqId,t.summary?a(t.summary):"",t.status,t.evidence?i(t.evidence):""]));case"testResult":return e.suites.map(t=>{const n=t.skipped!=null?`, skipped ${t.skipped}`:"";let l=`- **${t.name}**: ${t.passed} passed, ${t.failed} failed${n}
`;return t.notes&&(l+=`  ${i(t.notes)}
`),l}).join("").concat(`
`);case"apiInventory":return m(["Method","Path","Summary","Status"],e.endpoints.map(t=>[t.method,t.path,t.summary?a(t.summary):"",t.status??""]));case"linkList":{let t=e.title?u(r.headingLevel,a(e.title)):"";return t+=e.links.map(n=>{const l=n.description?` — ${i(n.description)}`:"";return`- [${a(n.label)}](${n.href})${l}
`}).join(""),`${t}
`}case"glossary":return e.terms.map(t=>`- **${a(t.term)}**: ${i(t.definition)}
`).join("").concat(`
`);case"citation":return e.items.map(t=>`- [${t.id}] ${t.source}${t.locator?` (${t.locator})`:""}
`).join("").concat(`
`);case"image":{const t=e.caption?`

_${a(e.caption)}_`:"";return`![${a(e.alt)}](${e.src})${t}

`}case"embed":return`[${e.title?a(e.title):e.url}](${e.url})

`;case"collapsible":{let t=`<details${e.defaultOpen?" open":""}>
<summary>${a(e.summary)}</summary>

`;return t+=f(e.children??[],r,o),t+=`</details>

`,t}case"tabs":return e.panels.map(t=>{let n=u(r.headingLevel,a(t.label));return n+=f(t.children??[],y(r,r.headingLevel),0),n}).join("");case"appendix":{let t=u(r.headingLevel,a(e.title));return t+=f(e.children??[],y(r,r.headingLevel),0),t}case"agentNote":return e.visible===!1?"":`> _Agent note:_ ${i(e.text)}

`;default:return`<!-- unsupported block type: ${e.type??"unknown"} -->

`}}function P(e,r,o){const a={...I(r,o),headingLevel:2};return f(e,a)}function C(e,r){const o=$(e.meta.title,r,e),a=e.meta.subtitle?$(e.meta.subtitle,r,e):"";let i=`# ${o}

`;a&&(i+=`${a}

`);const t=[];return e.meta.kind&&t.push(`**Kind:** ${e.meta.kind}`),e.meta.authors?.length&&t.push(`**Authors:** ${e.meta.authors.join(", ")}`),e.meta.tags?.length&&t.push(`**Tags:** ${e.meta.tags.join(", ")}`),t.length&&(i+=`${t.join(" · ")}

`),i+=`---

`,i+=P(e.blocks,e,r),i.trimEnd()+`
`}const z={format:"markdown",async render(e,r){if(!e.i18n.locales.includes(r.locale))throw new Error(`locale "${r.locale}" not in document locales: ${e.i18n.locales.join(", ")}`);const o=C(e,r.locale);return{format:"markdown",mimeType:"text/markdown",filename:N(e,r.locale,"markdown"),body:o}}},G=Object.freeze(Object.defineProperty({__proto__:null,emitBlock:M,emitBlocks:P,emitDocument:C,markdownBackend:z},Symbol.toStringTag,{value:"Module"}));export{v as T,_ as a,W as b,N as c,I as d,K as e,V as f,F as g,G as i,q as l,E as m,g as r,U as s,c as t};
