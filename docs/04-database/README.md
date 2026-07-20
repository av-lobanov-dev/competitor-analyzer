# PostgreSQL

PostgreSQL хранит основные данные сервиса Competitor Analyzer и служебные данные n8n.

## Текущее размещение

Контейнер PostgreSQL:

```text
competitor_postgres
```

База данных:

```text
competitor_analyzer
```

Схема:

```text
public
```

Пользователь:

```text
competitor_user
```

## Важная особенность

В одной базе и одной схеме сейчас находятся:

1. прикладные таблицы Competitor Analyzer;
2. внутренние таблицы n8n.

Всего в схеме `public` обнаружено 121 таблица.

Из них к Competitor Analyzer относятся 10 таблиц:

```text
clients
competitor_sites
scan_jobs
page_snapshots
analysis_jobs
scraping_rules
product_scan_jobs
products
price_history
site_maps
```

Остальные таблицы создаются и используются n8n.

## Документы

- [Обзор схемы](schema-overview.md)
- [Описание таблиц](tables.md)
- [Связи таблиц](relationships.md)
- [Очереди заданий](job-queues.md)
- [Функции PostgreSQL](functions.md)
- [Миграции](migrations.md)
- [Резервное копирование и восстановление](backup-and-restore.md)
- [Известные ограничения](technical-debt.md)

## Основные группы данных

### Клиенты и конкуренты

```text
clients
competitor_sites
```

### Исследование сайтов

```text
scan_jobs
page_snapshots
analysis_jobs
site_maps
```

### Сбор товаров

```text
scraping_rules
product_scan_jobs
products
price_history
```

## Текущее состояние данных

На момент инвентаризации 20 июля 2026 года:

| Таблица | Записей |
|---|---:|
| clients | 1 |
| competitor_sites | 2 |
| scan_jobs | 7 |
| page_snapshots | 4 |
| analysis_jobs | 4 |
| scraping_rules | 2 |
| product_scan_jobs | 7 |
| products | 40 |
| price_history | 320 |
| site_maps | 0 |

Эти значения являются снимком состояния и со временем изменятся.
