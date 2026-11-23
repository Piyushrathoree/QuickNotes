import assert from 'node:assert/strict';
import test from 'node:test';
import { EditHistory } from '../apps/mobile/src/lib/editHistory.ts';

function snapshot(content, caret = content.length, field = 'body') {
  return { content, field, selection: { start: caret, end: caret } };
}

test('consecutive typing groups until the caret moves or typing pauses', () => {
  const history = new EditHistory();
  history.record(snapshot(''), 1, 0);
  history.record(snapshot('a'), 1, 100);
  history.record(snapshot('ab'), 1, 200);
  history.record(snapshot('abc', 1), 1, 300);
  history.record(snapshot('aXbc', 2), 1, 1100);
  assert.equal(history.step('undo', snapshot('aXYbc')).content, 'aXbc');
  assert.deepEqual(history.step('undo', snapshot('aXbc')), snapshot('abc', 1));
  assert.deepEqual(history.step('undo', snapshot('abc')), snapshot(''));
  assert.equal(history.canUndo, false);
});

test('undo and redo retain title and body positions across a formatting change', () => {
  const history = new EditHistory();
  const title = snapshot('Draft\n', 5, 'title');
  const body = snapshot('Draft!\nFirst item', 10);
  const formatted = snapshot('Draft!\n- First item', 12);
  history.record(title, 1);
  history.record(body);
  assert.deepEqual(history.step('undo', formatted), body);
  assert.deepEqual(history.step('undo', body), title);
  assert.deepEqual(history.step('redo', title), body);
  assert.deepEqual(history.step('redo', body), formatted);
});

test('a new edit discards redo and a reloaded note starts with empty history', () => {
  const history = new EditHistory();
  history.record(snapshot('Original'));
  history.step('undo', snapshot('Edited'));
  assert.equal(history.canRedo, true);
  history.record(snapshot('Original'));
  assert.equal(history.canRedo, false);
  assert.equal(history.canUndo, true);
  history.reset();
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('large drafts retain at least the last edit while capping older snapshots', () => {
  const history = new EditHistory();
  history.record(snapshot('a'.repeat(1_100_000)));
  history.record(snapshot('b'.repeat(1_100_000)));
  assert.equal(history.step('undo', snapshot('c'.repeat(1_100_000))).content[0], 'b');
  assert.equal(history.canUndo, false);
});
