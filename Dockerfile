# Build the Vite/React client.
# Docker Official Images mirrored on Amazon ECR Public. This avoids shared
# Docker Hub anonymous-pull limits in managed builders such as Zeabur.
FROM public.ecr.aws/docker/library/node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# The build needs devDependencies such as TypeScript and Vite even when the
# platform sets NODE_ENV=production for the image build.
RUN npm ci --include=dev

COPY . ./

RUN npm run build

# Run the email-auth API and serve the built client from the same process.
FROM public.ecr.aws/docker/library/node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server

USER node
EXPOSE 8787

# Zeabur sets PORT automatically; the server falls back to 8787 for local Docker runs.
CMD ["npm", "start"]
