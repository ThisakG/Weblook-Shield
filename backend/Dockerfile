# ------------------------------------------------------------------------
# Backend Dockerfile
# WHY: Proposal Section 12 specifies "Containerized deployment (Docker)"
# for hosting. A slim Node image keeps the image small and reduces the
# attack surface (fewer preinstalled packages = fewer potential CVEs).
# ------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies first (separate layer) so `docker build` can reuse
# the cached node_modules layer when only source code changes, not deps.
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Run as a non-root user — a basic container-hardening practice: if the
# Node process is ever compromised, it does not run as root inside the
# container.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4000
CMD ["node", "src/server.js"]
