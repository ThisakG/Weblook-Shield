# ------------------------------------------------------------------------
# Frontend Dockerfile — multi-stage build.
# Stage 1 builds the static React bundle with Vite; Stage 2 serves it with
# a minimal Nginx image. This keeps the final production image small (no
# Node.js runtime needed to just serve static files) and matches the
# "Containerized deployment (Docker)" hosting approach from Proposal
# Section 12.
# ------------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# VITE_API_BASE_URL is baked into the static build at build time — see the
# hosting guide for how to set this correctly for your deployment target.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
