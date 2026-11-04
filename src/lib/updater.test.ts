import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkDesktopUpdate,
  compareVersions,
  fetchLatest,
  getInstalledVersion,
  normalizeNotes,
  parseLatest
} from "./updater";

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

describe("escritorio (Electron)", () => {
  it("sin puente window.nido no hay actualización", async () => {
    vi.stubGlobal("window", {});
    expect(await checkDesktopUpdate()).toBeNull();
  });

  it("lee la versión instalada del puente", async () => {
    vi.stubGlobal("window", {
      nido: { isElectron: true, appVersion: async () => "2.3.4" }
    });
    expect(await getInstalledVersion("desktop")).toBe("2.3.4");
  });

  it("devuelve la actualización y descarga/instala por el puente", async () => {
    let progress: ((percent: number) => void) | null = null;
    let installed = false;
    vi.stubGlobal("window", {
      nido: {
        isElectron: true,
        appVersion: async () => "1.0.0",
        checkForUpdates: async () => ({ version: "1.1.0", notes: "Novedades" }),
        onUpdateProgress: (cb: (percent: number) => void) => {
          progress = cb;
          return () => {
            progress = null;
          };
        },
        downloadUpdate: async () => {
          progress?.(50);
        },
        installUpdate: async () => {
          installed = true;
        }
      }
    });

    const update = await checkDesktopUpdate();
    expect(update?.currentVersion).toBe("1.0.0");
    expect(update?.version).toBe("1.1.0");
    expect(update?.notes).toEqual(["Novedades"]);

    let seen = 0;
    await update?.download((percent) => {
      seen = percent;
    });
    expect(seen).toBe(50);

    await update?.install();
    expect(installed).toBe(true);
  });
});
