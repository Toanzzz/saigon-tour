#!/usr/bin/env bash
# setup-deploy.sh — one-time credentials walkthrough for .github/workflows/deploy.yml.
#
# Sets the GitHub secrets/vars, installs a deploy key, writes the host .env, and
# prints the remaining manual steps. Safe to re-run: values that already exist are
# skipped unless --force. Secrets are read silently and never echoed.
#
#   scripts/setup-deploy.sh [--host t-oracle] [--force]

set -euo pipefail
umask 077

REPO=Toanzzz/saigon-tour
HOST_ALIAS=t-oracle
FORCE=0
DEFAULT_DIR=apps/saigon-tour
TMP=$(mktemp -d)
trap 'find "$TMP" -type f -exec shred -u {} + 2>/dev/null || true; rm -rf "$TMP"' EXIT
declare -a REPORT=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST_ALIAS="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -h | --help) sed -n '2,8p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

die() { echo "error: $*" >&2; exit 1; }
say() { printf '\n== %s\n' "$*"; }
note() { REPORT+=("$(printf '%-24s %s' "$1" "$2")"); echo "   $1: $2"; }
ask() { local v; read -rp "   $1 [${2:-}]: " v; printf '%s' "${v:-${2:-}}"; }
ask_secret() { local v; read -rsp "   $1: " v; echo >&2; printf '%s' "$v"; }
confirm() { local v; read -rp "   $1 [y/N]: " v; [[ "$v" =~ ^[Yy]$ ]]; }

preflight() {
  local c
  for c in gh ssh ssh-keygen ssh-keyscan ssh-copy-id openssl curl; do
    command -v "$c" >/dev/null || die "missing command: $c"
  done
  gh auth status >/dev/null 2>&1 || die "gh is not authenticated (run gh auth login)"
  gh repo view "$REPO" >/dev/null || die "no access to $REPO"
  SECRETS=$(gh secret list -R "$REPO" --json name -q '.[].name')
  VARS=$(gh variable list -R "$REPO" --json name -q '.[].name')
}

has_secret() { grep -qx "$1" <<<"$SECRETS"; }
has_var() { grep -qx "$1" <<<"$VARS"; }
want_secret() { [[ $FORCE == 1 ]] || ! has_secret "$1"; }

put_secret() { # name value
  printf '%s' "$2" | gh secret set "$1" -R "$REPO" >/dev/null
  SECRETS+=$'\n'"$1"
  note "$1" set
}

put_var() { # name value
  if [[ $FORCE == 0 ]] && has_var "$1"; then note "$1" skipped; return; fi
  gh variable set "$1" -R "$REPO" --body "$2" >/dev/null
  note "$1" set
}

remote() { ssh -T -o BatchMode=yes "$DEPLOY_USER@$DEPLOY_HOST" "$@"; }

step_host() {
  say "1. SSH host: CI connects here to recreate the api container."
  HOST_ALIAS=$(ask "Host alias" "$HOST_ALIAS")
  DEPLOY_HOST=$(ssh -G "$HOST_ALIAS" | awk '$1=="hostname"{print $2}')
  DEPLOY_HOST=$(ask "Hostname" "$DEPLOY_HOST")
  DEPLOY_USER=$(ask "User" "$(ssh -G "$HOST_ALIAS" | awk '$1=="user"{print $2}')")
  remote 'id -nG' | grep -qw docker || die "$DEPLOY_USER is not in the docker group on $DEPLOY_HOST"
  remote 'docker network inspect edge >/dev/null' || die "docker network 'edge' is missing on $DEPLOY_HOST"
  if want_secret DEPLOY_HOST; then put_secret DEPLOY_HOST "$DEPLOY_HOST"; else note DEPLOY_HOST skipped; fi
  if want_secret DEPLOY_USER; then put_secret DEPLOY_USER "$DEPLOY_USER"; else note DEPLOY_USER skipped; fi
}

step_key() {
  say "2. Deploy key: a dedicated ed25519 key that only CI holds."
  if ! want_secret DEPLOY_SSH_KEY; then note DEPLOY_SSH_KEY skipped; return; fi
  ssh-keygen -q -t ed25519 -N '' -C saigon-tour-deploy -f "$TMP/id_deploy"
  ssh-copy-id -i "$TMP/id_deploy.pub" "$DEPLOY_USER@$DEPLOY_HOST" >/dev/null 2>&1 \
    || die "ssh-copy-id failed"
  ssh -T -o BatchMode=yes -o IdentitiesOnly=yes -i "$TMP/id_deploy" \
    "$DEPLOY_USER@$DEPLOY_HOST" true || die "new deploy key does not log in"
  put_secret DEPLOY_SSH_KEY "$(cat "$TMP/id_deploy")"
}

step_known_hosts() {
  say "3. Known hosts: pins the host key so CI cannot be redirected."
  if ! want_secret DEPLOY_KNOWN_HOSTS; then note DEPLOY_KNOWN_HOSTS skipped; return; fi
  local keys
  keys=$(ssh-keyscan -H "$DEPLOY_HOST" 2>/dev/null)
  [[ -n "$keys" ]] || die "ssh-keyscan returned nothing for $DEPLOY_HOST"
  ssh-keygen -lf - <<<"$keys" | sed 's/^/   /'
  confirm "Do these fingerprints match the host?" || die "host key not confirmed"
  put_secret DEPLOY_KNOWN_HOSTS "$keys"
}

step_dir() {
  say "4. Deploy dir: where compose.prod.yml and .env live (relative to \$HOME)."
  DEPLOY_DIR=$(ask "Directory" "$DEFAULT_DIR")
  if [[ "$DEPLOY_DIR" == "$DEFAULT_DIR" ]]; then note DEPLOY_DIR "default"
  elif want_secret DEPLOY_DIR; then put_secret DEPLOY_DIR "$DEPLOY_DIR"
  else note DEPLOY_DIR skipped; fi
}

cf_get() { # path; uses CF_TOKEN without putting it in argv
  curl -fsS -H @<(printf 'Authorization: Bearer %s\n' "$CF_TOKEN") \
    "https://api.cloudflare.com/client/v4$1"
}

json_field() { # key: first "key":"value" in stdin
  grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

step_cloudflare() {
  say "5. Cloudflare: token for wrangler deploy of the static client."
  echo "   Create at https://dash.cloudflare.com/profile/api-tokens with the"
  echo "   'Edit Cloudflare Workers' template."
  CF_TOKEN=""
  if want_secret CLOUDFLARE_API_TOKEN; then
    CF_TOKEN=$(ask_secret "CLOUDFLARE_API_TOKEN")
    [[ -n "$CF_TOKEN" ]] || die "token is required"
    put_secret CLOUDFLARE_API_TOKEN "$CF_TOKEN"
  else
    note CLOUDFLARE_API_TOKEN skipped
  fi
  local account=""
  [[ -n "$CF_TOKEN" ]] && account=$(cf_get /accounts 2>/dev/null | json_field id || true)
  if want_secret CLOUDFLARE_ACCOUNT_ID; then
    account=$(ask "CLOUDFLARE_ACCOUNT_ID" "$account")
    [[ -n "$account" ]] || die "account id is required"
    put_secret CLOUDFLARE_ACCOUNT_ID "$account"
  else
    note CLOUDFLARE_ACCOUNT_ID skipped
  fi
  SUBDOMAIN=""
  [[ -n "$CF_TOKEN" && -n "$account" ]] \
    && SUBDOMAIN=$(cf_get "/accounts/$account/workers/subdomain" 2>/dev/null | json_field subdomain || true)
}

step_vars() {
  say "6. Vars: public origins baked into the client and the api .env."
  API_URL=$(ask "API_URL" "https://saigon-api.toan.io")
  SUBDOMAIN=$(ask "workers.dev subdomain" "${SUBDOMAIN:-}")
  [[ -n "$SUBDOMAIN" ]] || die "workers.dev subdomain is required"
  CLIENT_URL=$(ask "CLIENT_URL" "https://saigon-tour.$SUBDOMAIN.workers.dev")
  put_var API_URL "$API_URL"
}

env_value() { grep -m1 "^$1=" <<<"$EXISTING" | cut -d= -f2- || true; }

step_env() {
  say "7. Host .env: api and postgres secrets, mode 600 on the host."
  EXISTING=$(remote "cat '$DEPLOY_DIR/.env' 2>/dev/null" || true)
  local pg auth muse id secret
  if [[ -n "$EXISTING" && $FORCE == 0 ]]; then note ".env" skipped; return; fi
  pg=$(env_value POSTGRES_PASSWORD)
  auth=$(env_value BETTER_AUTH_SECRET)
  if [[ -n "$EXISTING" ]] && confirm "Rotate POSTGRES_PASSWORD and BETTER_AUTH_SECRET? (breaks the existing DB volume and sessions)"; then
    pg="" auth=""
  fi
  pg=${pg:-$(openssl rand -hex 32)}
  auth=${auth:-$(openssl rand -hex 32)}
  muse=$(ask_secret "META_MUSE_API_KEY (empty keeps current)")
  muse=${muse:-$(env_value META_MUSE_API_KEY)}
  [[ -n "$muse" ]] || die "META_MUSE_API_KEY is required"
  id=$(ask "META_CLIENT_ID (optional)" "$(env_value META_CLIENT_ID)")
  secret=""
  if [[ -n "$id" ]]; then
    secret=$(ask_secret "META_CLIENT_SECRET (empty keeps current)")
    secret=${secret:-$(env_value META_CLIENT_SECRET)}
    [[ -n "$secret" ]] || die "META_CLIENT_SECRET is required with META_CLIENT_ID"
  fi
  {
    printf 'POSTGRES_PASSWORD=%s\n' "$pg"
    printf 'DATABASE_URL=postgres://saigon:%s@postgres:5432/saigon\n' "$pg"
    printf 'META_MUSE_API_KEY=%s\n' "$muse"
    printf 'BETTER_AUTH_SECRET=%s\n' "$auth"
    printf 'PUBLIC_API_URL=%s\n' "$API_URL"
    printf 'CLIENT_URL=%s\n' "$CLIENT_URL"
    printf 'CORS_ORIGINS=%s\n' "$CLIENT_URL"
    if [[ -n "$id" ]]; then
      printf 'META_CLIENT_ID=%s\n' "$id"
      printf 'META_CLIENT_SECRET=%s\n' "$secret"
    fi
  } >"$TMP/env"
  remote "mkdir -p '$DEPLOY_DIR' && umask 077 && cat > '$DEPLOY_DIR/.env' && chmod 600 '$DEPLOY_DIR/.env'" <"$TMP/env"
  note ".env" "written to $DEPLOY_HOST:$DEPLOY_DIR/.env"
}

step_ghcr() {
  say "8. GHCR pull access: the host must pull ghcr.io/toanzzz/saigon-tour-api."
  if remote 'grep -q ghcr.io ~/.docker/config.json 2>/dev/null'; then note GHCR "host already logged in"; return; fi
  if confirm "Log the host into ghcr.io with a read:packages PAT now?"; then
    local user pat
    user=$(ask "GitHub user" "Toanzzz")
    pat=$(ask_secret "PAT (read:packages)")
    printf '%s' "$pat" | remote "docker login ghcr.io -u '$user' --password-stdin" >/dev/null
    note GHCR "host logged in"
  else
    note GHCR "make the saigon-tour-api package public after the first push"
  fi
}

summary() {
  say "Summary"
  printf '   %s\n' "${REPORT[@]}"
  cat <<MSG

Remaining manual steps:
  1. Caddy (infra repo hosts/t-oracle/caddy/Caddyfile), then mise run host:sync-caddy t-oracle:
       ${API_URL#https://} {
         reverse_proxy saigon-api:58001
       }
  2. DNS: point ${API_URL#https://} at $DEPLOY_HOST.
  3. Meta login (if enabled): register redirect $API_URL/auth/callback/facebook
MSG
}

preflight
step_host
step_key
step_known_hosts
step_dir
step_cloudflare
step_vars
step_env
step_ghcr
summary
