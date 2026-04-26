FROM node:20-alpine
WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the app source.
COPY . .

EXPOSE 3000

# POC dev mode — hot reload, no production build required.
CMD ["npm", "run", "dev"]
