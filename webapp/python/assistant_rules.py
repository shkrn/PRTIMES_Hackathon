REQUIRED_FIELDS = [
    "companyName",
    "announcementTitle",
    "announcementDate",
    "problem",
    "keyBenefits",
    "targetAudience",
]

QUESTION_TEMPLATES = {
    "companyName": [
        "今回の発表主体となる会社名や団体名を教えてください。",
        "どの企業・団体が発表する内容ですか？",
    ],
    "announcementTitle": [
        "何を発表するプレスリリースにしたいですか？",
        "新サービスや新施策の内容をひとことで教えてください。",
    ],
    "announcementDate": [
        "発表日または提供開始日はいつですか？",
        "読者に伝えるべき日付があれば教えてください。",
    ],
    "problem": [
        "どのような課題や背景があって今回の発表に至ったのでしょうか？",
        "この取り組みは何を解決するものですか？",
    ],
    "keyBenefits": [
        "主な特徴や価値を教えてください。",
        "読者に最も伝えたい強みは何ですか？",
    ],
    "targetAudience": [
        "主な対象ユーザーや顧客層は誰ですか？",
        "この発表は主にどのような人や企業向けですか？",
    ],
}

QUALITY_RULES = [
    "事実が不足している部分は推測で補わず、追加質問を優先すること。",
    "誇大表現を避け、プレスリリースらしい事実ベースの文体にすること。",
    "冒頭で誰が何を発表したかを明確に示すこと。",
    "読者にとっての便益や特徴を具体的に書くこと。",
    "情報が足りない場合は完成稿を無理に出さず、必要最小限の質問を返すこと。",
]

OUTPUT_FORMAT_INSTRUCTIONS = """
返答は必ず JSON オブジェクトのみで返してください。コードブロックは禁止です。
JSON 形式:
{
  "status": "asking" | "draft_ready",
  "assistantMessage": "string",
  "followUpQuestions": ["string"],
  "missingFields": ["string"],
  "draftTitle": "string or null",
  "draftContent": "string or null"
}
asking の場合は draftTitle と draftContent を null にしてください。
draft_ready の場合は followUpQuestions を空配列にしてください。
""".strip()


def build_system_prompt() -> str:
    required_fields_text = "\n".join(f"- {field}" for field in REQUIRED_FIELDS)
    quality_rules_text = "\n".join(f"- {rule}" for rule in QUALITY_RULES)

    return f"""
あなたは日本語のプレスリリース作成支援アシスタントです。
ユーザーの回答を見て、不足情報があれば必要最小限の追加質問を返し、十分な情報が揃ったらプレスリリースの下書きを生成してください。

必須確認項目:
{required_fields_text}

品質ルール:
{quality_rules_text}

{OUTPUT_FORMAT_INSTRUCTIONS}
""".strip()