# Очереди заданий

В проекте используются три таблицы очередей:

```text
scan_jobs
analysis_jobs
product_scan_jobs
```

## Общие статусы

Основной жизненный цикл:

```text
new → running → completed
              └→ failed
```

## scan_jobs

Назначение:

```text
исследование сайта через Playwright
```

Обработчик:

```text
playwright/src/worker.js
```

Получение задания выполняется прямым SQL-запросом из Node.js.

Для конкурентной обработки используется:

```sql
FOR UPDATE OF sj SKIP LOCKED
```

На момент инвентаризации:

```text
completed: 7
```

CHECK-ограничения для статуса пока нет.

## analysis_jobs

Назначение:

```text
анализ снимков страниц через GPT
```

Типы заданий:

```text
site_structure
scraping_rule
```

Допустимые статусы защищены CHECK-ограничением:

```text
new
running
completed
failed
```

На момент инвентаризации:

```text
site_structure / completed: 1
site_structure / failed:    2
scraping_rule  / completed: 1
```

Получение заданий выполняется функциями:

```text
take_next_analysis_job()
take_next_scraping_rule_job()
```

## product_scan_jobs

Назначение:

```text
сбор товаров и цен по готовому правилу
```

Обработчик:

```text
playwright/src/product-worker.js
```

Для конкурентной обработки используется:

```sql
FOR UPDATE OF psj SKIP LOCKED
```

На момент инвентаризации:

```text
completed: 6
new:       1
```

## SKIP LOCKED

Конструкция:

```sql
FOR UPDATE SKIP LOCKED
```

позволяет нескольким worker безопасно получать задания одновременно.

Если один worker уже заблокировал строку, другой worker пропустит её и получит следующую.

## Зависшие задания

В текущей реализации нет автоматического восстановления заданий, которые надолго остались в статусе:

```text
running
```

Такая ситуация возможна после:

- аварийного завершения контейнера;
- перезапуска сервера;
- сетевой ошибки;
- остановки worker после получения задания.

В будущем потребуется механизм, который возвращает просроченные задания в `new` или переводит их в `failed`.
