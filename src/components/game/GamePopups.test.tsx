import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpecialFoundPopup } from "@/components/game/GamePopups";

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