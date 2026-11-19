// Shared client for every reference-implementation console: login, authenticated fetch, small render helpers.
// The token lives in sessionStorage only (cleared when the tab closes).
const BS = {
  token: sessionStorage.getItem("bs_token") || "",
  me: null,
  esc: (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]),
  toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.style.display = "block";
    clearTimeout(BS._t); BS._t = setTimeout(() => (t.style.display = "none"), 4000);
  },
  async api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (BS.token) headers.Authorization = "Bearer " + BS.token;
    if (opts.json !== undefined) { headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(opts.json); }
    const res = await fetch(path, { ...opts, headers });
    if (res.status === 401) { BS.logout(); throw new Error("Signed out: please sign in again"); }
    const body = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
    if (!res.ok) throw new Error(body?.detail ? (typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail)) : res.statusText);
    return body;
  },
  async login(username, password) {
    const res = await fetch("/auth/token", { method: "POST", body: new URLSearchParams({ username, password }) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || "Sign-in failed");
    BS.token = body.access_token; sessionStorage.setItem("bs_token", BS.token);
  },
  logout() { BS.token = ""; BS.me = null; sessionStorage.removeItem("bs_token"); BS.show(); },
  has: (...roles) => !!BS.me && roles.some((r) => BS.me.roles.includes(r)),
  // Toggles #login and #app, fills #who, then calls the page's refresh().
  async show() {
    const login = document.getElementById("login"), app = document.getElementById("app"), who = document.getElementById("who");
    if (BS.token && !BS.me) { try { BS.me = await BS.api("/auth/me"); } catch { return; } }
    login.classList.toggle("hidden", !!BS.me); app.classList.toggle("hidden", !BS.me);
    who.innerHTML = BS.me ? `${BS.esc(BS.me.subject)} <span class="mute">(${BS.esc(BS.me.roles.join(", "))})</span> <button id="out">Sign out</button>` : "";
    if (BS.me) { document.getElementById("out").onclick = BS.logout; if (window.refresh) window.refresh().catch((e) => BS.toast(e.message)); }
  },
  init() {
    document.getElementById("login-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      try { await BS.login(f.get("username"), f.get("password")); ev.target.reset(); await BS.show(); } catch (e) { BS.toast(e.message); }
    });
    BS.show();
  },
  time: (s) => (s ? new Date(s * 1000).toLocaleString() : ""),
};
window.BS = BS;
