# Резервное копирование и восстановление

## Текущее состояние

Каталоги:

```text
backups/
postgres/backups/
```

на момент проверки не содержат файлов.

На сервере существует копия каталога данных:

```text
postgres/data_backup_20260715_030323
```

Размер:

```text
69 МБ
```

Это физическая копия каталога PostgreSQL, а не логический SQL-дамп.

## Файл структуры

В корне проекта существует:

```text
postgres_tables_structure.txt
```

Файл создан через `pg_dump` и содержит структуру части базы.

Дата изменения:

```text
17 июля 2026 года
```

Файл содержит не только таблицы Competitor Analyzer, но и как минимум таблицу n8n:

```text
processed_data
```

Поэтому файл не является чистой схемой приложения.

## Рекомендуемый логический backup

Для регулярных копий рекомендуется использовать `pg_dump`.

### Полный дамп общей базы

```bash
mkdir -p postgres/backups

docker exec competitor_postgres \
  pg_dump \
  -U competitor_user \
  -d competitor_analyzer \
  -Fc \
  > "postgres/backups/competitor_analyzer_$(date +%Y%m%d_%H%M%S).dump"
```

Формат `-Fc` удобен для `pg_restore`.

Важно: такой дамп включает и таблицы n8n, потому что сейчас они находятся в той же базе.

## Backup только таблиц Competitor Analyzer

```bash
mkdir -p postgres/backups

docker exec competitor_postgres \
  pg_dump \
  -U competitor_user \
  -d competitor_analyzer \
  -Fc \
  -t public.clients \
  -t public.competitor_sites \
  -t public.scan_jobs \
  -t public.page_snapshots \
  -t public.analysis_jobs \
  -t public.scraping_rules \
  -t public.product_scan_jobs \
  -t public.products \
  -t public.price_history \
  -t public.site_maps \
  > "postgres/backups/app_tables_$(date +%Y%m%d_%H%M%S).dump"
```

Для полноценного восстановления нужно также учитывать связанные sequences и функции. Поэтому основной надёжный backup до разделения баз — полный дамп всей базы.

## Проверка созданного файла

```bash
ls -lh postgres/backups
```

Проверка содержимого дампа:

```bash
pg_restore -l postgres/backups/ИМЯ_ФАЙЛА.dump | head -n 50
```

Если `pg_restore` не установлен на сервере, список можно проверить внутри контейнера.

## Восстановление

Восстановление нельзя выполнять поверх рабочей базы без подготовки.

Безопасная последовательность:

1. остановить worker и n8n;
2. создать отдельную тестовую базу;
3. восстановить дамп в тестовую базу;
4. проверить таблицы и количество записей;
5. только после проверки планировать восстановление рабочей базы.

Пример создания тестовой базы:

```bash
docker exec competitor_postgres \
  createdb \
  -U competitor_user \
  competitor_analyzer_restore_test
```

Пример восстановления:

```bash
cat postgres/backups/ИМЯ_ФАЙЛА.dump | \
docker exec -i competitor_postgres \
  pg_restore \
  -U competitor_user \
  -d competitor_analyzer_restore_test \
  --clean \
  --if-exists
```

## Важное ограничение

Физическую копию каталога PostgreSQL нельзя считать проверенным backup, пока не выполнено тестовое восстановление.

Рабочий backup считается надёжным только после успешной проверки восстановления.

## Реализованные скрипты

### Создание backup

Скрипт:

scripts/postgres-backup.sh

Выполняет:

- полный pg_dump базы;
- проверку структуры дампа;
- атомарную запись файла;
- удаление backup старше 14 дней.

Запуск:

./scripts/postgres-backup.sh

### Проверка восстановления

Скрипт:

scripts/postgres-restore-test.sh

Выполняет:

- создание временной базы;
- восстановление backup;
- проверку таблиц;
- проверку PostgreSQL-функций;
- удаление тестовой базы.

Запуск:

./scripts/postgres-restore-test.sh

Можно передать конкретный backup:

./scripts/postgres-restore-test.sh postgres/backups/competitor_analyzer_20260720_121622.dump

## Первый проверенный backup

Первый успешно проверенный backup:

postgres/backups/competitor_analyzer_20260720_121622.dump

Размер:

543K

Дата проверки:

20 июля 2026

Backup успешно восстановлен в тестовую базу.
Количество данных совпало.
После проверки тестовая база была удалена.

