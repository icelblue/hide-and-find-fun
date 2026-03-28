import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="text-6xl mb-4 opacity-60">🔍</div>
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground mb-6">Aquesta pàgina no existeix</p>
        <Button onClick={() => navigate("/")} variant="outline">
          ← Tornar al Lobby
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
