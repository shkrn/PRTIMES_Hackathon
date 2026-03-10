import {
  HELP_ROOT,
  type HelpCheckId,
  type HelpNodeId,
  type PendingHelpItem,
  type HelpSelection,
  type ManualHelpCheckId,
  type ManualHelpChecks,
} from '../../_lib/help-guide';
import styles from './editor-help-guide.module.css';
import { HelpGuideDetailPanel } from './help-guide-detail-panel';
import { HelpGuideSummaryCard } from './help-guide-summary-card';
import { HelpGuideTree } from './help-guide-tree';

type HelpGuideModalProps = {
  completedHelpCount: number;
  totalHelpCount: number;
  helpCompletionRate: number;
  selectedHelpId: HelpNodeId;
  selectedHelp: HelpSelection;
  helpStatusText: Record<HelpCheckId, string>;
  nextPendingItems: PendingHelpItem[];
  manualHelpChecks: ManualHelpChecks;
  onClose: () => void;
  onReset: () => void;
  onSelect: (id: HelpNodeId) => void;
  onToggleManualHelpCheck: (id: ManualHelpCheckId) => void;
  isHelpItemComplete: (id: HelpCheckId) => boolean;
};

export function HelpGuideModal({
  completedHelpCount,
  totalHelpCount,
  helpCompletionRate,
  selectedHelpId,
  selectedHelp,
  helpStatusText,
  nextPendingItems,
  manualHelpChecks,
  onClose,
  onReset,
  onSelect,
  onToggleManualHelpCheck,
  isHelpItemComplete,
}: HelpGuideModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-help-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.panelLabel}>Checklist / Help</p>
            <h2 id="editor-help-modal-title" className={styles.panelTitle}>
              作成フローツリー
            </h2>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onReset} className={styles.resetButton}>
              手動チェックをリセット
            </button>
            <button type="button" onClick={onClose} className={styles.closeButton}>
              閉じる
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalMain}>
            <HelpGuideSummaryCard
              completedHelpCount={completedHelpCount}
              totalHelpCount={totalHelpCount}
              helpCompletionRate={helpCompletionRate}
              summary={HELP_ROOT.summary}
            />
            <HelpGuideTree
              selectedHelpId={selectedHelpId}
              helpStatusText={helpStatusText}
              onSelect={onSelect}
              isHelpItemComplete={isHelpItemComplete}
            />
          </div>

          <HelpGuideDetailPanel
            selectedHelp={selectedHelp}
            helpStatusText={helpStatusText}
            nextPendingItems={nextPendingItems}
            manualHelpChecks={manualHelpChecks}
            onSelect={onSelect}
            onToggleManualHelpCheck={onToggleManualHelpCheck}
            isHelpItemComplete={isHelpItemComplete}
          />
        </div>
      </div>
    </div>
  );
}
