import React, { useEffect, useRef, useState } from "react";
import { auth, PLANNER_URL } from "../api";

const encode = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const random = () => encode(crypto.getRandomValues(new Uint8Array(32)));

export default function StudioHandoff({ start }) {
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function handoff() {
      if (start) {
        const verifier = random();
        const state = random();
        sessionStorage.setItem("studio-handoff", JSON.stringify({ verifier, state }));
        const challenge = encode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
        const planner = new URL("/", PLANNER_URL);
        planner.search = new URLSearchParams({ studioHandoff: "1", state, challenge });
        window.location.replace(planner.href);
        return;
      }
      const params = new URLSearchParams(window.location.hash.slice(1));
      history.replaceState(null, "", "/handoff");
      const pending = JSON.parse(sessionStorage.getItem("studio-handoff") || "null");
      sessionStorage.removeItem("studio-handoff");
      if (!pending || pending.state !== params.get("state")) throw Error("Invalid Studio sign-in request");
      const { data } = await auth.exchange(params.get("code"), pending.verifier);
      localStorage.setItem("tietheknot_invitation_auth", data.token);
      localStorage.setItem("tietheknot_invitation_user", JSON.stringify(data.user));
      window.location.replace("/");
    }
    handoff().catch(() => setError("Studio sign-in could not be completed. Open Studio again from Planner or sign in here."));
  }, [start]);
  return <main className="public-state">{error ? <><p>{error}</p><a href="/">Open Studio sign-in</a></> : <p>Signing you in to Invitation Studio…</p>}</main>;
}
