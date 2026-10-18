import React, { useState, useEffect, useCallback } from 'react';

// Icons using SVG components for zero external dependency overhead
const Icons = {
  Overview: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
  Server: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  Ticket: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>,
  Gift: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  Coins: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>,
  Shield: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Logout: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Copy: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  Lock: () => <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Menu: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Close: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
};

function formatUptime(seconds) {
  if (!seconds) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}j ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

function formatDate(timestamp) {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(Number(timestamp)));
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("bot_dash_token") || "");
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem("bot_api_url") || "");
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [stats, setStats] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [redeemCodes, setRedeemCodes] = useState([]);
  const [redeemFilter, setRedeemFilter] = useState("all");
  const [economy, setEconomy] = useState({ stats: {}, leaderboard: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [logCategory, setLogCategory] = useState("all");
  const [settings, setSettings] = useState({ settings: {}, configured: {} });

  // Modals & UI helpers
  const [showCreateRedeemModal, setShowCreateRedeemModal] = useState(false);
  const [newCodeData, setNewCodeData] = useState({ code: "", amount: 100 });
  const [showCloseTicketModal, setShowCloseTicketModal] = useState(null);
  const [closeTicketReason, setCloseTicketReason] = useState("");
  const [toasts, setToasts] = useState([]);

  // Login form state
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showCustomApi, setShowCustomApi] = useState(false);

  const showToast = (message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Base API caller
  const apiFetch = useCallback(async (path, options = {}) => {
    const base = apiUrl.trim().replace(/\/$/, "") || (window.location.hostname === "localhost" ? "" : "");
    const url = `${base}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...options.headers
    };

    try {
      const res = await fetch(url, { credentials: "include", ...options, headers });
      if (res.status === 401) {
        setAuthenticated(false);
        setToken("");
        localStorage.removeItem("bot_dash_token");
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Erreur serveur (${res.status})`);
      }
      return data;
    } catch (err) {
      throw err;
    }
  }, [apiUrl, token]);

  // Check Auth on Mount
  useEffect(() => {
    if (!token) {
      setAuthenticated(false);
      return;
    }
    apiFetch("/api/auth/me")
      .then(() => setAuthenticated(true))
      .catch(() => {
        setAuthenticated(false);
        setToken("");
        localStorage.removeItem("bot_dash_token");
      });
  }, [token, apiFetch]);

  // Load Tab Data
  const loadData = useCallback(async () => {
    if (!authenticated) return;
    setRefreshing(true);
    try {
      if (activeTab === "overview") {
        const s = await apiFetch("/api/stats");
        setStats(s);
      } else if (activeTab === "servers") {
        const g = await apiFetch("/api/guilds");
        setGuilds(g.guilds || []);
      } else if (activeTab === "tickets") {
        const filterParam = ticketFilter !== "all" ? `?status=${ticketFilter}` : "";
        const t = await apiFetch(`/api/tickets${filterParam}`);
        setTickets(t.tickets || []);
      } else if (activeTab === "redeem") {
        const r = await apiFetch(`/api/redeem?filter=${redeemFilter}`);
        setRedeemCodes(r.codes || []);
      } else if (activeTab === "economy") {
        const e = await apiFetch("/api/economy");
        setEconomy(e);
      } else if (activeTab === "moderation") {
        const catParam = logCategory !== "all" ? `?category=${logCategory}` : "";
        const l = await apiFetch(`/api/logs${catParam}`);
        setAuditLogs(l.logs || []);
      } else if (activeTab === "settings") {
        const cfg = await apiFetch("/api/settings");
        setSettings(cfg);
      }
    } catch (err) {
      showToast(err.message, "danger");
    } finally {
      setRefreshing(false);
    }
  }, [authenticated, activeTab, ticketFilter, redeemFilter, logCategory, apiFetch]);

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated, activeTab, ticketFilter, redeemFilter, logCategory, loadData]);

  // Periodic heartbeat poll
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(() => {
      if (activeTab === "overview") {
        apiFetch("/api/stats").then(s => setStats(s)).catch(() => {});
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [authenticated, activeTab, apiFetch]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const base = apiUrl.trim().replace(/\/$/, "");
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
        credentials: "include"
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Échec de connexion.");
      }

      setToken(data.token);
      localStorage.setItem("bot_dash_token", data.token);
      if (apiUrl) localStorage.setItem("bot_api_url", apiUrl);
      setAuthenticated(true);
      showToast("Connexion réussie !", "success");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setToken("");
    setAuthenticated(false);
    localStorage.removeItem("bot_dash_token");
    showToast("Vous avez été déconnecté.", "info");
  };

  // Actions: Redeem
  const handleCreateRedeem = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/redeem", {
        method: "POST",
        body: JSON.stringify(newCodeData)
      });
      showToast(`Code ${res.code.code} créé (+${res.code.amount} coins)`, "success");
      setShowCreateRedeemModal(false);
      setNewCodeData({ code: "", amount: 100 });
      loadData();
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  const handleDeleteRedeem = async (code) => {
    if (!window.confirm(`Supprimer définitivement le code "${code}" ?`)) return;
    try {
      await apiFetch(`/api/redeem/${code}`, { method: "DELETE" });
      showToast(`Code ${code} supprimé avec succès.`, "success");
      loadData();
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  // Actions: Tickets
  const handleCloseTicket = async () => {
    if (!showCloseTicketModal) return;
    try {
      await apiFetch(`/api/tickets/${showCloseTicketModal.channel_id}/close`, {
        method: "POST",
        body: JSON.stringify({ reason: closeTicketReason || "Fermé depuis le dashboard" })
      });
      showToast(`Ticket #${showCloseTicketModal.channel_id} fermé.`, "success");
      setShowCloseTicketModal(null);
      setCloseTicketReason("");
      loadData();
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast(`Copié dans le presse-papier : ${text}`, "info");
  };

  // 1. Unauthenticated Login Screen
  if (!authenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-icon-box">
            <Icons.Lock />
          </div>
          <h2>Administration Discord</h2>
          <p>Connectez-vous pour administrer votre bot Discord Tout-en-Un (mazoodev.com)</p>

          {loginError && (
            <div style={{ background: "var(--rose-bg)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--rose)", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ textAlign: "left" }}>
              <label>Mot de passe administrateur</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            {showCustomApi && (
              <div className="form-group" style={{ textAlign: "left" }}>
                <label>URL API du bot (Render / Railway / VPS)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://votre-bot.onrender.com"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
                <small style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Laisser vide pour utiliser le proxy relatif par défaut
                </small>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "14px", marginTop: "10px" }}
              disabled={loginLoading}
            >
              {loginLoading ? "Authentification..." : "Se connecter"}
            </button>
          </form>

          <div style={{ marginTop: "24px" }}>
            <button
              type="button"
              onClick={() => setShowCustomApi(!showCustomApi)}
              style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "13px" }}
            >
              {showCustomApi ? "Masquer la configuration de l'API" : "⚙️ Configurer l'URL de l'API du bot"}
            </button>
          </div>
        </div>

        {/* Toasts */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className="toast">
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Authenticated Dashboard Interface
  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="bot-avatar-badge">
            {stats?.bot?.avatar ? (
              <img src={stats.bot.avatar} alt="Bot Avatar" />
            ) : (
              <Icons.Shield />
            )}
          </div>
          <div className="bot-brand">
            <h2>Mazoodev Bot</h2>
            <span>
              <span className={`status-dot ${stats?.bot?.ready ? '' : 'offline'}`}></span>
              {stats?.bot?.ready ? "En ligne" : "Démarrage..."}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-link ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => { setActiveTab("overview"); setMobileMenuOpen(false); }}
          >
            <Icons.Overview /> Vue d'ensemble
          </button>
          <button
            className={`nav-link ${activeTab === "servers" ? "active" : ""}`}
            onClick={() => { setActiveTab("servers"); setMobileMenuOpen(false); }}
          >
            <Icons.Server /> Serveurs Discord
          </button>
          <button
            className={`nav-link ${activeTab === "tickets" ? "active" : ""}`}
            onClick={() => { setActiveTab("tickets"); setMobileMenuOpen(false); }}
          >
            <Icons.Ticket /> Gestion des Tickets
          </button>
          <button
            className={`nav-link ${activeTab === "redeem" ? "active" : ""}`}
            onClick={() => { setActiveTab("redeem"); setMobileMenuOpen(false); }}
          >
            <Icons.Gift /> Codes Redeem
          </button>
          <button
            className={`nav-link ${activeTab === "economy" ? "active" : ""}`}
            onClick={() => { setActiveTab("economy"); setMobileMenuOpen(false); }}
          >
            <Icons.Coins /> Économie & Classement
          </button>
          <button
            className={`nav-link ${activeTab === "moderation" ? "active" : ""}`}
            onClick={() => { setActiveTab("moderation"); setMobileMenuOpen(false); }}
          >
            <Icons.Shield /> Modération & Audit
          </button>
          <button
            className={`nav-link ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => { setActiveTab("settings"); setMobileMenuOpen(false); }}
          >
            <Icons.Settings /> Configuration
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-mini">
            <div className="user-avatar">AD</div>
            <div className="user-meta">
              <div className="name">Administrateur</div>
              <div className="role">Staff Général</div>
            </div>
          </div>
          <button className="btn-icon" title="Déconnexion" onClick={handleLogout}>
            <Icons.Logout />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button className="mobile-nav-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Icons.Menu />
            </button>
            <div className="page-title">
              <h1>
                {activeTab === "overview" && "Vue d'ensemble"}
                {activeTab === "servers" && "Serveurs Discord"}
                {activeTab === "tickets" && "Gestion des Tickets"}
                {activeTab === "redeem" && "Codes de Récompense (Redeem)"}
                {activeTab === "economy" && "Système Économie & Classement"}
                {activeTab === "moderation" && "Logs d'Audit & Modération"}
                {activeTab === "settings" && "Configuration du Bot"}
              </h1>
            </div>
          </div>

          <div className="top-actions">
            <button
              className="btn-secondary"
              onClick={loadData}
              disabled={refreshing}
              title="Rafraîchir les données"
            >
              <Icons.Refresh /> {refreshing ? "Actualisation..." : "Actualiser"}
            </button>
            {activeTab === "redeem" && (
              <button className="btn-primary" onClick={() => setShowCreateRedeemModal(true)}>
                <Icons.Plus /> Nouveau Code
              </button>
            )}
          </div>
        </header>

        <main className="content-body">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blurple"><Icons.Server /></div>
                  <div className="stat-info">
                    <div className="stat-value">{stats?.bot?.guildsCount ?? "-"}</div>
                    <div className="stat-label">Serveurs connectés</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon emerald"><Icons.Ticket /></div>
                  <div className="stat-info">
                    <div className="stat-value">{stats?.tickets?.open ?? 0}</div>
                    <div className="stat-label">Tickets ouverts ({stats?.tickets?.total ?? 0} total)</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon amber"><Icons.Coins /></div>
                  <div className="stat-info">
                    <div className="stat-value">{stats?.economy?.totalCoins?.toLocaleString("fr-FR") ?? "0"}</div>
                    <div className="stat-label">Coins en circulation ({stats?.economy?.totalUsers ?? 0} comptes)</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon rose"><Icons.Gift /></div>
                  <div className="stat-info">
                    <div className="stat-value">{stats?.redeem?.unused ?? 0}</div>
                    <div className="stat-label">Codes disponibles ({stats?.redeem?.used ?? 0} utilisés)</div>
                  </div>
                </div>
              </div>

              {/* Bot Status & Hardware Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "30px" }}>
                <div className="glass-card">
                  <h3 style={{ marginBottom: "18px", fontSize: "16px", fontWeight: "700" }}>État de l'instance Discord</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Bot Tag :</span>
                      <strong>{stats?.bot?.tag || "Chargement..."}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Latence WebSocket API :</span>
                      <strong style={{ color: "var(--emerald)" }}>{stats?.bot?.wsPing ?? 0} ms</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Temps d'activité (Uptime) :</span>
                      <strong>{formatUptime(stats?.bot?.uptimeSeconds)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Version Node.js :</span>
                      <span className="mono-tag">{stats?.bot?.nodeVersion || "Node.js v20+"}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card">
                  <h3 style={{ marginBottom: "18px", fontSize: "16px", fontWeight: "700" }}>Ressources & Base de données</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Moteur persistant :</span>
                      <span className="badge info">SQLite WAL Mode</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Mémoire RAM utilisée (RSS) :</span>
                      <strong>{stats?.bot?.memoryRssMb ?? 0} Mo</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Heap JS consommé :</span>
                      <strong>{stats?.bot?.memoryHeapUsedMb ?? 0} Mo</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Transactions enregistrées :</span>
                      <strong>{stats?.economy?.totalTransactions ?? 0} opérations</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="glass-card">
                <h3 style={{ marginBottom: "14px", fontSize: "16px", fontWeight: "700" }}>Raccourcis rapides d'administration</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  <button className="btn-primary" onClick={() => { setActiveTab("redeem"); setShowCreateRedeemModal(true); }}>
                    <Icons.Plus /> Créer un code Redeem
                  </button>
                  <button className="btn-secondary" onClick={() => { setActiveTab("tickets"); setTicketFilter("open"); }}>
                    <Icons.Ticket /> Voir les tickets ouverts
                  </button>
                  <button className="btn-secondary" onClick={() => setActiveTab("economy")}>
                    <Icons.Coins /> Consulter le classement
                  </button>
                  <button className="btn-secondary" onClick={() => setActiveTab("moderation")}>
                    <Icons.Shield /> Vérifier les logs d'audit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERVERS */}
          {activeTab === "servers" && (
            <div className="glass-card">
              <h3 style={{ marginBottom: "20px" }}>Serveurs Discord connectés ({guilds.length})</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                {guilds.map(g => (
                  <div key={g.id} className="stat-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", width: "100%" }}>
                      {g.icon ? (
                        <img src={g.icon} alt={g.name} style={{ width: "48px", height: "48px", borderRadius: "12px" }} />
                      ) : (
                        <div className="stat-icon blurple" style={{ width: "48px", height: "48px" }}><Icons.Server /></div>
                      )}
                      <div>
                        <h4 style={{ fontSize: "16px", fontWeight: "700" }}>{g.name}</h4>
                        <span className="mono-tag" style={{ fontSize: "11px" }}>{g.id}</span>
                      </div>
                    </div>
                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}>
                      <span>Membres : <strong style={{ color: "white" }}>{g.memberCount}</strong></span>
                      <span>Salons : <strong style={{ color: "white" }}>{g.channelsCount}</strong></span>
                      <span>Rôles : <strong style={{ color: "white" }}>{g.rolesCount}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TICKETS */}
          {activeTab === "tickets" && (
            <div className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "24px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className={`btn-secondary ${ticketFilter === "all" ? "active" : ""}`} onClick={() => setTicketFilter("all")}>Tous</button>
                  <button className={`btn-secondary ${ticketFilter === "open" ? "active" : ""}`} onClick={() => setTicketFilter("open")}>Ouverts</button>
                  <button className={`btn-secondary ${ticketFilter === "closed" ? "active" : ""}`} onClick={() => setTicketFilter("closed")}>Fermés</button>
                </div>
                <input
                  type="text"
                  className="form-control"
                  style={{ maxWidth: "300px" }}
                  placeholder="Rechercher par User ID ou Salon..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                />
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Salon ID</th>
                      <th>Créateur</th>
                      <th>Serveur</th>
                      <th>Statut</th>
                      <th>Créé le</th>
                      <th>Fermeture</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets
                      .filter(t => !ticketSearch || t.user_id.includes(ticketSearch) || t.channel_id.includes(ticketSearch))
                      .map(t => (
                        <tr key={t.id}>
                          <td><span className="mono-tag">{t.channel_id}</span></td>
                          <td><span className="mono-tag">{t.user_id}</span></td>
                          <td>{t.guild_name}</td>
                          <td>
                            <span className={`badge ${t.status === "open" ? "open" : "closed"}`}>
                              {t.status === "open" ? "● Ouvert" : "✓ Fermé"}
                            </span>
                          </td>
                          <td>{formatDate(t.created_at)}</td>
                          <td>
                            {t.closed_at ? (
                              <div style={{ fontSize: "12px" }}>
                                <div>{formatDate(t.closed_at)}</div>
                                <span style={{ color: "var(--text-dim)" }}>par {t.closed_by || "Staff"}</span>
                              </div>
                            ) : "-"}
                          </td>
                          <td>
                            {t.status === "open" && (
                              <button
                                className="btn-danger"
                                onClick={() => { setShowCloseTicketModal(t); setCloseTicketReason(""); }}
                              >
                                Fermer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    {tickets.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
                          Aucun ticket trouvé pour ce filtre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: REDEEM CODES */}
          {activeTab === "redeem" && (
            <div className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "24px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className={`btn-secondary ${redeemFilter === "all" ? "active" : ""}`} onClick={() => setRedeemFilter("all")}>Tous les codes</button>
                  <button className={`btn-secondary ${redeemFilter === "unused" ? "active" : ""}`} onClick={() => setRedeemFilter("unused")}>Disponibles</button>
                  <button className={`btn-secondary ${redeemFilter === "used" ? "active" : ""}`} onClick={() => setRedeemFilter("used")}>Déjà utilisés</button>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateRedeemModal(true)}>
                  <Icons.Plus /> Nouveau code
                </button>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code Unique</th>
                      <th>Montant</th>
                      <th>Créateur</th>
                      <th>Date création</th>
                      <th>Statut</th>
                      <th>Utilisé par</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redeemCodes.map(c => (
                      <tr key={c.code}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong className="mono-tag" style={{ color: "var(--amber)", fontSize: "13px" }}>{c.code}</strong>
                            <button className="btn-icon" title="Copier" onClick={() => copyToClipboard(c.code)}>
                              <Icons.Copy />
                            </button>
                          </div>
                        </td>
                        <td><strong style={{ color: "var(--emerald)" }}>+{c.amount.toLocaleString("fr-FR")} coins</strong></td>
                        <td><span className="mono-tag">{c.created_by}</span></td>
                        <td>{formatDate(c.created_at)}</td>
                        <td>
                          <span className={`badge ${c.redeemed_by ? "closed" : "open"}`}>
                            {c.redeemed_by ? "Utilisé" : "Disponible"}
                          </span>
                        </td>
                        <td>
                          {c.redeemed_by ? (
                            <div>
                              <span className="mono-tag">{c.redeemed_by}</span>
                              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{formatDate(c.redeemed_at)}</div>
                            </div>
                          ) : "-"}
                        </td>
                        <td>
                          {!c.redeemed_by && (
                            <button className="btn-danger" onClick={() => handleDeleteRedeem(c.code)}>
                              Supprimer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {redeemCodes.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
                          Aucun code de récompense enregistré.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ECONOMY & LEADERBOARD */}
          {activeTab === "economy" && (
            <div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon amber"><Icons.Coins /></div>
                  <div className="stat-info">
                    <div className="stat-value">{economy?.stats?.totalCoins?.toLocaleString("fr-FR") ?? 0}</div>
                    <div className="stat-label">Coins globaux en circulation</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon emerald"><Icons.Overview /></div>
                  <div className="stat-info">
                    <div className="stat-value">{economy?.stats?.totalUsers ?? 0}</div>
                    <div className="stat-label">Comptes d'utilisateurs actifs</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon blurple"><Icons.Server /></div>
                  <div className="stat-info">
                    <div className="stat-value">{economy?.stats?.totalTransactions ?? 0}</div>
                    <div className="stat-label">Total des transactions</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
                {/* Leaderboard */}
                <div className="glass-card">
                  <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                    🏆 Classement des fortunes
                  </h3>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Rang</th>
                          <th>Membre ID</th>
                          <th>Solde</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(economy?.leaderboard || []).slice(0, 15).map((user, idx) => (
                          <tr key={user.user_id}>
                            <td>
                              {idx === 0 && "🥇 #1"}
                              {idx === 1 && "🥈 #2"}
                              {idx === 2 && "🥉 #3"}
                              {idx > 2 && `#${idx + 1}`}
                            </td>
                            <td><span className="mono-tag">{user.user_id}</span></td>
                            <td><strong style={{ color: "var(--amber)" }}>{user.balance.toLocaleString("fr-FR")} coins</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="glass-card">
                  <h3 style={{ marginBottom: "20px" }}>Flux des transactions récentes</h3>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Montant</th>
                          <th>Détails</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(economy?.stats?.recentTransactions || []).map(tx => (
                          <tr key={tx.id}>
                            <td>
                              <span className={`badge ${tx.type === "pay" ? "info" : tx.type === "daily" ? "warning" : "success"}`}>
                                {tx.type}
                              </span>
                            </td>
                            <td><strong>+{tx.amount}</strong></td>
                            <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{tx.details}</td>
                            <td style={{ fontSize: "12px" }}>{formatDate(tx.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MODERATION & AUDIT LOGS */}
          {activeTab === "moderation" && (
            <div className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "24px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button className={`btn-secondary ${logCategory === "all" ? "active" : ""}`} onClick={() => setLogCategory("all")}>Tous</button>
                  <button className={`btn-secondary ${logCategory === "moderation" ? "active" : ""}`} onClick={() => setLogCategory("moderation")}>Modération</button>
                  <button className={`btn-secondary ${logCategory === "ticket" ? "active" : ""}`} onClick={() => setLogCategory("ticket")}>Tickets</button>
                  <button className={`btn-secondary ${logCategory === "redeem" ? "active" : ""}`} onClick={() => setLogCategory("redeem")}>Redeem</button>
                  <button className={`btn-secondary ${logCategory === "member" ? "active" : ""}`} onClick={() => setLogCategory("member")}>Membres</button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Catégorie</th>
                      <th>Action</th>
                      <th>Détails de l'évènement</th>
                      <th>Auteur ID</th>
                      <th>Horodatage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td>
                          <span className={`badge ${log.category === "moderation" ? "danger" : log.category === "ticket" ? "info" : log.category === "redeem" ? "warning" : "success"}`}>
                            {log.category}
                          </span>
                        </td>
                        <td><strong>{log.action}</strong></td>
                        <td style={{ maxWidth: "400px", wordBreak: "break-word", color: "var(--text-muted)", fontSize: "13px" }}>
                          {log.details}
                        </td>
                        <td><span className="mono-tag">{log.user_id || "Système"}</span></td>
                        <td>{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
                          Aucun journal d'audit enregistré.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: BOT SETTINGS */}
          {activeTab === "settings" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              <div className="glass-card">
                <h3 style={{ marginBottom: "20px" }}>Paramètres actuels du serveur</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px" }}>
                  <div>
                    <label style={{ display: "block", color: "var(--text-muted)", marginBottom: "6px" }}>Serveur Discord Principal (GUILD_ID)</label>
                    <span className="mono-tag">{settings?.configured?.guildId || "Non défini"}</span>
                  </div>
                  <div>
                    <label style={{ display: "block", color: "var(--text-muted)", marginBottom: "6px" }}>Salon des logs d'audit</label>
                    <span className="mono-tag">{settings?.configured?.logChannelId || "Non configuré (utilisez /setup-logs)"}</span>
                  </div>
                  <div>
                    <label style={{ display: "block", color: "var(--text-muted)", marginBottom: "6px" }}>Catégorie des tickets</label>
                    <span className="mono-tag">{settings?.configured?.ticketCategoryId || "Racine du serveur"}</span>
                  </div>
                  <div>
                    <label style={{ display: "block", color: "var(--text-muted)", marginBottom: "6px" }}>Domaine Web Officiel</label>
                    <span className="mono-tag">{settings?.configured?.dashboardPublicUrl || "https://mazoodev.com"}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <h3 style={{ marginBottom: "16px" }}>Architecture de Déploiement</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" }}>
                  Ce dashboard moderne est découplé du processus Discord pour une sécurité maximale :
                </p>
                <ul style={{ paddingLeft: "20px", color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.8" }}>
                  <li><strong>Frontend :</strong> Hébergé sur Netlify avec domaine <code>mazoodev.com</code></li>
                  <li><strong>Bot Persistent :</strong> Exécuté 24/7 sur Node.js persistant (Render / Railway / VPS PM2)</li>
                  <li><strong>Base de données :</strong> SQLite haute performance avec WAL mode et transactions atomiques</li>
                  <li><strong>Sécurité :</strong> Tokens cryptographiques HMAC-SHA256, protection brute force, secrets isolés</li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: CREATE REDEEM CODE */}
      {showCreateRedeemModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Créer un Code Redeem</h3>
              <button className="btn-icon" onClick={() => setShowCreateRedeemModal(false)}><Icons.Close /></button>
            </div>
            <form onSubmit={handleCreateRedeem}>
              <div className="form-group">
                <label>Code (ex: PROMO50, VIP2026)</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Entrez le code"
                    value={newCodeData.code}
                    onChange={(e) => setNewCodeData({ ...newCodeData, code: e.target.value.toUpperCase() })}
                    required
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const rand = "GIFT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                      setNewCodeData({ ...newCodeData, code: rand });
                    }}
                  >
                    Aléatoire
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Montant en coins</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max="1000000"
                  value={newCodeData.amount}
                  onChange={(e) => setNewCodeData({ ...newCodeData, amount: Number(e.target.value) })}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateRedeemModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Créer le code</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLOSE TICKET */}
      {showCloseTicketModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Fermer le ticket #{showCloseTicketModal.channel_id}</h3>
              <button className="btn-icon" onClick={() => setShowCloseTicketModal(null)}><Icons.Close /></button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "16px" }}>
              Cette action marquera le ticket comme fermé dans la base de données et supprimera le salon Discord associé.
            </p>
            <div className="form-group">
              <label>Motif de fermeture</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Demande traitée par le staff"
                value={closeTicketReason}
                onChange={(e) => setCloseTicketReason(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn-secondary" onClick={() => setShowCloseTicketModal(null)}>Annuler</button>
              <button className="btn-danger" onClick={handleCloseTicket}>Confirmer la fermeture</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
