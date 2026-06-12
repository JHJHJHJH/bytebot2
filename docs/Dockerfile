# Base image
FROM node:22-alpine

# Create app directory
WORKDIR /app

# Install dependencies (skip postinstall — fumadocs-mdx needs the source files,
# which are copied in the next layer; `next build` regenerates its output anyway)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy app source and build
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=9993
EXPOSE 9993

# Run the application
CMD ["npm", "run", "start"]
