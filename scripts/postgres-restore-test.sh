#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/opt/competitor-analyzer"
BACKUP_DIR="${PROJECT_ROOT}/postgres/backups"
POSTGRES_CONTAINER="competitor_postgres"
POSTGRES_USER="competitor_user"
SOURCE_DATABASE="competitor_analyzer"
RESTORE_DATABASE="competitor_analyzer_restore_test"

BACKUP_FILE="${1:-}"

if [[ -z "${BACKUP_FILE}" ]]; then
  BACKUP_FILE="$(
    find "${BACKUP_DIR}" \
      -maxdepth 1 \
      -type f \
      -name 'competitor_analyzer_*.dump' \
      -printf '%T@ %p\n' \
      | sort -nr \
      | head -n 1 \
      | cut -d' ' -f2-
  )"
fi

if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
  echo "ОШИБКА: backup-файл не найден." >&2
  exit 1
fi

cleanup() {
  echo "Удаление тестовой базы..."

  docker exec "${POSTGRES_CONTAINER}" \
    psql \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${RESTORE_DATABASE}'
        AND pid <> pg_backend_pid();
    " \
    > /dev/null || true

  docker exec "${POSTGRES_CONTAINER}" \
    dropdb \
    -U "${POSTGRES_USER}" \
    --if-exists \
    "${RESTORE_DATABASE}" \
    > /dev/null || true
}

trap cleanup EXIT

echo "Проверка восстановления backup:"
echo "${BACKUP_FILE}"

cleanup

docker exec "${POSTGRES_CONTAINER}" \
  createdb \
  -U "${POSTGRES_USER}" \
  "${RESTORE_DATABASE}"

docker exec -i "${POSTGRES_CONTAINER}" \
  pg_restore \
  -U "${POSTGRES_USER}" \
  -d "${RESTORE_DATABASE}" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  < "${BACKUP_FILE}"

echo "Сравнение количества записей..."

SOURCE_COUNTS="$(
  docker exec "${POSTGRES_CONTAINER}" \
    psql \
    -U "${POSTGRES_USER}" \
    -d "${SOURCE_DATABASE}" \
    -tA \
    -F '|' \
    -v ON_ERROR_STOP=1 \
    -c "
      SELECT 'analysis_jobs', COUNT(*) FROM analysis_jobs
      UNION ALL SELECT 'clients', COUNT(*) FROM clients
      UNION ALL SELECT 'competitor_sites', COUNT(*) FROM competitor_sites
      UNION ALL SELECT 'page_snapshots', COUNT(*) FROM page_snapshots
      UNION ALL SELECT 'price_history', COUNT(*) FROM price_history
      UNION ALL SELECT 'product_scan_jobs', COUNT(*) FROM product_scan_jobs
      UNION ALL SELECT 'products', COUNT(*) FROM products
      UNION ALL SELECT 'scan_jobs', COUNT(*) FROM scan_jobs
      UNION ALL SELECT 'scraping_rules', COUNT(*) FROM scraping_rules
      UNION ALL SELECT 'site_maps', COUNT(*) FROM site_maps
      ORDER BY 1;
    "
)"

RESTORE_COUNTS="$(
  docker exec "${POSTGRES_CONTAINER}" \
    psql \
    -U "${POSTGRES_USER}" \
    -d "${RESTORE_DATABASE}" \
    -tA \
    -F '|' \
    -v ON_ERROR_STOP=1 \
    -c "
      SELECT 'analysis_jobs', COUNT(*) FROM analysis_jobs
      UNION ALL SELECT 'clients', COUNT(*) FROM clients
      UNION ALL SELECT 'competitor_sites', COUNT(*) FROM competitor_sites
      UNION ALL SELECT 'page_snapshots', COUNT(*) FROM page_snapshots
      UNION ALL SELECT 'price_history', COUNT(*) FROM price_history
      UNION ALL SELECT 'product_scan_jobs', COUNT(*) FROM product_scan_jobs
      UNION ALL SELECT 'products', COUNT(*) FROM products
      UNION ALL SELECT 'scan_jobs', COUNT(*) FROM scan_jobs
      UNION ALL SELECT 'scraping_rules', COUNT(*) FROM scraping_rules
      UNION ALL SELECT 'site_maps', COUNT(*) FROM site_maps
      ORDER BY 1;
    "
)"

echo "Рабочая база:"
echo "${SOURCE_COUNTS}"

echo
echo "Восстановленная база:"
echo "${RESTORE_COUNTS}"

if [[ "${SOURCE_COUNTS}" != "${RESTORE_COUNTS}" ]]; then
  echo "ОШИБКА: количество записей не совпадает." >&2
  echo "Возможно, рабочая база изменилась после создания backup." >&2
  exit 1
fi

FUNCTION_COUNT="$(
  docker exec "${POSTGRES_CONTAINER}" \
    psql \
    -U "${POSTGRES_USER}" \
    -d "${RESTORE_DATABASE}" \
    -tAc "
      SELECT COUNT(*)
      FROM pg_proc p
      JOIN pg_namespace n
        ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'take_next_analysis_job',
          'take_next_scraping_rule_job',
          'complete_analysis_job',
          'fail_analysis_job'
        );
    "
)"

if [[ "${FUNCTION_COUNT}" != "4" ]]; then
  echo "ОШИБКА: восстановлены не все функции приложения." >&2
  exit 1
fi

echo
echo "Backup успешно восстановлен и проверен."
