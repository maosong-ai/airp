import elkLayouts from "@mermaid-js/layout-elk";
import mermaid from "mermaid";
import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";

const DIAGRAM_CONFIG = {
  fitPadding: 28,
  minHeight: 360,
  maxHeightPx: 880,
  maxHeightVh: 0.82,
  maxInitialZoom: 1.75,
  minZoom: 0.08,
  maxZoom: 6,
  zoomStep: 0.14,
  readabilityFloor: 0.55,
} as const;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

let mermaidReady = false;
let activeDrag: {
  onMove: (e: MouseEvent) => void;
  onEnd: () => void;
} | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("mousemove", (e) => activeDrag?.onMove(e));
  window.addEventListener("mouseup", () => {
    activeDrag?.onEnd();
    activeDrag = null;
  });
}

function getThemeVariables(isDark: boolean) {
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
    lineColor: isDark ? "#64748b" : "#64748b",
  };
}

async function ensureMermaid(isDark: boolean) {
  if (!mermaidReady) {
    mermaid.registerLayoutLoaders(elkLayouts);
    mermaidReady = true;
  }
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    look: "classic",
    layout: "elk",
    themeVariables: getThemeVariables(isDark),
  });
}

type MermaidDiagramProps = {
  source: string;
  title?: string;
  hint?: string;
};

export function MermaidDiagram({ source, title, hint }: MermaidDiagramProps) {
  const shellRef = useRef<HTMLElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const reactId = useId();
  const [zoomLabel, setZoomLabel] = useState("Loading…");

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const wrap = shell.querySelector<HTMLElement>(".mermaid-wrap");
    const viewport = shell.querySelector<HTMLElement>(".mermaid-viewport");
    const canvas = shell.querySelector<HTMLElement>(".mermaid-canvas");
    if (!wrap || !viewport || !canvas) {
      return;
    }
    const wrapEl = wrap;
    const viewportEl = viewport;
    const canvasEl = canvas;

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
    let disposed = false;

    const labelEl = shell.querySelector(".zoom-label");

    function updateLabel() {
      const text = `${Math.round(zoom * 100)}% — ${fitMode}`;
      setZoomLabel(text);
      if (labelEl) {
        labelEl.textContent = text;
      }
    }

    function constrainPan() {
      const vpW = viewportEl.clientWidth;
      const vpH = viewportEl.clientHeight;
      const rW = svgW * zoom;
      const rH = svgH * zoom;
      const pad = DIAGRAM_CONFIG.fitPadding;
      panX =
        rW + pad * 2 <= vpW
          ? (vpW - rW) / 2
          : clamp(panX, vpW - rW - pad, pad);
      panY =
        rH + pad * 2 <= vpH
          ? (vpH - rH) / 2
          : clamp(panY, vpH - rH - pad, pad);
    }

    function applyTransform() {
      const svg = canvasEl.querySelector("svg");
      if (!(svg && svgW)) {
        return;
      }
      constrainPan();
      svg.style.width = `${svgW * zoom}px`;
      svg.style.height = `${svgH * zoom}px`;
      canvasEl.style.transform = `translate(${panX}px, ${panY}px)`;
      updateLabel();
    }

    function canPan() {
      const rW = svgW * zoom;
      const rH = svgH * zoom;
      return (
        rW + DIAGRAM_CONFIG.fitPadding * 2 > viewportEl.clientWidth ||
        rH + DIAGRAM_CONFIG.fitPadding * 2 > viewportEl.clientHeight
      );
    }

    function computeSmartFit() {
      const vpW = viewportEl.clientWidth;
      const vpH = viewportEl.clientHeight;
      const aW = Math.max(80, vpW - DIAGRAM_CONFIG.fitPadding * 2);
      const aH = Math.max(80, vpH - DIAGRAM_CONFIG.fitPadding * 2);
      const contain = Math.min(aW / svgW, aH / svgH);
      let z = contain;
      let mode = "contain";
      if (contain < DIAGRAM_CONFIG.readabilityFloor) {
        const chartR = svgH / svgW;
        const vpR = vpH / Math.max(vpW, 1);
        z = chartR >= vpR ? aW / svgW : aH / svgH;
        mode = chartR >= vpR ? "width-priority" : "height-priority";
      }
      return {
        zoom: clamp(z, DIAGRAM_CONFIG.minZoom, DIAGRAM_CONFIG.maxInitialZoom),
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
      panX = (viewportEl.clientWidth - svgW * zoom) / 2;
      panY = (viewportEl.clientHeight - svgH * zoom) / 2;
      applyTransform();
    }

    function setOneToOne() {
      zoom = clamp(1, DIAGRAM_CONFIG.minZoom, DIAGRAM_CONFIG.maxZoom);
      fitMode = "1:1";
      panX = (viewportEl.clientWidth - svgW * zoom) / 2;
      panY = (viewportEl.clientHeight - svgH * zoom) / 2;
      applyTransform();
    }

    function zoomAround(factor: number, cx: number, cy: number) {
      const next = clamp(
        zoom * factor,
        DIAGRAM_CONFIG.minZoom,
        DIAGRAM_CONFIG.maxZoom
      );
      const ratio = next / zoom;
      panX = cx - ratio * (cx - panX);
      panY = cy - ratio * (cy - panY);
      zoom = next;
      fitMode = "custom";
      applyTransform();
    }

    function readSvgNaturalSize(svg: SVGSVGElement) {
      let w = 0;
      let h = 0;
      if (svg.viewBox?.baseVal?.width && svg.viewBox.baseVal.width > 0) {
        w = svg.viewBox.baseVal.width;
        h = svg.viewBox.baseVal.height;
      }
      if (!w) {
        w = Number.parseFloat(svg.getAttribute("width") ?? "0") || 0;
        h = Number.parseFloat(svg.getAttribute("height") ?? "0") || 0;
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
      const usableW = Math.max(280, wrapEl.getBoundingClientRect().width - 2);
      const idealH =
        (svgH / svgW) * usableW + DIAGRAM_CONFIG.fitPadding * 2;
      const maxVp = Math.floor(window.innerHeight * DIAGRAM_CONFIG.maxHeightVh);
      const hardMax = Math.min(
        DIAGRAM_CONFIG.maxHeightPx,
        Math.max(DIAGRAM_CONFIG.minHeight + 40, maxVp)
      );
      wrapEl.style.height = `${Math.round(clamp(idealH, DIAGRAM_CONFIG.minHeight, hardMax))}px`;
    }

    function openInNewTab() {
      const svg = canvasEl.querySelector("svg");
      if (!svg) {
        return;
      }
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.style.width = "";
      clone.style.height = "";
      const bg = isDark ? "#0b1220" : "#f0f4f8";
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title ?? "Diagram"}</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${bg};padding:32px;box-sizing:border-box}svg{max-width:100%;max-height:90vh}</style></head><body>${clone.outerHTML}</body></html>`;
      window.open(
        URL.createObjectURL(new Blob([html], { type: "text/html" })),
        "_blank"
      );
    }

    const actions: Record<string, () => void> = {
      "zoom-in": () =>
        zoomAround(
          1 + DIAGRAM_CONFIG.zoomStep,
          viewportEl.clientWidth / 2,
          viewportEl.clientHeight / 2
        ),
      "zoom-out": () =>
        zoomAround(
          1 / (1 + DIAGRAM_CONFIG.zoomStep),
          viewportEl.clientWidth / 2,
          viewportEl.clientHeight / 2
        ),
      "zoom-fit": fitDiagram,
      "zoom-one": setOneToOne,
      "zoom-expand": openInNewTab,
    };

    const cleanups: Array<() => void> = [];

    for (const [action, handler] of Object.entries(actions)) {
      const btn = wrapEl.querySelector(`[data-action="${action}"]`);
      btn?.addEventListener("click", handler);
      cleanups.push(() => btn?.removeEventListener("click", handler));
    }

    const onDblClick = () => fitDiagram();
    viewportEl.addEventListener("dblclick", onDblClick);
    cleanups.push(() => viewportEl.removeEventListener("dblclick", onDblClick));

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = viewportEl.getBoundingClientRect();
        const factor =
          e.deltaY < 0
            ? 1 + DIAGRAM_CONFIG.zoomStep
            : 1 / (1 + DIAGRAM_CONFIG.zoomStep);
        zoomAround(
          factor,
          e.clientX - rect.left,
          e.clientY - rect.top
        );
        return;
      }
      if (canPan()) {
        e.preventDefault();
        panX -= e.deltaX;
        panY -= e.deltaY;
        applyTransform();
      }
    };
    viewportEl.addEventListener("wheel", onWheel, { passive: false });
    cleanups.push(() => viewportEl.removeEventListener("wheel", onWheel));

    const onMouseDown = (e: MouseEvent) => {
      if (
        (e.target as HTMLElement).closest(".zoom-controls") ||
        !canPan()
      ) {
        return;
      }
      wrapEl.classList.add("is-panning");
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
        onEnd: () => wrapEl.classList.remove("is-panning"),
      };
    };
    viewportEl.addEventListener("mousedown", onMouseDown);
    cleanups.push(() =>
      viewportEl.removeEventListener("mousedown", onMouseDown)
    );

    const ro = new ResizeObserver(() => {
      if (svgW) {
        setAdaptiveHeight();
        fitDiagram();
      }
    });
    ro.observe(wrapEl);
    cleanups.push(() => ro.disconnect());

    async function render() {
      try {
        await ensureMermaid(isDark);
        if (disposed) {
          return;
        }
        const code = source.trim();
        const id = `diagram-${reactId.replace(/:/g, "")}-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        if (disposed) {
          return;
        }
        canvasEl.innerHTML = svg;
        const svgNode = canvasEl.querySelector("svg");
        if (!svgNode) {
          setZoomLabel("Error");
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : "render failed";
        setZoomLabel(`Error: ${msg}`);
      }
    }

    render();

    return () => {
      disposed = true;
      for (const fn of cleanups) {
        fn();
      }
      canvasEl.innerHTML = "";
    };
  }, [source, isDark, reactId, title]);

  const defaultHint =
    hint ??
    "Ctrl/Cmd + scroll to zoom · drag to pan · double-click to fit · ⛶ fullscreen";

  return (
    <section className="diagram-shell" ref={shellRef}>
      {title ? (
        <h4 className="mb-2 font-medium text-sm">{title}</h4>
      ) : null}
      <p className="diagram-shell__hint">{defaultHint}</p>
      <div className="mermaid-wrap">
        <div className="zoom-controls">
          <button data-action="zoom-in" title="Zoom in" type="button">
            +
          </button>
          <button data-action="zoom-out" title="Zoom out" type="button">
            −
          </button>
          <button data-action="zoom-fit" title="Fit" type="button">
            ↻
          </button>
          <button data-action="zoom-one" title="1:1" type="button">
            1:1
          </button>
          <button data-action="zoom-expand" title="Open in new tab" type="button">
            ⛶
          </button>
          <span className="zoom-label">{zoomLabel}</span>
        </div>
        <div className="mermaid-viewport">
          <div className="mermaid mermaid-canvas" />
        </div>
      </div>
    </section>
  );
}
