# Связи таблиц

## Полный список связей проекта

| Дочерняя таблица | Поле | Родительская таблица | При удалении |
|---|---|---|---|
| competitor_sites | client_id | clients | NO ACTION |
| scan_jobs | competitor_site_id | competitor_sites | NO ACTION |
| page_snapshots | scan_job_id | scan_jobs | CASCADE |
| page_snapshots | competitor_site_id | competitor_sites | CASCADE |
| analysis_jobs | page_snapshot_id | page_snapshots | CASCADE |
| analysis_jobs | competitor_site_id | competitor_sites | CASCADE |
| scraping_rules | competitor_site_id | competitor_sites | CASCADE |
| product_scan_jobs | scraping_rule_id | scraping_rules | CASCADE |
| product_scan_jobs | competitor_site_id | competitor_sites | CASCADE |
| products | competitor_site_id | competitor_sites | NO ACTION |
| price_history | product_id | products | NO ACTION |
| price_history | product_scan_job_id | product_scan_jobs | SET NULL |
| site_maps | competitor_site_id | competitor_sites | NO ACTION |

Все связи используют:

```text
ON UPDATE NO ACTION
```

## Значение CASCADE

При `ON DELETE CASCADE` дочерние записи удаляются автоматически.

Например, при удалении `page_snapshots` удаляются связанные:

```text
analysis_jobs
```

При удалении `scraping_rules` удаляются связанные:

```text
product_scan_jobs
```

## Значение NO ACTION

Удаление родительской записи запрещено, пока существуют связанные дочерние записи.

Например, нельзя удалить товар из `products`, пока существуют связанные записи в:

```text
price_history
```

## Значение SET NULL

При удалении задания сбора товара:

```text
product_scan_jobs
```

поле:

```text
price_history.product_scan_job_id
```

становится `NULL`.

История цены при этом сохраняется.

## Несогласованность правил удаления

Старые таблицы из первой миграции используют `NO ACTION`, а новые таблицы часто используют `CASCADE`.

Из-за этого поведение удаления сайта конкурента отличается для разных сущностей.

При удалении `competitor_sites`:

- `page_snapshots` могут удалиться каскадно;
- `analysis_jobs` могут удалиться каскадно;
- `scraping_rules` могут удалиться каскадно;
- `product_scan_jobs` могут удалиться каскадно;
- `scan_jobs` блокируют удаление;
- `products` блокируют удаление;
- `site_maps` блокируют удаление.

Перед изменением этой логики необходимо определить бизнес-правила хранения истории.
