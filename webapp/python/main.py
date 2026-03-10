"""
Press Release Editor - FastAPI Implementation

FastAPI + psycopg を使用したプレスリリースAPI実装
"""
import json
import os
from datetime import datetime
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from openai import OpenAI
from pydantic import BaseModel
from dotenv import load_dotenv  
from pydantic import BaseModel, Field

# .envファイルを読み込む（Dockerコンテナ内で実行する場合も必要）
load_dotenv()
import psycopg
from fastapi import FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps
from psycopg.rows import dict_row
from schemas import TemplatePayload

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_IMAGE_EDGE = 600
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
}
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# FastAPIアプリケーションの初期化
app = FastAPI(
    title="Press Release Editor API",
    description="プレスリリース編集APIサーバー",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# データベース接続情報
def get_db_connection():
    """データベース接続を取得"""
    return psycopg.connect(
        host=os.getenv("DB_HOST", "postgresql"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "press_release_db"),
        user=os.getenv("DB_USER", "press_release"),
        password=os.getenv("DB_PASSWORD", "press_release"),
        row_factory=dict_row
    )


def parse_press_release_id(id_value: str) -> int:
    """URLパラメータIDを検証して整数化する"""
    if not id_value.isdigit():
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_ID", "message": "Invalid ID"},
        )

    press_release_id = int(id_value)
    if press_release_id <= 0:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_ID", "message": "Invalid ID"},
        )

    return press_release_id


async def parse_save_request(request: Request) -> tuple[str, str]:
    """POSTリクエストボディを検証し、文字数制限を適用する"""
    body = await request.body()

    try:
        payload = json.loads(body)
    except json.JSONDecodeError as err:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_JSON", "message": "Invalid JSON"},
        ) from err

    if not isinstance(payload, dict):
        payload = {}

    title = payload.get("title")
    content = payload.get("content")

    # 型チェックと必須チェック
    if not isinstance(title, str) or not isinstance(content, str):
        raise HTTPException(
            status_code=400,
            detail={"code": "MISSING_REQUIRED_FIELDS", "message": "Title and content are required"},
        )

    # 文字数バリデーション
    if len(title) > MAX_TITLE_LENGTH or len(content) > MAX_CONTENT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "TEXT_TOO_LONG",
                "message": f"Title must be {MAX_TITLE_LENGTH} characters or less and content must be {MAX_CONTENT_LENGTH} characters or less"
            },
        )

    return title, content



def format_timestamp(value: datetime) -> str:
    """タイムスタンプを標準日時文字列へ整形する"""
    return value.strftime("%Y-%m-%dT%H:%M:%S.%f")


def serialize_template(row: dict) -> dict:
    row["created_at"] = format_timestamp(row["created_at"])
    row["updated_at"] = format_timestamp(row["updated_at"])
    return row
def resize_image_if_needed(content_type: str, file_bytes: bytes) -> bytes:
    """JPEG/PNG は最大辺 600px へ縮小し、GIF はそのまま保存する"""
    if content_type == "image/gif":
        return file_bytes

    with Image.open(BytesIO(file_bytes)) as image:
        image = ImageOps.exif_transpose(image)
        width, height = image.size

        if max(width, height) <= MAX_IMAGE_EDGE:
            return file_bytes

        image.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE))

        if content_type == "image/jpeg" and image.mode not in ("RGB", "L"):
            image = image.convert("RGB")

        output = BytesIO()
        save_format = "JPEG" if content_type == "image/jpeg" else "PNG"
        image.save(output, format=save_format, optimize=True)
        return output.getvalue()


# エンドポイント
@app.get("/press-releases/{id}")
async def get_press_release(id: str):
    """
    プレスリリースを取得する

    Args:
        id: プレスリリースID

    Returns:
        PressRelease: プレスリリースデータ

    Raises:
        HTTPException: プレスリリースが見つからない場合
    """
    try:
        press_release_id = parse_press_release_id(id)
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, title, content, created_at, updated_at FROM press_releases WHERE id = %s",
                    (press_release_id,)
                )
                row = cur.fetchone()

                if row is None:
                    raise HTTPException(
                        status_code=404,
                        detail={"code": "NOT_FOUND", "message": "Press release not found"}
                    )

                # contentは文字列のまま返す
                row["created_at"] = format_timestamp(row["created_at"])
                row["updated_at"] = format_timestamp(row["updated_at"])
                return row

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": "Internal server error"}
        )


@app.post("/press-releases/{id}")
async def save_press_release(id: str, request: Request):
    """
    プレスリリースを保存（更新）する

    Args:
        id: プレスリリースID
        request: 保存リクエスト

    Returns:
        dict: 成功メッセージ

    Raises:
        HTTPException: バリデーションエラーまたはプレスリリースが見つからない場合
    """
    try:
        press_release_id = parse_press_release_id(id)
        title, content = await parse_save_request(request)

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # レコードの存在確認
                cur.execute(
                    "SELECT EXISTS(SELECT 1 FROM press_releases WHERE id = %s)",
                    (press_release_id,)
                )
                exists = cur.fetchone()['exists']

                if not exists:
                    raise HTTPException(
                        status_code=404,
                        detail={"code": "NOT_FOUND", "message": "Press release not found"}
                    )

                # プレスリリースを更新
                cur.execute(
                    """UPDATE press_releases
                       SET title = %s, content = %s, updated_at = CURRENT_TIMESTAMP
                       WHERE id = %s""",
                    (title, content, press_release_id)
                )
                conn.commit()

                # 更新後のデータを取得
                cur.execute(
                    "SELECT id, title, content, created_at, updated_at FROM press_releases WHERE id = %s",
                    (press_release_id,)
                )
                row = cur.fetchone()

                # contentは文字列のまま返す
                row["created_at"] = format_timestamp(row["created_at"])
                row["updated_at"] = format_timestamp(row["updated_at"])
                return row

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": "Internal server error"}
        )


@app.get("/templates")
async def list_templates():
    """保存済みテンプレート一覧を取得する"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, name, title, created_at, updated_at
                    FROM press_release_templates
                    ORDER BY updated_at DESC, id DESC
                    """
                )
                rows = cur.fetchall()
                return [serialize_template(row) for row in rows]

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": "Internal server error"}
        )


@app.post("/templates")
async def create_template(payload: TemplatePayload):
    """現在のプレスリリース内容をテンプレートとして保存する"""
    try:
        name = payload.name.strip()
        if not name:
            raise HTTPException(
                status_code=400,
                detail={"code": "MISSING_REQUIRED_FIELDS", "message": "Template name is required"}
            )

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO press_release_templates (name, title, content)
                    VALUES (%s, %s, %s)
                    RETURNING id, name, title, content, created_at, updated_at
                    """,
                    (name, payload.title, payload.content)
                )
                row = cur.fetchone()
                conn.commit()
                return serialize_template(row)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": "Internal server error"}
        )


@app.get("/templates/{id}")
async def get_template(id: str):
    """テンプレート詳細を取得する"""
    try:
        template_id = parse_press_release_id(id)
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, name, title, content, created_at, updated_at
                    FROM press_release_templates
                    WHERE id = %s
                    """,
                    (template_id,)
                )
                row = cur.fetchone()

                if row is None:
                    raise HTTPException(
                        status_code=404,
                        detail={"code": "NOT_FOUND", "message": "Template not found"}
                    )

                return serialize_template(row)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": "Internal server error"}
        )
@app.post("/uploads/images", status_code=201)
async def upload_image(request: Request, file: UploadFile = File(...)):
    """画像をアップロードし、必要に応じて縮小して公開URLを返す"""
    content_type = file.content_type or ""

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"message": "JPEG、PNG、GIFのみアップロードできます"},
        )

    try:
        file_bytes = await file.read()

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail={"message": "画像ファイルが必要です"},
            )

        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail={"message": "画像サイズは 5MB 以下にしてください"},
            )

        try:
            output_bytes = resize_image_if_needed(content_type, file_bytes)
        except OSError as err:
            raise HTTPException(
                status_code=400,
                detail={"message": "不正な画像形式です"},
            ) from err

        extension = ALLOWED_IMAGE_TYPES[content_type]
        file_name = f"{uuid4()}.{extension}"
        file_path = UPLOAD_DIR / file_name
        file_path.write_bytes(output_bytes)

        base_url = str(request.base_url).rstrip("/")
        return {"url": f"{base_url}/uploads/{file_name}"}
    finally:
        await file.close()


app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# カスタム例外ハンドラー
@app.exception_handler(HTTPException)
async def http_exception_handler(_request, exc: HTTPException):
    """HTTPExceptionのカスタムハンドラー"""
    # detailが辞書の場合はそのまま返す（{"code": "...", "message": "..."}形式）
    if isinstance(exc.detail, dict):
        return Response(
            content=json.dumps(exc.detail),
            status_code=exc.status_code,
            media_type="application/json"
        )
    # detailが文字列の場合は{"code": "ERROR", "message": "..."}形式に変換
    return Response(
        content=json.dumps({"code": "ERROR", "message": exc.detail}),
        status_code=exc.status_code,
        media_type="application/json"
    )


@app.get("/")
async def root():
    """ヘルスチェックエンドポイント"""
    return {"message": "Press Release Editor API is running"}

async def parse_save_request(request: Request) -> tuple[str, str]:
    """POSTリクエストボディを検証し、文字数制限を適用する"""
    body = await request.body()

    try:
        payload = json.loads(body)
    except json.JSONDecodeError as err:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_JSON", "message": "Invalid JSON"},
        ) from err

    if not isinstance(payload, dict):
        payload = {}

    title = payload.get("title")
    content = payload.get("content")

    # 型チェックと必須チェック
    if not isinstance(title, str) or not isinstance(content, str):
        raise HTTPException(
            status_code=400,
            detail={"code": "MISSING_REQUIRED_FIELDS", "message": "Title and content are required"},
        )

    # 文字数バリデーションを追加
    if len(title) > 100 or len(content) > 500:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "TEXT_TOO_LONG",
                "message": "Title must be 100 characters or less and content must be 500 characters or less"
            },
        )

    return title, content

class SpellCheckRequest(BaseModel):
    """誤字脱字チェックリクエスト"""
    text: str
    text_type: str  # "title" または "content"


class SpellCheckResponse(BaseModel):
    """誤字脱字チェックレスポンス"""
    has_errors: bool
    corrected_text: str
    suggestions: list[dict]
# --- Structured Outputs用のスキーマ定義 ---
class SpellCheckSuggestionDetail(BaseModel):
    type: str = Field(description="指摘の種類（'誤字', '脱字', '文法', '表現', '敬語' のいずれか）")
    original: str = Field(description="修正対象となる元のテキストの部分")
    suggestion: str = Field(description="修正案")
    reason: str = Field(description="修正を提案する具体的な理由")

class SpellCheckStructuredOutput(BaseModel):
    has_errors: bool = Field(description="1つでも修正すべき点が見つかった場合はtrue、修正点がゼロの場合はfalse")
    corrected_text: str = Field(description="修正をすべて適用した後の完全なテキスト。has_errorsがfalseの場合は元のテキストをそのまま出力。")
    suggestions: list[SpellCheckSuggestionDetail] = Field(description="修正提案のリスト。エラーがない場合は空の配列。")

@app.post("/spell-check")
async def check_spelling(request: SpellCheckRequest):
    """
    タイトルまたは本文の誤字脱字をチェックする
    """
    try:
        # APIキーとクライアントの確認
        if not OPENAI_API_KEY or not client:
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "SERVICE_UNAVAILABLE",
                    "message": "誤字脱字チェック機能は現在利用できません（APIキー未設定）"
                }
            )
        print(request.text)
        
        if not request.text or not request.text.strip():
            raise HTTPException(
                status_code=400,
                detail={"code": "EMPTY_TEXT", "message": "Text is required"}
            )
        
        # --- プロンプトの明確化（一文単位の分割処理とマルチパス・スキャンの強制） ---
        base_prompt = """あなたは「超高精度校正エンジン」です。文脈による推測を排除し、一文字ずつの文字コードを照合するレベルで厳密な校正を行います。

【処理プロセス（内部ステップ）】
1. 入力テキストを一単語ずつ独立したタスクとしてスキャンしてください。
2. 各文に対し、以下の3層の検証を必ず実行し、すべての誤字脱字を過不足なく抽出してください：
   - 層A：カタカナ表記（長音符「ー」の欠落や不要な追加等）、固有名詞、専門用語。
   - 層B：助詞（てにをは）の不自然な連続・欠落、同音異義語の誤変換（「機会」と「機械」、「自信」と「自身」等）。
   - 層C：論理整合性（日付、曜日、時間の矛盾）およびその他の全般的な誤字脱字。

【厳守するルール】
- 元のテキストの意図、事実関係、段落構成、改行位置は絶対にそのまま保持すること。
- 指摘箇所が複数ある場合は、必ずすべて網羅すること。
- 修正すべき箇所が一切ない場合のみ、has_errorsをfalseとしてください。
-プレスリリスは誤字で正しくはプレスリリースである。もし存在する場合は必ずこれを指摘してください。
"""

        if request.text_type == "title":
            system_prompt = base_prompt + "\n対象はプレスリリースの「タイトル」です。簡潔かつ正確な表現が求められます。"
        else:
            system_prompt = base_prompt + "\n対象はプレスリリースの「本文」です。上記に加え、正しい敬語（尊敬語、謙譲語、丁寧語）が使われているかも厳格にチェックしてください。"

        # Structured Outputsを利用 (parseメソッドを使用し、Pydanticモデルを渡す)
        response = client.beta.chat.completions.parse(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"以下のテキストを厳密に校正してください：\n\n{request.text}"}
            ],
            response_format=SpellCheckStructuredOutput,
            temperature=0,
        )
        print(response.choices[0].message.parsed)
        
        # パースされたオブジェクトを取得
        result = response.choices[0].message.parsed
        
        return {
            "has_errors": result.has_errors,
            "corrected_text": result.corrected_text,
            "suggestions": [suggestion.model_dump() for suggestion in result.suggestions]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"誤字脱字チェックエラー: {e}")
        raise HTTPException(
            status_code=500,
            detail={"code": "SPELL_CHECK_ERROR", "message": f"誤字脱字チェックに失敗しました: {str(e)}"}
        )