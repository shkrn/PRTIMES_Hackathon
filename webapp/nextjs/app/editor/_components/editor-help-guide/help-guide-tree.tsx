import {
  HELP_BRANCHES,
  HELP_ROOT_ID,
  getHelpNodeProgress,
  getHelpNodesProgress,
  isHelpBranchNode,
  type HelpCheckId,
  type HelpNodeId,
  type HelpTreeNode,
} from '../../_lib/help-guide';
import styles from './help-guide-tree.module.css';

type HelpGuideTreeProps = {
  selectedHelpId: HelpNodeId;
  helpStatusText: Record<HelpCheckId, string>;
  onSelect: (id: HelpNodeId) => void;
  isHelpItemComplete: (id: HelpCheckId) => boolean;
};

type HelpGuideTreeNodeProps = {
  node: HelpTreeNode;
  selectedHelpId: HelpNodeId;
  helpStatusText: Record<HelpCheckId, string>;
  onSelect: (id: HelpNodeId) => void;
  isHelpItemComplete: (id: HelpCheckId) => boolean;
};

function HelpGuideTreeNode({
  node,
  selectedHelpId,
  helpStatusText,
  onSelect,
  isHelpItemComplete,
}: HelpGuideTreeNodeProps) {
  const isBranch = isHelpBranchNode(node);
  const progress = getHelpNodeProgress(node, isHelpItemComplete);
  const isComplete = progress.completed === progress.total;
  const hasChildren = isBranch && node.items.length > 0;

  return (
    <div className={styles.nodeGroup}>
      <button
        type="button"
        className={`${styles.nodeButton} ${
          isBranch ? styles.branchNode : styles.leafNode
        } ${hasChildren ? styles.nodeWithChildren : ''} ${
          isComplete ? styles.nodeComplete : ''
        } ${selectedHelpId === node.id ? styles.nodeSelected : ''}`}
        onClick={() => onSelect(node.id)}
        aria-pressed={selectedHelpId === node.id}
      >
        <span className={styles.nodeTitle}>{node.title}</span>
        {isBranch ? (
          <span className={styles.nodeHint}>{`${progress.completed}/${progress.total} 完了`}</span>
        ) : (
          <span
            className={`${styles.statusChip} ${
              isComplete ? styles.statusDone : styles.statusPending
            }`}
          >
            {helpStatusText[node.id]}
          </span>
        )}
      </button>

      {hasChildren ? (
        <div className={styles.childList}>
          {node.items.map((child) => (
            <HelpGuideTreeNode
              key={child.id}
              node={child}
              selectedHelpId={selectedHelpId}
              helpStatusText={helpStatusText}
              onSelect={onSelect}
              isHelpItemComplete={isHelpItemComplete}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HelpGuideTree({
  selectedHelpId,
  helpStatusText,
  onSelect,
  isHelpItemComplete,
}: HelpGuideTreeProps) {
  const rootProgress = getHelpNodesProgress(HELP_BRANCHES, isHelpItemComplete);
  const isRootComplete = rootProgress.completed === rootProgress.total;

  return (
    <div className={styles.treeFrame}>
      <div className={styles.tree}>
        <div className={styles.rootGroup}>
          <button
            type="button"
            className={`${styles.nodeButton} ${styles.rootNode} ${styles.nodeWithChildren} ${
              isRootComplete ? styles.nodeComplete : ''
            } ${selectedHelpId === HELP_ROOT_ID ? styles.nodeSelected : ''}`}
            onClick={() => onSelect(HELP_ROOT_ID)}
            aria-pressed={selectedHelpId === HELP_ROOT_ID}
          >
            <span className={styles.nodeTitle}>迷ったらここから</span>
            <span className={styles.nodeHint}>全体の進め方を見る</span>
          </button>

          <div className={styles.childList}>
            {HELP_BRANCHES.map((branch) => (
              <HelpGuideTreeNode
                key={branch.id}
                node={branch}
                selectedHelpId={selectedHelpId}
                helpStatusText={helpStatusText}
                onSelect={onSelect}
                isHelpItemComplete={isHelpItemComplete}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
