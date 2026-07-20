# Проверка состояния сервера

## Назначение

Скрипт `scripts/healthcheck.sh` выполняет ручную комплексную проверку основных компонентов Competitor Analyzer.

Он предназначен для быстрой диагностики сервера после:

- изменения Docker-конфигурации;
- обновления приложения;
- перезагрузки сервера;
- изменения настроек безопасности;
- возникновения ошибок в n8n, PostgreSQL или Playwright.

## Запуск

Перейти в каталог проекта и запустить скрипт:

```bash
cd /opt/competitor-analyzer
./scripts/healthcheck.sh
cd /opt/competitor-analyzer

echo "===== 1. CREATE HEALTHCHECK DOCUMENTATION ====="

cat > docs/09-operations/healthcheck.md <<'EOF'
# Проверка состояния сервера

## Назначение

Скрипт `scripts/healthcheck.sh` предназначен для быстрой проверки состояния инфраструктуры проекта Competitor Analyzer.

## Запуск

```bash
cd /opt/competitor-analyzer
./scripts/healthcheck.sh
```

Скрипт проверяет:

- Docker-контейнеры;
- использование диска;
- использование памяти;
- UFW;
- Fail2ban;
- PostgreSQL (`pg_isready`);
- доступность n8n;
- Playwright-контейнер;
- наличие актуального PostgreSQL backup;
- состояние Git.

Каталог резервных копий:

```text
/opt/competitor-analyzer/postgres/backups
```

Результат успешной проверки:

```text
Ошибок: 0
Предупреждений: 0
Общее состояние: OK
```
