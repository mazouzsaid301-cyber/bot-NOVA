const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { startDashboard } = require("../src/dashboard");

test("API & Dashboard: endpoints and security", async (t) => {
  const mockConfig = {
    port: 3456,
    dashboardPassword: "secure_test_password_123",
    sessionSecret: "test_secret_for_sessions_xyz",
    corsOrigins: ["https://mazoodev.com", "http://localhost:5173"],
    dashboardPublicUrl: "https://mazoodev.com",
    logChannelId: "12345",
    ticketCategoryId: "67890",
    guildId: "guild-test",
    nodeEnv: "test"
  };

  const mockClient = {
    isReady: () => true,
    user: { tag: "TestBot#0001", displayAvatarURL: () => "https://example.com/avatar.png" },
    ws: { ping: 42 },
    guilds: {
      cache: new Map([
        ["guild-1", {
          id: "guild-1",
          name: "Serveur Test",
          memberCount: 150,
          channels: { cache: new Map([["c1", {}], ["c2", {}]]) },
          roles: { cache: new Map([["r1", {}]]) },
          iconURL: () => "https://example.com/icon.png",
          ownerId: "owner-1",
          joinedTimestamp: Date.now() - 100000
        }]
      ])
    },
    channels: {
      fetch: async () => null
    }
  };

  const server = startDashboard(mockClient, mockConfig);

  const request = (path, options = {}) => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        host: "127.0.0.1",
        port: 3456,
        path,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers
        }
      }, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          let json = null;
          try { json = JSON.parse(data); } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: json || data });
        });
      });
      req.on("error", reject);
      if (options.body) {
        req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  };

  await t.test("GET /health returns 200 with bot status", async () => {
    const res = await request("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.equal(res.body.botReady, true);
  });

  await t.test("Protected endpoint /api/stats returns 401 when unauthenticated", async () => {
    const res = await request("/api/stats");
    assert.equal(res.status, 401);
  });

  await t.test("POST /api/auth/login rejects wrong password", async () => {
    const res = await request("/api/auth/login", {
      method: "POST",
      body: { password: "wrong_password" }
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, "INVALID_CREDENTIALS");
  });

  let authToken = "";
  await t.test("POST /api/auth/login accepts correct password and issues token", async () => {
    const res = await request("/api/auth/login", {
      method: "POST",
      body: { password: "secure_test_password_123" }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    authToken = res.body.token;
  });

  await t.test("GET /api/auth/me returns admin profile when authenticated", async () => {
    const res = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.authenticated, true);
  });

  await t.test("GET /api/stats returns metrics when authenticated", async () => {
    const res = await request("/api/stats", {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.bot);
    assert.ok(res.body.economy);
    assert.ok(res.body.tickets);
    assert.ok(res.body.redeem);
  });

  await t.test("POST /api/redeem creates code and GET /api/redeem lists it", async () => {
    const testCode = "API_" + Date.now();
    const createRes = await request("/api/redeem", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: { code: testCode, amount: 750 }
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.code.code, testCode);

    const listRes = await request("/api/redeem", {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.codes.some(c => c.code === testCode));
  });

  await t.test("POST /api/auth/logout revokes token", async () => {
    const logoutRes = await request("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert.equal(logoutRes.status, 200);

    const tryProtected = await request("/api/stats", {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert.equal(tryProtected.status, 401);
  });

  server.close();
});
