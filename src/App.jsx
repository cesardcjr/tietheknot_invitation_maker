import StudioHandoff from "./pages/StudioHandoff";
import React, { useState } from "react";
import Login from "./pages/Login";
import Builder from "./pages/Builder";
import PublicInvitation from "./pages/PublicInvitation";

function publicTokenFromPath() {
  const match = window.location.pathname.match(/^\/i\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function App() {
  const publicToken = publicTokenFromPath();
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("tietheknot_invitation_auth");
    const user = localStorage.getItem("tietheknot_invitation_user");
    return token && user ? { token, user: JSON.parse(user) } : null;
  });

  const path = window.location.pathname;
  const sharedKey = path.match(/^\/event\/([A-Za-z0-9_-]{24})\/?$/)?.[1];
  if (sharedKey) return <PublicInvitation key={sharedKey} sharedKey={sharedKey} />;
  if (path === "/handoff" || path === "/handoff/start") return <StudioHandoff start={path.endsWith("/start")} />;
  if (publicToken) return <PublicInvitation token={publicToken} />;
  if (!session) return <Login onLogin={setSession} />;
  return (
    <Builder
      session={session}
      onLogout={() => {
        localStorage.removeItem("tietheknot_invitation_auth");
        localStorage.removeItem("tietheknot_invitation_user");
        setSession(null);
      }}
    />
  );
}
