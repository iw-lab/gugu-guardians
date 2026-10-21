#!/usr/bin/env bash
# 학교 허브 배포·명령 — korea 계정(simssijjang@korea.kr · CLOUDFLARE_ACCOUNT_ID=b3d436cfca3fb9f2d1d7af777e23e8f1) 전용.
# 로그인 이메일이 korea 가 아니면 멈춘다(계정이 조용히 바뀌는 사고 방지). 사용: tools/hub.sh deploy | tools/hub.sh <wrangler 인자…>
set -euo pipefail
cd "$(dirname "$0")/../hub"
export HOME="$HOME/.cf-homes/korea" CLOUDFLARE_ACCOUNT_ID=b3d436cfca3fb9f2d1d7af777e23e8f1
W="${WRANGLER:-$HOME/../../Documents/dev/snake/worker/node_modules/.bin/wrangler}"
[ -x "$W" ] || W=/Users/sim-insu/Documents/dev/snake/worker/node_modules/.bin/wrangler
who=$("$W" whoami 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -o 'email [^ ]*' | head -1 | cut -d' ' -f2 | sed 's/\.$//')
[ "$who" = "simssijjang@korea.kr" ] || { echo "❌ 허브는 korea 계정 전용 — 지금 로그인: ${who:-없음}"; exit 3; }
if [ "${1:-}" = deploy ]; then exec "$W" deploy; fi
exec "$W" "$@"
