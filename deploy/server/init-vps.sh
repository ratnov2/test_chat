#!/usr/bin/env bash
# Первичная настройка VPS (Ubuntu/Debian) под preview-окружения. Запускать от root, можно повторно.
#
#   scp -r deploy root@<ip>:~/ && ssh root@<ip>
#   DEPLOY_PUBKEY="$(cat deploy_key.pub)" bash deploy/server/init-vps.sh
#
# Переменные: DOMAIN, DEPLOY_USER, DEPLOY_PUBKEY, HTPASSWD_USER (логин для basic auth).
set -euo pipefail

DOMAIN="${DOMAIN:-preview.margaretti.space}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
HTPASSWD_USER="${HTPASSWD_USER:-admin}"
DEPLOY_PUBKEY="${DEPLOY_PUBKEY:-}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
HTPASSWD_FILE="/etc/nginx/previews.htpasswd"

[[ $EUID -eq 0 ]] || { echo "Запустите от root" >&2; exit 1; }
for f in server/previews-register.sh ui/index.html nginx/previews.conf; do
  [[ -f "$HERE/$f" ]] || { echo "Не найден $HERE/$f" >&2; exit 1; }
done

echo "==> Пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx jq rsync apache2-utils certbot

echo "==> Пользователь $DEPLOY_USER и каталоги"
id "$DEPLOY_USER" &>/dev/null || adduser --disabled-password --gecos "" "$DEPLOY_USER"
mkdir -p /srv/previews /srv/previews-ui
chown "$DEPLOY_USER:$DEPLOY_USER" /srv/previews
chmod 755 /srv/previews

if [[ -n "$DEPLOY_PUBKEY" ]]; then
  echo "==> SSH-ключ для CI"
  home="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$home/.ssh"
  touch "$home/.ssh/authorized_keys"
  grep -qxF "$DEPLOY_PUBKEY" "$home/.ssh/authorized_keys" || echo "$DEPLOY_PUBKEY" >>"$home/.ssh/authorized_keys"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$home/.ssh/authorized_keys"
  chmod 600 "$home/.ssh/authorized_keys"
else
  echo "!! DEPLOY_PUBKEY не задан: добавьте публичный ключ CI в ~$DEPLOY_USER/.ssh/authorized_keys вручную"
fi

echo "==> Скрипты и UI"
install -m 755 "$HERE/server/previews-register.sh" /usr/local/bin/previews-register
install -m 644 "$HERE/ui/index.html" /srv/previews-ui/index.html

if [[ ! -f "$HTPASSWD_FILE" ]]; then
  echo "==> Пароль для basic auth (логин: $HTPASSWD_USER)"
  htpasswd -c "$HTPASSWD_FILE" "$HTPASSWD_USER"
  chmod 640 "$HTPASSWD_FILE"
  chgrp www-data "$HTPASSWD_FILE"
fi

if [[ ! -f "$CERT_DIR/fullchain.pem" ]]; then
  echo "==> Wildcard-сертификат (DNS-challenge)"
  echo "certbot попросит добавить TXT-запись _acme-challenge.$DOMAIN на reg.ru."
  echo "Перед Enter проверьте, что она видна: dig +short TXT _acme-challenge.$DOMAIN"
  certbot certonly --manual --preferred-challenges dns \
    -d "$DOMAIN" -d "*.$DOMAIN"
fi

echo "==> nginx"
rm -f /etc/nginx/sites-enabled/default
sed "s/preview\.margaretti\.space/$DOMAIN/g; s/preview\\\\\.margaretti\\\\\.space/${DOMAIN//./\\\\.}/g" \
  "$HERE/nginx/previews.conf" >/etc/nginx/conf.d/previews.conf
nginx -t
systemctl enable --now nginx
systemctl reload nginx

if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
  echo "==> ufw: открываю 80 и 443"
  ufw allow 80/tcp
  ufw allow 443/tcp
fi

echo "Готово: https://$DOMAIN"
