#!/usr/bin/env bash

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

if [ -d "$BACKUP_DIR" ]; then
    LATEST_BACKUP=$(find "$BACKUP_DIR" -maxdepth 1 -type f \
        -printf '%T@ %p\n' 2>/dev/null \
        | sort -nr \
        | head -1 \
        | cut -d' ' -f2-)

    if [ -n "$LATEST_BACKUP" ]; then
        BACKUP_TIME=$(stat -c %Y "$LATEST_BACKUP")
        CURRENT_TIME=$(date +%s)
        BACKUP_AGE_HOURS=$(( (CURRENT_TIME - BACKUP_TIME) / 3600 ))

        echo "Последний файл: $LATEST_BACKUP"
        echo "Возраст: ${BACKUP_AGE_HOURS} ч."

        if [ "$BACKUP_AGE_HOURS" -le 26 ]; then
            check_ok "Резервная копия актуальна."
        elif [ "$BACKUP_AGE_HOURS" -le 48 ]; then
            check_warning "Резервная копия старше 26 часов."
        else
            check_error "Резервная копия старше 48 часов."
        fi
    else
        check_error "В каталоге резервных копий нет файлов."
    fi
else
    check_error "Каталог резервных копий не найден: $BACKUP_DIR"
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
else
    echo "Общее состояние: FAILED"
fi

echo
echo "Терминал остаётся открытым."
