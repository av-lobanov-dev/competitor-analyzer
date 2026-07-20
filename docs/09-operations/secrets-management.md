# Управление секретами

## Назначение

Секреты Competitor Analyzer хранятся вне отслеживаемых Git файлов.

К секретам относятся:

- пароль PostgreSQL;
- служебные ключи n8n;
- токены внешних API;
- другие учётные данные сервисов.

## Файл `.env`

Рабочие секреты сервера хранятся в файле:

```text
/opt/competitor-analyzer/.env
```

Файл `.env` не должен отслеживаться Git.

Правила `.gitignore` должны содержать:

```gitignore
.env
.env.*
```

Проверить, что `.env` исключён:

```bash
git check-ignore -v .env
```

Проверить, что `.env` не отслеживается:

```bash
git ls-files .env
```

Команда не должна выводить имя файла.

## Права доступа

Файл `.env` должен быть доступен только владельцу:

```bash
chmod 600 .env
```

Проверить права:

```bash
stat -c '%a %U:%G %n' .env
```

Ожидаемые права:

```text
600
```

## Docker Compose

Пароль PostgreSQL передаётся через переменную окружения:

```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
```

n8n использует ту же переменную:

```yaml
DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
```

Playwright также получает пароль через переменную окружения:

```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
```

Значение пароля не должно находиться непосредственно в `docker-compose.yml`.

## Playwright

Worker-файлы используют только переменную окружения:

```javascript
password: process.env.POSTGRES_PASSWORD,
```

Fallback-пароли в исходном коде запрещены.

Нельзя использовать конструкцию вида:

```javascript
process.env.POSTGRES_PASSWORD || 'password'
```

## Проверка конфигурации

Проверить Docker Compose:

```bash
docker compose config --quiet
```

Проверить отсутствие старого пароля:

```bash
git grep -nF "competitor_password"
```

Проверить использование переменной окружения:

```bash
grep -Rni "process.env.POSTGRES_PASSWORD" playwright/src
```

## Ротация пароля PostgreSQL

При смене пароля необходимо:

1. создать резервную копию базы;
2. создать новый стойкий пароль;
3. сохранить его в `.env`;
4. изменить пароль роли PostgreSQL;
5. пересоздать контейнеры PostgreSQL, n8n и Playwright;
6. проверить подключение каждого сервиса;
7. не выводить пароль в терминал или журналы.

## Резервные копии `.env`

Временные копии `.env` также содержат секреты.

Они:

- не должны попадать в Git;
- должны иметь права `600`;
- должны удаляться после подтверждения успешной ротации;
- не должны передаваться через незащищённые каналы.

## Запрещено

Запрещено:

- хранить реальные пароли в `docker-compose.yml`;
- хранить реальные пароли в JavaScript-файлах;
- добавлять `.env` в Git;
- публиковать значения секретов в документации;
- выводить секреты через `echo`, `cat` или отладочные логи;
- использовать fallback-пароли в исходном коде;
- передавать пароль PostgreSQL в аргументах командной строки без необходимости.

## Текущее состояние

Пароль PostgreSQL:

- хранится в `.env`;
- передаётся контейнерам через Docker Compose;
- удалён из отслеживаемой конфигурации;
- удалён из Playwright worker-файлов;
- был заменён после обнаружения старого открытого значения.
