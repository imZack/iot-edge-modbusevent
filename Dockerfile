FROM arm32v7/node:8-slim

COPY package.json package-lock.json /app/

WORKDIR /app

RUN npm install --production

COPY . /app

CMD ["node", "app.js"]
