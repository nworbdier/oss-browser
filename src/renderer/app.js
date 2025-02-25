// Tab management
let tabs = [];
let activeTabId = null;
let sidebarVisible = true; // Track sidebar visibility

// DOM Elements
const newTabBtn = document.getElementById("new-tab-btn");
const tabsList = document.getElementById("tabs-list");
const webviewContainer = document.getElementById("webview-container");
const urlBar = document.getElementById("url-bar");
const backBtn = document.getElementById("back-btn");
const forwardBtn = document.getElementById("forward-btn");
const refreshBtn = document.getElementById("refresh-btn");
const sidebar = document.querySelector(".sidebar");
const resizer = document.getElementById("sidebar-resizer");
const sidebarToggle = document.getElementById("sidebar-toggle");

// Initialize the browser with a default tab
document.addEventListener("DOMContentLoaded", () => {
  createNewTab("https://google.com");
  setupSidebarResizing();
  setupSidebarToggle();
  setupKeyboardShortcuts();
});

// Event Listeners
newTabBtn.addEventListener("click", () => {
  createNewTab("https://google.com");
});

backBtn.addEventListener("click", () => {
  const activeWebview = getActiveWebview();
  if (activeWebview && activeWebview.canGoBack()) {
    activeWebview.goBack();
  }
});

forwardBtn.addEventListener("click", () => {
  const activeWebview = getActiveWebview();
  if (activeWebview && activeWebview.canGoForward()) {
    activeWebview.goForward();
  }
});

refreshBtn.addEventListener("click", () => {
  const activeWebview = getActiveWebview();
  if (activeWebview) {
    activeWebview.reload();
  }
});

urlBar.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const url = formatUrl(urlBar.value);
    const activeWebview = getActiveWebview();
    if (activeWebview) {
      activeWebview.src = url;
      // Update the tab's URL
      const tabIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      if (tabIndex !== -1) {
        tabs[tabIndex].url = url;
      }
    }
  }
});

// Helper Functions
function createNewTab(url) {
  const tabId = "tab-" + Date.now();

  // Create tab object
  const tab = {
    id: tabId,
    title: "New Tab",
    url: url,
    favicon:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="8" fill="%23ddd"/></svg>',
  };

  tabs.push(tab);

  // Create tab element
  const tabElement = document.createElement("div");
  tabElement.className = "tab";
  tabElement.id = tabId;
  tabElement.innerHTML = `
    <img class="tab-favicon" src={tab.favicon}/>
    <span class="tab-title">${tab.title}</span>
    <button class="tab-close" title="Close tab">×</button>
  `;

  tabElement.addEventListener("click", (e) => {
    // Don't switch tabs if the close button was clicked
    if (!e.target.classList.contains("tab-close")) {
      switchToTab(tabId);
    }
  });

  // Add close button event listener
  const closeBtn = tabElement.querySelector(".tab-close");
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent tab switching
    closeTab(tabId);
  });

  tabsList.appendChild(tabElement);

  // Create webview
  const webview = document.createElement("webview");
  webview.id = "webview-" + tabId;
  webview.src = url;
  webview.style.display = "none";

  // Webview event listeners
  webview.addEventListener("did-start-loading", () => {
    // Show loading indicator if needed
  });

  webview.addEventListener("dom-ready", () => {
    // Now it's safe to switch to the tab
    switchToTab(tabId);
  });

  webview.addEventListener("did-stop-loading", () => {
    // Update URL bar safely
    try {
      if (
        webview.getWebContentsId &&
        typeof webview.getWebContentsId === "function"
      ) {
        urlBar.value = webview.getURL();
      }
    } catch (error) {
      console.log("Webview not fully initialized");
    }

    // Update tab title and favicon
    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex !== -1) {
      // Get title safely
      try {
        tabs[tabIndex].title = webview.getTitle() || "New Tab";
      } catch (error) {
        tabs[tabIndex].title = "New Tab";
      }

      // Get URL safely
      try {
        if (
          webview.getWebContentsId &&
          typeof webview.getWebContentsId === "function"
        ) {
          tabs[tabIndex].url = webview.getURL();
        }
      } catch (error) {
        tabs[tabIndex].url = url;
      }

      // Update tab element
      const tabTitleElement = tabElement.querySelector(".tab-title");
      if (tabTitleElement) {
        tabTitleElement.textContent = tabs[tabIndex].title;
      }
    }
  });

  webview.addEventListener("page-favicon-updated", (e) => {
    if (e.favicons && e.favicons.length > 0) {
      const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
      if (tabIndex !== -1) {
        tabs[tabIndex].favicon = e.favicons[0];

        // Update tab element
        const tabFaviconElement = tabElement.querySelector(".tab-favicon");
        if (tabFaviconElement) {
          tabFaviconElement.src = tabs[tabIndex].favicon;
        }
      }
    }
  });

  webviewContainer.appendChild(webview);

  // Initial switch to the tab (will be updated when dom-ready fires)
  // Just show the tab UI without trying to access webview methods yet
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  tabElement.classList.add("active");
  activeTabId = tabId;
}

function switchToTab(tabId) {
  // Hide all webviews
  document.querySelectorAll("#webview-container webview").forEach((webview) => {
    webview.style.display = "none";
  });

  // Remove active class from all tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Show the selected webview
  const webview = document.getElementById("webview-" + tabId);
  if (webview) {
    webview.style.display = "flex";

    // Update URL bar only if webview is ready
    try {
      // Only try to get URL if webview is loaded
      if (
        webview.getWebContentsId &&
        typeof webview.getWebContentsId === "function"
      ) {
        urlBar.value = webview.getURL();
      }
    } catch (error) {
      console.log("Webview not ready yet");
    }
  }

  // Add active class to the selected tab
  const tabElement = document.getElementById(tabId);
  if (tabElement) {
    tabElement.classList.add("active");
  }

  // Update active tab ID
  activeTabId = tabId;
}

function closeTab(tabId) {
  // Find the tab index
  const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
  if (tabIndex === -1) return;

  // Remove the tab from the array
  tabs.splice(tabIndex, 1);

  // Remove the tab element from DOM
  const tabElement = document.getElementById(tabId);
  if (tabElement) {
    tabElement.remove();
  }

  // Remove the webview from DOM
  const webview = document.getElementById("webview-" + tabId);
  if (webview) {
    webview.remove();
  }

  // If we closed the active tab, switch to another tab
  if (activeTabId === tabId) {
    if (tabs.length > 0) {
      // Switch to the next tab or the previous if this was the last tab
      const newTabIndex = tabIndex < tabs.length ? tabIndex : tabs.length - 1;
      switchToTab(tabs[newTabIndex].id);
    } else {
      // No tabs left, create a new one with Google.com
      createNewTab("https://google.com");
    }
  }
}

function getActiveWebview() {
  if (activeTabId) {
    return document.getElementById("webview-" + activeTabId);
  }
  return null;
}

function formatUrl(input) {
  // Simple URL formatting
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  } else if (input.includes(".") && !input.includes(" ")) {
    return "https://" + input;
  } else {
    // Treat as a search query
    return "https://www.google.com/search?q=" + encodeURIComponent(input);
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Close tab with Cmd+W (Mac) or Ctrl+W (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "w") {
      e.preventDefault();
      if (activeTabId) {
        closeTab(activeTabId);
      }
    }

    // Toggle sidebar with Cmd+S (Mac) or Ctrl+S (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      toggleSidebar();
    }
  });
}

function setupSidebarResizing() {
  let isResizing = false;
  let startX, startWidth;

  resizer.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = parseInt(window.getComputedStyle(sidebar).width, 10);

    // Add a class to the body to indicate resizing is in progress
    document.body.classList.add("resizing");

    // Prevent text selection during resize
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    // Calculate new width with a smoother algorithm
    const width = startWidth + (e.clientX - startX);

    // Set min and max width constraints
    if (width >= 200 && width <= 500) {
      // Update CSS variable for sidebar width
      document.documentElement.style.setProperty(
        "--sidebar-width",
        `${width}px`
      );
      sidebar.style.width = `${width}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.classList.remove("resizing");
    }
  });

  // Cancel resize if mouse leaves the window
  document.addEventListener("mouseleave", () => {
    if (isResizing) {
      isResizing = false;
      document.body.classList.remove("resizing");
    }
  });
}

function setupSidebarToggle() {
  sidebarToggle.addEventListener("click", toggleSidebar);
}

function toggleSidebar() {
  sidebarVisible = !sidebarVisible;

  if (sidebarVisible) {
    sidebar.classList.remove("collapsed");
    sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
    sidebarToggle.title = "Hide sidebar";
  } else {
    sidebar.classList.add("collapsed");
    sidebarToggle.innerHTML = '<i class="fas fa-expand"></i>';
    sidebarToggle.title = "Show sidebar";
  }
}
