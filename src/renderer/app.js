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
const switchAccountBtn = document.getElementById("switch-account-btn");

// Initialize the browser with a default tab
document.addEventListener("DOMContentLoaded", () => {
  createNewTab("https://google.com");
  setupSidebarResizing();
  setupSidebarToggle();
  setupKeyboardShortcuts();
  setupAccountSwitching();
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

  // Create webview with persistent session
  const webview = document.createElement("webview");
  webview.id = "webview-" + tabId;
  webview.setAttribute("partition", "persist:main"); // Enable persistent session
  webview.setAttribute("allowpopups", "true"); // Enable popups
  webview.src = url;
  webview.style.display = "none";

  // Additional webview settings for better compatibility
  webview.setAttribute("webpreferences", "nativeWindowOpen=true");
  webview.setAttribute("webpreferences", "contextIsolation=false");

  // Webview event listeners
  webview.addEventListener("did-start-loading", () => {
    // Show loading indicator if needed
  });

  webview.addEventListener("new-window", (e) => {
    // Handle new window/popup events
    if (e.disposition === "new-window" || e.disposition === "foreground-tab") {
      // Check if this is an authentication popup
      if (isAuthenticationUrl(e.url)) {
        // Create a new tab for authentication
        const authTabId = createNewTab(e.url);

        // Store the original tab ID to return to after authentication
        if (typeof authTabId === "string") {
          storeAuthenticationContext(authTabId, activeTabId);
        }
      } else {
        createNewTab(e.url);
      }
    } else {
      // For other cases, open in the same tab
      webview.src = e.url;
    }
  });

  webview.addEventListener("dom-ready", () => {
    // Now it's safe to switch to the tab
    switchToTab(tabId);

    // Inject custom CSS for better Google sign-in compatibility
    webview.insertCSS(`
      /* Fix Google sign-in popup styles */
      .signin-popup {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
      }
    `);
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
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  tabElement.classList.add("active");
  activeTabId = tabId;

  return tabId;
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

    // Refresh webview with Cmd+R or Cmd+Shift+R (Mac) or Ctrl+R or Ctrl+Shift+R (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && (e.key === "r" || e.key === "R")) {
      e.preventDefault();
      const activeWebview = getActiveWebview();
      if (activeWebview) {
        // Hard reload (bypass cache) if Shift is pressed
        if (e.shiftKey) {
          activeWebview.reloadIgnoringCache();
        } else {
          activeWebview.reload();
        }
      }
    }

    // Switch account with Cmd+Shift+A (Mac) or Ctrl+Shift+A (Windows/Linux)
    if (
      (e.metaKey || e.ctrlKey) &&
      e.shiftKey &&
      (e.key === "a" || e.key === "A")
    ) {
      e.preventDefault();
      const activeWebview = getActiveWebview();
      if (activeWebview) {
        const currentUrl = activeWebview.getURL();
        const authUrl = determineAuthUrl(currentUrl);

        if (authUrl) {
          const authTabId = createNewTab(authUrl);
          storeAuthenticationContext(authTabId, activeTabId);
        }
      }
    }

    // New tab with Cmd+T (Mac) or Ctrl+T (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "t") {
      e.preventDefault();
      createNewTab("https://google.com");
    }

    // Navigate back with Cmd+[ or Cmd+Left (Mac) or Ctrl+[ or Alt+Left (Windows/Linux)
    if (
      ((e.metaKey || e.ctrlKey) && e.key === "[") ||
      (e.metaKey && e.key === "ArrowLeft") ||
      (e.altKey && e.key === "ArrowLeft")
    ) {
      e.preventDefault();
      const activeWebview = getActiveWebview();
      if (activeWebview && activeWebview.canGoBack()) {
        activeWebview.goBack();
      }
    }

    // Navigate forward with Cmd+] or Cmd+Right (Mac) or Ctrl+] or Alt+Right (Windows/Linux)
    if (
      ((e.metaKey || e.ctrlKey) && e.key === "]") ||
      (e.metaKey && e.key === "ArrowRight") ||
      (e.altKey && e.key === "ArrowRight")
    ) {
      e.preventDefault();
      const activeWebview = getActiveWebview();
      if (activeWebview && activeWebview.canGoForward()) {
        activeWebview.goForward();
      }
    }

    // Focus URL bar with Cmd+L (Mac) or Ctrl+L (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "l") {
      e.preventDefault();
      urlBar.focus();
      urlBar.select();
    }

    // Find in page with Cmd+F (Mac) or Ctrl+F (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      const activeWebview = getActiveWebview();
      if (activeWebview) {
        // Send find command to webview
        activeWebview.findInPage("");
      }
    }

    // Switch to specific tab with Cmd+1, Cmd+2, etc. (Mac) or Ctrl+1, Ctrl+2, etc. (Windows/Linux)
    if (
      (e.metaKey || e.ctrlKey) &&
      !isNaN(parseInt(e.key)) &&
      parseInt(e.key) > 0
    ) {
      e.preventDefault();
      const tabIndex = parseInt(e.key) - 1;
      if (tabs[tabIndex]) {
        switchToTab(tabs[tabIndex].id);
      }
    }

    // Switch to last tab with Cmd+9 (Mac) or Ctrl+9 (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "9") {
      e.preventDefault();
      if (tabs.length > 0) {
        switchToTab(tabs[tabs.length - 1].id);
      }
    }

    // Zoom in with Cmd+ (Mac) or Ctrl+ (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && (e.key === "+" || e.key === "=")) {
      e.preventDefault();
      const activeWebview = getActiveWebview();
      if (activeWebview) {
        // Get current zoom factor and increase it
        activeWebview.getZoomFactor((factor) => {
          activeWebview.setZoomFactor(factor + 0.1);
        });
      }
    }

    // Zoom out with Cmd- (Mac) or Ctrl- (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "-") {
      e.preventDefault();
      const activeWebview = getActiveWebview();
      if (activeWebview) {
        // Get current zoom factor and decrease it
        activeWebview.getZoomFactor((factor) => {
          activeWebview.setZoomFactor(Math.max(0.1, factor - 0.1));
        });
      }
    }

    // Reset zoom with Cmd+0 (Mac) or Ctrl+0 (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "0") {
      e.preventDefault();
      const activeWebview = getActiveWebview();
      if (activeWebview) {
        activeWebview.setZoomFactor(1.0);
      }
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

// Setup account switching functionality
function setupAccountSwitching() {
  // Add click event listener to the switch account button
  switchAccountBtn.addEventListener("click", () => {
    const activeWebview = getActiveWebview();
    if (!activeWebview) return;

    // Get the current URL
    const currentUrl = activeWebview.getURL();

    // Determine the appropriate authentication URL based on the current site
    let authUrl = determineAuthUrl(currentUrl);

    if (authUrl) {
      // Create a new tab for authentication
      const authTabId = createNewTab(authUrl);

      // Store the original tab ID to return to after authentication
      storeAuthenticationContext(authTabId, activeTabId);
    }
  });
}

// Determine the appropriate authentication URL based on the current site
function determineAuthUrl(currentUrl) {
  try {
    const urlObj = new URL(currentUrl);
    const hostname = urlObj.hostname;

    // Common authentication endpoints for popular services
    const authEndpoints = {
      "google.com":
        "https://accounts.google.com/signin/v2/identifier?hl=en&passive=true&continue=" +
        encodeURIComponent(currentUrl),
      "youtube.com":
        "https://accounts.google.com/signin/v2/identifier?hl=en&passive=true&continue=" +
        encodeURIComponent(currentUrl),
      "gmail.com":
        "https://accounts.google.com/signin/v2/identifier?hl=en&passive=true&continue=" +
        encodeURIComponent(currentUrl),
      "microsoft.com":
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?response_type=code&client_id=4765445b-32c6-49b0-83e6-1d93765276ca&redirect_uri=" +
        encodeURIComponent(currentUrl),
      "github.com":
        "https://github.com/login?return_to=" + encodeURIComponent(currentUrl),
      "twitter.com":
        "https://twitter.com/i/flow/login?redirect_after_login=" +
        encodeURIComponent(currentUrl),
      "facebook.com":
        "https://www.facebook.com/login.php?next=" +
        encodeURIComponent(currentUrl),
      "amazon.com":
        "https://www.amazon.com/ap/signin?openid.return_to=" +
        encodeURIComponent(currentUrl),
      "reddit.com":
        "https://www.reddit.com/login/?dest=" + encodeURIComponent(currentUrl),
      "linkedin.com":
        "https://www.linkedin.com/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin",
    };

    // Check if the current hostname matches any of our known services
    for (const [domain, authUrl] of Object.entries(authEndpoints)) {
      if (hostname.includes(domain)) {
        return authUrl;
      }
    }

    // For unknown services, try to find a login page
    // First, check if we're already on a login page
    if (isAuthenticationUrl(currentUrl)) {
      return currentUrl;
    }

    // For unknown sites, try common login paths
    const commonLoginPaths = ["/login", "/signin", "/auth", "/account/login"];
    for (const path of commonLoginPaths) {
      const possibleLoginUrl = `${urlObj.protocol}//${urlObj.hostname}${path}`;
      // We can't check if this URL exists without actually navigating to it,
      // so we'll just return the first one we construct
      return possibleLoginUrl;
    }

    // If all else fails, just return the current URL
    return currentUrl;
  } catch (error) {
    console.log("Error determining auth URL:", error);
    return null;
  }
}

// Authentication related variables and functions
let authContextMap = new Map(); // Maps auth tab IDs to original tab IDs

// Check if a URL is likely an authentication URL
function isAuthenticationUrl(url) {
  const authDomains = [
    "accounts.google.com",
    "login.microsoftonline.com",
    "login.live.com",
    "login.yahoo.com",
    "github.com/login",
    "api.twitter.com/oauth",
    "www.facebook.com/login",
    "login.salesforce.com",
    "auth.atlassian.com",
    "signin.aws.amazon.com",
    "login.okta.com",
  ];

  const authKeywords = [
    "login",
    "signin",
    "sign-in",
    "auth",
    "authenticate",
    "oauth",
    "sso",
    "saml",
    "account",
    "session",
  ];

  try {
    const urlObj = new URL(url);

    // Check if domain matches known auth domains
    if (authDomains.some((domain) => urlObj.hostname.includes(domain))) {
      return true;
    }

    // Check for auth keywords in path
    if (
      authKeywords.some((keyword) =>
        urlObj.pathname.toLowerCase().includes(keyword)
      )
    ) {
      return true;
    }

    // Check for auth keywords in query parameters
    if (
      authKeywords.some((keyword) =>
        urlObj.search.toLowerCase().includes(keyword)
      )
    ) {
      return true;
    }

    return false;
  } catch (error) {
    console.log("Error parsing URL:", error);
    return false;
  }
}

// Store authentication context
function storeAuthenticationContext(authTabId, originalTabId) {
  authContextMap.set(authTabId, originalTabId);

  // Set up a listener for this auth tab to detect when authentication is complete
  const authWebview = document.getElementById("webview-" + authTabId);
  if (authWebview) {
    authWebview.addEventListener("did-navigate", handleAuthNavigation);
    authWebview.addEventListener("did-navigate-in-page", handleAuthNavigation);
  }
}

// Handle navigation events in auth tabs
function handleAuthNavigation(e) {
  const webview = e.target;
  const tabId = webview.id.replace("webview-", "");

  // Check if this is an auth tab
  if (authContextMap.has(tabId)) {
    const currentUrl = webview.getURL();

    // Check if we've navigated away from an auth page, which might indicate completion
    if (!isAuthenticationUrl(currentUrl)) {
      // Authentication might be complete
      const originalTabId = authContextMap.get(tabId);

      // Remove the listener to avoid duplicate handling
      webview.removeEventListener("did-navigate", handleAuthNavigation);
      webview.removeEventListener("did-navigate-in-page", handleAuthNavigation);

      // Clean up the auth context
      authContextMap.delete(tabId);

      // Switch back to the original tab
      if (originalTabId && document.getElementById(originalTabId)) {
        // Wait a moment to ensure any redirects are complete
        setTimeout(() => {
          switchToTab(originalTabId);

          // Refresh the original tab to reflect the new authentication state
          const originalWebview = document.getElementById(
            "webview-" + originalTabId
          );
          if (originalWebview) {
            originalWebview.reload();
          }
        }, 1000);
      }
    }
  }
}
