// ============================================================
// vite.config.ts — Configuració de build i dev server
// ============================================================
// IMPORTANT per a desplegaments externs:
//   - Les variables VITE_SUPABASE_* es llegeixen de .env
//   - Si no existeix .env, usa els valors per defecte (Lovable Cloud)
//   - Per connectar a un altre Supabase, crea un .env amb les claus
//   - El port per defecte és 8080 (canviable a server.port)
// ============================================================
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Valors per defecte (Lovable Cloud) — s'usen si no hi ha .env
const PUBLIC_SUPABASE_URL = "https://wqbjvceezgokqhrqckcg.supabase.co";
const PUBLIC_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxYmp2Y2Vlemdva3FocnFja2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjMzMjgsImV4cCI6MjA5MDI5OTMyOH0.Dk1OiEj5sX9CXnSsgDf9UTlbM9dI4xaWSPdlYTQ_aQc";
const PUBLIC_SUPABASE_PROJECT_ID = "wqbjvceezgokqhrqckcg";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL || PUBLIC_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(env.VITE_SUPABASE_PROJECT_ID || PUBLIC_SUPABASE_PROJECT_ID),
    },
  };
});
