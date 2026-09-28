/**
 * Reliable cross-browser file download helper.
 * Appends link to DOM and delays URL revocation so Chrome / Edge
 * properly preserve the download filename and file extension.
 */
export function downloadFile(data: string, filename: string, mimeType: string): void {
  const blob = new Blob([data], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  // Delay cleanup so the browser initiates download with the correct filename
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 2000);
}

export function downloadJSON(data: string, filename: string): void {
  downloadFile(data, filename.endsWith('.json') ? filename : `${filename}.json`, 'application/json');
}

export function downloadCSV(data: string, filename: string): void {
  downloadFile(data, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv');
}
