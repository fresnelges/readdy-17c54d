export function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const BOM = '\uFEFF';
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const csv = BOM + [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}