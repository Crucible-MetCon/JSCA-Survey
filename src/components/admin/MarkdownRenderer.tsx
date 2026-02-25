'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
  let key = 0;

  function flushList() {
    if (!listBuffer) return;
    if (listBuffer.type === 'ul') {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 mb-4 text-gray-700">
          {listBuffer.items}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key++} className="list-decimal list-inside space-y-1 mb-4 text-gray-700">
          {listBuffer.items}
        </ol>
      );
    }
    listBuffer = null;
  }

  function renderInline(text: string): React.ReactNode {
    // Handle bold (**text**) and italic (*text*)
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let partKey = 0;

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(remaining.slice(0, boldMatch.index));
        }
        parts.push(<strong key={partKey++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }
      parts.push(remaining);
      break;
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings
    if (line.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4 key={key++} className="text-base font-semibold text-[#1B2A4A] mt-4 mb-2">
          {renderInline(line.slice(5))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-lg font-semibold text-[#1B2A4A] mt-6 mb-2">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-[#1B2A4A] mt-8 mb-3 pb-2 border-b border-gray-200">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={key++} className="text-2xl font-bold text-[#1B2A4A] mt-8 mb-4">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={key++} className="my-6 border-gray-200" />);
      continue;
    }

    // Unordered list items
    const ulMatch = line.match(/^(\s*)[-*]\s+(.*)/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(
        <li key={key++} className={ulMatch[1].length > 0 ? 'ml-4' : ''}>
          {renderInline(ulMatch[2])}
        </li>
      );
      continue;
    }

    // Ordered list items
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(
        <li key={key++} className={olMatch[1].length > 0 ? 'ml-4' : ''}>
          {renderInline(olMatch[2])}
        </li>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={key++} className="mb-3 text-gray-700 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return <div className="prose-sm max-w-none">{elements}</div>;
}
