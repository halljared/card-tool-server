FROM node:lts-alpine
ENV GROUP_ID=1000 \
    USER_ID=1000
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN addgroup -g $GROUP_ID www
RUN adduser -D -u $USER_ID -G www www -s /bin/sh
USER www
EXPOSE 3000
CMD ["npm", "run", "serve"]