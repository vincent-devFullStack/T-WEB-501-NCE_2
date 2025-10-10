// public/js/login.js
document.addEventListener("DOMContentLoaded", () => {
  // Ne rien faire si on n'est pas sur la page login
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  if (!loginForm && !signupForm) return;

  const loginPane = document.getElementById("login-pane");
  const signupPane = document.getElementById("signup-pane");

  const showSignupBtn = document.getElementById("show-signup");
  const showLoginBtn = document.getElementById("show-login");

  const hide = (el) => {
    if (!el) return;
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
  };
  const show = (el) => {
    if (!el) return;
    el.classList.remove("hidden");
    el.setAttribute("aria-hidden", "false");
  };

  function toSignup() {
    hide(loginPane);
    show(signupPane);
  }
  function toLogin() {
    hide(signupPane);
    show(loginPane);
  }

  // --- Synchronise l'UI avec le hash de l'URL
  function syncPaneWithHash() {
    if (location.hash === "#signup") toSignup();
    else toLogin();
  }

  // Bascule via les boutons internes (et met à jour l'URL)
  showSignupBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (location.hash !== "#signup") location.hash = "#signup";
    else toSignup(); // au cas où
  });
  showLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (location.hash) history.replaceState(null, "", location.pathname);
    toLogin();
  });

  // Arrivée directe avec /auth/login#signup
  syncPaneWithHash();

  // Si le hash change (ex: clic sur "S'inscrire" dans la navbar alors qu'on est déjà ici)
  window.addEventListener("hashchange", syncPaneWithHash);

  // ------- Helpers réseau -------
  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  function setBusy(form, busy) {
    const btn = form?.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = !!busy;
    btn.dataset.loading = busy ? "1" : "";
  }
  async function postJSON(url, data) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
  }

  // ------- Connexion -------
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setBusy(loginForm, true);
    try {
      const data = Object.fromEntries(new FormData(loginForm));
      const r = await postJSON("/api/auth/login", data);
      if (r.ok) {
        location.assign("/"); // retour à l'accueil MVC
        return;
      }
      const err = await safeJson(r);
      alert(err?.error || "Identifiants invalides");
    } catch (err) {
      console.error(err);
      alert("Erreur réseau pendant la connexion.");
    } finally {
      setBusy(loginForm, false);
    }
  });

  // ------- Inscription -------
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
      if (r.ok || r.status === 201) {
        location.assign("/"); // retour à l'accueil après création
        return;
      }
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
