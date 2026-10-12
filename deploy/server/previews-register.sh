#!/usr/bin/env bash
set -euo pipefail

ROOT="${PREVIEW_ROOT:-/srv/previews}"
KEEP="${PREVIEW_KEEP:-10}"

input="$(cat)"
project="$(jq -r '.project' <<<"$input")"
sha="$(jq -r '.sha' <<<"$input")"

[[ "$project" =~ ^[a-z0-9-]+$ ]] || { echo "bad project" >&2; exit 1; }
[[ "$sha" =~ ^[0-9a-f]{7}$ ]] || { echo "bad sha" >&2; exit 1; }
[[ -d "$ROOT/$project/$sha" ]] || { echo "build not uploaded" >&2; exit 1; }

manifest="$ROOT/manifest.json"
exec 9>"$ROOT/.lock"
flock 9

[[ -f "$manifest" ]] || echo '{}' >"$manifest"
before="$(jq -r --arg p "$project" '(.[$p] // [])[].sha' "$manifest")"
tmp="$(mktemp "$ROOT/.manifest.XXXXXX")"

jq --argjson entry "$input" --argjson keep "$KEEP" --arg date "$(date -u +%FT%TZ)" '
  ($entry | {sha, branch, message, date: $date}) as $e
  | .[$entry.project] = ([$e] + ((.[$entry.project] // []) | map(select(.sha != $e.sha))))[0:$keep]
' "$manifest" >"$tmp"
chmod 644 "$tmp"
mv "$tmp" "$manifest"

after="$(jq -r --arg p "$project" '.[$p][].sha' "$manifest")"
for old in $before; do
  grep -qx "$old" <<<"$after" || rm -rf "${ROOT:?}/$project/$old"
done
