// ============================================================
// Index.tsx — Redirecció d'entrada
// ============================================================
// React Router usa "/" com a ruta arrel. Aquest component
// simplement redirigeix a "/" (el Lobby o AuthPage segons
// l'estat d'autenticació, gestionat a App.tsx).
// ============================================================

import { Navigate } from "react-router-dom";

export default function Index() {
  return <Navigate to="/" replace />;
}
