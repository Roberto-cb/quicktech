FROM node:20-slim

# Instalamos dependencias del sistema necesarias para Prisma
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

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

# --- AJUSTE DEFINITIVO PARA TU ESTRUCTURA ---
# Nos aseguramos de que existan las carpetas de destino en dist
RUN mkdir -p dist/views dist/public

# Copiamos el contenido visual desde src/ hacia dist/
# Usamos el punto "." para copiar el contenido de las carpetas correctamente
RUN cp -r src/views/. dist/views/ || true
RUN cp -r src/public/. dist/public/ || true

EXPOSE 3000

# Comando para arrancar la app usando el código compilado
CMD ["npm", "start"]