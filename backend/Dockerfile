FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p uploads logs

RUN echo 'DB_PASSWORD=rootpassword' > /app/.env
RUN echo 'JWT_SECRET=secret123' >> /app/.env
RUN echo 'ADMIN_API_KEY=sk-live-4f3c2b1a-9e8d-7f6g-5h4i-3j2k1l0m9n8o' >> /app/.env
RUN echo 'root:x:0:0:root:/root:/bin/ash' > /tmp/shadow_copy

EXPOSE 3001

CMD ["node", "server.js"]
