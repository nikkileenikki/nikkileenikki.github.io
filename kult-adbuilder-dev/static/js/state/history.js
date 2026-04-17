import { deepClone } from '../core/utils.js';

export function createHistory(limit = 100) {
  let undoStack = [];
  let redoStack = [];

  function push(state) {
    undoStack.push(deepClone(state));
    if (undoStack.length > limit) undoStack.shift();
    redoStack = [];
  }

  function undo(currentState) {
    if (!undoStack.length) return null;
    const previous = undoStack.pop();
    redoStack.push(deepClone(currentState));
    return deepClone(previous);
  }

  function redo(currentState) {
    if (!redoStack.length) return null;
    const next = redoStack.pop();
    undoStack.push(deepClone(currentState));
    return deepClone(next);
  }

  function clear() {
    undoStack = [];
    redoStack = [];
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  return {
    push,
    undo,
    redo,
    clear,
    canUndo,
    canRedo
  };
}
