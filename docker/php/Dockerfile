FROM php:8.4-fpm

ARG UNAME=webgpuuser
ARG UID=1000
ARG GID=1000

ENV COMPOSER_MEMORY_LIMIT=-1

RUN apt update
RUN apt install -y zlib1g-dev g++ git libicu-dev libzip-dev bash zip libpq-dev
RUN docker-php-ext-install intl opcache pdo pdo_pgsql zip

RUN groupadd -g $GID -o $UNAME
RUN useradd -m -u $UID -g $GID -o -s /bin/bash $UNAME

WORKDIR /var/www/html/webgpu

RUN git config --global --add safe.directory /var/www/html/webgpu

COPY --chown=$UNAME:$UNAME ./ ./
COPY --from=composer /usr/bin/composer /usr/bin/composer

RUN composer install --no-interaction

USER $UNAME

CMD ["php-fpm"]

EXPOSE 9000
