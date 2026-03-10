'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  collectPendingHelpItems,
  DEFAULT_MANUAL_HELP_CHECKS,
  HELP_BRANCHES,
  HELP_ITEMS,
  HELP_ROOT_ID,
  HELP_STORAGE_KEY,
  buildAutoHelpChecks,
  buildHelpStatusText,
  findHelpSelection,
  isHelpItemComplete,
  parseStoredManualHelpChecks,
  type HelpCheckId,
  type HelpNodeId,
  type ManualHelpCheckId,
  type ManualHelpChecks,
  type PendingHelpItem,
} from '../../_lib/help-guide';
import { HelpGuideModal } from './help-guide-modal';
import { HelpGuideTrigger } from './help-guide-trigger';

type EditorHelpGuideProps = {
  title: string;
  titleCount: number;
  contentCount: number;
  editorDocument: Record<string, unknown>;
  maxTitleLength: number;
  maxContentLength: number;
};

function loadManualHelpChecks(): ManualHelpChecks {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_MANUAL_HELP_CHECKS };
  }

  try {
    return (
      parseStoredManualHelpChecks(window.localStorage.getItem(HELP_STORAGE_KEY)) ?? {
        ...DEFAULT_MANUAL_HELP_CHECKS,
      }
    );
  } catch {
    window.localStorage.removeItem(HELP_STORAGE_KEY);
    return { ...DEFAULT_MANUAL_HELP_CHECKS };
  }
}

export function EditorHelpGuide({
  title,
  titleCount,
  contentCount,
  editorDocument,
  maxTitleLength,
  maxContentLength,
}: EditorHelpGuideProps) {
  const [manualHelpChecks, setManualHelpChecks] = useState<ManualHelpChecks>(loadManualHelpChecks);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHelpId, setSelectedHelpId] = useState<HelpNodeId>(HELP_ROOT_ID);

  useEffect(() => {
    window.localStorage.setItem(HELP_STORAGE_KEY, JSON.stringify(manualHelpChecks));
  }, [manualHelpChecks]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const autoHelpChecks = buildAutoHelpChecks({
    title,
    titleCount,
    contentCount,
    maxTitleLength,
    maxContentLength,
    editorDocument,
  });
  const helpStatusText = buildHelpStatusText({
    manualHelpChecks,
    autoHelpChecks,
    titleCount,
    contentCount,
    maxTitleLength,
    maxContentLength,
  });
  const checkHelpItemComplete = (itemId: HelpCheckId): boolean =>
    isHelpItemComplete(itemId, manualHelpChecks, autoHelpChecks);
  const completedHelpCount = HELP_ITEMS.filter((item) => checkHelpItemComplete(item.id)).length;
  const helpCompletionRate = Math.round((completedHelpCount / HELP_ITEMS.length) * 100);
  const selectedHelp = findHelpSelection(selectedHelpId);
  const nextPendingItems: PendingHelpItem[] = collectPendingHelpItems(
    HELP_BRANCHES,
    checkHelpItemComplete,
    3
  );

  const handleReset = () => {
    setManualHelpChecks({ ...DEFAULT_MANUAL_HELP_CHECKS });
    setSelectedHelpId(HELP_ROOT_ID);
  };

  const handleToggleManualHelpCheck = (itemId: ManualHelpCheckId) => {
    setManualHelpChecks((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  };

  const modal =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <HelpGuideModal
            completedHelpCount={completedHelpCount}
            totalHelpCount={HELP_ITEMS.length}
            helpCompletionRate={helpCompletionRate}
            selectedHelpId={selectedHelpId}
            selectedHelp={selectedHelp}
            helpStatusText={helpStatusText}
            nextPendingItems={nextPendingItems}
            manualHelpChecks={manualHelpChecks}
            onClose={() => setIsOpen(false)}
            onReset={handleReset}
            onSelect={setSelectedHelpId}
            onToggleManualHelpCheck={handleToggleManualHelpCheck}
            isHelpItemComplete={checkHelpItemComplete}
          />,
          document.body
        )
      : null;

  return (
    <>
      <HelpGuideTrigger
        completedHelpCount={completedHelpCount}
        totalHelpCount={HELP_ITEMS.length}
        onOpen={() => setIsOpen(true)}
      />
      {modal}
    </>
  );
}
