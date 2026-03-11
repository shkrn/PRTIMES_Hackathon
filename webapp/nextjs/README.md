# Next.js実装（フロントエンド）

このディレクトリは Next.js（App Router）によるフロントエンド実装です。

バックエンドAPIの起動方法や全体構成は [webapp/README.md](../README.md) を参照してください。

## 前提条件

- Node.js 20 以上
- npm
- PostgreSQL 16（`webapp/docker-compose.yml` で起動）

## セットアップ

```bash
npm install
```

## データベース起動

`webapp` ディレクトリで以下を実行:

```bash
docker compose up -d db
```

初期化SQLは `webapp/sql/schema.sql` です。

## 起動

```bash
npm run dev
```

`webapp/.env` に共通の環境変数を配置してください。Next.js はこのファイルを追加で読み込みます。

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PYTHON_API_URL=http://localhost:8080
```

ブラウザ向けの接続先を変える場合だけ `nextjs/.env.local` を使ってください。

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

起動後、`http://localhost:3000` を開いてください。Next.js はフロントエンドのみを担当し、API は Python バックエンドを直接呼び出します。

## npmコマンド一覧

- `npm run dev`: 開発サーバーを起動
- `npm run build`: 本番用ビルドを作成
- `npm run start`: ビルド済みアプリを起動
- `npm run lint`: ESLintを実行

## 連携API

- `GET http://localhost:8080/press-releases/:id`
- `POST http://localhost:8080/press-releases/:id`
- `POST http://localhost:8080/assistant/chat`
- `POST http://localhost:8080/uploads/images`
- `GET http://localhost:8080/uploads/:fileName`

API仕様は [webapp/README.md](../README.md) を参照してください。
