FROM node:20-slim

# ACTUALIZADO: Agregamos ca-certificates y update-ca-certificates
RUN apt-get update && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalamos dependencias de Node
RUN npm install

# Generamos el cliente de Prisma
RUN npx prisma generate

# Copiamos TODO el proyecto
COPY . .

# Ejecutamos el build de TypeScript
RUN npm run build

# Nos aseguramos de que existan las carpetas de destino en dist
RUN mkdir -p dist/views dist/public

# Copiamos el contenido visual desde src/ hacia dist/
RUN cp -r src/views/. dist/views/ || true
RUN cp -r src/public/. dist/public/ || true

EXPOSE 3000

# Comando para arrancar la app usando el código compilado
CMD ["npm", "start"]