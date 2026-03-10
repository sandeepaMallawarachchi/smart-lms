/**
 * Word-level diff utility using the Myers diff algorithm.
 *
 * Compares two strings word-by-word and returns a sequence of tokens
 * annotated as 'equal', 'added', or 'removed'.
 */

export type DiffTokenType = 'equal' | 'added' | 'removed';

export interface DiffToken {
    type: DiffTokenType;
    value: string;   // the word (with trailing space preserved for display)
}

/** Split text into word tokens, preserving whitespace as part of each word. */
function tokenize(text: string): string[] {
    // Split on whitespace boundaries, keeping the space attached to the preceding word
    return text.split(/(\s+)/).filter((t) => t.length > 0);
}

/**
 * Myers shortest-edit-script diff on token arrays.
 * Returns an edit sequence of (type, token) pairs.
 */
export function diffWords(oldText: string, newText: string): DiffToken[] {
    const a = tokenize(oldText);
    const b = tokenize(newText);

    const n = a.length;
    const m = b.length;
    const max = n + m;

    // v[k] stores the furthest reaching x position for diagonal k
    const v: number[] = new Array(2 * max + 1).fill(0);
    const trace: number[][] = [];

    // Find shortest edit script length
    let found = false;
    outer: for (let d = 0; d <= max; d++) {
        trace.push([...v]);
        for (let k = -d; k <= d; k += 2) {
            const ki = k + max;
            let x: number;
            if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) {
                x = v[ki + 1];
            } else {
                x = v[ki - 1] + 1;
            }
            let y = x - k;
            while (x < n && y < m && a[x] === b[y]) {
                x++;
                y++;
            }
            v[ki] = x;
            if (x >= n && y >= m) {
                found = true;
                break outer;
            }
        }
    }

    if (!found || max === 0) {
        // identical or one is empty
        if (n === 0 && m === 0) return [];
        if (n === 0) return b.map((w) => ({ type: 'added', value: w }));
        if (m === 0) return a.map((w) => ({ type: 'removed', value: w }));
    }

    // Backtrack through trace to recover edit path
    const edits: DiffToken[] = [];
    let x = n;
    let y = m;

    for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
        const vd = trace[d];
        const k = x - y;
        const ki = k + max;

        let prevK: number;
        if (k === -d || (k !== d && vd[ki - 1] < vd[ki + 1])) {
            prevK = k + 1;
        } else {
            prevK = k - 1;
        }

        const prevX = vd[prevK + max];
        const prevY = prevX - prevK;

        // Snake (equal) tokens going backwards
        while (x > prevX && y > prevY) {
            x--;
            y--;
            edits.unshift({ type: 'equal', value: a[x] });
        }

        if (d > 0) {
            if (x === prevX) {
                // Insertion
                y--;
                edits.unshift({ type: 'added', value: b[y] });
            } else {
                // Deletion
                x--;
                edits.unshift({ type: 'removed', value: a[x] });
            }
        }
    }

    return edits;
}

/** Collapse consecutive tokens of the same type into merged strings for compact rendering. */
export function mergeDiffTokens(tokens: DiffToken[]): DiffToken[] {
    const result: DiffToken[] = [];
    for (const t of tokens) {
        const last = result[result.length - 1];
        if (last && last.type === t.type) {
            last.value += t.value;
        } else {
            result.push({ ...t });
        }
    }
    return result;
}
