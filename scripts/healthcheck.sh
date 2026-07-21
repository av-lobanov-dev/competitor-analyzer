#!/usr/bin/env bash

PROJECT_DIR="/opt/competitor-analyzer"

ERRORS=0
WARNINGS=0
BACKUP_DIR="/opt/competitor-analyzer/postgres/backups"

check_ok() {
    echo "OK: $1"
}

check_error() {
    echo "ERROR: $1"
    ERRORS=$((ERRORS + 1))
}

check_warning() {
    echo "WARNING: $1"
    WARNINGS=$((WARNINGS + 1))
}

echo "======================================"
echo " Competitor Analyzer Health Check"
echo " Date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "======================================"

echo
echo "===== 1. DOCKER CONTAINERS ====="
docker compose ps

for CONTAINER in competitor_postgres competitor_n8n competitor_playwright; do
    STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null)

    if [ "$STATUS" = "running" ]; then
        check_ok "$CONTAINER работает."
    else
        check_error "$CONTAINER не работает. Статус: ${STATUS:-not found}"
    fi
done

echo
echo "===== 2. DISK ====="
df -h /

DISK_USAGE=$(df -P / | awk 'NR==2 {gsub("%","",$5); print $5}')

if [ "$DISK_USAGE" -lt 80 ]; then
    check_ok "Использование диска: ${DISK_USAGE}%."
elif [ "$DISK_USAGE" -lt 90 ]; then
    check_warning "Использование диска: ${DISK_USAGE}%."
else
    check_error "Использование диска критическое: ${DISK_USAGE}%."
fi

echo
echo "===== 3. MEMORY ====="
free -h

MEMORY_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')

if [ "$MEMORY_USAGE" -lt 80 ]; then
    check_ok "Использование памяти: ${MEMORY_USAGE}%."
elif [ "$MEMORY_USAGE" -lt 90 ]; then
    check_warning "Использование памяти: ${MEMORY_USAGE}%."
else
    check_error "Использование памяти критическое: ${MEMORY_USAGE}%."
fi

echo
echo "===== 4. UFW ====="

if ufw status | grep -q "Status: active"; then
    check_ok "UFW активен."
else
    check_error "UFW не активен."
fi

ufw status numbered

echo
echo "===== 5. FAIL2BAN ====="

if systemctl is-active --quiet fail2ban; then
    check_ok "Fail2ban работает."
else
    check_error "Fail2ban не работает."
fi

fail2ban-client status sshd 2>/dev/null || true

echo
echo "===== 6. POSTGRESQL ====="

if docker exec competitor_postgres pg_isready >/dev/null 2>&1; then
    check_ok "PostgreSQL принимает подключения."
else
    check_error "PostgreSQL не принимает подключения."
fi

echo
echo "===== 7. N8N ====="

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' \
    --max-time 10 \
    http://127.0.0.1:5678)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 500 ]; then
    check_ok "n8n отвечает. HTTP-код: $HTTP_CODE."
else
    check_error "n8n не отвечает корректно. HTTP-код: $HTTP_CODE."
fi

echo
echo "===== 8. PLAYWRIGHT ====="

if docker exec competitor_playwright ps -ef >/dev/null 2>&1; then
    check_ok "Playwright-контейнер принимает команды."
    docker exec competitor_playwright ps -ef
else
    check_error "Playwright-контейнер не отвечает."
fi

echo
echo "===== 9. POSTGRESQL BACKUP ====="

BACKUP_ROOT="/opt/competitor-analyzer/postgres/backups"

LATEST_BACKUP="$(
    find "$BACKUP_ROOT" \
        -type f \
        -name 'competitor_analyzer*.dump' \
        -printf '%T@ %p\n' 2>/dev/null \
        | sort -nr \
        | head -1 \
        | cut -d' ' -f2-
)"

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: резервные копии PostgreSQL не найдены."
    ERRORS=$((ERRORS + 1))
else
    BACKUP_TIMESTAMP="$(
        stat -c '%Y' "$LATEST_BACKUP" 2>/dev/null
    )"

    CURRENT_TIMESTAMP="$(
        date +%s
    )"

    if [ -z "$BACKUP_TIMESTAMP" ]; then
        echo "ERROR: не удалось определить время резервной копии."
        ERRORS=$((ERRORS + 1))
    else
        BACKUP_AGE_SECONDS=$((CURRENT_TIMESTAMP - BACKUP_TIMESTAMP))
        BACKUP_AGE_HOURS=$((BACKUP_AGE_SECONDS / 3600))

        echo "Последний файл: $LATEST_BACKUP"
        echo "Возраст: $BACKUP_AGE_HOURS ч."

        if [ ! -s "$LATEST_BACKUP" ]; then
            echo "ERROR: резервная копия пуста."
            ERRORS=$((ERRORS + 1))
        elif [ "$BACKUP_AGE_HOURS" -gt 48 ]; then
            echo "WARNING: резервная копия старше 48 часов."
            WARNINGS=$((WARNINGS + 1))
        else
            if docker exec -i competitor_postgres \
                pg_restore --list \
                < "$LATEST_BACKUP" \
                > /dev/null 2>&1; then

                echo "OK: резервная копия актуальна и читается."
            else
                echo "ERROR: резервная копия не прошла pg_restore --list."
                ERRORS=$((ERRORS + 1))
            fi
        fi
    fi
fi

echo

echo "===== 10. GIT STATUS ====="
git status --short

echo
echo "======================================"
echo " RESULT"
echo "======================================"
echo "Ошибок: $ERRORS"
echo "Предупреждений: $WARNINGS"

if [ "$ERRORS" -eq 0 ]; then
    echo "Общее состояние: OK"
    HEALTHCHECK_EXIT_CODE=0
else
    echo "Общее состояние: FAILED"
    HEALTHCHECK_EXIT_CODE=1
fi

echo
echo "Терминал остаётся открытым."

exit "$HEALTHCHECK_EXIT_CODE"
