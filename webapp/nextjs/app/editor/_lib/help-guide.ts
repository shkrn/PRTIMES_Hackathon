export const HELP_ROOT_ID = 'help-root' as const;
export const HELP_STORAGE_KEY = 'prtimes-editor-help-checks';

export type HelpBranchId = string;
export type ManualHelpCheckId = 'audience' | 'newsValue' | 'leadSummary' | 'cta' | 'proofread';
export type AutoHelpCheckId = 'titleLength' | 'bodyLength' | 'hasList' | 'hasImage' | 'hasLink';
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
];

export const DEFAULT_MANUAL_HELP_CHECKS: ManualHelpChecks = {
  audience: false,
  newsValue: false,
  leadSummary: false,
  cta: false,
  proofread: false,
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
};

export function buildAutoHelpChecks({
  title,
  titleCount,
  contentCount,
  maxTitleLength,
  maxContentLength,
  editorDocument,
}: BuildAutoHelpChecksOptions): AutoHelpChecks {
  const trimmedTitleCount = title.trim().length;

  return {
    titleLength: trimmedTitleCount > 0 && titleCount <= maxTitleLength,
    bodyLength: contentCount > 0 && contentCount <= maxContentLength,
    hasList: hasNodeType(editorDocument, 'bulletList') || hasNodeType(editorDocument, 'orderedList'),
    hasImage: hasNodeType(editorDocument, 'image'),
    hasLink: hasMarkType(editorDocument, 'link'),
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
