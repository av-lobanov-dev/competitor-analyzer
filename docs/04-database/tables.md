# Таблицы Competitor Analyzer

## clients

Хранит клиентов сервиса.

| Поле | Тип | NULL | Описание |
|---|---|---|---|
| id | integer | нет | Первичный ключ |
| name | text | нет | Название клиента |
| created_at | timestamp | да | Дата создания |

## competitor_sites

Хранит сайты конкурентов клиентов.

| Поле | Тип | NULL | Описание |
|---|---|---|---|
| id | integer | нет | Первичный ключ |
| client_id | integer | да | Ссылка на клиента |
| name | text | да | Название конкурента |
| url | text | нет | URL сайта |
| created_at | timestamp | да | Дата создания |

Текущая связь:

```text
competitor_sites.client_id → clients.id
```

При удалении клиента используется `NO ACTION`.

## scan_jobs

Очередь первичного исследования сайтов.

| Поле | Тип | NULL | Описание |
|---|---|---|---|
| id | integer | нет | Первичный ключ |
| competitor_site_id | integer | да | Сайт конкурента |
| status | text | нет | Статус задания |
| started_at | timestamp | да | Время начала |
| finished_at | timestamp | да | Время окончания |
| created_at | timestamp | да | Время создания |

Значение статуса по умолчанию:

```text
new
```

В таблице пока нет CHECK-ограничения статусов.

## page_snapshots

Хранит снимки страниц, полученные Playwright.

| Поле | Тип | NULL | Описание |
|---|---|---|---|
| id | integer | нет | Первичный ключ |
| scan_job_id | integer | нет | Исходное задание |
| competitor_site_id | integer | нет | Сайт конкурента |
| requested_url | text | нет | Запрошенный URL |
| final_url | text | нет | Итоговый URL после редиректов |
| page_title | text | да | Заголовок страницы |
| page_text | text | да | Видимый текст |
| page_html | text | да | HTML страницы |
| http_status | integer | да | HTTP-статус |
| load_time_ms | integer | да | Время загрузки |
| created_at | timestamp | нет | Время создания |
| page_structure | jsonb | да | Структура страницы |

При удалении задания или сайта снимки удаляются каскадно.

## analysis_jobs

Очередь GPT-анализа.

| Поле | Тип | NULL | Описание |
|---|---|---|---|
| id | integer | нет | Первичный ключ |
| page_snapshot_id | integer | нет | Анализируемый снимок |
| competitor_site_id | integer | нет | Сайт конкурента |
| analysis_type | text | нет | Тип анализа |
| status | text | нет | Статус задания |
| result_json | jsonb | да | Результат GPT |
| error_message | text | да | Ошибка |
| model_name | text | да | Использованная модель |
| prompt_version | text | да | Версия промпта |
| started_at | timestamp | да | Время начала |
| finished_at | timestamp | да | Время завершения |
| created_at | timestamp | нет | Время создания |

Допустимые статусы:

```text
new
running
completed
failed
```

Обнаруженные типы анализа:

```text
site_structure
scraping_rule
```

Один снимок не может иметь два задания одного типа благодаря уникальному индексу:

```text
page_snapshot_id + analysis_type
```

## scraping_rules

Хранит правила сбора товаров.

| Поле | Тип | NULL | Описание |
|---|---|---|---|
| id | integer | нет | Первичный ключ |
| competitor_site_id | integer | нет | Сайт конкурента |
| name | text | нет | Название правила |
| start_url | text | нет | Начальная страница |
| product_card_selector | text | нет | Селектор карточки |
| product_name_selector | text | нет | Селектор названия |
| product_price_selector | text | нет | Селектор цены |
| product_url_selector | text | да | Селектор ссылки |
| product_external_id_selector | text | да | Селектор внешнего ID |
| product_old_price_selector | text | да | Селектор старой цены |
| product_currency_selector | text | да | Селектор валюты |
| next_page_selector | text | да | Селектор пагинации |
| max_pages | integer | нет | Максимум страниц |
| currency | text | нет | Валюта по умолчанию |
| is_active | boolean | нет | Активность правила |
| created_at | timestamp | нет | Время создания |
| updated_at | timestamp | нет | Время обновления |

Ограничение:

```text
max_pages > 0
```

Для одного сайта может существовать только одно активное правило.

Это обеспечивается частичным уникальным индексом:

```text
competitor_site_id WHERE is_active = true
```

## product_scan_jobs

Очередь сбора товаров.

| Поле | Тип | NULL | Описание |
|---|---|---|---|
| id | integer | нет | Первичный ключ |
| scraping_rule_id | integer | нет | Правило сбора |
| competitor_site_id | integer | нет | Сайт конкурента |
| status | text | нет | Статус |
| pages_processed | integer | нет | Обработано страниц |
| products_found | integer | нет | Найдено карточек |
| products_created | integer | нет | Создано товаров |
| products_updated | integer | нет | Обновлено товаров |
| prices_saved | integer | нет | Сохранено цен |
| products_skipped | integer | нет | Пропущено карточек |
| error_message | text | да | Сообщение об ошибке |
| created_at | timestamp | нет | Время создания |
| started_at | timestamp | да | Время начала |
| finished_at | timestamp | да | Время завершения |

Допустимые статусы:

```text
new
running
completed
failed
```

Все счётчики должны быть больше или равны нулю.

## products

Хранит товары конкурентов.

| Поле | Тип | NULL | Описание |
|---|---|---|---|
| id | integer | нет | Первичный ключ |
| competitor_site_id | integer | да | Сайт конкурента |
| external_id | text | да | ID товара на сайте |
| name | text | нет | Название |
| url | text | да | Ссылка товара |
| created_at | timestamp | да | Время создания |

Текущий Product Worker ищет существующий товар по:

```text
competitor_site_id + url
```

Но уникального ограничения для этой пары в базе пока нет.

## price_history

Хранит историю цен.

| Поле | Тип | NULL | Описание |
|---|---|---|---|
| id | integer | нет | Первичный ключ |
| product_id | integer | да | Товар |
| price | numeric(12,2) | да | Цена |
| currency | text | да | Валюта |
| collected_at | timestamp | да | Время получения |
| product_scan_job_id | integer | да | Задание сбора |

При удалении `product_scan_jobs` ссылка обнуляется:

```text
ON DELETE SET NULL
```

Сама запись цены при этом сохраняется.

## site_maps

Предназначена для хранения карт сайтов.

| Поле | Тип | NULL | Описание |
|---|---|---|---|
| id | integer | нет | Первичный ключ |
| competitor_site_id | integer | да | Сайт конкурента |
| map_json | jsonb | нет | Карта сайта |
| created_at | timestamp | да | Время создания |

На момент инвентаризации таблица пустая.

Актуальная реализация Playwright пока не записывает данные в `site_maps`.
