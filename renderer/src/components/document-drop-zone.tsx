import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tRenderer } from "@/lib/renderer-i18n";
import { Upload } from "lucide-react";
import { useCallback, useState } from "react";

export type DocumentDropZoneProps = {
  uiLocale: string;
  onFileSelect: (file: File) => void;
  parseError?: string | null;
};

function isJsonFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".json") ||
    name.endsWith(".airp.json") ||
    file.type === "application/json"
  );
}

export function DocumentDropZone({
  uiLocale,
  onFileSelect,
  parseError,
}: DocumentDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file && isJsonFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div
        className={cn(
          "rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30"
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <h1 className="font-bold text-2xl">{tRenderer(uiLocale, "emptyHint")}</h1>
        <p className="mt-3 text-muted-foreground">
          {tRenderer(uiLocale, "emptyHintDetail")}
        </p>
        <p className="mt-4 text-muted-foreground text-sm">
          {dragActive
            ? tRenderer(uiLocale, "dropActive")
            : tRenderer(uiLocale, "dropHint")}
        </p>
        <Button
          className="mt-6"
          onClick={() => document.getElementById("airp-drop-file-input")?.click()}
          type="button"
          variant="outline"
        >
          <Upload className="mr-1.5 size-4" />
          {tRenderer(uiLocale, "uploadJson")}
        </Button>
        <input
          accept=".json,.airp.json,application/json"
          className="sr-only"
          id="airp-drop-file-input"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          type="file"
        />
      </div>
      {parseError ? (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-destructive text-sm">
          {parseError}
        </div>
      ) : null}
    </div>
  );
}
