import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import caStrings from "@/i18n/ca.json";

function lookup(key: string): string {
  return key.split(".").reduce<any>((acc, k) => (acc && typeof acc === "object" ? acc[k] : undefined), caStrings) ?? key;
}

vi.mock("@/i18n/LanguageProvider", () => ({
  useT: () => (key: string, varsOrFallback?: any, maybeFallback?: string) => {
    const val = lookup(key);
    if (typeof val === "string") return val;
    if (typeof varsOrFallback === "string") return varsOrFallback;
    if (typeof maybeFallback === "string") return maybeFallback;
    return key;
  },
  useLanguage: () => ({ lang: "ca", setLang: vi.fn(), t: (k: string) => lookup(k) }),
  useContentT: () => (_t: unknown, fallback: string) => fallback,
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { SpecialFoundPopup } from "@/components/game/GamePopups";
import { buildTrophySpecialData, getHideMessage, getTrophyDisplayIcon, getTrophyDisplayName } from "@/lib/object-specials";

describe("SpecialFoundPopup", () => {
  const baseProps = {
    rival: { special_data: { hide_message: "Secret" } },
    objects: [{ id: "obj-1", icon: "💍" }],
    onInputChange: vi.fn(),
    onVariantChange: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
  };

  it("demana text per als trofeus custom_name", () => {
    render(
      <SpecialFoundPopup
        {...baseProps}
        show={{ special: { special_type: "custom_name", prompt_text: "Posa-li nom" } }}
        specialFoundInput=""
        specialFoundVariant={null}
      />,
    );

    expect(screen.getByPlaceholderText("Escriu un nom...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desar trofeu/i })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Escriu un nom..."), { target: { value: "Cor brillant" } });
    expect(baseProps.onInputChange).toHaveBeenCalledWith("Cor brillant");
  });

  it("permet triar variant per a trofeus choose_variant", () => {
    const onVariantChange = vi.fn();
    const { rerender } = render(
      <SpecialFoundPopup
        {...baseProps}
        onVariantChange={onVariantChange}
        show={{
          special: {
            special_type: "choose_variant",
            prompt_text: "Quin tipus de pilota et guardes?",
            variants: [
              { value: "futbol", label: "Futbol", icon: "⚽" },
              { value: "basket", label: "Basket", icon: "🏀" },
            ],
          },
        }}
        specialFoundInput=""
        specialFoundVariant={null}
      />,
    );

    expect(screen.queryByPlaceholderText("Escriu un nom...")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desar trofeu/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /⚽ futbol/i }));
    expect(onVariantChange).toHaveBeenCalledWith({ value: "futbol", label: "Futbol", icon: "⚽" });

    rerender(
      <SpecialFoundPopup
        {...baseProps}
        onVariantChange={onVariantChange}
        show={{
          special: {
            special_type: "choose_variant",
            prompt_text: "Quin tipus de pilota et guardes?",
            variants: [
              { value: "futbol", label: "Futbol", icon: "⚽" },
              { value: "basket", label: "Basket", icon: "🏀" },
            ],
          },
        }}
        specialFoundInput=""
        specialFoundVariant={{ value: "futbol", label: "Futbol", icon: "⚽" }}
      />,
    );

    expect(screen.getByRole("button", { name: /desar trofeu/i })).toBeEnabled();
  });
});

describe("object specials helpers", () => {
  it("construeix trofeu de custom_name amb missatge ocult", () => {
    const specialData = buildTrophySpecialData({
      special: { special_type: "custom_name" },
      objectRecord: { name: "Foto", icon: "🖼️" },
      inputName: "Estiu 2026",
      hideMessage: "T'ha costat!",
    });

    expect(specialData.custom_name).toBe("Estiu 2026");
    expect(specialData.object_name).toBe("Foto");
    expect(specialData.custom_message).toBe("T'ha costat!");
    expect(getTrophyDisplayName(specialData)).toBe('"Estiu 2026"');
    expect(getTrophyDisplayIcon(specialData)).toBe("🖼️");
  });

  it("construeix trofeu de variant i prioritza la seva icona", () => {
    const specialData = buildTrophySpecialData({
      special: { special_type: "choose_variant" },
      objectRecord: { name: "Pilota", icon: "⚽" },
      variant: { value: "basket", label: "Bàsquet", icon: "🏀" },
      hideMessage: null,
    });

    expect(specialData.variant_value).toBe("basket");
    expect(getTrophyDisplayName(specialData)).toBe("Bàsquet");
    expect(getTrophyDisplayIcon(specialData)).toBe("🏀");
  });

  it("recupera el missatge ocult de formats antics i nous", () => {
    expect(getHideMessage({ hide_message: "Hola" })).toBe("Hola");
    expect(getHideMessage({ type: "custom_message", message: "Pista" })).toBe("Pista");
    expect(getHideMessage(null)).toBeNull();
  });
});