export function generateId(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const rand = Math.random().toString(36).substring(2, 6);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}_${rand}`;
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}