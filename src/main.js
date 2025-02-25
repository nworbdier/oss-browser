const { app, BrowserWindow, session } = require("electron");
const path = require("path");
const Store = require("electron-store");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Initialize electron store
const store = new Store();

// Disable security warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "./index.html"));

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
};

// Configure persistent session
const configurePersistentSession = () => {
  const persistentSession = session.fromPartition("persist:main");

  // Enable permission handling
  persistentSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const url = webContents.getURL();

      // Auto-allow certain permissions for better UX
      const autoApprovePermissions = [
        "notifications",
        "fullscreen",
        "clipboard-read",
        "clipboard-write",
      ];

      if (autoApprovePermissions.includes(permission)) {
        return callback(true);
      }

      // Check stored permissions
      const storedPermission = store.get(`permissions.${permission}.${url}`);
      if (storedPermission !== undefined) {
        return callback(storedPermission);
      }

      // Default to allow for now - in production you might want to show a permission dialog
      store.set(`permissions.${permission}.${url}`, true);
      callback(true);
    }
  );

  // Configure popup handling
  persistentSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "popup") {
        callback(true);
      }
    }
  );

  return persistentSession;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  const persistentSession = configurePersistentSession();

  // Set default session configuration
  const sessionConfig = {
    // Enable persistent cookies
    persistent: true,
    // Cache size: 100MB
    cache: {
      maxSize: 100 * 1024 * 1024,
    },
  };

  // Apply session configuration
  persistentSession.setConfig(sessionConfig);

  createWindow();

  // Enable webview permissions with more permissive CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
            "script-src * 'unsafe-inline' 'unsafe-eval'; " +
            "connect-src * 'unsafe-inline'; " +
            "img-src * data: blob: 'unsafe-inline'; " +
            "frame-src *; " +
            "style-src * 'unsafe-inline';",
        ],
      },
    });
  });
});

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
