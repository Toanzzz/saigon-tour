#!/usr/bin/env bash
# deploy-remote.sh — recreate the api on the production host at a given image tag.
#
# Runs ON the host. .github/workflows/deploy.yml pipes it over SSH, so the logic
# that executes is the one committed with the image being deployed. By hand:
#
#   ssh t-oracle 'f=$(mktemp); cat >"$f"; SAIGON_TAG=<sha> bash "$f" </dev/null; rm -f "$f"' \
#     < scripts/deploy-remote.sh
#
# Do NOT pipe this into `bash -s`. Under -s the shell reads its own source from
# stdin, and `compose exec` attaches stdin and drains the unread remainder, so
# the deploy stops part way and still exits 0. `-T` does not help.
#
# Environment:
#   SAIGON_TAG    Image tag to deploy (required; CI uses the commit SHA)
#   DEPLOY_DIR    Directory holding compose.prod.yml (default: ~/apps/saigon-tour)
#   COMPOSE_FILE  Compose file name (default: compose.prod.yml)

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-${HOME}/apps/saigon-tour}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yml}"

die() {
  echo "error: $*" >&2
  exit 1
}

log() {
  echo "==> $*" >&2
}

[[ -n "${SAIGON_TAG:-}" ]] || die "SAIGON_TAG is required"
export SAIGON_TAG

cd "${DEPLOY_DIR}" || die "cannot enter ${DEPLOY_DIR}"
[[ -f "${COMPOSE_FILE}" ]] || die "${DEPLOY_DIR}/${COMPOSE_FILE} is missing"
[[ -f .env ]] || die "${DEPLOY_DIR}/.env is missing (holds the production secrets)"

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

log "deploying ${SAIGON_TAG} from ${DEPLOY_DIR}/${COMPOSE_FILE}"

# Pull first so a bad tag or registry outage fails before anything changes.
log "pulling images"
compose pull

log "ensuring postgres"
compose up -d --wait postgres

# One replica: Colyseus state is in memory, so this is a plain recreate.
# --wait gates on the image HEALTHCHECK (/health).
log "recreating api"
compose up -d --no-deps --wait api

log "verifying health"
for attempt in $(seq 1 30); do
  # </dev/null: `compose exec` attaches stdin even with -T. See the header.
  if compose exec -T api node -e \
      "fetch('http://127.0.0.1:58001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
      </dev/null; then
    log "api reports healthy"
    break
  fi
  [[ "${attempt}" -lt 30 ]] || die "api did not become healthy"
  sleep 2
done

compose ps
docker image prune -f >/dev/null
log "deployed ${SAIGON_TAG}"
