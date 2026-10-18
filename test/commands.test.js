const test = require("node:test");
const assert = require("node:assert/strict");
const { commands, checkRoleHierarchy } = require("../src/commands");

test("Commands: all 22 required commands are defined", () => {
  const expected = [
    "help", "ping", "dashboard", "ticket", "ticket-close",
    "setup-logs", "redeem-create", "redeem", "balance",
    "daily", "pay", "leaderboard", "mod-ban", "mod-kick",
    "mod-timeout", "purge", "clean", "rank", "rewards-info",
    "ticket-panel", "roles-panel", "setup-nova"
  ];

  const actualNames = commands.map(c => c.name);
  for (const cmd of expected) {
    assert.ok(actualNames.includes(cmd), `La commande /${cmd} doit être enregistrée`);
  }
});

test("Commands: NOVA PVP commands are properly configured", () => {
  const cleanCmd = commands.find(c => c.name === "clean");
  assert.ok(cleanCmd, "La commande /clean doit exister");
  assert.ok(cleanCmd.options.some(o => o.name === "forcer"), "L'option 'forcer' doit exister sur /clean");

  const rankCmd = commands.find(c => c.name === "rank");
  assert.ok(rankCmd, "La commande /rank doit exister");

  const ticketPanelCmd = commands.find(c => c.name === "ticket-panel");
  assert.ok(ticketPanelCmd, "La commande /ticket-panel doit exister");

  const rolesPanelCmd = commands.find(c => c.name === "roles-panel");
  assert.ok(rolesPanelCmd, "La commande /roles-panel doit exister");

  const setupNovaCmd = commands.find(c => c.name === "setup-nova");
  assert.ok(setupNovaCmd, "La commande /setup-nova doit exister");
});

test("Commands: checkRoleHierarchy blocks self-moderation", () => {
  const interaction = {
    user: { id: "user-123" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 10 } } } } },
    member: { roles: { highest: { position: 5 } } }
  };
  const targetMember = { id: "user-123", roles: { highest: { position: 5 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, false);
  assert.match(result.reason, /sur vous-même/i);
});

test("Commands: checkRoleHierarchy blocks bot moderation", () => {
  const interaction = {
    user: { id: "user-123" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 10 } } } } },
    member: { roles: { highest: { position: 5 } } }
  };
  const targetMember = { id: "bot-999", roles: { highest: { position: 10 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, false);
  assert.match(result.reason, /auto-sanctionner/i);
});

test("Commands: checkRoleHierarchy blocks owner moderation", () => {
  const interaction = {
    user: { id: "user-123" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 10 } } } } },
    member: { roles: { highest: { position: 5 } } }
  };
  const targetMember = { id: "owner-000", roles: { highest: { position: 15 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, false);
  assert.match(result.reason, /propriétaire/i);
});

test("Commands: checkRoleHierarchy blocks action if target has higher role than executor", () => {
  const interaction = {
    user: { id: "mod-1" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 20 } } } } },
    member: { roles: { highest: { position: 5 } } }
  };
  const targetMember = { id: "target-1", roles: { highest: { position: 8 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, false);
  assert.match(result.reason, /hiérarchie/i);
});

test("Commands: checkRoleHierarchy blocks action if target has higher role than bot", () => {
  const interaction = {
    user: { id: "admin-1" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 10 } } } } },
    member: { roles: { highest: { position: 25 } } }
  };
  const targetMember = { id: "target-1", roles: { highest: { position: 15 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, false);
  assert.match(result.reason, /rôle du bot/i);
});

test("Commands: checkRoleHierarchy allows action when hierarchy is respected", () => {
  const interaction = {
    user: { id: "mod-1" },
    client: { user: { id: "bot-999" } },
    guild: { ownerId: "owner-000", members: { me: { roles: { highest: { position: 20 } } } } },
    member: { roles: { highest: { position: 15 } } }
  };
  const targetMember = { id: "target-1", roles: { highest: { position: 5 } } };

  const result = checkRoleHierarchy(interaction, targetMember);
  assert.equal(result.canAct, true);
});
