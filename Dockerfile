# Build the Vite/React static bundle.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Vite reads VITE_* variables at build time. Configure these as Zeabur build
# arguments (or let Zeabur expose the matching variables during image build).
ARG VITE_OPENAI_BASE_URL
ARG VITE_OPENAI_API_KEY
ARG VITE_OPENAI_MODEL
ENV VITE_OPENAI_BASE_URL=$VITE_OPENAI_BASE_URL \
    VITE_OPENAI_API_KEY=$VITE_OPENAI_API_KEY \
    VITE_OPENAI_MODEL=$VITE_OPENAI_MODEL
RUN npm run build

# Serve the bundle with SPA fallback for client-side navigation.
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/conf.d/default.conf.template

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "envsubst '\\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
