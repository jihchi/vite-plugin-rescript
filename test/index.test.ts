import { describe, expect, it } from "vitest";
import Plugin from "../src/index.js";

describe("@jihchi/vite-plugin-rescript", () => {
  it("works", () => {
    const actual = Plugin();
    expect(actual).toHaveProperty("name", "@jihchi/vite-plugin-rescript");
    expect(actual).toHaveProperty("configResolved");
    expect(actual.configResolved).toBeInstanceOf(Function);
  });

  it("invokes closeBundle hook without crashing", async () => {
    const actual = Plugin();
    expect(actual).toHaveProperty("closeBundle");
    await expect(
      // @ts-expect-error
      actual.closeBundle(),
    ).resolves.toEqual(undefined);
  });
});
