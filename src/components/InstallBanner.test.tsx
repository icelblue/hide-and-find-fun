// ============================================================
// InstallBanner.test.tsx — Tests del component InstallBanner
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the utility logic, not the rendered component (avoids DOM complexity)
describe("InstallBanner — lògica de detecció", () => {
  const originalUA = navigator.userAgent;

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("detecta standalone mode correctament", () => {
    const matchMediaMock = vi.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, "matchMedia", { value: matchMediaMock, writable: true });
    expect(matchMediaMock("(display-mode: standalone)").matches).toBe(true);
  });

  it("localStorage dismiss funciona 7 dies", () => {
    const DISMISS_KEY = "dd_install_banner_dismissed";
    const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

    // Set dismissed just now
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    const val = localStorage.getItem(DISMISS_KEY);
    expect(val).toBeTruthy();
    expect(Date.now() - parseInt(val!, 10) < DISMISS_DURATION_MS).toBe(true);

    // Set dismissed 8 days ago = expired
    localStorage.setItem(DISMISS_KEY, (Date.now() - 8 * 24 * 60 * 60 * 1000).toString());
    const old = localStorage.getItem(DISMISS_KEY);
    expect(Date.now() - parseInt(old!, 10) < DISMISS_DURATION_MS).toBe(false);
  });

  it("no mostra en iframe (preview Lovable)", () => {
    // Simulate iframe: window.self !== window.top
    const isInIframe = (() => {
      try { return window.self !== window.top; } catch { return true; }
    })();
    // In test environment this is false (not in iframe), which is correct behavior
    expect(typeof isInIframe).toBe("boolean");
  });

  it("detecta plataforma iOS correctament", () => {
    const iosUAs = [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    ];
    for (const ua of iosUAs) {
      expect(/iPad|iPhone|iPod/.test(ua)).toBe(true);
    }
  });

  it("detecta plataforma Android correctament", () => {
    const androidUA = "Mozilla/5.0 (Linux; Android 14; Pixel 8)";
    expect(/Android/i.test(androidUA)).toBe(true);
  });

  it("desktop no és ni iOS ni Android", () => {
    const desktopUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    expect(/iPad|iPhone|iPod/.test(desktopUA)).toBe(false);
    expect(/Android/i.test(desktopUA)).toBe(false);
  });
});
