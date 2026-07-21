#!/usr/bin/env bash

PROJECT_DIR="/opt/competitor-analyzer"
BACKUP_ROOT="$PROJECT_DIR/postgres/backups"
DAILY_DIR="$BACKUP_ROOT/daily"
WEEKLY_DIR="$BACKUP_ROOT/weekly"
LOG_FILE="$BACKUP_ROOT/backup.log"
LOCK_FILE="/var/lock/competitor-analyzer-postgres-backup.lock"

mkdir -p "$DAILY_DIR"
mkdir -p "$WEEKLY_DIR"

exec 9>"$LOCK_FILE"

if ! flock -n 9; then
    printf '%s %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" \
        "SKIP: другой процесс резервного копирования уже выполняется." \
        >> "$LOG_FILE"
    exit 0
fi

cd "$PROJECT_DIR" || {
    printf '%s %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" \
        "ERROR: каталог проекта не найден." \
        >> "$LOG_FILE"
    exit 1
}

if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    . "$PROJECT_DIR/.env"
    set +a
fi

TIMESTAMP="$(date -u '+%Y%m%d_%H%M%S')"
DATE_ONLY="$(date -u '+%Y%m%d')"
DAY_OF_WEEK="$(date -u '+%u')"

TEMP_FILE="$DAILY_DIR/.competitor_analyzer_${TIMESTAMP}.dump.tmp"
DAILY_FILE="$DAILY_DIR/competitor_analyzer_${TIMESTAMP}.dump"
WEEKLY_FILE="$WEEKLY_DIR/competitor_analyzer_weekly_${DATE_ONLY}.dump"

printf '%s %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" \
    "START: создание резервной копии." \
    >> "$LOG_FILE"

if ! docker inspect competitor_postgres \
    --format '{{.State.Running}}' 2>/dev/null \
    | grep -qx true; then

    printf '%s %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" \
        "ERROR: контейнер PostgreSQL не работает." \
        >> "$LOG_FILE"
    rm -f "$TEMP_FILE"
    exit 1
fi

if docker exec competitor_postgres \
    pg_dump \
    --username=competitor_user \
    --dbname=competitor_analyzer \
    --format=custom \
    --compress=6 \
    --no-owner \
    --no-privileges \
    > "$TEMP_FILE"; then

    chmod 600 "$TEMP_FILE"
else
    printf '%s %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" \
        "ERROR: pg_dump завершился с ошибкой." \
        >> "$LOG_FILE"
    rm -f "$TEMP_FILE"
    exit 1
fi

if [ ! -s "$TEMP_FILE" ]; then
    printf '%s %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" \
        "ERROR: создан пустой файл резервной копии." \
        >> "$LOG_FILE"
    rm -f "$TEMP_FILE"
    exit 1
fi

if ! docker exec -i competitor_postgres \
    pg_restore --list \
    < "$TEMP_FILE" \
    > /dev/null; then

    printf '%s %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" \
        "ERROR: проверка резервной копии через pg_restore завершилась ошибкой." \
        >> "$LOG_FILE"
    rm -f "$TEMP_FILE"
    exit 1
fi

mv "$TEMP_FILE" "$DAILY_FILE"
chmod 600 "$DAILY_FILE"

if [ "$DAY_OF_WEEK" = "7" ]; then
    cp --preserve=mode,timestamps "$DAILY_FILE" "$WEEKLY_FILE"
    chmod 600 "$WEEKLY_FILE"

    printf '%s %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" \
        "OK: создана еженедельная копия $WEEKLY_FILE." \
        >> "$LOG_FILE"
fi

find "$DAILY_DIR" \
    -maxdepth 1 \
    -type f \
    -name 'competitor_analyzer_*.dump' \
    -mtime +6 \
    -delete

find "$WEEKLY_DIR" \
    -maxdepth 1 \
    -type f \
    -name 'competitor_analyzer_weekly_*.dump' \
    -mtime +27 \
    -delete

printf '%s %s\n' "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" \
    "OK: резервная копия создана и проверена: $DAILY_FILE." \
    >> "$LOG_FILE"

printf '%s\n' "$DAILY_FILE"
