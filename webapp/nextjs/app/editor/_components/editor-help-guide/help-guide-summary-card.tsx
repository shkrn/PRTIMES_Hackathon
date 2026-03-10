import styles from './help-guide-summary-card.module.css';

type HelpGuideSummaryCardProps = {
  completedHelpCount: number;
  totalHelpCount: number;
  helpCompletionRate: number;
  summary: string;
};

export function HelpGuideSummaryCard({
  completedHelpCount,
  totalHelpCount,
  helpCompletionRate,
  summary,
}: HelpGuideSummaryCardProps) {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryHeader}>
        <span className={styles.summaryCount}>
          {completedHelpCount}/{totalHelpCount} 完了
        </span>
        <span className={styles.summaryPercent}>{helpCompletionRate}%</span>
      </div>
      <div className={styles.progressBar} aria-hidden="true">
        <div className={styles.progressFill} style={{ width: `${helpCompletionRate}%` }} />
      </div>
      <p className={styles.summaryText}>{summary}</p>
    </div>
  );
}
