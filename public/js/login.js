// login.js

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const showSignup = document.getElementById("show-signup");
const showLogin = document.getElementById("show-login");

// --- Bascule entre les formulaires ---
showSignup.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  signupForm.classList.remove("hidden");
});

showLogin.addEventListener("click", () => {
  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
});

// --- Connexion ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm));

  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // indispensable pour le cookie JWT
    body: JSON.stringify(data),
  });

  if (r.ok) {
    location.href = "index.html"; // redirige vers l'accueil
  } else {
    const err = await safeJson(r);
    alert(err?.error || "Identifiants invalides");
  }
});

// --- Inscription ---
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = Object.fromEntries(new FormData(signupForm));

  const data = {
    first_name: raw.first_name?.trim(),
    last_name: raw.last_name?.trim(),
    email: raw.email?.trim(),
    password: raw.password,
    phone: raw.phone?.trim() || null,
    linkedin_url: raw.linkedin_url?.trim() || null,
    person_type: raw.person_type || "candidat",
  };

  const r = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // pose aussi le cookie après signup
    body: JSON.stringify(data),
  });

  if (r.ok) {
    location.href = "index.html"; // redirige aussi vers l'accueil
  } else {
    const err = await safeJson(r);
    alert(err?.error || "Erreur lors de l'inscription");
  }
});

// --- Fonction utilitaire pour éviter les plantages JSON ---
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
