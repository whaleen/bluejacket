# Use Playwright's official image which includes browsers
FROM mcr.microsoft.com/playwright:v1.58.0-jammy

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files and pnpm lockfile
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev for build)
RUN pnpm install --frozen-lockfile

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN pnpm run build

# Remove dev dependencies after build
RUN pnpm prune --production

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Run the service
CMD ["pnpm", "start"]
