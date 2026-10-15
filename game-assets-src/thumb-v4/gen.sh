#!/bin/bash
# 구구성 수호대 킹수학 썸네일 v4 그림 — GPT 웹앱(썸네일 HARD · 붐비면 gpt-web.py 가 Firefly 로 넘김).
# 참조판 = make-ref.py(2D 원화 아군 6·괴물 4). jobs.jsonl(art-a·b) 은 날개 말이 제목 자리(위 38%)로 올라가
# 글자에 가렸다 → jobs2.jsonl(art-c·d)에 «40% 선 위는 하늘만» 규칙을 더했다. 채택 = art-c.
# 채택본을 art.webp 로 줄여 커밋하고 tools/build-thumb-v4.py 가 글자를 얹는다.
set -e
D=/Users/sim-insu/Documents/dev/gugu-guardians/game-assets-src/thumb-v4
~/.claude/venvs/vibes/bin/python "$D/make-ref.py"
~/.claude/venvs/vibes/bin/python ~/.claude/bin/gpt-web.py --image-batch "$D/jobs2.jsonl"
~/.claude/venvs/vibes/bin/python -c "from PIL import Image; Image.open('$D/art-c.png').convert('RGB').save('$D/art.webp','WEBP',quality=90,method=6)"
echo ART_DONE
