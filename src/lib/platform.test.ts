import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlatform, isCapacitorNative, isElectron } from "./platform";

/**
 * Detección de plataforma. En el entorno de pruebas (Node) no hay `window`,
 * así que se simula con `vi.stubGlobal`.
 */
describe("platform", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sin ventana, es web", () => {
    expect(getPlatform()).toBe("web");
    expect(isElectron()).toBe(false);
    expect(isCapacitorNative()).toBe(false);
  });

  it("dentro de Electron es desktop", () => {
    vi.stubGlobal("window", { nido: { isElectron: true } });
    expect(isElectron()).toBe(true);
    expect(getPlatform()).toBe("desktop");
  });

  it("dentro de Capacitor es android", () => {
    vi.stubGlobal("window", {
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" }
    });
    expect(isCapacitorNative()).toBe(true);
    expect(getPlatform()).toBe("android");
  });

  it("un navegador normal sigue siendo web", () => {
    vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => false } });
    expect(getPlatform()).toBe("web");
  });
});
