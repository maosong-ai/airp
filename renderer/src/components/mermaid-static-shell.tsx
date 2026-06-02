type MermaidStaticShellProps = {
  source: string;
  title?: string;
  hint?: string;
};

/** SSR-safe shell; pair with public/mermaid-init.js in static HTML export */
export function MermaidStaticShell({
  source,
  title,
  hint = "Ctrl/Cmd + scroll to zoom · drag to pan · double-click to fit · ⛶ fullscreen",
}: MermaidStaticShellProps) {
  return (
    <section className="diagram-shell">
      {title ? <h4 className="mb-2 font-medium text-sm">{title}</h4> : null}
      <p className="diagram-shell__hint">{hint}</p>
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
          <span className="zoom-label">Loading…</span>
        </div>
        <div className="mermaid-viewport">
          <div className="mermaid mermaid-canvas" />
        </div>
      </div>
      <script
        className="diagram-source"
        dangerouslySetInnerHTML={{ __html: source }}
        type="text/plain"
      />
    </section>
  );
}
