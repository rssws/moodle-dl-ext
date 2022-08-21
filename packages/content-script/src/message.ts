export function log(content: string): void {
  chrome.runtime.sendMessage({
    type: 'popup-log',
    data: { content },
  });
}
