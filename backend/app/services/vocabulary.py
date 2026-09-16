from collections import Counter

from pythainlp.tokenize import word_tokenize


IGNORED_TOKENS = {
    " ", "ครับ", "ค่ะ", "คะ", "นะ", "น่ะ", "อ่ะ", "เอ่อ", "อืม", "และ", "หรือ",
    "ที่", "ใน", "ของ", "เป็น", "ได้", "ให้", "จะ", "ไม่", "ก็", "กับ",
}


def extract_recurring_phrases(transcript: str, limit: int = 24) -> list[dict[str, int | str]]:
    """Rank repeated Thai words and short phrases without asking an LLM to count."""
    tokens = [
        token.strip()
        for token in word_tokenize(transcript, engine="newmm", keep_whitespace=False)
        if token.strip() and token.strip() not in IGNORED_TOKENS and not token.strip().isascii()
    ]
    candidates: Counter[str] = Counter(tokens)
    for size in (2, 3):
        for index in range(len(tokens) - size + 1):
            phrase = "".join(tokens[index : index + size])
            if len(phrase) > 2:
                candidates[phrase] += 1

    ranked = [
        {"text": text, "count": count}
        for text, count in candidates.items()
        if count >= 2
    ]
    ranked.sort(key=lambda item: (-int(item["count"]), -len(str(item["text"])), str(item["text"])))
    return ranked[:limit]
