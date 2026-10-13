#!/usr/bin/env bash
# 학생 주소(gugu-guardians.pages.dev) 손 배포 — CI 에 CLOUDFLARE_API_TOKEN 이 없을 때 쓴다.
#   tools/deploy-pages.sh            # 막히면 이유를 말하고 멈춘다
# 🔴 2026-10-13: 뒤처진 로컬 main 으로 배포해 다른 세션이 1시간 전에 올린 새 버전(SVG 아이콘·뼈대 91종)을
#    옛 번들로 덮었다. 그래서 ① origin/main 과 같지 않거나 ② 커밋 안 된 변경이 있으면 배포하지 않는다.
#    ③ 배포 뒤 학생 주소가 방금 만든 번들을 주는지 열어 본다(「배포 완료」 문구는 도달을 뜻하지 않는다).
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=gugu-guardians
ACCOUNT=4644562c4caa65bcd406fbbe6f104e59   # naver 계정 — gugu-guardians Pages 프로젝트 소유
CF_HOME="${CF_HOME:-$HOME/Documents/dev/iwdraw/.cf-home}"
# 4.83 대의 wrangler 는 맞는 로그인에도 «Authentication error 10000» 을 낸다 — 4.149 이상을 쓴다
WR="${WRANGLER:-$HOME/Documents/dev/snake/worker/node_modules/.bin/wrangler}"

git fetch -q origin main
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "❌ 커밋 안 된 변경이 있다 — 커밋한 것만 배포한다"; exit 2; }
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "❌ HEAD($(git rev-parse --short HEAD)) ≠ origin/main($(git rev-parse --short origin/main)) — git pull 후 다시(옛 버전으로 덮어쓰기 방지)"; exit 3; }

npm run build
HOME="$CF_HOME" CLOUDFLARE_ACCOUNT_ID="$ACCOUNT" "$WR" pages deploy dist --project-name "$PROJECT" --branch main --commit-hash "$(git rev-parse --short HEAD)"

want=$(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1)
for i in 1 2 3 4 5 6 7 8 9 10; do
  got=$(curl -sf "https://$PROJECT.pages.dev/?cb=$RANDOM$i" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1 || true)
  [ "$got" = "$want" ] && { echo "✅ 학생 주소가 이번 번들($want)을 준다 · $(git rev-parse --short HEAD)"; exit 0; }
  sleep 6
done
echo "❌ 학생 주소가 아직 ${got:-응답 없음} — 이번 번들은 $want"; exit 1
