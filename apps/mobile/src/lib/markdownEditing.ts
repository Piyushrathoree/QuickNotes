type Selection = { start: number; end: number };

function lineStart(body: string, position: number) {
  return position === 0 ? 0 : body.lastIndexOf('\n', position - 1) + 1;
}

function lineEnd(body: string, position: number) {
  const end = body.indexOf('\n', position);
  return end === -1 ? body.length : end;
}

export function editMarkdown(
  body: string,
  selection: Selection,
  format: 'bullet' | 'table' | 'heading' | 'subheading' | 'task' | 'bold' | 'italic' | 'code' | 'link' | 'indent' | 'outdent',
) {
  const start = Math.max(0, Math.min(selection.start, body.length));
  const end = Math.max(start, Math.min(selection.end, body.length));
  const first = lineStart(body, start);
  const last = lineEnd(body, end > start && body[end - 1] === '\n' ? end - 1 : end);

  if (format === 'indent' || format === 'outdent') {
    const listLine = /^([ \t]*)([-*+]|\d{1,9}[.)]) /;
    const stepFor = (line: string) => (/^[ \t]*\d/.test(line) ? 3 : 2);
    const lines = body.slice(first, last).split('\n');
    // A list item can only sit one level under the item above it, or Markdown reads it as a code block.
    let previousIndent = -1;
    if (first > 0) {
      const above = body.slice(0, first - 1).split('\n').at(-1) ?? '';
      const match = listLine.exec(above);
      if (match) previousIndent = match[1].length;
    }
    let total = 0;
    let firstDelta = 0;
    const changed = lines.map((line, index) => {
      const match = listLine.exec(line);
      if (!match) { previousIndent = -1; return line; }
      const indent = match[1].length;
      const step = stepFor(line);
      let delta = 0;
      if (format === 'indent') {
        if (previousIndent >= 0 && indent + step <= previousIndent + step && indent + step <= 8) delta = step;
      } else delta = -Math.min(step, indent);
      previousIndent = indent + delta;
      if (index === 0) firstDelta = delta;
      total += delta;
      return delta > 0 ? ' '.repeat(delta) + line : line.slice(-delta);
    });
    if (!total && !firstDelta) return { body, selection: { start, end } };
    const nextStart = Math.max(first, start + firstDelta);
    return {
      body: body.slice(0, first) + changed.join('\n') + body.slice(last),
      selection: { start: nextStart, end: Math.max(nextStart, end + total) },
    };
  }

  if (format === 'table') {
    // Insert after the current block, including when the cursor is inside an existing table.
    let position = last;
    while (position < body.length && body[position + 1] !== '\n') {
      position = lineEnd(body, position + 1);
    }
    const before = body.slice(0, position);
    const after = body.slice(position);
    const prefix = before ? '\n\n' : '';
    const template = '| Column 1 | Column 2 |\n| --- | --- |\n|  |  |';
    const suffix = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '';
    const cell = before.length + prefix.length + 2;
    return { body: before + prefix + template + suffix + after, selection: { start: cell, end: cell + 8 } };
  }

  if (format === 'bullet' || format === 'task' || format === 'heading' || format === 'subheading') {
    const prefix = format === 'bullet' ? '- ' : format === 'task' ? '- [ ] ' : format === 'heading' ? '# ' : '## ';
    const headingLevel = format === 'heading' ? /^(\s*)# +/ : /^(\s*)## +/;
    const anyHeading = /^(\s*)#{1,6} +/;
    const lines = body.slice(first, last).split('\n');
    const marker = format === 'bullet' ? /^(\s*)[-*+] +(?! |\[[ xX]\] )/ : format === 'task' ? /^(\s*)[-*+] +\[[ xX]\] +/ : headingLevel;
    const taskMarker = /^(\s*)[-*+] +\[[ xX]\] +/;
    const bulletMarker = /^(\s*)[-*+] +/;
    const remove = lines.every((line) => marker.test(line));
    const changed = lines.map((line) => {
      if (remove) return line.replace(marker, '$1');
      if (marker.test(line) || (!line.trim() && lines.length > 1)) return line;
      if (format === 'bullet' && taskMarker.test(line)) return line.replace(taskMarker, '$1- ');
      if (format === 'task' && bulletMarker.test(line)) return line.replace(bulletMarker, '$1- [ ] ');
      // A heading of the other level switches level instead of stacking markers.
      if ((format === 'heading' || format === 'subheading') && anyHeading.test(line)) return line.replace(anyHeading, `$1${prefix}`);
      return line.replace(/^[ \t]*/, (indent) => indent + prefix);
    }).join('\n');
    const nextStart = end === start
      ? first + Math.min(changed.length, Math.max(0, start - first + changed.length - (last - first)))
      : first;
    return {
      body: body.slice(0, first) + changed + body.slice(last),
      selection: { start: nextStart, end: end === start ? nextStart : first + changed.length },
    };
  }

  const selected = body.slice(start, end);
  if (format === 'bold' || format === 'italic') {
    const marker = format === 'bold' ? '**' : '*';
    const leftRun = body.slice(0, start).match(/\*+$/)?.[0].length ?? 0;
    const rightRun = body.slice(end).match(/^\*+/)?.[0].length ?? 0;
    const hasMarker = (length: number) => format === 'bold' ? length >= 2 : length % 2 === 1;
    if (selected && hasMarker(leftRun) && hasMarker(rightRun)) {
      const nextStart = start - marker.length;
      return {
        body: body.slice(0, nextStart) + selected + body.slice(end + marker.length),
        selection: { start: nextStart, end: nextStart + selected.length },
      };
    }
    const wrapsSelection = selected.length > marker.length * 2 && selected.startsWith(marker) && selected.endsWith(marker);
    if (wrapsSelection && (format === 'bold' || (selected[1] !== '*' && selected.at(-2) !== '*'))) {
      const text = selected.slice(marker.length, -marker.length);
      return {
        body: body.slice(0, start) + text + body.slice(end),
        selection: { start, end: start + text.length },
      };
    }
    // Markdown emphasis cannot open or close against whitespace.
    const text = selected.trim() || 'text';
    const before = selected.match(/^\s*/)?.[0] ?? '';
    const after = selected.trim() ? selected.match(/\s*$/)?.[0] ?? '' : '';
    const nextStart = start + before.length + marker.length;
    return {
      body: body.slice(0, start) + before + marker + text + marker + after + body.slice(end),
      selection: { start: nextStart, end: nextStart + text.length },
    };
  }

  if (format === 'code') {
    const text = selected || 'code';
    const backtick = "`";
    let longestRun = 0;
    for (const match of text.matchAll(/`+/g)) longestRun = Math.max(longestRun, match[0].length);
    const block = text.includes('\n');
    const marker = backtick.repeat(Math.max(block ? 3 : 1, longestRun + 1));
    const before = body.slice(0, start);
    const after = body.slice(end);
    const padding = !block && (text.startsWith(backtick) || text.endsWith(backtick) || (/^ +.* +$/s.test(text) && !!text.trim())) ? ' ' : '';
    const prefix = block ? (before && !before.endsWith('\n') ? '\n' : '') + marker + '\n' : marker + padding;
    const suffix = block ? '\n' + marker + (after && !after.startsWith('\n') ? '\n' : '') : padding + marker;
    const nextStart = start + prefix.length;
    return {
      body: before + prefix + text + suffix + after,
      selection: { start: nextStart, end: nextStart + text.length },
    };
  }

  const text = selected || 'link text';
  const address = 'https://';
  const label = text.replace(/[\\[\]]/g, '\\$&').replace(/\r?\n/g, ' ');
  const editStart = selected ? start + label.length + 3 : start + 1;
  return {
    body: body.slice(0, start) + '[' + label + '](' + address + ')' + body.slice(end),
    selection: { start: editStart, end: editStart + (selected ? address.length : label.length) },
  };
}
