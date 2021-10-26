FROM php:8.1.0RC4-fpm-buster

ARG UNAME=webgpuuser
ARG UID=1000
ARG GID=1000

RUN apt update
RUN apt install -y zlib1g-dev g++ git libicu-dev zip libzip-dev bash zip
RUN docker-php-ext-install intl opcache pdo pdo_mysql
RUN docker-php-ext-configure zip
RUN docker-php-ext-install zip

WORKDIR /var/www/html/webgpu

COPY --from=composer /usr/bin/composer /usr/bin/composer

ENV COMPOSER_MEMORY_LIMIT=-1

RUN groupadd -g $GID -o $UNAME
RUN useradd -m -u $UID -g $GID -o -s /bin/bash $UNAME

USER $UNAME

CMD composer install ; php-fpm

EXPOSE 9000
