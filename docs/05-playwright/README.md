# Playwright и Node.js worker

Playwright является браузерным исполнителем проекта Competitor Analyzer.

Он используется для:

- открытия сайтов конкурентов;
- выполнения JavaScript на страницах;
- получения структуры страниц;
- сохранения HTML и текста;
- поиска ссылок и изображений;
- поиска возможных товарных карточек;
- подготовки снимков страниц для анализа;
- сбора товаров после включения соответствующего worker.

## Актуальная реализация

Основное Node.js-приложение находится в каталоге:

```text
src/
```

Основные файлы:

```text
src/index.js
src/workers/base-worker.js
src/workers/analysis-worker.js
src/services/analysis-service.js
src/services/analysis-router.js
src/queue/analysis-queue.js
src/analyzers/structure-analyzer.js
src/analyzers/seo-analyzer.js
```

Контейнер собирается с помощью:

```text
playwright/Dockerfile
```

Корень проекта подключается внутрь контейнера:

```text
.:/app
```

Поэтому актуальный код внутри контейнера находится в:

```text
/app/src/
```

## Текущая конфигурация worker

```text
ENABLE_ANALYSIS_WORKER=true
ENABLE_SCRAPING_WORKER=false
ENABLE_LEGACY_WORKER=false
```

В текущей конфигурации работает только:

```text
Analysis Worker
```

## Analysis Worker

Файл:

```text
src/workers/analysis-worker.js
```

Worker получает задания из таблицы:

```text
analysis_jobs
```

Он выполняет:

- восстановление зависших заданий;
- безопасное получение следующего задания;
- передачу задания в Analysis Service;
- сохранение результата;
- сохранение ошибки;
- повторный опрос очереди.

Подробное описание:

- [Обработчик очередей](queue-runner.md)

## Анализ структуры страницы

Для заданий типа:

```text
site_structure
```

используется анализатор структуры страницы.

Маршрутизация выполняется через:

```text
src/services/analysis-router.js
```

## SEO-анализ страницы

Для заданий типа:

```text
seo_analysis
```

используется файл:

```text
src/analyzers/seo-analyzer.js
```

Результат SEO-анализа содержит:

```text
score
grade
metrics
problems
recommendations
```

Подтверждённый результат тестирования страницы Books to Scrape:

```text
score: 100
grade: good
links: 94
images: 20
headings: 21
products: 40
textLength: 2029
```

Результат сохраняется в:

```text
analysis_jobs.result_json
```

## Компактное логирование

Analysis Worker больше не записывает полный объект задания в журнал.

Логируются только:

```text
analysisJobId
pageSnapshotId
competitorSiteId
analysisType
pageTitle
finalUrl
```

Большие поля не включаются в запись получения задания:

```text
page_text
page_structure
possibleProductCards
```

## Устаревшая структура

В каталоге:

```text
playwright/src/
```

сохраняется предыдущая реализация worker, включая:

```text
worker.js
product-worker.js
queue-runner.sh
```

Её запуск отключён переменной:

```text
ENABLE_LEGACY_WORKER=false
```

Старые файлы пока не удаляются. Сначала необходимо проверить, осталась ли в них полезная функциональность, которую нужно перенести в новую архитектуру.
