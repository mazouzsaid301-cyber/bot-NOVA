const test = require("node:test");
const assert = require("node:assert/strict");
const { commands, checkRoleHierarchy } = require("../src/commands");

test("Commands: all 16 required commands are defined", () => {
  const expected = [
    "help", "ping", "dashboard", "ticket", "ticket-close",
    "setup-logs", "redeem-create", "redeem", "balance",
    "daily", "pay", "leaderboard", "mod-ban", "mod-kick",
    "mod-timeout", "purge"
  ];

  const actualNames = commands.map(c => c.name);
  for (const cmd of expected) {
    assert.ok(actualNames.includes(cmd), `La commande /${cmd} doit être enregistrée`);
  }
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
