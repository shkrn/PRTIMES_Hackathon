from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TemplatePayload(BaseModel):
    name: str
    title: str
    content: str


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("content must not be empty")
        return stripped


class DraftContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = ""
    contentText: str = ""
    language: str = "ja"


class AssistantChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pressReleaseId: int | None = None
    mode: Literal["draft"] = "draft"
    messages: list[ChatMessage] = Field(min_length=1)
    currentDraftContext: DraftContext = Field(default_factory=DraftContext)


class AssistantError(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str


class DraftMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    format: Literal["plain_text"] = "plain_text"
    version: int = 1


class AssistantChatResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["asking", "draft_ready", "error"]
    assistantMessage: str
    followUpQuestions: list[str] = Field(default_factory=list)
    missingFields: list[str] = Field(default_factory=list)
    draftTitle: str | None = None
    draftContent: str | None = None
    draftMeta: DraftMeta | None = None
    error: AssistantError | None = None
