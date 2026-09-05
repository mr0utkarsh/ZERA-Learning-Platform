import React from 'react';

/**
 * Minimal, XSS-safe Markdown renderer. Converts a limited Markdown subset
 * (headings, lists, bold/italic/inline code, blockquote, fenced code)
 * into React elements. Raw HTML is never rendered — anything resembling
 * tags is displayed as plain text.
 */

function renderInline(text, keyPrefix) {
  const nodes = [];
  // tokenize **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) nodes.push(<strong key={`${keyPrefix}-b${k}`}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) nodes.push(<code key={`${keyPrefix}-c${k}`}>{tok.slice(1, -1)}</code>);
    else nodes.push(<em key={`${keyPrefix}-i${k}`}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
    k += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function Markdown({ text = '' }) {
  const lines = String(text).replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (line.trim().startsWith('```')) {
      const buf = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { buf.push(lines[i]); i += 1; }
      i += 1;
      blocks.push(<pre key={key++}><code>{buf.join('\n')}</code></pre>);
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const Tag = `h${Math.min(h[1].length + 1, 4)}`;
      blocks.push(<Tag key={key++}>{renderInline(h[2], `h${key}`)}</Tag>);
      i += 1;
      continue;
    }

    // blockquote
    if (line.trim().startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i += 1; }
      blocks.push(<blockquote key={key++}>{renderInline(buf.join(' '), `q${key}`)}</blockquote>);
      continue;
    }

    // unordered list
    if (/^\s*[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*•]\s+/, '')); i += 1; }
      blocks.push(<ul key={key++}>{items.map((it, j) => <li key={j}>{renderInline(it, `u${key}-${j}`)}</li>)}</ul>);
      continue;
    }

    // ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i += 1; }
      blocks.push(<ol key={key++}>{items.map((it, j) => <li key={j}>{renderInline(it, `o${key}-${j}`)}</li>)}</ol>);
      continue;
    }

    // blank
    if (!line.trim()) { i += 1; continue; }

    // paragraph (gather until blank line)
    const buf = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|```|\s*[-*•]\s|\s*\d+[.)]\s)/.test(lines[i])) {
      buf.push(lines[i]); i += 1;
    }
    blocks.push(<p key={key++}>{renderInline(buf.join(' '), `p${key}`)}</p>);
  }

  return <div className="md">{blocks}</div>;
}
