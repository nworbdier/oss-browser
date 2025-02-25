import "./styles.css";
import "./app.js"; // Assuming app.js has browser logic

function App() {
  const browserContainer = document.createElement("div");
  browserContainer.className = "browser-container";

  const sidebar = document.createElement("div");
  sidebar.className = "sidebar glass-effect";

  const tabsContainer = document.createElement("div");
  tabsContainer.className = "tabs-container";

  const tabActions = document.createElement("div");
  tabActions.className = "tab-actions";

  const newTabBtn = document.createElement("button");
  newTabBtn.id = "new-tab-btn";
  newTabBtn.textContent = "+";
  tabActions.appendChild(newTabBtn);

  const tabsList = document.createElement("div");
  tabsList.id = "tabs-list";

  tabsContainer.appendChild(tabActions);
  tabsContainer.appendChild(tabsList);
  sidebar.appendChild(tabsContainer);

  const sidebarResizer = document.createElement("div");
  sidebarResizer.id = "sidebar-resizer";

  const mainContent = document.createElement("div");
  mainContent.className = "main-content";

  const navigationBar = document.createElement("div");
  navigationBar.className = "navigation-bar glass-effect";

  const sidebarToggleBtn = document.createElement("button");
  sidebarToggleBtn.id = "sidebar-toggle";
  sidebarToggleBtn.title = "Toggle sidebar";
  const sidebarToggleIcon = document.createElement("i");
  sidebarToggleIcon.className = "fas fa-columns";
  sidebarToggleBtn.appendChild(sidebarToggleIcon);

  const backBtn = document.createElement("button");
  backBtn.id = "back-btn";
  const backIcon = document.createElement("i");
  backIcon.className = "fas fa-arrow-left";
  backBtn.appendChild(backIcon);

  const forwardBtn = document.createElement("button");
  forwardBtn.id = "forward-btn";
  const forwardIcon = document.createElement("i");
  forwardIcon.className = "fas fa-arrow-right";
  forwardBtn.appendChild(forwardIcon);

  const refreshBtn = document.createElement("button");
  refreshBtn.id = "refresh-btn";
  const refreshIcon = document.createElement("i");
  refreshIcon.className = "fas fa-sync-alt";
  refreshBtn.appendChild(refreshIcon);

  const urlBar = document.createElement("input");
  urlBar.type = "text";
  urlBar.id = "url-bar";
  urlBar.placeholder = "Enter URL or search...";
  urlBar.className = "glass-input";

  const switchAccountBtn = document.createElement("button");
  switchAccountBtn.id = "switch-account-btn";
  switchAccountBtn.title = "Switch Account";
  const switchAccountIcon = document.createElement("i");
  switchAccountIcon.className = "fas fa-user-circle";
  switchAccountBtn.appendChild(switchAccountIcon);

  navigationBar.appendChild(sidebarToggleBtn);
  navigationBar.appendChild(backBtn);
  navigationBar.appendChild(forwardBtn);
  navigationBar.appendChild(refreshBtn);
  navigationBar.appendChild(urlBar);
  navigationBar.appendChild(switchAccountBtn);

  const webviewContainer = document.createElement("div");
  webviewContainer.id = "webview-container";

  mainContent.appendChild(navigationBar);
  mainContent.appendChild(webviewContainer);

  browserContainer.appendChild(sidebar);
  browserContainer.appendChild(sidebarResizer);
  browserContainer.appendChild(mainContent);

  return browserContainer;
}

document.addEventListener("DOMContentLoaded", () => {
  const appElement = App();
  document.body.appendChild(appElement);
});
