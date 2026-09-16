import json
import sys

import mlx_whisper

result = mlx_whisper.transcribe(
    sys.argv[1],
    path_or_hf_repo="mlx-community/whisper-small-mlx",
    language="th",
    task="transcribe",
)

print(json.dumps(result, ensure_ascii=False, indent=2))
