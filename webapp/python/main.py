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

import psycopg
from fastapi import FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps
from psycopg.rows import dict_row

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
    """POSTリクエストボディをPHP/Go実装と同等ルールで検証する"""
    body = await request.body()

    try:
        payload = json.loads(body)
    except json.JSONDecodeError as err:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_JSON", "message": "Invalid JSON"},
        ) from err

    # JSONオブジェクトでない場合は必須フィールド不足として扱う
    if not isinstance(payload, dict):
        payload = {}

    title = payload.get("title")
    content = payload.get("content")
    if not isinstance(title, str) or not isinstance(content, str):
        raise HTTPException(
            status_code=400,
            detail={"code": "MISSING_REQUIRED_FIELDS", "message": "Title and content are required"},
        )

    # 空白のみタイトルも許容（PHP/Goと同じ）
    return title, content


def format_timestamp(value: datetime) -> str:
    """タイムスタンプを標準日時文字列へ整形する"""
    return value.strftime("%Y-%m-%dT%H:%M:%S.%f")


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

