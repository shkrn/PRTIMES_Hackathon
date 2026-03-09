from pydantic import BaseModel


class TemplatePayload(BaseModel):
    name: str
    title: str
    content: str
