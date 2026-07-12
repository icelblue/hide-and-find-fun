// ============================================================
// useHidingFlowState — estat de la fase "hide" agrupat
// ------------------------------------------------------------
// Només estat (no handlers): agrupa els useState de la fase d'amagar per no
// contaminar GamePage. Els handlers es queden al component perquè toquen
// context transversal (RPC, toasts, i18n, personalDataRef…).
// ============================================================
import { useState } from "react";
import {
  buildCustomObjectSpecialData,
  type CustomObjectMaterial,
  type CustomObjectSize,
} from "@/lib/custom-object";
import type { Position } from "@/lib/game-types";

export function useHidingFlowState() {
  const [selectedScenario, setSelectedScenario] = useState("");
  const [selectedObject, setSelectedObject] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<Position | "">("");
  const [hideStep, setHideStep] = useState(0);
  const [objectSpecial, setObjectSpecial] = useState<Record<string, unknown> | null>(null);
  const [specialInput, setSpecialInput] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<Record<string, unknown> | null>(null);
  const [hideMessage, setHideMessage] = useState("");
  const [showHideMessagePopup, setShowHideMessagePopup] = useState(false);

  // Custom object
  const [customObjectIcon, setCustomObjectIcon] = useState("");
  const [customObjectName, setCustomObjectName] = useState("");
  const [customObjectSize, setCustomObjectSize] = useState<CustomObjectSize>(2);
  const [customObjectMaterial, setCustomObjectMaterial] = useState<CustomObjectMaterial>("generic");
  const [customObjectTrait1, setCustomObjectTrait1] = useState("");
  const [customObjectTrait2, setCustomObjectTrait2] = useState("");
  const [customObjectData, setCustomObjectData] = useState<ReturnType<typeof buildCustomObjectSpecialData> | null>(null);

  return {
    selectedScenario, setSelectedScenario,
    selectedObject, setSelectedObject,
    selectedItem, setSelectedItem,
    selectedPosition, setSelectedPosition,
    hideStep, setHideStep,
    objectSpecial, setObjectSpecial,
    specialInput, setSpecialInput,
    selectedVariant, setSelectedVariant,
    hideMessage, setHideMessage,
    showHideMessagePopup, setShowHideMessagePopup,
    customObjectIcon, setCustomObjectIcon,
    customObjectName, setCustomObjectName,
    customObjectSize, setCustomObjectSize,
    customObjectMaterial, setCustomObjectMaterial,
    customObjectTrait1, setCustomObjectTrait1,
    customObjectTrait2, setCustomObjectTrait2,
    customObjectData, setCustomObjectData,
  };
}
