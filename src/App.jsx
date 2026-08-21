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
