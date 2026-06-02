/**
 * Standalone Mermaid diagram-shell initializer (from migration HTML).
 * Used by static HTML export; matches zoom/pan/fit behavior.
 */
import elkLayouts from "https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk/dist/mermaid-layout-elk.esm.min.mjs";
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

const config = {
  fitPadding: 28,
  minHeight: 360,
  maxHeightPx: 880,
  maxHeightVh: 0.82,
  maxInitialZoom: 1.75,
  minZoom: 0.08,
  maxZoom: 6,
  zoomStep: 0.14,
  readabilityFloor: 0.55,
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
let activeDrag = null;
addEventListener("mousemove", (e) => activeDrag?.onMove(e));
addEventListener("mouseup", () => {
  activeDrag?.onEnd();
  activeDrag = null;
});

function isDarkMode() {
  return (
    document.documentElement.classList.contains("dark") ||
    matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function getThemeVariables() {
  const isDark = isDarkMode();
  return {
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    fontSize: "14px",
    primaryColor: isDark ? "#134e4a" : "#ecfeff",
    primaryBorderColor: isDark ? "#22d3ee" : "#0891b2",
    primaryTextColor: isDark ? "#e2e8f0" : "#0f172a",
    secondaryColor: isDark ? "#1e3a5f" : "#e0f2fe",
    secondaryBorderColor: isDark ? "#38bdf8" : "#0369a1",
    secondaryTextColor: isDark ? "#e2e8f0" : "#0f172a",
    tertiaryColor: isDark ? "#422006" : "#fffbeb",
    tertiaryBorderColor: isDark ? "#fbbf24" : "#b45309",
    tertiaryTextColor: isDark ? "#e2e8f0" : "#0f172a",
    lineColor: "#64748b",
  };
}

let mermaidReady = false;

async function ensureMermaid() {
  if (!mermaidReady) {
    mermaid.registerLayoutLoaders(elkLayouts);
    mermaidReady = true;
  }
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    look: "classic",
    layout: "elk",
    themeVariables: getThemeVariables(),
  });
}

function initDiagram(shell) {
  if (shell.dataset.airpDiagramReady === "1") {
    return;
  }
  const wrap = shell.querySelector(".mermaid-wrap");
  const viewport = shell.querySelector(".mermaid-viewport");
  const canvas = shell.querySelector(".mermaid-canvas");
  const source = shell.querySelector(".diagram-source");
  const label = shell.querySelector(".zoom-label");
  if (!(wrap && viewport && canvas && source && label)) {
    return;
  }

  let zoom = 1;
  let fitMode = "contain";
  let panX = 0;
  let panY = 0;
  let svgW = 0;
  let svgH = 0;
  let sx = 0;
  let sy = 0;
  let spx = 0;
  let spy = 0;

  function constrainPan() {
    const vpW = viewport.clientWidth;
    const vpH = viewport.clientHeight;
    const rW = svgW * zoom;
    const rH = svgH * zoom;
    const pad = config.fitPadding;
    panX =
      rW + pad * 2 <= vpW ? (vpW - rW) / 2 : clamp(panX, vpW - rW - pad, pad);
    panY =
      rH + pad * 2 <= vpH ? (vpH - rH) / 2 : clamp(panY, vpH - rH - pad, pad);
  }

  function applyTransform() {
    const svg = canvas.querySelector("svg");
    if (!(svg && svgW)) {
      return;
    }
    constrainPan();
    svg.style.width = `${svgW * zoom}px`;
    svg.style.height = `${svgH * zoom}px`;
    canvas.style.transform = `translate(${panX}px, ${panY}px)`;
    label.textContent = `${Math.round(zoom * 100)}% — ${fitMode}`;
  }

  function canPan() {
    const rW = svgW * zoom;
    const rH = svgH * zoom;
    return (
      rW + config.fitPadding * 2 > viewport.clientWidth ||
      rH + config.fitPadding * 2 > viewport.clientHeight
    );
  }

  function computeSmartFit() {
    const vpW = viewport.clientWidth;
    const vpH = viewport.clientHeight;
    const aW = Math.max(80, vpW - config.fitPadding * 2);
    const aH = Math.max(80, vpH - config.fitPadding * 2);
    const contain = Math.min(aW / svgW, aH / svgH);
    let z = contain;
    let mode = "contain";
    if (contain < config.readabilityFloor) {
      const chartR = svgH / svgW;
      const vpR = vpH / Math.max(vpW, 1);
      z = chartR >= vpR ? aW / svgW : aH / svgH;
      mode = chartR >= vpR ? "width-priority" : "height-priority";
    }
    return {
      zoom: clamp(z, config.minZoom, config.maxInitialZoom),
      mode,
    };
  }

  function fitDiagram() {
    if (!svgW) {
      return;
    }
    const fit = computeSmartFit();
    zoom = fit.zoom;
    fitMode = fit.mode;
    panX = (viewport.clientWidth - svgW * zoom) / 2;
    panY = (viewport.clientHeight - svgH * zoom) / 2;
    applyTransform();
  }

  function setOneToOne() {
    zoom = clamp(1, config.minZoom, config.maxZoom);
    fitMode = "1:1";
    panX = (viewport.clientWidth - svgW * zoom) / 2;
    panY = (viewport.clientHeight - svgH * zoom) / 2;
    applyTransform();
  }

  function zoomAround(factor, cx, cy) {
    const next = clamp(zoom * factor, config.minZoom, config.maxZoom);
    const ratio = next / zoom;
    panX = cx - ratio * (cx - panX);
    panY = cy - ratio * (cy - panY);
    zoom = next;
    fitMode = "custom";
    applyTransform();
  }

  function readSvgNaturalSize(svg) {
    let w = 0;
    let h = 0;
    if (svg.viewBox?.baseVal?.width > 0) {
      w = svg.viewBox.baseVal.width;
      h = svg.viewBox.baseVal.height;
    }
    if (!w) {
      w = Number.parseFloat(svg.getAttribute("width")) || 0;
      h = Number.parseFloat(svg.getAttribute("height")) || 0;
    }
    if (!w) {
      const b = svg.getBBox();
      w = b.width;
      h = b.height;
    }
    if (!svg.getAttribute("viewBox")) {
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }
    return { w, h };
  }

  function setAdaptiveHeight() {
    if (!svgW) {
      return;
    }
    const usableW = Math.max(280, wrap.getBoundingClientRect().width - 2);
    const idealH = (svgH / svgW) * usableW + config.fitPadding * 2;
    const maxVp = Math.floor(innerHeight * config.maxHeightVh);
    const hardMax = Math.min(
      config.maxHeightPx,
      Math.max(config.minHeight + 40, maxVp)
    );
    wrap.style.height = `${Math.round(clamp(idealH, config.minHeight, hardMax))}px`;
  }

  function openInNewTab() {
    const svg = canvas.querySelector("svg");
    if (!svg) {
      return;
    }
    const clone = svg.cloneNode(true);
    clone.style.width = "";
    clone.style.height = "";
    const bg = isDarkMode() ? "#0b1220" : "#f0f4f8";
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Diagram</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${bg};padding:32px;box-sizing:border-box}svg{max-width:100%;max-height:90vh}</style></head><body>${clone.outerHTML}</body></html>`;
    open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank");
  }

  async function render() {
    try {
      await ensureMermaid();
      const code = source.textContent.trim();
      const id = `diagram-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { svg } = await mermaid.render(id, code);
      canvas.innerHTML = svg;
      const svgNode = canvas.querySelector("svg");
      if (!svgNode) {
        label.textContent = "Error";
        return;
      }
      const size = readSvgNaturalSize(svgNode);
      svgW = size.w;
      svgH = size.h;
      svgNode.removeAttribute("width");
      svgNode.removeAttribute("height");
      svgNode.style.maxWidth = "none";
      svgNode.style.display = "block";
      setAdaptiveHeight();
      fitDiagram();
      shell.dataset.airpDiagramReady = "1";
    } catch (err) {
      label.textContent = `Error: ${err?.message || "render failed"}`;
    }
  }

  const actions = {
    "zoom-in": () =>
      zoomAround(
        1 + config.zoomStep,
        viewport.clientWidth / 2,
        viewport.clientHeight / 2
      ),
    "zoom-out": () =>
      zoomAround(
        1 / (1 + config.zoomStep),
        viewport.clientWidth / 2,
        viewport.clientHeight / 2
      ),
    "zoom-fit": fitDiagram,
    "zoom-one": setOneToOne,
    "zoom-expand": openInNewTab,
  };
  for (const [action, handler] of Object.entries(actions)) {
    wrap.querySelector(`[data-action="${action}"]`)?.addEventListener("click", handler);
  }
  viewport.addEventListener("dblclick", fitDiagram);
  viewport.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const factor =
          e.deltaY < 0 ? 1 + config.zoomStep : 1 / (1 + config.zoomStep);
        zoomAround(factor, e.clientX - rect.left, e.clientY - rect.top);
        return;
      }
      if (canPan()) {
        e.preventDefault();
        panX -= e.deltaX;
        panY -= e.deltaY;
        applyTransform();
      }
    },
    { passive: false }
  );
  viewport.addEventListener("mousedown", (e) => {
    if (e.target.closest(".zoom-controls") || !canPan()) {
      return;
    }
    wrap.classList.add("is-panning");
    sx = e.clientX;
    sy = e.clientY;
    spx = panX;
    spy = panY;
    e.preventDefault();
    activeDrag = {
      onMove: (ev) => {
        panX = spx + (ev.clientX - sx);
        panY = spy + (ev.clientY - sy);
        applyTransform();
      },
      onEnd: () => wrap.classList.remove("is-panning"),
    };
  });
  new ResizeObserver(() => {
    if (svgW) {
      setAdaptiveHeight();
      fitDiagram();
    }
  }).observe(wrap);
  render();
}

async function boot(scope) {
  await ensureMermaid();
  const root = scope && scope.querySelectorAll ? scope : document;
  root.querySelectorAll(".diagram-shell").forEach(initDiagram);
}

boot();

window.__airpRefreshDiagrams = boot;
