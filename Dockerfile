FROM node:20-alpine

WORKDIR /usr/src/

COPY package*.json ./
RUN npm install --production

COPY . .

CMD ["node", "src/server.js"]
