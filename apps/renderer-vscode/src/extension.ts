import { fork } from "node:child_process";
import type { Logger } from "@airp/utils";
import {
  type CancellationToken,
  type CustomDocument,
  type CustomReadonlyEditorProvider,
  commands,
  type ExtensionContext,
  env,
  Uri,
  ViewColumn,
  type WebviewPanel,
  window,
} from "vscode";
import { isCursorHost } from "./host-env";
import { panelKey } from "./paths";
import {
  isRenderableUri,
  RenderSession,
  type RenderSessionHost,
} from "./render-session";
import { RenderWorkerPool } from "./render-worker-pool";
import { createVscodeLogger } from "./vscode-logger";

export const VIEW_TYPE = "airp.renderer";
const PANEL_TITLE = "AIRP Renderer";
const TEXT_EDITOR = "default";
const sessions = new Map<string, RenderSession>();

export function activate(context: ExtensionContext): void {
  const output = window.createOutputChannel(PANEL_TITLE);
  const log: Logger = createVscodeLogger(output);
  const workerPath = Uri.joinPath(
    context.extensionUri,
    "dist",
    "render-worker.cjs"
  ).fsPath;
  const pool = new RenderWorkerPool({
    spawnWorker: () =>
      fork(workerPath, [], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        execPath: process.execPath,
        stdio: ["ignore", "inherit", "inherit", "ipc"],
      }),
  });
  const host: RenderSessionHost = {
    context,
    extensionUri: context.extensionUri,
    log,
    output,
    pool,
  };

  context.subscriptions.push(output, pool);
  context.subscriptions.push(
    window.registerCustomEditorProvider(
      VIEW_TYPE,
      new AirpRendererEditorProvider(host),
      {
        supportsMultipleEditorsPerDocument: false,
        webviewOptions: {
          enableFindWidget: !isCursorHost(env.appName),
          retainContextWhenHidden: true,
        },
      }
    ),
    commands.registerCommand("airp.renderer.open", async (uri?: Uri) => {
      await openRenderer(uri, host);
    }),
    commands.registerCommand("airp.renderer.editSource", async (uri?: Uri) => {
      await editSource(uri, host);
    })
  );
  context.subscriptions.push({
    dispose: () => {
      for (const session of sessions.values()) {
        session.dispose();
      }
      sessions.clear();
    },
  });
}

export function deactivate(): void {
  sessions.clear();
}

class AirpRendererEditorProvider implements CustomReadonlyEditorProvider {
  private readonly host: RenderSessionHost;

  constructor(host: RenderSessionHost) {
    this.host = host;
  }

  openCustomDocument(
    uri: Uri,
    _openContext: { backupId?: string },
    _token: CancellationToken
  ): CustomDocument {
    return { uri, dispose: () => undefined };
  }

  resolveCustomEditor(
    document: CustomDocument,
    webviewPanel: WebviewPanel,
    _token: CancellationToken
  ): Promise<void> {
    const fsPath = document.uri.fsPath;
    const key = panelKey(fsPath);
    const existing = sessions.get(key);
    if (existing) {
      existing.dispose();
      sessions.delete(key);
    }

    const session = new RenderSession({
      host: this.host,
      panel: webviewPanel,
      inputFsPath: fsPath,
    });
    sessions.set(key, session);
    webviewPanel.onDidDispose(() => {
      if (sessions.get(key) === session) {
        sessions.delete(key);
      }
    });
    session.start();
    return Promise.resolve();
  }
}

async function openRenderer(
  uri: Uri | undefined,
  host: RenderSessionHost
): Promise<void> {
  const target = uri ?? window.activeTextEditor?.document.uri;
  if (!(target && isRenderableUri(target))) {
    host.log.error("Open a *.airp.json file to render");
    await window.showErrorMessage("Open a *.airp.json file to render");
    return;
  }
  await commands.executeCommand("vscode.openWith", target, VIEW_TYPE);
}

async function editSource(
  uri: Uri | undefined,
  host: RenderSessionHost
): Promise<void> {
  const target =
    uri ?? activeSessionUri() ?? window.activeTextEditor?.document.uri;
  if (!(target && isRenderableUri(target))) {
    host.log.error("Open a *.airp.json Renderer view to edit source");
    await window.showErrorMessage(
      "Open a *.airp.json Renderer view to edit source"
    );
    return;
  }
  await commands.executeCommand(
    "vscode.openWith",
    target,
    TEXT_EDITOR,
    ViewColumn.Beside
  );
}

function activeSessionUri(): Uri | undefined {
  for (const session of sessions.values()) {
    if (session.isActive()) {
      return Uri.file(session.getInputFsPath());
    }
  }
  return undefined;
}
