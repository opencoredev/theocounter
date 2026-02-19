declare global {
  interface Window {
    stonks?: {
      event: (name: string, pathOrProps?: string | Record<string, string>, props?: Record<string, string>) => void;
      view: () => void;
    };
  }
}

export function track(name: string, props?: Record<string, string>): void {
  if (typeof window !== "undefined") {
    window.stonks?.event(name, props);
  }
}
