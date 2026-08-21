import React, { useState } from "react";
import { auth, PLANNER_URL } from "../api";

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await auth.login(form);
      localStorage.setItem("tietheknot_invitation_auth", data.token);
      localStorage.setItem("tietheknot_invitation_user", JSON.stringify(data.user));
      onLogin(data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">TTK</div>
        <p className="eyebrow">TieTheKnot PH</p>
        <h1 id="login-title">Invitation Studio</h1>
        <p className="login-copy">Use the same approved account as your wedding planner.</p>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="username">Username</label>
          <input id="username" autoComplete="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary wide" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <a className="text-link" href={PLANNER_URL}>Return to Wedding Planner</a>
      </section>
    </main>
  );
}
