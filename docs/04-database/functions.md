# Функции PostgreSQL

К проекту Competitor Analyzer относятся четыре функции:

```text
take_next_analysis_job()
take_next_scraping_rule_job()
complete_analysis_job(...)
fail_analysis_job(...)
```

Остальные функции схемы `public`, например UUID-функции и `increment_workflow_version`, относятся к PostgreSQL-расширениям или n8n.

## take_next_analysis_job()

Назначение:

- найти самое старое новое GPT-задание;
- заблокировать его;
- перевести в `running`;
- вернуть данные снимка страницы.

Возвращает:

- ID задания;
- ID снимка;
- ID сайта;
- тип анализа;
- заголовок страницы;
- итоговый URL;
- текст страницы;
- структуру страницы.

Для получения используется:

```sql
FOR UPDATE SKIP LOCKED
```

### Ограничение

Функция получает любое задание со статусом `new`:

```sql
WHERE aj.status = 'new'
```

Она не фильтрует `analysis_type`.

Поэтому она может получить задание типа:

```text
scraping_rule
```

которое предназначено для специализированной функции.

## take_next_scraping_rule_job()

Получает только задания:

```text
analysis_type = scraping_rule
status = new
```

Дополнительно возвращает:

- `prompt_version`;
- HTML страницы.

Для подготовки правила сбора HTML может быть важен, поэтому он включён только в специализированную функцию.

## complete_analysis_job(...)

Параметры:

```text
p_analysis_job_id
p_result_json
p_model_name
p_prompt_version
```

Функция переводит задание:

```text
running → completed
```

и сохраняет:

- результат;
- модель;
- версию промпта;
- время завершения.

Возвращает `true`, только если обновлена одна строка.

Если задание не находится в статусе `running`, возвращает `false`.

## fail_analysis_job(...)

Параметры:

```text
p_analysis_job_id
p_error_message
p_model_name
p_prompt_version
```

Функция переводит задание:

```text
running → failed
```

и сохраняет ошибку.

Возвращает `true`, только если обновлена одна строка.

## Рекомендуемое развитие

Общую функцию лучше заменить функцией с параметром:

```sql
take_next_analysis_job(p_analysis_type text)
```

Тогда один механизм сможет безопасно получать задания заданного типа.

Альтернативный вариант — добавить в `take_next_analysis_job()` явный фильтр:

```sql
AND aj.analysis_type = 'site_structure'
```
