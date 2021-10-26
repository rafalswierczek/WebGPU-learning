FROM node:14

ARG UNAME=gpuuser
ARG UID=1000
ARG GID=1000

WORKDIR /var/www/html/webgpu

RUN groupadd -g $GID -o $UNAME
RUN useradd -m -u $UID -g $GID -o -s /bin/bash $UNAME

WORKDIR /var/www/html/webgpu/assets/

USER $UNAME

CMD npm i ; yarn dev ; node
