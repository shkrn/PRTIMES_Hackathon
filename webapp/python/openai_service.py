import json
import os

from openai import AsyncOpenAI, OpenAIError

from assistant_rules import REQUIRED_FIELDS, build_system_prompt
from schemas import AssistantChatRequest, AssistantChatResponse, DraftMeta


class AssistantServiceError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _build_context_message(payload: AssistantChatRequest) -> str:
    title = payload.currentDraftContext.title.strip() or "(未入力)"
    content_text = payload.currentDraftContext.contentText.strip() or "(未入力)"

    return (
        "現在の編集コンテキスト:\n"
        f"- pressReleaseId: {payload.pressReleaseId}\n"
        f"- mode: {payload.mode}\n"
        f"- title: {title}\n"
        f"- contentText: {content_text}\n"
        f"- language: {payload.currentDraftContext.language}\n"
        f"- requiredFields: {', '.join(REQUIRED_FIELDS)}"
    )


def _normalize_response(data: dict) -> AssistantChatResponse:
    response = AssistantChatResponse.model_validate(
        {
            "status": data.get("status", "error"),
            "assistantMessage": data.get("assistantMessage") or "応答の生成に失敗しました。",
            "followUpQuestions": data.get("followUpQuestions") or [],
            "missingFields": data.get("missingFields") or [],
            "draftTitle": data.get("draftTitle"),
            "draftContent": data.get("draftContent"),
            "draftMeta": DraftMeta() if data.get("status") == "draft_ready" else None,
            "error": None,
        }
    )

    if response.status == "draft_ready" and (not response.draftTitle or not response.draftContent):
        return AssistantChatResponse(
            status="error",
            assistantMessage="下書き応答の形式が不正でした。",
            followUpQuestions=[],
            missingFields=[],
            draftTitle=None,
            draftContent=None,
            draftMeta=None,
            error={"code": "INVALID_AI_RESPONSE", "message": "draft fields are missing"},
        )

    return response


async def generate_assistant_reply(payload: AssistantChatRequest) -> AssistantChatResponse:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise AssistantServiceError("OPENAI_API_KEY_MISSING", "OPENAI_API_KEY is not configured")

    model = os.getenv("OPENAI_API_MODEL", "gpt-4o-mini")
    client = AsyncOpenAI(api_key=api_key)
    messages = [
        {"role": "system", "content": build_system_prompt()},
        {"role": "system", "content": _build_context_message(payload)},
        *[{"role": message.role, "content": message.content} for message in payload.messages],
    ]

    try:
        completion = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.4,
            response_format={"type": "json_object"},
        )
    except OpenAIError as exc:
        raise AssistantServiceError("OPENAI_REQUEST_FAILED", "OpenAI request failed") from exc
    except Exception as exc:
        raise AssistantServiceError("OPENAI_REQUEST_FAILED", "Unexpected OpenAI request failure") from exc

    content = completion.choices[0].message.content if completion.choices else None
    if not content:
        raise AssistantServiceError("EMPTY_AI_RESPONSE", "OpenAI response was empty")

    try:
        payload_data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise AssistantServiceError("INVALID_AI_RESPONSE", "OpenAI response was not valid JSON") from exc

    try:
        return _normalize_response(payload_data)
    except Exception as exc:
        raise AssistantServiceError("INVALID_AI_RESPONSE", "OpenAI response did not match the expected schema") from exc