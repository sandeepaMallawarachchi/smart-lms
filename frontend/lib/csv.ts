// ─── CSV Helpers ─────────────────────────────────────────────

/** Safely escape a CSV cell value, wrapping in quotes when needed. */
export function escapeCell(value: unknown): string {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

/** Build one CSV row from an array of cell values. */
export function csvRow(...values: unknown[]): string {
    return values.map(escapeCell).join(',');
}

/** Join rows into a full CSV string. */
export function buildCsv(rows: string[]): string {
    return rows.join('\n');
}

/**
 * Trigger a browser-side CSV download.
 * Works entirely on the client — no server round-trip.
 */
export function downloadCsvBlob(csv: string, filename: string): void {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
