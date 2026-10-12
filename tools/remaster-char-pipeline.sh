#!/bin/bash
# 캐릭터 91종 원화 → Firefly 3D → 뼈대 아틀라스를 «원화가 나오는 대로» 이어 돌린다 (REMASTER-GDD R-3)
#   원화 생성(gb-image.sh = GPT 웹앱 → 막히면 Firefly)은 뒤에서 돌고, 1분마다 새로 생긴 원화만 리그한다.
#   끝 = 원화 생성이 끝났고 리그할 것이 남지 않았을 때. 로그 = game-assets-src/rig/pipeline.log
cd "$(dirname "$0")/.."
R=game-assets-src/rig
bash ~/.claude/skills/game-builder/tools/gb-image.sh "$PWD/$R/jobs.jsonl" > "$R/images.log" 2>&1 &
IMG=$!
while :; do
  todo=$(python3 - <<'P'
import json,os
d=json.load(open('game-assets-src/rig/characters.json')); st=json.load(open('tools/rig-status.json')) if os.path.exists('tools/rig-status.json') else {}
tr=json.load(open('game-assets-src/rig/tries.json')) if os.path.exists('game-assets-src/rig/tries.json') else {}
print(' '.join(c['id'] for c in d['characters'] if os.path.exists(c['src']) and not st.get(c['id'],{}).get('ok') and tr.get(c['id'],0) < 2))
P
)
  if [ -n "$todo" ]; then
    for id in $todo; do
      echo "▶ $(date '+%H:%M') rig $id"
      python3 ~/.claude/skills/game-builder/tools/rig-characters.py --root "$PWD" "$id" 2>&1 | grep -E '✅|❌' | head -3
      python3 - "$id" <<'P'
import json,os,sys
# 시도 횟수는 rig-status.json 이 아니라 따로 센다(rig-characters 가 그 항목을 통째로 덮어쓴다 — 거기 적으면 무한 재시도)
st=json.load(open('tools/rig-status.json')) if os.path.exists('tools/rig-status.json') else {}
p='game-assets-src/rig/tries.json'; tr=json.load(open(p)) if os.path.exists(p) else {}
if not st.get(sys.argv[1],{}).get('ok'): tr[sys.argv[1]]=tr.get(sys.argv[1],0)+1
json.dump(tr,open(p,'w'))
P
    done
  elif ! kill -0 $IMG 2>/dev/null; then
    break
  else
    sleep 60
  fi
done
echo "=== 끝 $(date '+%H:%M') · ok $(python3 -c "import json;print(sum(1 for v in json.load(open('tools/rig-status.json')).values() if v.get('ok')))")/91"
echo PIPELINE_DONE
