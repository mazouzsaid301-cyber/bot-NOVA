# Image Node.js LTS légère et sécurisée
FROM node:20-alpine

# Métadonnées
LABEL maintainer="mazoodev.com"
LABEL description="Discord All-in-One Bot persistent container"

# Définition du répertoire de travail
WORKDIR /app

# Installation des dépendances système requises
RUN apk add --no-cache python3 make g++

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation propre des dépendances de production
RUN npm ci --omit=dev

# Copie du code source
COPY src/ ./src/

# Création du dossier persistant pour la base de données SQLite
RUN mkdir -p /app/data && chown -R node:node /app

# Exécution sous un utilisateur non-root pour une sécurité maximale
USER node

# Exposition du port HTTP pour l'API du dashboard et le health-check
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/bot.sqlite

# Commande de démarrage
CMD ["npm", "start"]
