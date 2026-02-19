import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockConfetti } = vi.hoisted(() => ({
  mockConfetti: vi.fn(),
}));

vi.mock("canvas-confetti", () => ({
  default: mockConfetti,
}));

import { Celebration } from "../celebration";

const mockVideo = {
  videoId: "test-video-123",
  title: "Test Video Title",
  thumbnailUrl: "https://example.com/thumb.jpg",
  publishedAt: 1_000_000_000,
};

function stubLocalStorage(store: Record<string, string> = {}) {
  const storage: Record<string, string> = { ...store };
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => storage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      for (const key of Object.keys(storage)) delete storage[key];
    }),
  });
}

describe("Celebration", () => {
  beforeEach(() => {
    mockConfetti.mockReset();
    stubLocalStorage();
  });

  it("does not fire confetti when lastSeenVideoId matches", () => {
    stubLocalStorage({ lastSeenVideoId: mockVideo.videoId });
    render(
      <Celebration video={mockVideo} droughtDurationMs={86_400_000} />,
    );
    expect(mockConfetti).not.toHaveBeenCalled();
  });

  it("fires confetti when lastSeenVideoId differs", () => {
    stubLocalStorage({ lastSeenVideoId: "old-video" });
    render(
      <Celebration video={mockVideo} droughtDurationMs={86_400_000} />,
    );
    expect(mockConfetti).toHaveBeenCalled();
  });

  it("renders YouTube embed with correct URL", () => {
    stubLocalStorage({ lastSeenVideoId: mockVideo.videoId });
    const { container } = render(
      <Celebration video={mockVideo} droughtDurationMs={86_400_000} />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      `https://www.youtube.com/embed/${mockVideo.videoId}?autoplay=0&rel=0`,
    );
  });

  it("formats 86400000ms (1 day) as 'After 1 day'", () => {
    stubLocalStorage({ lastSeenVideoId: mockVideo.videoId });
    render(
      <Celebration video={mockVideo} droughtDurationMs={86_400_000} />,
    );
    expect(screen.queryByText("After 1 day")).not.toBeNull();
  });

  it("shows 'A new video!' when droughtDurationMs is 0", () => {
    stubLocalStorage({ lastSeenVideoId: mockVideo.videoId });
    render(<Celebration video={mockVideo} droughtDurationMs={0} />);
    expect(screen.queryByText("A new video!")).not.toBeNull();
  });
});
