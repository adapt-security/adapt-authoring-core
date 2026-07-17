# Language strings

User-facing text is never hard-coded. Instead the system separates two concerns:

- **Modules declare the keys they expect** (with metadata to help translators), in a
  `strings/*.json` manifest.
- **Langpacks provide the translations**, in `lang/<locale>/*.json` files.

At start-up the two are reconciled: any declared key with no translation is logged as a warning.
This mirrors the way errors work — a module declares an error in `errors/*.json`, and the langpack
translates it in `lang/<locale>/error.json` keyed by the error code.

## Declaring keys (modules)

A module declares the strings it uses in `strings/*.json` at its package root. Keys are **fully
prefixed** (e.g. `app.foo`). Each entry mirrors an error definition: a `description` giving the
translator context, and a `data` map documenting any `${...}` placeholders the string uses.

```json
{
  "app.othershere": {
    "description": "Presence facepile label shown when others are viewing",
    "data": { "count": "number of other viewers", "plural": "'' or 's' for pluralisation" }
  },
  "app.savedraft": {
    "description": "Button label for saving the current draft"
  }
}
```

Do **not** include the English text here — that lives in the langpack. A declaration is a contract
("this module needs these keys"), not a translation.

### Dynamic keys

When a key is built at runtime (e.g. ``t(`app.layout${value}`)``), declare the concrete keys
where the value-set is known (`app.layoutfull`, `app.layouthalf`, …). For genuinely open families
that can't be enumerated, declare the prefix with `"pattern": true`:

```json
{ "app.preset_": { "pattern": true, "description": "Course-preset labels, one per preset key" } }
```

A `pattern` entry is treated as a key prefix: it is satisfied by any translation whose key starts
with it, and it stops those translations being reported as orphaned.

## Providing translations (langpacks)

Translations live in a langpack module under `lang/<locale>/<namespace>.json`. The namespace comes
from the file path: `lang/en/app.json` contributes `app.*` keys, `lang/en/error.json` contributes
`error.*`. The file is a flat map of key (without the namespace prefix) to text, supporting
`${var}` substitution:

```json
{ "othershere": "${count} other${plural} here", "savedraft": "Save draft" }
```

## Start-up validation

When the app boots, [`Lang`](Lang) reconciles the keys declared in every module's `strings/*.json`
against the default-language translations and logs a `warn` for each key with no translation. Set
the `logMissingLangStrings` config option to `false` to silence this. The same reconciliation is
enforced in CI, so a missing (or orphaned) string fails the build.

Error strings are out of scope here: an error is declared in `errors/*.json` and translated in the
langpack's `error.json`, and is handled by the [error registry](error-handling) — not by this
mechanism.

## Consuming strings

- **Back-end:** `app.lang.translate(locale, key, data)` (or `req.translate(key, data)` in a request
  handler). A missing key returns the key itself.
- **Front-end:** the `t('app.key', data)` helper, populated from `GET /api/lang/:lang`.
