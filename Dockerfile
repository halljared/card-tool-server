FROM node:lts-alpine
ENV GROUP_ID=1000 \
    USER_ID=1000
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
USER node
EXPOSE 3000
CMD ["npm", "run", "serve"]