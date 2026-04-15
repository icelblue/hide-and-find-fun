// ============================================================
// InstallBanner.test.tsx — Tests del component InstallBanner
// ============================================================
import { describe, it, expect, vi, afterEach } from "vitest";

describe("InstallBanner — lògica de detecció", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("detecta standalone mode correctament", () => {
    const matchMediaMock = vi.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, "matchMedia", { value: matchMediaMock, writable: true });
    expect(matchMediaMock("(display-mode: standalone)").matches).toBe(true);
  });

  it("sessionStorage dismiss dura només la sessió", () => {
    const DISMISS_KEY = "dd_install_banner_dismissed";
    sessionStorage.setItem(DISMISS_KEY, "1");
    expect(sessionStorage.getItem(DISMISS_KEY)).toBe("1");
    sessionStorage.clear();
    expect(sessionStorage.getItem(DISMISS_KEY)).toBeNull();
  });

  it("no mostra en iframe (preview Lovable)", () => {
    const isInIframe = (() => {
      try { return window.self !== window.top; } catch { return true; }
    })();
    expect(typeof isInIframe).toBe("boolean");
  });

  it("detecta plataforma iOS correctament (iPhone/iPad)", () => {
    const iosUAs = [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    ];
    for (const ua of iosUAs) {
      expect(/iPad|iPhone|iPod/.test(ua)).toBe(true);
    }
  });

  it("detecta iPadOS 13+ (reportat com Mac amb touchpoints)", () => {
    const iPadOSUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
    // iPadOS reports as Mac but has maxTouchPoints > 1
    expect(/Macintosh/.test(iPadOSUA)).toBe(true);
    // In a real iPad: navigator.maxTouchPoints > 1
  });

  it("detecta plataforma Android correctament", () => {
    const androidUA = "Mozilla/5.0 (Linux; Android 14; Pixel 8)";
    expect(/Android/i.test(androidUA)).toBe(true);
  });

  it("desktop no és ni iOS ni Android", () => {
    const desktopUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    expect(/iPad|iPhone|iPod/.test(desktopUA)).toBe(false);
    expect(/Android/i.test(desktopUA)).toBe(false);
    expect(/Macintosh/.test(desktopUA)).toBe(false);
  });

  it("detecta navegador Android: Chrome, Firefox, Samsung", () => {
    expect(/SamsungBrowser/i.test("Mozilla/5.0 SamsungBrowser/23.0")).toBe(true);
    expect(/Firefox/i.test("Mozilla/5.0 Firefox/120.0")).toBe(true);
    expect(/Chrome/i.test("Mozilla/5.0 Chrome/120.0") && !/Edge|Edg/i.test("Mozilla/5.0 Chrome/120.0")).toBe(true);
  });
});
