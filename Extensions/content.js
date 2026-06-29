console.log("🔥 Extension active (resilient mode)");

let currentUser = null;
let observer = null;
let isRecovering = false;
let lastProfileUsername = null;
let lastSpentAmount = null;

/**
 * Safe messaging
 */
function send(msg) {
  try {
    if (!chrome?.runtime?.sendMessage) return false;

    chrome.runtime.sendMessage(msg);
    return true;
  } catch (e) {
    console.warn("⚠️ Message failed, will recover:", e);
    triggerRecovery();
    return false;
  }
}

/**
 * Extract chat username
 */
function getUsername() {
  const el = document.querySelector(
    "a.g-user-name.g-user-realname__wrapper span.g-user-name"
  );

  return el?.textContent?.trim() || null;
}

/**
 * Extract profile username
 */
function detectProfileUsername() {
  const el = document.querySelector(
    ".g-user-name.m-lg-size"
  );

  if (!el) return null;

  return el.textContent.trim();
}

/**
 * Extract total spent from profile page
 */
function detectSpentAmount() {
  const items = document.querySelectorAll(
    ".b-fans__item__list__item"
  );

  for (const item of items) {
    const label = item.querySelector(
      ".b-fans__item__list__label"
    );

    if (!label) continue;

    if (label.textContent.trim() !== "Spent")
      continue;

    const match = item.textContent.match(
      /\$([\d,]+\.?\d*)/
    );

    if (!match) return null;

    return parseFloat(
      match[1].replace(/,/g, "")
    );
  }

  return null;
}

/**
 * Check if user is currently viewing a profile page
 */
function checkProfilePage() {
    const username = detectProfileUsername();
    const spent = detectSpentAmount();
  
    if (!username || spent === null) return;
  
    // Skip duplicate updates
    if (
      username === lastProfileUsername &&
      spent === lastSpentAmount
    ) {
      return;
    }
  
    lastProfileUsername = username;
    lastSpentAmount = spent;
  
    console.log(`💰 ${username} has spent $${spent}`);
  
    send({
      type: "REVENUE_UPDATED",
      username,
      amount: spent
    });
  }

/**
 * Core chat detection
 */
function checkChat() {
  const username = getUsername();
  if (!username) return;

  if (username === currentUser) return;

  currentUser = username;

  console.log("💬 Active chat changed:", username);

  send({
    type: "ACTIVE_CHAT_CHANGED",
    username
  });
}

/**
 * Start observer safely
 */
function startObserver() {
  if (!document.body) return;

  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    console.log("👀 DOM changed");
  
    checkChat();
    checkProfilePage();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });

  console.log("👀 Observer started");
}

/**
 * Recovery system
 */
function triggerRecovery() {
  if (isRecovering) return;

  isRecovering = true;

  console.log("♻️ Recovering extension context...");

  setTimeout(() => {
    try {
      currentUser = null;
      startObserver();
      checkChat();
      checkProfilePage();

      isRecovering = false;

      console.log("✅ Recovery complete");
    } catch (e) {
      console.warn("Recovery failed:", e);
      isRecovering = false;
    }
  }, 1000);
}

/**
 * Watch for page lifecycle changes
 */
function watchDOM() {
  const bodyObserver = new MutationObserver(() => {
    if (!document.body) return;

    if (!observer) {
      startObserver();
      checkChat();
      checkProfilePage();
    }
  });

  bodyObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

/**
 * Init
 */
function init() {
    console.log("🚀 Initializing extension");
  
    startObserver();
    watchDOM();
  
    checkChat();
    checkProfilePage();

  setInterval(() => {
    if (!document.body || !observer) {
      triggerRecovery();
    }
  }, 5000);
}

init();