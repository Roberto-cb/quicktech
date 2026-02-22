FROM node:20-slim

RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY . .

RUN npm run build


RUN mkdir -p dist/views dist/public
RUN cp -r src/views/* dist/views/
RUN cp -r public/* dist/public/

EXPOSE 3000

CMD ["npm", "start"]