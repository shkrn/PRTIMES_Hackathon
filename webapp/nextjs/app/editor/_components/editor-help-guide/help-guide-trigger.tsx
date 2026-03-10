import styles from './editor-help-guide.module.css';

type HelpGuideTriggerProps = {
  completedHelpCount: number;
  totalHelpCount: number;
  onOpen: () => void;
};

export function HelpGuideTrigger({
  completedHelpCount,
  totalHelpCount,
  onOpen,
}: HelpGuideTriggerProps) {
  return (
    <button type="button" onClick={onOpen} className={styles.triggerButton}>
      <span className={styles.triggerLabel}>作成ガイド</span>
      <span className={styles.triggerCount}>
        {completedHelpCount}/{totalHelpCount}
      </span>
    </button>
  );
}
