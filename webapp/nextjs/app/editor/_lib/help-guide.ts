export const HELP_ROOT_ID = 'help-root' as const;
export const HELP_STORAGE_KEY = 'prtimes-editor-help-checks';

export type HelpBranchId = string;
export type ManualHelpCheckId =
  | 'audience'
  | 'newsValue'
  | 'leadSummary'
  | 'cta'
  | 'proofread'
  | 'address'
  | 'season';
export type AutoHelpCheckId =
  | 'titleLength'
  | 'bodyLength'
  | 'hasList'
  | 'hasImage'
  | 'hasLink'
  | 'aiDraftGenerated'
  | 'aiSpellCheck'
  | 'saveShortcut'
  | 'formatShortcut'
  | 'historyShortcut'
  | 'templateLoaded'
  | 'templateSaved';
export type HelpCheckId = ManualHelpCheckId | AutoHelpCheckId;
export type HelpNodeId = typeof HELP_ROOT_ID | HelpBranchId | HelpCheckId;
export type HelpItem = {
  id: HelpCheckId;
  title: string;
  detail: string;
  kind: 'manual' | 'auto';
};
export type HelpBranch = {
  id: HelpBranchId;
  title: string;
  summary: string;
  detail: string;
  items: HelpTreeNode[];
};
export type HelpTreeNode = HelpBranch | HelpItem;
export type HelpSelection =
  | {
      kind: 'root';
      title: string;
      summary: string;
      detail: string;
      items: HelpBranch[];
    }
  | {
      kind: 'branch';
      branch: HelpBranch;
      ancestors: HelpBranch[];
    }
  | {
      kind: 'item';
      item: HelpItem;
      ancestors: HelpBranch[];
    };
export type PendingHelpItem = {
  item: HelpItem;
  ancestors: HelpBranch[];
};
export type HelpNodeProgress = {
  completed: number;
  total: number;
};

export type ManualHelpChecks = Record<ManualHelpCheckId, boolean>;
export type AutoHelpChecks = Record<AutoHelpCheckId, boolean>;
export type TemplateGuideState = {
  hasLoadedTemplate: boolean;
  hasSavedTemplate: boolean;
};
export type KeyboardShortcutGuideState = {
  hasUsedSaveShortcut: boolean;
  hasUsedFormatShortcut: boolean;
  hasUsedHistoryShortcut: boolean;
};
export type AiGuideState = {
  hasGeneratedDraft: boolean;
  hasUsedSpellCheck: boolean;
};

type HelpDocument = Record<string, unknown>;

export const HELP_ROOT = {
  title: '作成ガイド',
  summary: '迷ったら、企画の芯から公開前確認まで左から右へ順に確認してください。',
  detail:
    'このガイドは、プレスリリース作成で落としやすい確認項目をスキルツリー風に並べたものです。ノードを押すと補足が読めて、手動項目はその場でチェックできます。',
} as const;

export const MANUAL_HELP_CHECK_IDS: ManualHelpCheckId[] = [
  'audience',
  'newsValue',
  'leadSummary',
  'cta',
  'proofread',
  'address',
  'season',
];

export const DEFAULT_MANUAL_HELP_CHECKS: ManualHelpChecks = {
  audience: false,
  newsValue: false,
  leadSummary: false,
  cta: false,
  proofread: false,
  address: false,
  season: false,
};

export const HELP_BRANCHES: HelpBranch[] = [
  {
    id: 'planning',
    title: '企画の芯',
    summary: '誰に向けた発表で、何が新しいのかを先に固定します。',
    detail:
      '最初に読者像とニュース価値を言語化しておくと、タイトル、本文、画像の判断がぶれにくくなります。',
    items: [
      {
        id: 'audience',
        title: '読者像を一文で言える',
        detail:
          '「誰に読んでほしいか」を一文で言える状態にしてください。読者が決まると、言葉遣いと見せ方が定まります。',
        kind: 'manual',
      },
      {
          id: 'newsValue',
          title: '新しさを整理できた',
          detail:
            '今回の発表で何が新しいのか、従来との違いは何かを先に整理してください。差分が曖昧だと本文が散らばります。',
          kind: 'manual',
      },
    ],
  },
  {
    id: 'shortcuts',
    title: 'ショートカット',
    summary: '保存や装飾をキーボードで操作できると、編集の往復が速くなります。',
    detail:
      'このエディタでは、保存、文字装飾、元に戻す/やり直しにショートカットが使えます。1回実際に試しておくと、本文調整のテンポがかなり上がります。',
    items: [
      {
        id: 'saveShortcut',
        title: 'Cmd/Ctrl+S で保存した',
        detail:
          '保存ボタンを押さなくても、Cmd/Ctrl+S でそのまま保存できます。修正を細かく反映したいときに使うと作業が止まりにくくなります。',
        kind: 'auto',
      },
      {
        id: 'formatShortcut',
        title: 'Cmd/Ctrl+B・I・U で装飾した',
        detail:
          '強調したい語句は Cmd/Ctrl+B で太字、Cmd/Ctrl+I で斜体、Cmd/Ctrl+U で下線にできます。ツールバーに触らず整えられるようにしておくと編集が速くなります。',
        kind: 'auto',
      },
      {
        id: 'historyShortcut',
        title: 'Cmd/Ctrl+Z で戻し、やり直しも試した',
        detail:
          '誤って編集したときは Cmd/Ctrl+Z で元に戻せます。やり直しは Shift+Cmd/Ctrl+Z で使えます。試しながら書くときに必須の操作です。',
        kind: 'auto',
      },
    ],
  },
  {
    id: 'templates',
    title: 'テンプレート活用',
    summary: '下書きの流用と再利用用の保存を使い分けて、作成を早めます。',
    detail:
      'テンプレート機能は、書き出しを速くしたいときと、使い回せる構成を残したいときの両方で役立ちます。必要な場面で読み込みと保存を使い分けてください。',
    items: [
      {
        id: 'templateLoaded',
        title: 'テンプレートを読み込んで土台を作った',
        detail:
          '過去に使った構成や定型フォーマットがある場合は、テンプレートを読み込んでから編集を始めると入力を減らせます。上部のテンプレート選択と「テンプレート読込」を使ってください。',
        kind: 'auto',
      },
      {
        id: 'templateSaved',
        title: '再利用しやすい形でテンプレート保存した',
        detail:
          '今後も使い回す見出し構成や本文の型ができたら、分かりやすい名前でテンプレート保存してください。チーム内での再利用や次回作成の短縮に役立ちます。',
        kind: 'auto',
      },
    ],
  },
  {
    id: 'ai-tools',
    title: 'AI機能',
    summary: '作成支援チャットと誤字脱字チェックを使うと、下書き作成と公開前確認が速くなります。',
    detail:
      'AI 機能は、本文のたたき台づくりと最終チェックで役割が分かれています。作成支援チャットで下書きを作り、公開前に誤字脱字チェックを回す流れで使うと安定します。',
    items: [
      {
        id: 'aiDraftGenerated',
        title: '作成支援チャットで下書きを作成した',
        detail:
          '右側の作成支援チャットに発表内容を送ると、AI が不足情報を確認しながら本文下書きを作成します。下書きカードが出たら「本文へ反映」でそのまま編集に戻れます。',
        kind: 'auto',
      },
      {
        id: 'aiSpellCheck',
        title: 'AIの誤字脱字チェックを実行した',
        detail:
          'タイトルまたは本文の「チェック」ボタンを使って、公開前に一度 AI の誤字脱字チェックを実行してください。固有名詞や日付の見落としを減らせます。',
        kind: 'auto',
      },
    ],
  },
  {
    id: 'headline',
    title: 'タイトルと導入',
    summary: '結論を前に出して、最初の数秒で内容を掴めるようにします。',
    detail:
      'タイトルと冒頭は最も読まれる部分です。主語と変化点を先に置き、導入で結論を先出ししてください。',
    items: [
      {
        id: 'titleLength',
        title: 'タイトルは100文字以内',
        detail:
          '長すぎるタイトルは要点が埋もれます。主語、何が起きたか、読み手に関係する変化点が先頭で伝わる長さに保ってください。',
        kind: 'auto',
      },
      {
        id: 'leadSummary',
        title: '導入で結論を先出しした',
        detail:
          '冒頭1〜2文で「誰が、何を、なぜ今出すのか」をまとめてください。そのあとに背景や詳細を置くと読みやすくなります。',
        kind: 'manual',
      },
    ],
  },
  {
    id: 'structure',
    title: '本文構成',
    summary: '要点を短く分け、流し読みでも拾える並びにします。',
    detail:
      '長い段落だけで押し切らず、要点を区切って配置してください。箇条書きがあると比較情報や仕様が読み取りやすくなります。',
    items: [
      {
        id: 'bodyLength',
        title: '本文は500文字以内',
        detail:
          '本文が長くなりすぎたら、情報を削るか箇条書きに分解してください。短い文の連なりの方が要点が通ります。',
        kind: 'auto',
      },
      {
        id: 'hasList',
        title: '箇条書きで要点整理した',
        detail:
          '仕様、開催概要、特徴比較などは箇条書きにすると視認性が上がります。文章だけで埋めないのが基本です。',
        kind: 'auto',
      },
    ],
  },
  {
    id: 'assets',
    title: '画像と導線',
    summary: '理解を助ける素材と、次の行動につながるリンクを用意します。',
    detail:
      '画像は本文の理解補助として使い、リンクは詳細確認や問い合わせなど次のアクションを支えるものを置いてください。',
    items: [
      {
        id: 'hasImage',
        title: '画像を1枚以上入れた',
        detail:
          '本文と関係のある画像を1枚でも入れると、内容の把握が速くなります。画像単体で意味が通じるかも確認してください。',
        kind: 'auto',
      },
      {
        id: 'hasLink',
        title: '参照リンクを配置した',
        detail:
          '詳細ページや問い合わせ先に飛べるリンクを入れてください。読了後の行動導線がないと離脱しやすくなります。',
        kind: 'auto',
      },
    ],
  },
  {
    id: 'review',
    title: '公開前確認',
    summary: '最後にアクションの明確さと表記の正しさを見直します。',
    detail:
      '公開前の最終チェックで事故を減らします。読後アクションと固有名詞の確認は、最後にまとめて見直すのが効率的です。',
    items: [
      {
        id: 'cta',
        title: '読後アクションが明確',
        detail:
          '資料請求、申込み、問い合わせなど、読んだあとに何をしてほしいかが本文中で分かるか確認してください。',
        kind: 'manual',
      },
      {
        id: 'proofread',
        title: '誤字脱字と固有名詞を確認',
        detail:
          '会社名、製品名、日付、URL、数字は最後にまとめて見直してください。表記ゆれもこの段階で揃えます。',
        kind: 'manual',
      },
    ],
  },
  {
    id: 'one-point',
    title: 'One Point アドバイス​',
    summary: 'PRを​より​効果的に​届ける​ヒントを​お伝えします。',
    detail:
      'PRを​より​効果的に​届ける​ヒントを​お伝えします。',
    items: [
      {
        id: 'address',
        title: '住所を​追加した',
        detail:
          '活動拠点を​明記する​ことで、​同地域の​方々の​目に​留まりやすくなります。​',
        kind: 'manual',
      },
      {
        id: 'season',
        title: '「旬」を​捉え、​共感を​呼ぶ。​',
        detail:
          '季節の​イベントや​記念日を​添える​ことで、​「今」と​いう​特別感が​生まれ、​メディアや​地域の​方々に​「自分たちの​ための​ニュースだ」と​身近に​感じて​もらいやすくなります。',
        kind: 'manual',
      },
    ],
  },
];

export const HELP_ITEMS = flattenHelpItems(HELP_BRANCHES);

type ValidationOptions = {
  titleCount: number;
  contentCount: number;
  maxTitleLength: number;
  maxContentLength: number;
};

export function getValidationErrors({
  titleCount,
  contentCount,
  maxTitleLength,
  maxContentLength,
}: ValidationOptions): string[] {
  const errors: string[] = [];

  if (titleCount > maxTitleLength) {
    errors.push(`タイトルが${maxTitleLength}文字を超えています（現在${titleCount}文字）`);
  }

  if (contentCount > maxContentLength) {
    errors.push(`本文が${maxContentLength}文字を超えています（現在${contentCount}文字）`);
  }

  return errors;
}

export function parseStoredManualHelpChecks(rawValue: string | null): ManualHelpChecks | null {
  if (!rawValue) {
    return null;
  }

  const parsed = JSON.parse(rawValue) as Partial<Record<ManualHelpCheckId, boolean>>;
  const next: ManualHelpChecks = { ...DEFAULT_MANUAL_HELP_CHECKS };

  for (const key of MANUAL_HELP_CHECK_IDS) {
    if (typeof parsed[key] === 'boolean') {
      next[key] = parsed[key];
    }
  }

  return next;
}

type BuildAutoHelpChecksOptions = {
  title: string;
  titleCount: number;
  contentCount: number;
  maxTitleLength: number;
  maxContentLength: number;
  editorDocument: HelpDocument;
  templateGuideState: TemplateGuideState;
  keyboardShortcutGuideState: KeyboardShortcutGuideState;
  aiGuideState: AiGuideState;
};

export function buildAutoHelpChecks({
  title,
  titleCount,
  contentCount,
  maxTitleLength,
  maxContentLength,
  editorDocument,
  templateGuideState,
  keyboardShortcutGuideState,
  aiGuideState,
}: BuildAutoHelpChecksOptions): AutoHelpChecks {
  const trimmedTitleCount = title.trim().length;

  return {
    titleLength: trimmedTitleCount > 0 && titleCount <= maxTitleLength,
    bodyLength: contentCount > 0 && contentCount <= maxContentLength,
    hasList: hasNodeType(editorDocument, 'bulletList') || hasNodeType(editorDocument, 'orderedList'),
    hasImage: hasNodeType(editorDocument, 'image'),
    hasLink: hasMarkType(editorDocument, 'link'),
    aiDraftGenerated: aiGuideState.hasGeneratedDraft,
    aiSpellCheck: aiGuideState.hasUsedSpellCheck,
    saveShortcut: keyboardShortcutGuideState.hasUsedSaveShortcut,
    formatShortcut: keyboardShortcutGuideState.hasUsedFormatShortcut,
    historyShortcut: keyboardShortcutGuideState.hasUsedHistoryShortcut,
    templateLoaded: templateGuideState.hasLoadedTemplate,
    templateSaved: templateGuideState.hasSavedTemplate,
  };
}

type BuildHelpStatusTextOptions = {
  manualHelpChecks: ManualHelpChecks;
  autoHelpChecks: AutoHelpChecks;
  titleCount: number;
  contentCount: number;
  maxTitleLength: number;
  maxContentLength: number;
};

export function buildHelpStatusText({
  manualHelpChecks,
  autoHelpChecks,
  titleCount,
  contentCount,
  maxTitleLength,
  maxContentLength,
}: BuildHelpStatusTextOptions): Record<HelpCheckId, string> {
  return {
    audience: manualHelpChecks.audience ? 'チェック済み' : '未確認',
    newsValue: manualHelpChecks.newsValue ? 'チェック済み' : '未確認',
    leadSummary: manualHelpChecks.leadSummary ? 'チェック済み' : '未確認',
    cta: manualHelpChecks.cta ? 'チェック済み' : '未確認',
    proofread: manualHelpChecks.proofread ? 'チェック済み' : '未確認',
    titleLength: `${titleCount}/${maxTitleLength}文字`,
    bodyLength: `${contentCount}/${maxContentLength}文字`,
    hasList: autoHelpChecks.hasList ? '箇条書きあり' : '箇条書きなし',
    hasImage: autoHelpChecks.hasImage ? '画像あり' : '画像なし',
    hasLink: autoHelpChecks.hasLink ? 'リンクあり' : 'リンクなし',
    aiDraftGenerated: autoHelpChecks.aiDraftGenerated ? '作成済み' : '未作成',
    aiSpellCheck: autoHelpChecks.aiSpellCheck ? '実行済み' : '未実行',
    saveShortcut: autoHelpChecks.saveShortcut ? '使用済み' : '未使用',
    formatShortcut: autoHelpChecks.formatShortcut ? '使用済み' : '未使用',
    historyShortcut: autoHelpChecks.historyShortcut ? '使用済み' : '未使用',
    templateLoaded: autoHelpChecks.templateLoaded ? '読込済み' : '未読込',
    templateSaved: autoHelpChecks.templateSaved ? '保存済み' : '未保存',
    address: manualHelpChecks.address ? 'チェック済み' : '未確認',
    season: manualHelpChecks.season ? 'チェック済み' : '未確認',
  };
}

export function isHelpItemComplete(
  itemId: HelpCheckId,
  manualHelpChecks: ManualHelpChecks,
  autoHelpChecks: AutoHelpChecks
): boolean {
  return itemId in manualHelpChecks
    ? manualHelpChecks[itemId as ManualHelpCheckId]
    : autoHelpChecks[itemId as AutoHelpCheckId];
}

export function findHelpSelection(selectedId: HelpNodeId): HelpSelection {
  if (selectedId === HELP_ROOT_ID) {
    return {
      kind: 'root',
      title: HELP_ROOT.title,
      summary: HELP_ROOT.summary,
      detail: HELP_ROOT.detail,
      items: HELP_BRANCHES,
    };
  }

  const found = findHelpSelectionInNodes(HELP_BRANCHES, selectedId, []);
  if (found) {
    return found;
  }

  return {
    kind: 'root',
    title: HELP_ROOT.title,
    summary: HELP_ROOT.summary,
    detail: HELP_ROOT.detail,
    items: HELP_BRANCHES,
  };
}

export function isHelpBranchNode(node: HelpTreeNode): node is HelpBranch {
  return 'items' in node;
}

export function getHelpNodeProgress(
  node: HelpTreeNode,
  isComplete: (itemId: HelpCheckId) => boolean
): HelpNodeProgress {
  if (!isHelpBranchNode(node)) {
    return { completed: isComplete(node.id) ? 1 : 0, total: 1 };
  }

  return getHelpNodesProgress(node.items, isComplete);
}

export function getHelpNodesProgress(
  nodes: HelpTreeNode[],
  isComplete: (itemId: HelpCheckId) => boolean
): HelpNodeProgress {
  return nodes.reduce<HelpNodeProgress>(
    (progress, node) => {
      const current = getHelpNodeProgress(node, isComplete);
      return {
        completed: progress.completed + current.completed,
        total: progress.total + current.total,
      };
    },
    { completed: 0, total: 0 }
  );
}

export function collectPendingHelpItems(
  nodes: HelpTreeNode[],
  isComplete: (itemId: HelpCheckId) => boolean,
  limit?: number
): PendingHelpItem[] {
  const pendingItems: PendingHelpItem[] = [];

  collectPendingHelpItemsInternal(nodes, isComplete, [], pendingItems, limit);
  return pendingItems;
}

function findHelpSelectionInNodes(
  nodes: HelpTreeNode[],
  selectedId: HelpNodeId,
  ancestors: HelpBranch[]
): HelpSelection | null {
  for (const node of nodes) {
    if (isHelpBranchNode(node)) {
      if (node.id === selectedId) {
        return { kind: 'branch', branch: node, ancestors };
      }

      const found = findHelpSelectionInNodes(node.items, selectedId, [...ancestors, node]);
      if (found) {
        return found;
      }

      continue;
    }

    if (node.id === selectedId) {
      return { kind: 'item', item: node, ancestors };
    }
  }

  return null;
}

function flattenHelpItems(nodes: HelpTreeNode[]): HelpItem[] {
  return nodes.flatMap((node) =>
    isHelpBranchNode(node) ? flattenHelpItems(node.items) : node
  );
}

function collectPendingHelpItemsInternal(
  nodes: HelpTreeNode[],
  isComplete: (itemId: HelpCheckId) => boolean,
  ancestors: HelpBranch[],
  results: PendingHelpItem[],
  limit?: number
): void {
  for (const node of nodes) {
    if (typeof limit === 'number' && results.length >= limit) {
      return;
    }

    if (isHelpBranchNode(node)) {
      collectPendingHelpItemsInternal(node.items, isComplete, [...ancestors, node], results, limit);
      continue;
    }

    if (!isComplete(node.id)) {
      results.push({ item: node, ancestors });
    }
  }
}

function hasNodeType(node: unknown, targetType: string): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const current = node as HelpDocument;
  if (current.type === targetType) {
    return true;
  }

  const content = Array.isArray(current.content) ? current.content : [];
  return content.some((child) => hasNodeType(child, targetType));
}

function hasMarkType(node: unknown, targetType: string): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const current = node as HelpDocument;
  const marks = Array.isArray(current.marks) ? current.marks : [];
  if (
    marks.some(
      (mark) => mark && typeof mark === 'object' && (mark as HelpDocument).type === targetType
    )
  ) {
    return true;
  }

  const content = Array.isArray(current.content) ? current.content : [];
  return content.some((child) => hasMarkType(child, targetType));
}
