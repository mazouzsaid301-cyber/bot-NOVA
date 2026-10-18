# 🤖 Discord All-in-One Bot & Administration Dashboard

Plateforme complète d'administration Discord en français comprenant un **bot persistant discord.js v14** et un **tableau de bord web moderne hébergé sur Netlify** pour le domaine **`mazoodev.com`**.

---

## 🏗️ 1. Architecture Globale

```
+-------------------------------------------------------+
|  Frontend Netlify (mazoodev.com)                      |
|  - SPA React + Vite                                   |
|  - Design moderne sombre & responsive (Glassmorphism) |
|  - Authentification sécurisée par token HMAC-SHA256   |
+---------------------------+---------------------------+
                            |
           Requêtes HTTPS   |  /api/* (CORS sécurisé)
                            v
+-------------------------------------------------------+
|  Hébergement Persistant du Bot (Render/Railway/VPS)   |
|  - Processus Node.js 20+ persistant 24h/24 7j/7       |
|  - Discord Gateway (discord.js v14)                   |
|  - API REST Express sécurisée (/api/* & /health)      |
|  - Base de données SQLite persistante (WAL mode)      |
+-------------------------------------------------------+
```

> [!IMPORTANT]
> Le bot Discord maintient une connexion WebSocket persistante (Gateway) avec Discord. Il **ne doit jamais** être déployé sur des plateformes éphémères (ex: Netlify Functions, Vercel Serverless). Le bot tourne sur un hébergeur persistant (VPS, Render, Railway), tandis que le frontend tourne sur Netlify.

---

## ⚡ 2. Fonctionnalités du Bot

### Commandes Slash (en Français)
| Commande | Permissions requises | Description |
| :--- | :--- | :--- |
| `/help` | Tout le monde | Affiche le centre d'aide complet avec la liste des commandes |
| `/ping` | Tout le monde | Affiche la latence WebSocket et de l'API Discord |
| `/dashboard` | Tout le monde | Affiche l'adresse web officielle du tableau de bord (`mazoodev.com`) |
| `/ticket` | Tout le monde | Ouvre un salon de support textuel privé avec le staff |
| `/ticket-close` | Créateur ou Staff | Ferme et archive le ticket en base, puis supprime le salon Discord |
| `/redeem-create` | Administrateur | Génère un code de récompense unique à usage unique |
| `/redeem` | Tout le monde | Réclame un code pour créditer son solde de coins |
| `/balance` | Tout le monde | Affiche le solde de coins d'un membre ou de soi-même |
| `/daily` | Tout le monde | Récupère la récompense quotidienne de 100 coins (cooldown 24h) |
| `/pay` | Tout le monde | Transfère des coins à un autre membre (vérification de solde atomique) |
| `/leaderboard` | Tout le monde | Affiche le top 10 des fortunes du serveur |
| `/mod-ban` | Bannir des membres | Bannit un membre après vérification de la hiérarchie des rôles |
| `/mod-kick` | Expulser des membres | Expulse un membre après vérification de la hiérarchie des rôles |
| `/mod-timeout` | Exclure des membres | Exclut temporairement un membre (1 à 40320 minutes) |
| `/purge` | Gérer les messages | Supprime jusqu'à 100 messages récents dans le salon |
| `/clean` | Gérer les salons | Vide entièrement un salon textuel de tous ses messages (recréation propre) |
| `/setup-logs` | Administrateur | Configure le salon textuel de destination des logs d'audit |

---

## 💻 3. Développement et Tests Locaux

### Prérequis
- Node.js `>= 20.11.0` (Recommandé : Node.js 20 ou 22 LTS)
- npm `>= 10`

### Installation
```bash
# 1. Cloner ou ouvrir le dossier du projet
cd discord-all-in-one-bot

# 2. Installer les dépendances du bot et du dashboard
npm install
npm install --prefix dashboard

# 3. Configurer l'environnement
cp .env.example .env
# Remplissez votre DISCORD_TOKEN, CLIENT_ID, GUILD_ID, DASHBOARD_PASSWORD et SESSION_SECRET
```

### Exécution des Tests
Le projet dispose d'une suite de tests complète validant le moteur SQLite, les transactions, la modération, la hiérarchie des rôles et l'API :
```bash
npm test
```

### Lancement en Développement
```bash
# Terminal 1 : Lancement du Bot Discord & de son API REST (port 3000)
npm run dev

# Terminal 2 : Lancement du Dashboard React Vite (port 5173 avec proxy automatique vers le port 3000)
npm run dev:dashboard
```

---

## 🌐 4. Déploiement du Dashboard sur Netlify (`mazoodev.com`)

### Étape 1 : Connexion à Netlify
1. Poussez votre code sur votre dépôt GitHub (privé).
2. Rendez-vous sur [app.netlify.com](https://app.netlify.com) et cliquez sur **Add new site > Import an existing project**.
3. Sélectionnez votre dépôt GitHub.
4. Netlify détecte automatiquement le fichier [`netlify.toml`](file:///c:/Users/ST/Downloads/discord-all-in-one-bot/discord-all-in-one-bot/netlify.toml) :
   - **Base directory :** `dashboard`
   - **Build command :** `npm run build`
   - **Publish directory :** `dashboard/dist`
5. Cliquez sur **Deploy site**.

### Étape 2 : Configuration du Domaine `mazoodev.com`
Dans le tableau de bord Netlify de votre site :
1. Allez dans **Site configuration > Domain management > Custom domains**.
2. Cliquez sur **Add a domain** et entrez : `mazoodev.com`.
3. Netlify vous indiquera d'ajouter `www.mazoodev.com` comme alias.
4. Rendez-vous chez votre registrar DNS (OVH, Cloudflare, Namecheap, etc.) et configurez les enregistrements DNS officiels de Netlify :
   - **Enregistrement Apex (A) :**
     - Type : `A`
     - Nom / Hôte : `@` (ou `mazoodev.com`)
     - Valeur : `75.2.60.5` (IP load balancer officielle Netlify)
   - **Enregistrement Sous-domaine (CNAME) :**
     - Type : `CNAME`
     - Nom / Hôte : `www`
     - Valeur : `<nom-de-votre-site>.netlify.app`
5. Netlify générera automatiquement le certificat SSL/TLS gratuit Let's Encrypt une fois les DNS propagés.

---

## 🚀 5. Hébergement Persistant du Bot Discord

Le bot Discord requiert un processus persistant et un stockage persistant pour sa base de données SQLite (`data/bot.sqlite`). Voici les 3 options recommandées :

### Option A : Render (Web Service ou Background Worker avec Disque Persistant)
1. Créez un nouveau **Web Service** sur [render.com](https://render.com).
2. Connectez votre dépôt GitHub.
3. Configurez :
   - **Environment :** `Node`
   - **Build Command :** `npm install`
   - **Start Command :** `npm start`
   - **Health Check Path :** `/health`
4. Dans **Disks**, ajoutez un disque persistant :
   - **Mount Path :** `/app/data`
   - **Size :** 1 Go
5. Dans **Environment Variables**, ajoutez les clés de votre fichier `.env` (notamment `DATABASE_PATH=/app/data/bot.sqlite` et `DASHBOARD_URL=https://mazoodev.com`).

### Option B : Railway
1. Créez un nouveau projet sur [railway.app](https://railway.app).
2. Déployez depuis votre dépôt GitHub.
3. Ajoutez un **Volume persistant** monté sur `/app/data`.
4. Renseignez les variables d'environnement dans l'onglet **Variables**.

### Option C : VPS Ubuntu (avec Docker ou PM2)
#### Avec Docker Compose (Recommandé) :
```bash
docker compose up -d --build
```
Le volume Docker `mazoodev_bot_sqlite_data` garantit la persistance des données lors des redémarrages.

#### Avec PM2 :
```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 🔐 6. Sécurité & Bonnes Pratiques

- **Zéro fuite de secrets :** Le token Discord et les mots de passe ne sont jamais exposés dans le bundle frontend.
- **Transactions ACID :** Les transferts de coins et les utilisations de codes redeem sont atomiques, empêchant les doublons et soldes négatifs.
- **Protection Brute Force :** Le système de connexion bloque les IP après 5 tentatives infructueuses pendant 15 minutes.
- **Contrôle de hiérarchie :** Aucune action de modération ne peut outrepasser la hiérarchie des rôles Discord.
- **Sauvegarde de la base :** Sauvegardez régulièrement le fichier `data/bot.sqlite`.
