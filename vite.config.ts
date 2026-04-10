// ============================================================
// vite.config.ts — Configuració de build i dev server
// ============================================================
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

const PUBLIC_SUPABASE_URL = "https://wqbjvceezgokqhrqckcg.supabase.co";
const PUBLIC_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxYmp2Y2Vlemdva3FocnFja2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjMzMjgsImV4cCI6MjA5MDI5OTMyOH0.Dk1OiEj5sX9CXnSsgDf9UTlbM9dI4xaWSPdlYTQ_aQc";
const PUBLIC_SUPABASE_PROJECT_ID = "wqbjvceezgokqhrqckcg";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: { overlay: false },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      // Inject CSS via JS to eliminate render-blocking stylesheet
      mode === "production" && cssInjectedByJsPlugin(),
    ].filter(Boolean),
    build: {
      target: "es2020",
      cssMinify: true,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Supabase in its own chunk
            if (id.includes("@supabase")) return "supabase";
            // React core
            if (id.includes("react-dom")) return "react-dom";
            if (id.includes("react-router")) return "router";
            // TanStack Query
            if (id.includes("@tanstack")) return "query";
            // Radix UI components
            if (id.includes("@radix-ui")) return "radix";
            // Sonner toast
            if (id.includes("sonner")) return "sonner";
          },
        },
      },
    },
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
