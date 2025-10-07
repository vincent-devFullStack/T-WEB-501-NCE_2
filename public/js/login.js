// public/js/login.js
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  const loginPane = document.getElementById("login-pane");
  const signupPane = document.getElementById("signup-pane");

  const showSignup = document.getElementById("show-signup");
  const showLogin = document.getElementById("show-login");

  function hide(el) {
    el?.classList.add("hidden");
    el?.setAttribute("aria-hidden", "true");
  }
  function show(el) {
    el?.classList.remove("hidden");
    el?.setAttribute("aria-hidden", "false");
  }

  function toSignup() {
    hide(loginPane);
    show(signupPane);
  }
  function toLogin() {
    hide(signupPane);
    show(loginPane);
  }

  // Boutons bascule
  showSignup?.addEventListener("click", (e) => {
    e.preventDefault();
    toSignup();
  });
  showLogin?.addEventListener("click", (e) => {
    e.preventDefault();
    toLogin();
  });

  // Ouvrir directement l'inscription avec /login.html#signup
  if (location.hash === "#signup") toSignup();

  // Utils réseau
  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  async function postJSON(url, data) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
  }
  function setBusy(form, busy) {
    const btn = form?.querySelector("button[type=submit]");
    if (btn) {
      btn.disabled = busy;
      btn.dataset.loading = busy ? "1" : "";
    }
  }

  // Connexion
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setBusy(loginForm, true);
    try {
      const data = Object.fromEntries(new FormData(loginForm));
      const r = await postJSON("/api/auth/login", data);
      if (r.ok) return void (location.href = "index.html");
      const err = await safeJson(r);
      alert(err?.error || "Identifiants invalides");
    } catch (err) {
      console.error(err);
      alert("Erreur réseau pendant la connexion.");
    } finally {
      setBusy(loginForm, false);
    }
  });

  // Inscription
  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setBusy(signupForm, true);
    try {
      const raw = Object.fromEntries(new FormData(signupForm));
      const payload = {
        first_name: raw.first_name?.trim(),
        last_name: raw.last_name?.trim(),
        email: raw.email?.trim(),
        password: raw.password,
        phone: raw.phone?.trim() || null,
        linkedin_url: raw.linkedin_url?.trim() || null,
        person_type: raw.person_type || "candidat",
      };
      const r = await postJSON("/api/auth/register", payload);
      if (r.ok || r.status === 201) return void (location.href = "index.html");
      const err = await safeJson(r);
      alert(err?.error || "Erreur lors de l'inscription.");
    } catch (err) {
      console.error(err);
      alert("Erreur réseau pendant l’inscription.");
    } finally {
      setBusy(signupForm, false);
    }
  });
});
