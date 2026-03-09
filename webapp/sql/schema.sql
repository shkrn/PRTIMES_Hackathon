-- Press Releases Table
CREATE TABLE IF NOT EXISTS press_releases (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS press_release_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial data
INSERT INTO press_releases (id, title, content, created_at, updated_at)
VALUES (
    1,
    '年収550万円以上で即内定！技術×ビジネス思考を磨く27・28卒向けハッカソン受付開始',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"プレスリリース配信サービス「PR TIMES」等を運営する株式会社PR TIMES（東京都港区、代表取締役：山口拓己、東証プライム、名証プレミア：3922）は、2026年3月9日（月）、10日（火）、11日（水）の3日間、2027・28年卒業予定のエンジニア志望学生(*1)を対象とした「PR TIMES HACKATHON 2026 Spring」をPR TIMES本社（赤坂インターシティ）で開催します。"}]},{"type":"paragraph","content":[{"type":"text","text":"一次募集締切は2026年2月1日（日） 23:59まで、下記フォームより本日からエントリー受付を開始いたします。"}]}]}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

INSERT INTO press_release_templates (id, name, title, content, created_at, updated_at)
VALUES (
    1,
    '製品発表テンプレート',
    '【新製品発表】製品名を公開',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"株式会社○○（本社：東京都、代表者：○○）は、新製品「○○」を発表したことをお知らせします。"}]},{"type":"paragraph","content":[{"type":"text","text":"本製品は、○○という課題を解決し、○○な価値を提供します。"}]},{"type":"paragraph","content":[{"type":"text","text":"今後も当社は、○○の実現に向けて取り組んでまいります。"}]}]}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('press_release_templates', 'id'),
    COALESCE((SELECT MAX(id) FROM press_release_templates), 0) + 1,
    false
);
