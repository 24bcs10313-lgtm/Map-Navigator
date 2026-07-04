/**
 * Stack-Based Undo / Redo Operations Manager
 * Implements the Command pattern using two arrays as LIFO stacks.
 */

class UndoRedoManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.onStateChangeCallback = null;
    }

    /**
     * Set a callback to execute whenever history stacks are modified.
     * Useful for updating UI button enabled/disabled states.
     */
    registerCallback(callback) {
        this.onStateChangeCallback = callback;
    }

    triggerCallback() {
        if (this.onStateChangeCallback) {
            this.onStateChangeCallback({
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                undoSize: this.undoStack.length,
                redoSize: this.redoStack.length,
                history: this.getHistoryDescription()
            });
        }
    }

    /**
     * Records a new action and clears the redo stack (standard timeline behavior).
     * @param {Object} action { type: 'TRAFFIC' | 'CLOSE', from, to, prevVal, nextVal, streetName }
     */
    executeAction(action) {
        this.undoStack.push(action);
        this.redoStack = []; // Clear redo timeline on new actions
        this.triggerCallback();
    }

    /**
     * Checks if undo operations are available.
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Checks if redo operations are available.
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Pops an action from the undo stack, returns it for reversal, and moves it to the redo stack.
     */
    undo() {
        if (!this.canUndo()) return null;
        
        const action = this.undoStack.pop();
        this.redoStack.push(action);
        this.triggerCallback();
        return action;
    }

    /**
     * Pops an action from the redo stack, returns it for re-application, and moves it back to the undo stack.
     */
    redo() {
        if (!this.canRedo()) return null;
        
        const action = this.redoStack.pop();
        this.undoStack.push(action);
        this.triggerCallback();
        return action;
    }

    /**
     * Clears both stacks.
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.triggerCallback();
    }

    /**
     * Returns a human-readable list describing actions in the undo stack.
     */
    getHistoryDescription() {
        return [...this.undoStack].reverse().map((act, index) => {
            const num = this.undoStack.length - index;
            if (act.type === 'TRAFFIC') {
                return `[${num}] Set traffic on ${act.streetName} to ${act.nextVal}x`;
            } else if (act.type === 'CLOSE') {
                return `[${num}] ${act.nextVal ? 'Closed' : 'Opened'} road: ${act.streetName}`;
            }
            return `[${num}] Custom action`;
        });
    }
}

// Bind to window global for browser use
window.UndoRedoManager = UndoRedoManager;
