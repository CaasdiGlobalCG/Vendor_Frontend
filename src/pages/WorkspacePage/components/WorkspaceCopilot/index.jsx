import React from 'react';
import { useCopilot } from '../../../../context/CopilotContext';
import CopilotButton from './CopilotButton';
import CopilotFullPage from './CopilotFullPage';

/**
 * WorkspaceCopilot Component
 * Main component that combines button and full-page modal
 * Should be used with CopilotProvider context
 */
const WorkspaceCopilot = () => {
  const { isOpen, setIsOpen } = useCopilot();

  return (
    <>
      <CopilotButton />
      {isOpen && <CopilotFullPage onClose={() => setIsOpen(false)} />}
    </>
  );
};

export default WorkspaceCopilot;
