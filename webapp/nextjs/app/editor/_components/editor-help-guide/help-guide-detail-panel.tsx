import {
  HELP_ROOT_ID,
  getHelpNodeProgress,
  isHelpBranchNode,
  type HelpCheckId,
  type HelpNodeId,
  type PendingHelpItem,
  type HelpSelection,
  type ManualHelpCheckId,
  type ManualHelpChecks,
} from '../../_lib/help-guide';
import styles from './help-guide-detail-panel.module.css';

type BreadcrumbItem = {
  id: HelpNodeId;
  label: string;
};

type HelpGuideDetailPanelProps = {
  selectedHelp: HelpSelection;
  helpStatusText: Record<HelpCheckId, string>;
  nextPendingItems: PendingHelpItem[];
  manualHelpChecks: ManualHelpChecks;
  onSelect: (id: HelpNodeId) => void;
  onToggleManualHelpCheck: (id: ManualHelpCheckId) => void;
  isHelpItemComplete: (id: HelpCheckId) => boolean;
};

export function HelpGuideDetailPanel({
  selectedHelp,
  helpStatusText,
  nextPendingItems,
  manualHelpChecks,
  onSelect,
  onToggleManualHelpCheck,
  isHelpItemComplete,
}: HelpGuideDetailPanelProps) {
  const getPathLabel = (titles: string[]): string => titles.join(' / ') || '全体ガイド';
  const breadcrumbs: BreadcrumbItem[] =
    selectedHelp.kind === 'root'
      ? []
      : [
          { id: HELP_ROOT_ID, label: '作成ガイド' },
          ...selectedHelp.ancestors.map((ancestor) => ({
            id: ancestor.id,
            label: ancestor.title,
          })),
        ];

  return (
    <section className={styles.detailCard}>
      {breadcrumbs.length > 0 ? (
        <nav className={styles.breadcrumbs} aria-label="ヘルプ階層">
          <ol className={styles.breadcrumbList}>
            {breadcrumbs.map((breadcrumb, index) => (
              <li key={`${breadcrumb.label}-${index}`} className={styles.breadcrumbItem}>
                <button
                  type="button"
                  className={styles.breadcrumbButton}
                  onClick={() => onSelect(breadcrumb.id)}
                >
                  {breadcrumb.label}
                </button>
                {index < breadcrumbs.length - 1 ? (
                  <span className={styles.breadcrumbSeparator} aria-hidden="true">
                    /
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {selectedHelp.kind === 'root' ? (
        <>
          <h3 className={styles.detailTitle}>{selectedHelp.title}</h3>
          <p className={styles.detailText}>{selectedHelp.detail}</p>
          <div className={styles.detailList}>
            {nextPendingItems.length > 0 ? (
              nextPendingItems.map(({ item, ancestors }) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.detailLink}
                  onClick={() => onSelect(item.id)}
                >
                  <span>{item.title}</span>
                  <span>{getPathLabel(ancestors.map((ancestor) => ancestor.title))}</span>
                </button>
              ))
            ) : (
              <div className={styles.detailComplete}>
                すべての項目を確認済みです。最終確認をして保存してください。
              </div>
            )}
          </div>
        </>
      ) : null}

      {selectedHelp.kind === 'branch' ? (
        <>
          <h3 className={styles.detailTitle}>{selectedHelp.branch.title}</h3>
          <p className={styles.detailText}>{selectedHelp.branch.detail}</p>
          <div className={styles.detailList}>
            {selectedHelp.branch.items.map((node) => {
              const progress = getHelpNodeProgress(node, isHelpItemComplete);
              const isComplete = progress.completed === progress.total;
              const label = isHelpBranchNode(node)
                ? `${progress.completed}/${progress.total} 完了`
                : helpStatusText[node.id];

              return (
                <button
                  key={node.id}
                  type="button"
                  className={styles.detailLink}
                  onClick={() => onSelect(node.id)}
                >
                  <span>{node.title}</span>
                  <span>{isComplete ? '完了' : label}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {selectedHelp.kind === 'item' ? (
        <>
          <h3 className={styles.detailTitle}>{selectedHelp.item.title}</h3>
          <p className={styles.detailText}>{selectedHelp.item.detail}</p>
          <div className={styles.itemMeta}>
            <span
              className={`${styles.statusChip} ${
                isHelpItemComplete(selectedHelp.item.id) ? styles.statusDone : styles.statusPending
              }`}
            >
              {helpStatusText[selectedHelp.item.id]}
            </span>
            <span className={styles.itemMode}>
              {selectedHelp.item.kind === 'manual' ? '手動チェック' : '自動判定'}
            </span>
          </div>
          {selectedHelp.item.kind === 'manual' ? (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => onToggleManualHelpCheck(selectedHelp.item.id as ManualHelpCheckId)}
            >
              {manualHelpChecks[selectedHelp.item.id as ManualHelpCheckId]
                ? '未確認に戻す'
                : 'チェック済みにする'}
            </button>
          ) : (
            <p className={styles.autoNote}>
              エディタ内容に応じて自動で判定されます。本文や素材を更新すると状態も変わります。
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
