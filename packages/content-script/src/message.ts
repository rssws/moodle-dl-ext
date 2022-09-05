export function message<T>(topic: string, payload: T): void {
  chrome.runtime.sendMessage({
    topic,
    payload,
  });
}
