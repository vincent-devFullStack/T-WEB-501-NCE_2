// public/js/login.js
document.addEventListener("DOMContentLoaded", () => {
  // Formulaires présents ?
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  if (!loginForm && !signupForm) return;

  // Panneaux
  const loginPane = document.getElementById("login-pane");
  const signupPane = document.getElementById("signup-pane");

  // Boutons de bascule
  const showSignupBtn = document.getElementById("show-signup");
  const showLoginBtn = document.getElementById("show-login");

  // Champ conditionnel "Nom de l’entreprise" (visible si rôle = recruteur)
  const roleSelect = document.getElementById("signup-role");
  const companyWrap = document.getElementById("company-field"); // <div id="company-field">...</div>
  const companyInput = document.getElementById("signup-company"); // <input id="signup-company" name="company_name">

  // Utilitaires d'affichage
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
    updateCompanyField(); // ajuste l'état du champ entreprise
  }
  function toLogin() {
    hide(signupPane);
    show(loginPane);
  }

  // Synchronise l'UI avec l'ancre (#signup)
  function syncPaneWithHash() {
    if (location.hash === "#signup") toSignup();
    else toLogin();
  }

  // Bascule via boutons
  showSignupBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (location.hash !== "#signup") location.hash = "#signup";
    else toSignup();
  });
  showLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (location.hash) history.replaceState(null, "", location.pathname);
    toLogin();
  });

  // Arrivée initiale + changement d’ancre
  syncPaneWithHash();
  updateCompanyField(); // s’assure du bon état au premier rendu
  window.addEventListener("hashchange", syncPaneWithHash);

  // Affichage conditionnel du champ "Nom de l’entreprise"
  function updateCompanyField() {
    if (!roleSelect || !companyWrap || !companyInput) return;
    const isRecruiter = roleSelect.value === "recruteur";
    if (isRecruiter) {
      companyWrap.classList.remove("hidden");
      companyInput.required = true;
    } else {
      companyWrap.classList.add("hidden");
      companyInput.required = false;
      companyInput.value = "";
    }
  }
  roleSelect?.addEventListener("change", updateCompanyField);

  // ------- Réseau -------
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
        location.assign("/");
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
      const role = (raw.person_type || "candidat").trim();
      const isRecruiter = role === "recruteur";

      // Validation rapide côté client
      if (isRecruiter) {
        const name = (raw.company_name || "").trim();
        if (!name) {
          alert("Le nom de l’entreprise est requis pour un compte recruteur.");
          setBusy(signupForm, false);
          return;
        }
      }

      const payload = {
        first_name: raw.first_name?.trim(),
        last_name: raw.last_name?.trim(),
        email: raw.email?.trim(),
        password: raw.password,
        phone: raw.phone?.trim() || null,
        linkedin_url: raw.linkedin_url?.trim() || null,
        person_type: role,
        company_name: isRecruiter ? (raw.company_name || "").trim() : null,
      };

      const r = await postJSON("/api/auth/register", payload);
      if (r.ok || r.status === 201) {
        location.assign("/");
        return;
      }
      const err = await safeJson(r);
      if (r.status === 409) {
        alert("Email déjà utilisé.");
      } else {
        alert(err?.error || "Erreur lors de l'inscription.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau pendant l’inscription.");
    } finally {
      setBusy(signupForm, false);
    }
  });
});
