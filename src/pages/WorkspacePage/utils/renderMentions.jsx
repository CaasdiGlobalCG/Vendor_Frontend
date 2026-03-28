import React from 'react';

/**
 * renderMentions — Converts plain text with @mentions into styled React nodes.
 * Matches @Name patterns and renders them as highlighted spans.
 *
 * @param {string} text - Raw message text
 * @param {string} [highlightClass] - Optional Tailwind classes for mention styling
 * @returns {React.ReactNode[]} Array of text and mention spans
 */
export function renderMentions(text, highlightClass = 'font-semibold text-blue-600 bg-blue-50 px-0.5 rounded') {
  if (!text) return [text];

  // Match @Name or @First Last patterns
  const regex = /@([\w][\w\s.]*?)(?=\s@|[,!?.;:\s]|$)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Push text before mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Push the mention as a styled span
    parts.push(
      <span key={`mention-${match.index}`} className={highlightClass}>
        @{match[1].trim()}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export default renderMentions;
