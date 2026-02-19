declare global {
  interface Window {
    stonks?: (event: string) => void;
  }
}

export function track(event: string): void {
  if (typeof window !== "undefined") {
    window.stonks?.(event);
  }
}
