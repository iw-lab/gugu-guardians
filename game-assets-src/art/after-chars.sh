#!/bin/bash
# 캐릭터 원화 생성(gb-image)이 끝난 뒤 GPT 웹앱이 비면 키아트를 그린다 — 같은 웹앱 프로필을 두 배치가 다투지 않게
cd "$(dirname "$0")/../.."
until grep -q '^gb-image:' game-assets-src/rig/images.log 2>/dev/null; do sleep 60; done
bash ~/.claude/skills/game-builder/tools/gb-image.sh "$PWD/game-assets-src/art/jobs.jsonl"
echo ART_DONE
