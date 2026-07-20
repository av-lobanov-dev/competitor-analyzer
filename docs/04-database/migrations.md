# Миграции PostgreSQL

## Расположение

SQL-файлы находятся в:

```text
postgres/init/
```

Текущий список:

```text
001_schema.sql
002_page_snapshots.sql
003_page_structure.sql
004_analysis_jobs.sql
005_take_analysis_job.sql
006_finish_analysis_job.sql
007_scraping_rules.sql
008_product_scan_jobs.sql
009_link_prices_to_scan_jobs.sql
010_take_scraping_rule_job.sql
```

## Назначение файлов

### 001_schema.sql

Создаёт основные таблицы:

- clients;
- competitor_sites;
- scan_jobs;
- products;
- price_history;
- site_maps.

### 002_page_snapshots.sql

Создаёт `page_snapshots` и основные индексы.

### 003_page_structure.sql

Добавляет JSONB-поле `page_structure` и GIN-индекс.

### 004_analysis_jobs.sql

Создаёт очередь GPT-анализа.

### 005_take_analysis_job.sql

Создаёт функцию получения следующего GPT-задания.

### 006_finish_analysis_job.sql

Создаёт функции успешного и ошибочного завершения GPT-задания.

### 007_scraping_rules.sql

Создаёт правила сбора товаров.

### 008_product_scan_jobs.sql

Создаёт очередь сбора товаров.

### 009_link_prices_to_scan_jobs.sql

Связывает историю цен с заданием сбора.

### 010_take_scraping_rule_job.sql

Создаёт функцию получения GPT-задания типа `scraping_rule`.

## Как Docker применяет init-файлы

Файлы из каталога инициализации PostgreSQL выполняются только при первом создании пустого каталога данных.

Если каталог данных уже существует, добавление нового SQL-файла не применит его автоматически.

Например, создание:

```text
011_new_change.sql
```

не изменит работающую базу после обычного:

```bash
docker compose restart
```

## Текущая проблема

У проекта нет собственной таблицы учёта применённых миграций.

Таблица:

```text
public.migrations
```

принадлежит n8n и не должна использоваться для миграций Competitor Analyzer.

## Правило до появления менеджера миграций

Каждая новая миграция должна:

1. иметь новый последовательный номер;
2. храниться в `postgres/init/`;
3. быть по возможности повторяемой;
4. применяться вручную к существующей базе;
5. проверяться SQL-запросом;
6. документироваться;
7. попадать в Git отдельным коммитом.

Пример ручного применения:

```bash
docker exec -i competitor_postgres \
  psql \
  -U competitor_user \
  -d competitor_analyzer \
  < postgres/init/011_example.sql
```

## Проблема миграции 009

Миграция добавляет ограничение без проверки существования:

```sql
ALTER TABLE price_history
ADD CONSTRAINT price_history_product_scan_job_id_fkey
```

При повторном выполнении может возникнуть ошибка, что ограничение уже существует.

## Рекомендуемое развитие

Добавить таблицу:

```text
app_schema_migrations
```

Она должна хранить:

- номер миграции;
- имя файла;
- время применения;
- контрольную сумму.

В дальнейшем желательно использовать миграционный инструмент, например node-pg-migrate, Flyway, Liquibase или собственный простой runner.
