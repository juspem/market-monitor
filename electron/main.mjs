import { app, BrowserWindow, dialog, Menu, net, protocol, session, shell } from "electron";
import path from "node:path";
import { APP_ORIGIN, createAppHandler } from "./protocol.mjs";
import { isAllowedExternalUrl } from "./external-links.mjs";

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

app.setName("Market Monitor");
app.setAppUserModelId("com.marketmonitor.desktop");
const hidden = process.argv.includes("--smoke-test");
let mainWindow;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });
  app.whenReady().then(async () => {
    protocol.handle("app", createAppHandler({ distDir: path.join(app.getAppPath(), "dist"), fetcher: (url, options) => net.fetch(url, options) }));
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.on("will-download", (event) => event.preventDefault());
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: "Market Monitor", submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }] },
      { label: "View", submenu: [{ role: "reload" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }] },
    ]));
    mainWindow = new BrowserWindow({
      title: "Market Monitor", width: 1440, height: 960, minWidth: 480, minHeight: 600,
      show: false, backgroundColor: "#eef2f3", icon: path.join(app.getAppPath(), "build", "icon.png"),
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true },
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (isAllowedExternalUrl(url)) void shell.openExternal(url).catch(console.error);
      return { action: "deny" };
    });
    mainWindow.webContents.on("will-navigate", (event, url) => {
      if (url !== `${APP_ORIGIN}/` && url !== `${APP_ORIGIN}/index.html`) {
        event.preventDefault();
        if (isAllowedExternalUrl(url)) void shell.openExternal(url).catch(console.error);
      }
    });
    mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
    mainWindow.once("ready-to-show", () => { if (!hidden) mainWindow.show(); });
    mainWindow.on("closed", () => { mainWindow = undefined; });
    await mainWindow.loadURL(`${APP_ORIGIN}/`);
  }).catch((error) => {
    if (!hidden) dialog.showErrorBox("Market Monitor could not start", error.message);
    console.error(error);
    app.exit(1);
  });
  app.on("window-all-closed", () => app.quit());
}
