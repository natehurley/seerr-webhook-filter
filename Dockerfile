FROM node:18-alpine
LABEL org.opencontainers.image.source https://github.com/natehurley/seerr-webhook-filter
WORKDIR /app
COPY package.json .
RUN npm install --only=production
COPY server.js .
EXPOSE 3456
CMD ["node", "server.js"]
