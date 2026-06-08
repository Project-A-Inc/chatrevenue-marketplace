# User dialog vocabulary

Use this table to find the right plain-language phrase for any
technical concept that might leak. The "Never use" column is
non-negotiable: those terms must not appear in user-facing messages
in any language.

## English (default)

| Never use | Use instead |
|---|---|
| branch | a separate copy / a separate copy for your skill |
| commit | saving |
| push | sending |
| pull request / PR | draft for review / review link |
| merge | confirm / publish (the user clicks themselves) |
| rebase / squash / merge commit | (not mentioned at all) |
| repository / repo | the skills project |
| validate / validation | check / checking |
| working tree dirty | you have unsaved changes in the skills folder |
| Claude Code | (not mentioned; "running the last steps") |
| MCP / tool / subprocess | (not mentioned) |
| stdout / stderr / exit code | (not mentioned) |
| gh / git / CLI | (not mentioned) |
| OAuth / token / API key | sign-in / access |
| worker / executable | runs on its own / works in the background for you |
| enroll / dispatcher / schedule / cron | turning it on (happens later in ChatRevenue) |
| interval_online_min / interval_offline_min | how often it runs while you're active / while you're away |
| presence / online-offline cadence | whether you're at your desk or away |

## Russian (when dialog language is Russian)

| Никогда | Использовать |
|---|---|
| branch / ветка | отдельная копия / отдельная копия для твоего скилла |
| commit / коммит | сохраняю |
| push / пуш | отправляю |
| pull request / PR | черновик на ревью / ссылка для ревью |
| merge / мерж | подтвердить / залить (юзер сам нажимает) |
| repository / репозиторий | проект со скиллами / папка со скиллами |
| validate / валидация | проверяю / проверка |
| Claude Code / Клод Код | (не упоминается; «выполняю последние шаги») |
| gh / git / CLI | (не упоминается) |
| worker / executable / воркер | работает само / работает для тебя в фоне |
| enroll / dispatcher / schedule / cron / расписание | включение (произойдёт позже в ChatRevenue) |
| interval_online_min / interval_offline_min | как часто запускается, когда ты за столом / когда отошёл |

When the dialog language is neither English nor Russian, translate the
English plain-language phrases into the user's language, keeping the
"never" terms out.

## Worker dialog phrases

Use these when the skill runs on its own. Never say worker / executable /
interval / cron / enroll.

### English

- "Should this run on its own in the background, or only when you ask for it?"
- "How often should it run while you're at your desk? And while you're away?"
- "It'll start running once you publish it and turn it on in ChatRevenue."
- (update) "This already runs on its own — want to change how often, or just what it does?"

### Russian

- «Это должно работать само в фоне или только когда ты попросишь?»
- «Как часто это запускать, когда ты за столом? А когда отошёл?»
- «Оно начнёт работать, когда ты опубликуешь скилл и включишь его в ChatRevenue.»
- (обновление) «Это уже работает само — поменять, как часто, или только то, что оно делает?»

## Language switching

- Default: English.
- Detect: first user message in the session. If non-English, continue
  in that language.
- Override: explicit instruction like "respond in Russian" / "ответь
  по-русски".
- Reset: a new chat session starts in English again.

## Closing message templates

### English (create or update)

> Done. Your draft is here:
> <PR_URL>
>
> Open the link, take a look, and click the green "Merge" button when
> you're ready. Once you do, the skill will appear in ChatRevenue
> within a couple of minutes.

### English (remove)

> Done. The removal request is here:
> <PR_URL>
>
> Open the link to confirm what's being removed, then click the green
> "Merge" button. Once you do, the agent will lose this behavior
> within a couple of minutes.

### Russian (create or update)

> Готово. Твой черновик здесь:
> <PR_URL>
>
> Открой ссылку, посмотри, и нажми зелёную кнопку "Merge" когда будешь
> готов. После этого скилл появится в ChatRevenue в течение пары минут.

### Russian (remove)

> Готово. Запрос на удаление здесь:
> <PR_URL>
>
> Открой ссылку, проверь что именно удаляется, и нажми зелёную кнопку
> "Merge". После этого агент перестанет это делать в течение пары
> минут.
