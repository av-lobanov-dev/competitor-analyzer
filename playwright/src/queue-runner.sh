#!/bin/sh

set -u

INTERVAL_SECONDS="${WORKER_INTERVAL_SECONDS:-15}"

echo "Запущен обработчик очередей Playwright"
echo "Интервал проверки: ${INTERVAL_SECONDS} секунд"
echo ""

while true
do
  echo "=================================================="
  echo "Проверка очередей: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "=================================================="

  echo ""
  echo "[1/2] Проверяем задания исследования страниц..."

  if ! node src/worker.js; then
    echo "Ошибка при выполнении worker.js"
  fi

  echo ""
  echo "[2/2] Проверяем задания сбора товаров..."

  if ! node src/product-worker.js; then
    echo "Ошибка при выполнении product-worker.js"
  fi

  echo ""
  echo "Следующая проверка через ${INTERVAL_SECONDS} секунд"
  echo ""

  sleep "${INTERVAL_SECONDS}"
done
