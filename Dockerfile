FROM node:18-slim

# Install OpenSSL and other necessary dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /usr/src/app

# Copy dependency files first for better caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Build the Prisma client inside the container
RUN npx prisma generate

# Copy the rest of the application
COPY . .

EXPOSE 8080

# Use the production start command
CMD ["node", "server.js"]