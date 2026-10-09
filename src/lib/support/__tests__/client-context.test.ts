import { describe, expect, it } from "vitest";
import { describeUserAgent, parseContext } from "@/lib/support/client-context";

describe("describeUserAgent", () => {
  it("names the common browsers and systems", () => {
    expect(describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36")).toEqual({ browser: "Chrome 141", os: "Windows 10/11", mobile: false });
    expect(describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0").browser).toBe("Edge 141");
    expect(describeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1")).toEqual({ browser: "Safari 18", os: "iOS 18", mobile: true });
    expect(describeUserAgent(undefined)).toEqual({ browser: null, os: null, mobile: false });
  });

  it("treats a broken stored context as missing", () => {
    expect(parseContext("{oops")).toBeNull();
    expect(parseContext(null)).toBeNull();
  });
});
