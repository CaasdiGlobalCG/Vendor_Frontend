import React from 'react';

// Text highlighting utilities for mentions and hashtags

export const renderTextWithHighlights = (text) => {
  if (!text) return null;
  
  // Find all complete mentions and hashtags (only word characters, no spaces)
  const mentionRegex = /@[a-zA-Z0-9_]+(?=\s|$|@|#)/g;
  const hashtagRegex = /#[a-zA-Z0-9_]+(?=\s|$|@|#)/g;
  
  let result = text;
  let parts = [];
  let lastIndex = 0;
  
  // Find all matches and their positions
  const matches = [];
  let match;
  
  // Find mentions
  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push({
      type: 'mention',
      text: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  // Find hashtags
  while ((match = hashtagRegex.exec(text)) !== null) {
    matches.push({
      type: 'hashtag',
      text: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);
  
  // Build the result
  matches.forEach((match, index) => {
    // Add text before the match
    if (match.start > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.start)
      });
    }
    
    // Add the match
    parts.push({
      type: match.type,
      content: match.text
    });
    
    lastIndex = match.end;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  // If no matches, return the original text
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }
  
  return parts.map((part, index) => {
    if (part.type === 'mention') {
      return (
        <span key={index} className="text-green-600 font-medium">
          {part.content}
        </span>
      );
    } else if (part.type === 'hashtag') {
      return (
        <span key={index} className="text-purple-600 font-medium">
          {part.content}
        </span>
      );
    }
    return part.content;
  });
};

export const formatSizeMB = (bytes) => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} mb`;
};
