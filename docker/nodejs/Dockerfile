FROM node:26.8.1-alpine

ARG UNAME=gpuuser
ARG UID=1000
ARG GID=1000

RUN npm install -g yarn

WORKDIR /var/www/html/webgpu

RUN deluser --remove-home node 2>/dev/null; delgroup node 2>/dev/null; addgroup -g $GID $UNAME && adduser -D -u $UID -G $UNAME -s /bin/sh $UNAME

COPY --chown=$UNAME:$UNAME ./ ./

USER $UNAME

CMD yarn install ; yarn watch ; node
