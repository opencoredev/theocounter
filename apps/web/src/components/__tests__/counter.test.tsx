import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: mockUseQuery,
}));

vi.mock("@theocounter.com/backend/convex/_generated/api", () => ({
  api: { videos: { getLatestVideo: "videos:getLatestVideo" } },
}));

import { Counter } from "../counter";

describe("Counter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders skeleton when query returns undefined (loading)", () => {
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<Counter />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByText("It has been")).toBeNull();
  });

  it("renders empty state when query returns null", () => {
    mockUseQuery.mockReturnValue(null);
    render(<Counter />);
    expect(
      screen.queryByText("Waiting for first video detection..."),
    ).not.toBeNull();
  });

  it("formats 0ms elapsed as 00:00:00:00", () => {
    const now = 1_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    mockUseQuery.mockReturnValue({
      publishedAt: now,
      title: "Test Video",
      videoId: "test123",
    });
    render(<Counter />);
    expect(screen.getAllByText("00")).toHaveLength(4);
  });

  it("formats 90061000ms (1d 1h 1m 1s) as 01:01:01:01", () => {
    const publishedAt = 1_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(publishedAt + 90_061_000);
    mockUseQuery.mockReturnValue({
      publishedAt,
      title: "Test Video",
      videoId: "test456",
    });
    render(<Counter />);
    expect(screen.getAllByText("01")).toHaveLength(4);
  });

  it("displays the video title", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000_000_000);
    mockUseQuery.mockReturnValue({
      publishedAt: 1_000_000_000,
      title: "Theo's Latest Banger",
      videoId: "xyz789",
    });
    render(<Counter />);
    expect(screen.queryByText("Theo's Latest Banger")).not.toBeNull();
  });
});
