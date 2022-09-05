export function message(topic: string, payload: any): void {
  chrome.runtime.sendMessage({
    topic,
    payload,
  });
}
