# Сетевой доступ к PostgreSQL

## Назначение

PostgreSQL используется внутренними сервисами Competitor Analyzer:

- n8n;
- Playwright workers;
- административными скриптами, запускаемыми через контейнер PostgreSQL.

## Docker-сеть

n8n подключается к PostgreSQL через внутреннее имя Docker-сервиса:

```text
postgres:5432
```

Playwright подключается к PostgreSQL через внутреннее имя Docker-сервиса:

```text
postgres:5432
```

Порт `5432` доступен внутри Docker-сети, но не публикуется на сетевые интерфейсы VDS.

## Docker Compose

У сервиса `postgres` отсутствует секция публикации порта:

```yaml
ports:
  - "5432:5432"
```

Это сделано намеренно. Добавлять данную секцию обратно без отдельного решения по безопасности запрещено.

Внутренние сервисы продолжают использовать порт `5432` через Docker-сеть:

```yaml
DB_POSTGRESDB_HOST: postgres
DB_POSTGRESDB_PORT: 5432
```

```yaml
POSTGRES_HOST: postgres
POSTGRES_PORT: 5432
```

## Проверка публикации порта Docker

Проверить опубликованные порты контейнера:

```bash
docker port competitor_postgres
```

Для PostgreSQL команда не должна выводить внешний адрес.

Проверить системные TCP-порты:

```bash
ss -lntp | grep ':5432'
```

Команда не должна показывать прослушивание PostgreSQL на следующих адресах:

```text
0.0.0.0:5432
[::]:5432
```

## Проверка PostgreSQL

Проверить готовность PostgreSQL:

```bash
docker exec competitor_postgres pg_isready -U competitor_user -d competitor_analyzer
```

Проверить выполнение SQL-запроса:

```bash
docker exec competitor_postgres psql -U competitor_user -d competitor_analyzer -c "SELECT current_database(), current_user, now();"
```

Проверить активные подключения:

```bash
docker exec competitor_postgres psql -U competitor_user -d competitor_analyzer -c "SELECT usename, application_name, client_addr, state FROM pg_stat_activity WHERE datname = 'competitor_analyzer';"
```

## Административное подключение

Для ручного подключения к PostgreSQL используется `docker exec`:

```bash
docker exec -it competitor_postgres psql -U competitor_user -d competitor_analyzer
```

Для выполнения SQL-файла используется:

```bash
docker exec -i competitor_postgres psql -U competitor_user -d competitor_analyzer < migration.sql
```

Публиковать PostgreSQL в интернет для административного доступа не требуется.

## Запрещённая конфигурация

До появления отдельного защищённого административного канала запрещено:

- публиковать `5432:5432`;
- открывать порт `5432` во внешнем firewall;
- разрешать подключения PostgreSQL из интернета;
- использовать публичный IP VDS как адрес базы данных;
- ослаблять правила `pg_hba.conf` для внешних сетей.

## Результат

PostgreSQL доступен n8n и Playwright через внутреннюю Docker-сеть по адресу `postgres:5432`.

Порт PostgreSQL не публикуется через Docker на сетевые интерфейсы VDS.
