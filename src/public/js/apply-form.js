// public/js/apply-form.js

// Récupérer les infos de l'utilisateur connecté
async function getUserInfo() {
  try {
    const r = await fetch("/api/auth/me", { credentials: "include" });
    if (!r.ok) return null;
    const data = await r.json();
    return data.user;
  } catch {
    return null;
  }
}

// Vérifier si l'utilisateur a déjà postulé à une offre
async function checkIfAlreadyApplied(adId) {
  try {
    const r = await fetch(`/api/ads/${adId}/check-applied`, {
      credentials: "include",
    });
    if (!r.ok) return false;
    const data = await r.json();
    return data.already_applied || false;
  } catch {
    return false;
  }
}

// Activer le formulaire quand une offre est sélectionnée
function enableApplicationForm(adId, alreadyApplied = false) {
  const fieldset = document.getElementById("apply-fieldset");
  const submitBtn = fieldset?.querySelector('button[type="submit"]');
  const adIdInput = document.getElementById("apply-ad-id");

  if (adIdInput) adIdInput.value = adId;

  if (fieldset) {
    if (alreadyApplied) {
      // Désactiver le formulaire et changer le bouton
      fieldset.disabled = true;
      if (submitBtn) {
        submitBtn.textContent = "✓ Déjà postulé";
        submitBtn.style.backgroundColor = "#6c757d";
      }
    } else {
      // Activer le formulaire
      fieldset.disabled = false;
      if (submitBtn) {
        submitBtn.textContent = "Envoyer la candidature";
        submitBtn.style.backgroundColor = "";
      }
    }
  }
}

// Pré-remplir le formulaire avec les données de l'utilisateur
async function prefillApplicationForm() {
  const user = await getUserInfo();
  if (!user) return;

  const nameField = document.getElementById("apply-name");
  const emailField = document.getElementById("apply-email");
  const phoneField = document.getElementById("apply-phone");

  // Pré-remplir le nom
  if (nameField) {
    const fullName =
      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.name ||
      "";
    if (fullName) nameField.value = fullName;
  }

  // Pré-remplir l'email
  if (emailField && user.email) {
    emailField.value = user.email;
  }

  // Pré-remplir le téléphone avec un délai
  if (phoneField && user.phone) {
    phoneField.value = user.phone;

    setTimeout(() => {
      phoneField.value = user.phone;
      phoneField.dispatchEvent(new Event("input", { bubbles: true }));
      phoneField.dispatchEvent(new Event("change", { bubbles: true }));
    }, 100);
  }
}

// Gérer la soumission du formulaire
const applyForm = document.getElementById("quick-apply-form");
if (applyForm) {
  applyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const adId = document.getElementById("apply-ad-id")?.value;
    if (!adId) {
      alert(
        'Veuillez sélectionner une offre en cliquant sur "Candidature rapide"'
      );
      return;
    }

    const formData = new FormData(e.target);
    const statusEl = document.getElementById("apply-status");

    // Vérifier la taille du CV
    const cvFile = formData.get("cv");
    if (cvFile && cvFile.size > 5 * 1024 * 1024) {
      statusEl.textContent = "❌ Le CV ne doit pas dépasser 5 Mo";
      statusEl.className = "form-status error";
      return;
    }

    statusEl.textContent = "Envoi en cours...";
    statusEl.className = "form-status info";

    try {
      const r = await fetch(`/api/ads/${adId}/apply`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await r.json();

      if (r.ok) {
        statusEl.textContent = "✅ Candidature envoyée avec succès !";
        statusEl.className = "form-status success";

        // Changer le bouton en "Déjà postulé"
        enableApplicationForm(adId, true);

        // Réinitialiser seulement certains champs
        document.getElementById("apply-cv").value = "";
        const messageField = document.getElementById("apply-message");
        if (messageField) messageField.value = "";

        setTimeout(() => {
          statusEl.textContent = "";
          statusEl.className = "form-status";
        }, 5000);
      } else {
        statusEl.textContent = `❌ ${result.error || "Erreur lors de l'envoi"}`;
        statusEl.className = "form-status error";
      }
    } catch (err) {
      console.error(err);
      statusEl.textContent = "❌ Erreur de connexion";
      statusEl.className = "form-status error";
    }
  });
}

// Pré-remplir au chargement de la page
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", prefillApplicationForm);
} else {
  prefillApplicationForm();
}

// Exposer la fonction globalement pour les boutons "Candidature rapide"
window.enableApplicationForm = enableApplicationForm;
window.checkIfAlreadyApplied = checkIfAlreadyApplied;
