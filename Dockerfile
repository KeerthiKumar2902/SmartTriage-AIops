FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Build the Prisma client inside the container
RUN npx prisma generate

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
