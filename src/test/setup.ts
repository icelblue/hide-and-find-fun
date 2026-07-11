import "@testing-library/jest-dom";

// ------------------------------------------------------------
// Entorn Supabase fictici per a tests unitaris.
// Els tests no han de dependre d'un .env real: si el fitxer que
// s'importa acaba creant el client de Supabase, li donem valors
// vàlids sintàcticament perquè createClient() no llanci error.
// Cap test fa peticions reals de xarxa contra aquesta URL.
// ------------------------------------------------------------
import.meta.env.VITE_SUPABASE_URL ||= "https://test-project.supabase.co";
import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= "test-anon-key";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
