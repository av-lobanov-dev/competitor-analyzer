#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/opt/competitor-analyzer"
BACKUP_DIR="${PROJECT_ROOT}/postgres/backups"
POSTGRES_CONTAINER="competitor_postgres"
POSTGRES_USER="competitor_user"
POSTGRES_DATABASE="competitor_analyzer"
RETENTION_DAYS=14

TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/competitor_analyzer_${TIMESTAMP}.dump"
TEMP_FILE="${BACKUP_FILE}.tmp"

mkdir -p "${BACKUP_DIR}"

cleanup() {
  rm -f "${TEMP_FILE}"
}

trap cleanup EXIT

echo "Создание backup PostgreSQL..."
echo "База: ${POSTGRES_DATABASE}"
echo "Файл: ${BACKUP_FILE}"

docker exec "${POSTGRES_CONTAINER}" \
  pg_dump \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DATABASE}" \
  -Fc \
  > "${TEMP_FILE}"

if [[ ! -s "${TEMP_FILE}" ]]; then
  echo "ОШИБКА: создан пустой backup-файл." >&2
  exit 1
fi

docker exec -i "${POSTGRES_CONTAINER}" \
  pg_restore \
  -l \
  < "${TEMP_FILE}" \
  > /dev/null

mv "${TEMP_FILE}" "${BACKUP_FILE}"

echo "Backup успешно создан:"
ls -lh "${BACKUP_FILE}"

echo "Удаление backup старше ${RETENTION_DAYS} дней..."

find "${BACKUP_DIR}" \
  -maxdepth 1 \
  -type f \
  -name 'competitor_analyzer_*.dump' \
  -mtime "+${RETENTION_DAYS}" \
  -print \
  -delete

echo "Готово."
