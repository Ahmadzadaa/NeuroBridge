import { describe, expect, it } from "vitest";
import { localizedText, trilingual } from "@/lib/i18n-content";
import { formatSimMoney } from "@/lib/simulation/money";

describe("localizedText", () => {
  const text = trilingual({ az: "Salam", tr: "Merhaba", en: "Hello" });

  it("picks the reader's language from trilingual text", () => {
    expect(localizedText(text, "tr")).toBe("Merhaba");
    expect(localizedText(text, "en")).toBe("Hello");
    expect(localizedText(text, "az")).toBe("Salam");
  });

  it("falls back when a language is missing", () => {
    expect(localizedText(trilingual({ az: "Salam" }), "en")).toBe("Salam");
  });

  it("passes plain text through untouched, even when it starts with a brace", () => {
    expect(localizedText("Kafe İdarə Et", "tr")).toBe("Kafe İdarə Et");
    expect(localizedText("{not json", "tr")).toBe("{not json");
    expect(localizedText(null, "tr")).toBe("");
  });
});

describe("formatSimMoney", () => {
  it("uses the reader's currency", () => {
    expect(formatSimMoney(4806, "tr")).toBe("₺4.806");
    expect(formatSimMoney(4806, "az")).toBe("₼4.806");
    expect(formatSimMoney(4806, "en")).toBe("$4,806");
    expect(formatSimMoney(-194, "tr")).toBe("−₺194");
  });
});
