import { afterEach, describe, expect, it, vi } from "vitest";
import { compareVersions, fetchLatest, normalizeNotes, parseLatest } from "./updater";

/** Responde una `fetch` falsa con el JSON o el error indicados. */
function mockFetch(handler: (url: string) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const data = handler(String(url));
      if (data instanceof Error) throw data;
      return {
        ok: true,
        status: 200,
        json: async () => data
      };
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("compareVersions", () => {
  it("ordena por número, no por texto", () => {
    expect(compareVersions("1.2.0", "1.10.0")).toBeLessThan(0);
    expect(compareVersions("1.10.0", "1.2.0")).toBeGreaterThan(0);
  });

  it("trata las partes que faltan como cero", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("2", "1.9.9")).toBeGreaterThan(0);
  });

  it("distingue parche", () => {
    expect(compareVersions("1.1.0", "1.1.0")).toBe(0);
    expect(compareVersions("1.1.1", "1.1.0")).toBeGreaterThan(0);
  });
});

describe("normalizeNotes", () => {
  it("acepta listas", () => {
    expect(normalizeNotes(["Uno", "Dos"])).toEqual(["Uno", "Dos"]);
  });

  it("parte texto por líneas y quita viñetas", () => {
    expect(normalizeNotes("- Uno\n• Dos\n* Tres")).toEqual(["Uno", "Dos", "Tres"]);
  });

  it("ignora lo que no sirve", () => {
    expect(normalizeNotes(undefined)).toEqual([]);
    expect(normalizeNotes(42)).toEqual([]);
  });
});

describe("parseLatest", () => {
  it("acepta version + notes", () => {
    expect(parseLatest({ version: "1.2.3", notes: ["n"] })).toEqual({
      version: "1.2.3",
      notes: ["n"]
    });
  });

  it("acepta version + body (notas en texto)", () => {
    expect(parseLatest({ version: "1.2.3", body: "Novedades" })).toEqual({
      version: "1.2.3",
      notes: ["Novedades"]
    });
  });

  it("rechaza lo que no trae versión", () => {
    expect(() => parseLatest(null)).toThrow();
    expect(() => parseLatest({ notes: ["x"] })).toThrow();
  });
});

describe("fetchLatest", () => {
  it("en web lee version.json del propio sitio", async () => {
    mockFetch(() => ({ version: "1.1.0", notes: ["Gastos con ícono propio"] }));
    const info = await fetchLatest("web");
    expect(info.version).toBe("1.1.0");
    expect(info.notes).toEqual(["Gastos con ícono propio"]);
  });

  it("en Android lee latest.json de la release", async () => {
    mockFetch(() => ({ version: "1.2.0", body: "Nuevo" }));
    const info = await fetchLatest("android");
    expect(info.version).toBe("1.2.0");
    expect(info.notes).toEqual(["Nuevo"]);
  });

  it("en Android usa el version.json publicado si la release falla", async () => {
    mockFetch((url) => {
      if (url.includes("latest.json")) return new Error("sin red");
      return { version: "1.3.0", notes: ["Respaldo"] };
    });
    const info = await fetchLatest("android");
    expect(info.version).toBe("1.3.0");
    expect(info.notes).toEqual(["Respaldo"]);
  });
});
