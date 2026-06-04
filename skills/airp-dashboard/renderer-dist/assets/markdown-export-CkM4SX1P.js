function C(e){const n=e.trim().split(/[-_]/);return n.length===1?n[0].toLowerCase():`${n[0].toLowerCase()}-${n[1].toUpperCase()}`}function q(){if(typeof navigator>"u")return"en";const e=navigator.languages?.length?navigator.languages:[navigator.language];for(const n of e)if(n)return C(n);return"en"}function c(e,n,s){if(e===void 0)return"";if(typeof e=="string")return e;const i=Object.keys(e);if(e[n])return e[n];const a=s.i18n.defaultLocale;if(e[a])return e[a];for(const r of s.i18n.locales)if(e[r])return e[r];const t=i[0];return t?e[t]??"":""}function v(e,n,s,i){const a=e.i18n.ui?.[n]?.[s];return a||(e.i18n.ui?.[e.i18n.defaultLocale]?.[s]??i)}function B(e,n,s){return e===void 0?"":typeof e=="string"?e:Array.isArray(e)?e.map(i=>{switch(i.type){case"text":return i.value;case"code":return`\`${i.value}\``;case"strong":return`**${i.children.map(a=>a.type==="text"?a.value:"").join("")}**`;case"link":return`[${i.children.map(a=>a.type==="text"?a.value:"").join("")}](${i.href})`;default:return""}}).join(""):c(e,n,s)}function D(e){return e.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g,"-").replace(/^-+|-+$/g,"").slice(0,64)}function T(e,n){return{locale:n,doc:e,t:s=>c(s,n,e),tr:s=>B(s,n,e),ui:(s,i)=>v(e,n,s,i)}}const A={html:"html",markdown:"md"};function M(e,n,s){return`${(c(e.meta.title,n,e)||"report").toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g,"-").replace(/^-+|-+$/g,"").slice(0,64)||"report"}.${A[s]}`}function $(e,n){const s=Math.min(Math.max(e,1),6);return`${"#".repeat(s)} ${n}

`}function d(e,n){return`\`\`\`${n??""}
${e}
\`\`\`

`}function L(e,n){return e==null?"":typeof e=="string"?e.replace(/\|/g,"\\|").replace(/\n/g," "):typeof e=="number"||typeof e=="boolean"?String(e):Array.isArray(e)?n.tr(e).replace(/\|/g,"\\|").replace(/\n/g," "):typeof e=="object"&&e!==null&&"label"in e?n.t(e.label):typeof e=="object"&&e!==null?n.t(e).replace(/\|/g,"\\|").replace(/\n/g," "):String(e)}function R(e){return e.replace(/^\d+\.\s*/,"")}function w(e,n){return!e||e.length!==1||e[0]?.type!=="bulletList"?null:e[0].items.map(s=>n.tr(s))}function h(e,n){return{...e,headingLevel:Math.min(n+1,6)}}function m(e,n){const s=r=>r.replace(/\|/g,"\\|"),i=`| ${e.map(s).join(" | ")} |`,a=`| ${e.map(()=>"---").join(" | ")} |`,t=n.map(r=>`| ${r.map(s).join(" | ")} |`).join(`
`);return`${i}
${a}
${t}

`}function p(e,n,s=0){return e.map(i=>y(i,n,s)).join("")}function y(e,n,s=0){const{t:i,tr:a}=n;switch(e.type){case"hero":{let t="";for(const r of e.metrics??[]){const u=r.title?i(r.title):"",f=r.value!=null?String(r.value):"",o=r.unit?i(r.unit):"",l=r.description?a(r.description):"";t+=`- **${u}**: ${f}${o?` ${o}`:""}${l?` — ${l}`:""}
`}return e.badges?.length&&(t+=e.badges.map(r=>`- _${i(r.label)}_
`).join("")),`${t}
`}case"section":{const t=(e.level??2)+s;let r=$(t,i(e.title));return e.lead&&(r+=`> ${a(e.lead).replace(/\n/g,`
> `)}

`),r+=p(e.children??[],h(n,t),0),r}case"group":{const t=!!e.title;let r=t?$(n.headingLevel,i(e.title)):"";const u=t?h(n,n.headingLevel):n;return r+=p(e.children??[],u,s),r}case"divider":return e.label?`---

_${i(e.label)}_

`:`---

`;case"spacer":return`
`;case"heading":return $(e.level+s,i(e.text));case"paragraph":return`${a(e.text)}

`;case"lead":return`> ${a(e.text).replace(/\n/g,`
> `)}

`;case"pullQuote":{let t=`> ${i(e.text)}
`;return e.attribution&&(t+=`>
> — ${i(e.attribution)}
`),`${t}
`}case"blockquote":return`> ${a(e.text).replace(/\n/g,`
> `)}

`;case"callout":return`> ${e.title?`**${i(e.title)}**

`:""}${a(e.body).replace(/\n/g,`
> `)}

`;case"bulletList":return e.items.map(t=>`- ${a(t)}
`).join("")+`
`;case"numberedList":return e.items.map((t,r)=>`${r+1}. ${a(t)}
`).join("")+`
`;case"checklist":return e.items.map(t=>{const r=t.checked?"x":" ",u=t.note?` — ${a(t.note)}`:"";return`- [${r}] ${a(t.label)}${u}
`}).join("")+`
`;case"definitionList":return e.items.map(t=>`**${i(t.term)}**:
${a(t.definition)}

`).join("")+`
`;case"table":{const t=e.columns??[],r=t.map(o=>i(o.label)),u=(e.rows??[]).map(o=>t.map(l=>L(o[l.key],n)));let f=e.caption?`_${i(e.caption)}_

`:"";if(f+=m(r,u),e.footerRow){const o=t.map(l=>L(e.footerRow[l.key],n));f+=m(r,[o])}return f}case"comparison":{const t=e.labelBefore?i(e.labelBefore):"Before",r=e.labelAfter?i(e.labelAfter):"After",u=w(e.before,n),f=w(e.after,n);if(u&&f){const l=Math.max(u.length,f.length),j=[];for(let g=0;g<l;g++)j.push([u[g]??"",f[g]??""]);return m([t,r],j)}let o=$(n.headingLevel,t);return o+=p(e.before??[],n,s),o+=$(n.headingLevel,r),o+=p(e.after??[],n,s),o}case"collection":{let t=e.title?$(n.headingLevel,i(e.title)):"";for(const r of e.items??[]){const u=r.title?i(r.title):"",f=r.value!=null?`${r.value}${r.unit?` ${i(r.unit)}`:""}`:"",o=r.description?a(r.description):"";t+=`- **${u}**${f?`: ${f}`:""}${o?` — ${o}`:""}
`}return`${t}
`}case"keyValueList":return m(["Key","Value"],e.items.map(t=>[i(t.key),a(t.value)]));case"statusBoard":return m(["Item","Status","Detail"],e.items.map(t=>[i(t.label),t.status,t.detail?a(t.detail):""]));case"code":return d(e.code,e.language??e.filename);case"codeDiff":{const t=e.language??"diff";if(e.unified)return d(e.unified,t);const r=[e.filename?`--- a/${e.filename}`:"--- a/file",e.filename?`+++ b/${e.filename}`:"+++ b/file",e.before?`-${e.before.split(`
`).join(`
-`)}`:"",e.after?`+${e.after.split(`
`).join(`
+`)}`:""].filter(Boolean).join(`
`);return d(r,t)}case"fileTree":{let t=function(u,f){const o=u.annotation?` (${i(u.annotation)})`:"";r.push(`${f}${u.name}${o}`);for(const l of u.children??[])t(l,`${f}  `)};const r=[];return t(e.root,""),d(r.join(`
`),"text")}case"fileChangeList":return m(["Path","Change","Note"],e.items.map(t=>[t.path,t.change,t.note?a(t.note):""]));case"mermaid":{let t=e.title?`${i(e.title)}

`:"";return t+=d(e.source,"mermaid"),t}case"architectureOverview":{let t="";return e.overview?.source&&(t+=d(e.overview.source,"mermaid")),e.modules?.length&&(t+=y({type:"collection",items:e.modules},n,s)),t}case"flowSteps":return e.steps.map((t,r)=>{const u=R(i(t.title)),f=t.status?` (${t.status})`:"",o=t.description?`
  ${a(t.description)}`:"";return`${r+1}. **${u}**${f}${o}
`}).join("").concat(`
`);case"decision":{let t=$(n.headingLevel,i(e.title));if(t+=`_Status: ${e.status}_

`,e.context&&(t+=`${a(e.context)}

`),e.chosen&&(t+=`**Chosen:** ${i(e.chosen)}

`),e.rationale&&(t+=`${a(e.rationale)}

`),e.options?.length){for(const r of e.options)t+=`- **${i(r.label)}**`,r.pros&&(t+=`
  - Pros: ${a(r.pros)}`),r.cons&&(t+=`
  - Cons: ${a(r.cons)}`),t+=`
`;t+=`
`}return t}case"risk":{let t=$(n.headingLevel,i(e.title));return t+=`_Severity: ${e.severity}_`,e.status&&(t+=` · _Status: ${e.status}_`),t+=`

`,e.description&&(t+=`${a(e.description)}

`),e.mitigation&&(t+=`**Mitigation:** ${a(e.mitigation)}

`),t}case"assumption":return`- ${e.validated?"[x]":"[ ]"} ${a(e.statement)}

`;case"constraint":{const t=e.nonNegotiable?" _(non-negotiable)_":"";return`- ${a(e.rule)}${t}

`}case"openQuestion":{const t=e.blocking?" _(blocking)_":"";return`- ${a(e.question)}${t}

`}case"timeline":return e.events.map(t=>{const r=t.date?`${t.date}: `:"",u=t.status?` (${t.status})`:"",f=t.description?`
  ${a(t.description)}`:"";return`- ${r}**${i(t.title)}**${u}${f}
`}).join("").concat(`
`);case"roadmap":return e.phases.map(t=>{let r=$(n.headingLevel+1,`${i(t.title)}${t.timeframe?` (${i(t.timeframe)})`:""}`);return t.status&&(r+=`_Status: ${t.status}_

`),t.goals?.length&&(r+=t.goals.map(u=>`- ${a(u)}
`).join(""),r+=`
`),r}).join("");case"requirementTrace":return m(["ID","Summary","Status","Evidence"],e.items.map(t=>[t.reqId,t.summary?i(t.summary):"",t.status,t.evidence?a(t.evidence):""]));case"testResult":return e.suites.map(t=>{const r=t.skipped!=null?`, skipped ${t.skipped}`:"";let u=`- **${t.name}**: ${t.passed} passed, ${t.failed} failed${r}
`;return t.notes&&(u+=`  ${a(t.notes)}
`),u}).join("").concat(`
`);case"apiInventory":return m(["Method","Path","Summary","Status"],e.endpoints.map(t=>[t.method,t.path,t.summary?i(t.summary):"",t.status??""]));case"linkList":{let t=e.title?$(n.headingLevel,i(e.title)):"";return t+=e.links.map(r=>{const u=r.description?` — ${a(r.description)}`:"";return`- [${i(r.label)}](${r.href})${u}
`}).join(""),`${t}
`}case"glossary":return e.terms.map(t=>`- **${i(t.term)}**: ${a(t.definition)}
`).join("").concat(`
`);case"citation":return e.items.map(t=>`- [${t.id}] ${t.source}${t.locator?` (${t.locator})`:""}
`).join("").concat(`
`);case"image":{const t=e.caption?`

_${i(e.caption)}_`:"";return`![${i(e.alt)}](${e.src})${t}

`}case"embed":return`[${e.title?i(e.title):e.url}](${e.url})

`;case"collapsible":{let t=`<details${e.defaultOpen?" open":""}>
<summary>${i(e.summary)}</summary>

`;return t+=p(e.children??[],n,s),t+=`</details>

`,t}case"tabs":return e.panels.map(t=>{let r=$(n.headingLevel,i(t.label));return r+=p(t.children??[],h(n,n.headingLevel),0),r}).join("");case"appendix":{let t=$(n.headingLevel,i(e.title));return t+=p(e.children??[],h(n,n.headingLevel),0),t}case"agentNote":return e.visible===!1?"":`> _Agent note:_ ${a(e.text)}

`;default:return`<!-- unsupported block type: ${e.type??"unknown"} -->

`}}function _(e,n,s){const i={...T(n,s),headingLevel:2};return p(e,i)}function S(e,n){const s=c(e.meta.title,n,e),i=e.meta.subtitle?c(e.meta.subtitle,n,e):"";let a=`# ${s}

`;i&&(a+=`${i}

`);const t=[];return e.meta.kind&&t.push(`**Kind:** ${e.meta.kind}`),e.meta.authors?.length&&t.push(`**Authors:** ${e.meta.authors.join(", ")}`),e.meta.tags?.length&&t.push(`**Tags:** ${e.meta.tags.join(", ")}`),t.length&&(a+=`${t.join(" · ")}

`),a+=`---

`,a+=_(e.blocks,e,n),a.trimEnd()+`
`}const I={format:"markdown",async render(e,n){if(!e.i18n.locales.includes(n.locale))throw new Error(`locale "${n.locale}" not in document locales: ${e.i18n.locales.join(", ")}`);const s=S(e,n.locale);return{format:"markdown",mimeType:"text/markdown",filename:M(e,n.locale,"markdown"),body:s}}},E=Object.freeze(Object.defineProperty({__proto__:null,emitBlock:y,emitBlocks:_,emitDocument:S,markdownBackend:I},Symbol.toStringTag,{value:"Module"}));export{M as a,T as c,q as d,E as i,C as n,D as s};
