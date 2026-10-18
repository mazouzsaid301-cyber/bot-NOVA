const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

// Use an isolated test database
const testDbPath = path.join(process.cwd(), "data", "test-bot.sqlite");
if (fs.existsSync(testDbPath)) {
  try { fs.unlinkSync(testDbPath); } catch {}
}
process.env.DATABASE_PATH = testDbPath;

const {
  db,
  ensureUser,
  getUser,
  getLeaderboard,
  transferCoins,
  claimDaily,
  createRedeemCode,
  claimRedeemCode,
  listRedeemCodes,
  deleteRedeemCode,
  createTicket,
  closeTicket,
  getTicketByChannel,
  getOpenTicketForUser,
  listTickets,
  countTickets,
  addAuditLog,
  listAuditLogs,
  addModerationAction,
  listModerationActions,
  getEconomyStats,
  getSetting,
  setSetting
} = require("../src/db");

test("Database: user initialization and balance", () => {
  ensureUser("user-1");
  const user = getUser("user-1");
  assert.equal(user.user_id, "user-1");
  assert.equal(user.balance, 0);
  assert.equal(user.last_daily, 0);
});

test("Database: redeem code lifecycle and single-use enforcement", () => {
  const code = createRedeemCode("CODE500", 500, "admin-1");
  assert.equal(code.code, "CODE500");
  assert.equal(code.amount, 500);

  // Duplicate code creation should throw
  assert.throws(() => {
    createRedeemCode("CODE500", 100, "admin-1");
  });

  // Claim code
  const claim1 = claimRedeemCode("CODE500", "user-1");
  assert.equal(claim1.success, true);
  assert.equal(claim1.amount, 500);

  const user = getUser("user-1");
  assert.equal(user.balance, 500);

  // Claiming the same code a second time must fail
  const claim2 = claimRedeemCode("CODE500", "user-2");
  assert.equal(claim2.success, false);
  assert.match(claim2.error, /déjà été utilisé/i);

  // Cannot delete a redeemed code
  const delRedeemed = deleteRedeemCode("CODE500");
  assert.equal(delRedeemed.success, false);

  // Create and delete an unused code
  createRedeemCode("TEMP99", 99, "admin-1");
  const delUnused = deleteRedeemCode("TEMP99");
  assert.equal(delUnused.success, true);
});

test("Database: economy transfers and overdraft prevention", () => {
  ensureUser("alice");
  ensureUser("bob");

  // Credit alice 200 via redeem code
  createRedeemCode("ALICE200", 200, "admin");
  claimRedeemCode("ALICE200", "alice");

  // Transfer 150 from alice to bob
  const tx1 = transferCoins("alice", "bob", 150);
  assert.equal(tx1.success, true);
  assert.equal(tx1.amount, 150);

  assert.equal(getUser("alice").balance, 50);
  assert.equal(getUser("bob").balance, 150);

  // Alice cannot send more than her balance
  const tx2 = transferCoins("alice", "bob", 100);
  assert.equal(tx2.success, false);
  assert.match(tx2.error, /insuffisant/i);

  // Alice cannot send to herself
  const tx3 = transferCoins("alice", "alice", 10);
  assert.equal(tx3.success, false);

  // Negative amount is rejected
  const tx4 = transferCoins("alice", "bob", -50);
  assert.equal(tx4.success, false);
});

test("Database: daily claim and cooldown enforcement", () => {
  const claim1 = claimDaily("daily-user", 100, 86400000);
  assert.equal(claim1.success, true);
  assert.equal(claim1.amount, 100);
  assert.equal(claim1.newBalance, 100);

  // Second claim immediately should be rejected due to cooldown
  const claim2 = claimDaily("daily-user", 100, 86400000);
  assert.equal(claim2.success, false);
  assert.ok(claim2.remainingMs > 0);
});

test("Database: tickets lifecycle and duplication prevention", () => {
  const guildId = "guild-123";
  const userId = "user-ticket-1";
  const channelId = "chan-456";

  // Create ticket
  createTicket(channelId, guildId, userId);
  const openTicket = getOpenTicketForUser(guildId, userId);
  assert.ok(openTicket);
  assert.equal(openTicket.channel_id, channelId);
  assert.equal(openTicket.status, "open");

  // Close ticket
  const closed = closeTicket(channelId, "staff-member", "Problème résolu");
  assert.equal(closed.success, true);
  assert.equal(closed.ticket.status, "closed");
  assert.equal(closed.ticket.closed_by, "staff-member");

  // Verified it is no longer an open ticket
  const noOpenTicket = getOpenTicketForUser(guildId, userId);
  assert.equal(noOpenTicket, undefined);

  // Record remains in DB even after channel deletion
  const preserved = getTicketByChannel(channelId);
  assert.equal(preserved.status, "closed");
  assert.equal(preserved.user_id, userId);
});

test("Database: audit logs and moderation actions", () => {
  addAuditLog({
    guildId: "guild-1",
    category: "ticket",
    action: "Ticket ouvert",
    details: "Test audit details",
    userId: "user-1"
  });

  const logs = listAuditLogs({ guildId: "guild-1", category: "ticket" });
  assert.ok(logs.length > 0);
  assert.equal(logs[0].action, "Ticket ouvert");

  addModerationAction({
    guildId: "guild-1",
    actionType: "ban",
    targetId: "bad-user",
    targetTag: "bad-user#0001",
    moderatorId: "mod-1",
    moderatorTag: "mod#0001",
    reason: "Spam",
    details: "Détails du ban"
  });

  const modActions = listModerationActions({ guildId: "guild-1" });
  assert.ok(modActions.length > 0);
  assert.equal(modActions[0].action_type, "ban");
  assert.equal(modActions[0].target_id, "bad-user");
});

test("Database: settings storage and retrieval", () => {
  setSetting("test_key", "test_value_123");
  assert.equal(getSetting("test_key"), "test_value_123");
  setSetting("test_key", "updated_value_456");
  assert.equal(getSetting("test_key"), "updated_value_456");
});
