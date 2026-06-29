console.log("🔥 Background worker (full analytics mode)");

let currentUser = null;
let sessionStart = null;

/**
 * Get DB
 */
async function getUsers() {
  const data = await chrome.storage.local.get(["users"]);
  return data.users || {};
}

/**
 * Save DB
 */
async function saveUsers(users) {
  await chrome.storage.local.set({ users });
}

/**
 * Add session time
 */
async function addTime(username, ms) {
  const users = await getUsers();

  if (!users[username]) {
    users[username] = {
      totalMinutes: 0,
      totalRevenue: 0,
      sessions: 0,
      lastSeen: null
    };
  }

  users[username].totalMinutes += ms / 60000;
  users[username].sessions += 1;
  users[username].lastSeen = Date.now();

  await saveUsers(users);
}

/**
 * Update subscriber lifetime spend
 */
async function addRevenue(username, amount) {
  const users = await getUsers();

  if (!users[username]) {
    users[username] = {
      totalMinutes: 0,
      totalRevenue: 0,
      sessions: 0,
      lastSeen: null
    };
  }

  // Overwrite because OF already shows lifetime spend
  users[username].totalRevenue = amount;
  users[username].lastSeen = Date.now();

  await saveUsers(users);

  console.log(`💰 Saved ${username}: $${amount}`);
}

/**
 * End session
 */
async function endSession() {
  if (!currentUser || !sessionStart) return;

  const duration = Date.now() - sessionStart;

  await addTime(currentUser, duration);

  console.log("⏱ Session saved:", currentUser, duration);

  currentUser = null;
  sessionStart = null;
}

/**
 * Message listener
 */
chrome.runtime.onMessage.addListener((msg) => {

  // Revenue updates from profile pages
  if (msg.type === "REVENUE_UPDATED") {
    addRevenue(msg.username, msg.amount);
    return;
  }

  // Chat changes
  if (msg.type !== "ACTIVE_CHAT_CHANGED") return;

  if (msg.username === currentUser) return;

  endSession();

  currentUser = msg.username;
  sessionStart = Date.now();

  console.log("▶ Started session:", currentUser);
});