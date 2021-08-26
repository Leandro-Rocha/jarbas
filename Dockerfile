FROM node:14.17.5-alpine3.12
RUN apk add --update git

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci 

COPY src/ src/
COPY tsconfig.json .

RUN npm run build

CMD [ "node", "dist/tsc/cli.js" ]
