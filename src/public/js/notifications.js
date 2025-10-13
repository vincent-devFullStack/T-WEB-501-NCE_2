// public/js/notifications.js

let notificationInterval;

// Récupérer le nombre total de candidatures "reçues"
async function fetchNotificationsCount() {
  try {
    const response = await fetch("/api/ads/notifications/count", {
      credentials: "include",
    });

    if (!response.ok) return;

    const data = await response.json();
    updateGlobalNotificationBadge(data.count);
  } catch (e) {
    console.error("Erreur fetch notifications:", e);
  }
}

// Récupérer le nombre de candidatures "reçues" pour une offre spécifique
async function fetchAdNotificationsCount(adId) {
  try {
    const response = await fetch(`/api/ads/${adId}/notifications/count`, {
      credentials: "include",
    });

    if (!response.ok) return;

    const data = await response.json();
    updateAdNotificationBadge(adId, data.count);
  } catch (e) {
    console.error("Erreur fetch ad notifications:", e);
  }
}

// Mettre à jour le badge global (navbar "Mes offres")
function updateGlobalNotificationBadge(count) {
  const badge = document.querySelector(".global-notification-badge");

  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  }
}

// Mettre à jour le badge d'une offre spécifique
function updateAdNotificationBadge(adId, count) {
  const badge = document.querySelector(`[data-ad-notification="${adId}"]`);

  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  }
}

// Démarrer le polling (vérifier toutes les 30 secondes)
function startNotificationPolling() {
  // Vérifier immédiatement
  fetchNotificationsCount();

  // Mettre à jour les badges de chaque offre si on est sur la page "Mes offres"
  document.querySelectorAll("[data-ad-id]").forEach((card) => {
    const adId = card.dataset.adId;
    if (adId) fetchAdNotificationsCount(adId);
  });

  // Puis toutes les 30 secondes
  notificationInterval = setInterval(() => {
    fetchNotificationsCount();

    // Mettre à jour aussi les badges individuels
    document.querySelectorAll("[data-ad-id]").forEach((card) => {
      const adId = card.dataset.adId;
      if (adId) fetchAdNotificationsCount(adId);
    });
  }, 30000);
}

// Arrêter le polling
function stopNotificationPolling() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }
}

// Exporter les fonctions
window.notificationSystem = {
  start: startNotificationPolling,
  stop: stopNotificationPolling,
  refresh: fetchNotificationsCount,
  refreshAd: fetchAdNotificationsCount,
};

// Auto-start si utilisateur est recruteur
if (document.body.dataset.role === "recruteur") {
  startNotificationPolling();
}
