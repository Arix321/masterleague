import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/callback")({
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/carreiras" }), 600);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Entrando no vestiário...
    </div>
  );
}