// public/js/notifications.js

let notificationInterval = null;
let pollingActive = false;

// Récupérer le nombre total de candidatures "reçues"
async function fetchNotificationsCount() {
  try {
    const response = await fetch("/api/ads/notifications/count", {
      credentials: "include",
    });

    if (!response.ok) return;

    const data = await response.json();
    updateGlobalNotificationBadge(Number(data.count) || 0);
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
    updateAdNotificationBadge(adId, Number(data.count) || 0);
  } catch (e) {
    console.error("Erreur fetch ad notifications:", e);
  }
}

function toggleBadge(badge, count) {
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.add("is-visible");
  } else {
    badge.textContent = "";
    badge.classList.remove("is-visible");
  }
}

// Mettre à jour le badge global (navbar "Mes offres")
function updateGlobalNotificationBadge(count) {
  const badges = document.querySelectorAll(".global-notification-badge");
  if (!badges.length) return;
  badges.forEach((badge) => toggleBadge(badge, count));
}

// Mettre à jour le badge d'une offre spécifique
function updateAdNotificationBadge(adId, count) {
  const badge = document.querySelector(`[data-ad-notification="${adId}"]`);
  toggleBadge(badge, count);
}

// Démarrer le polling (vérifier toutes les 30 secondes)
function startNotificationPolling() {
  if (pollingActive) return;
  pollingActive = true;

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
    notificationInterval = null;
  }
  pollingActive = false;
}

// Exporter les fonctions
window.notificationSystem = {
  start: startNotificationPolling,
  stop: stopNotificationPolling,
  refresh: fetchNotificationsCount,
  refreshAd: fetchAdNotificationsCount,
};

// Fonction d'initialisation qui attend que la navbar soit prête
function initNotifications() {
  const MAX_BADGE_RETRIES = 10;
  let badgeRetryAttempts = 0;

  const attemptStart = () => {
    if (document.body.dataset.role !== "recruteur") {
      stopNotificationPolling();
      return;
    }

    const badge = document.querySelector(".global-notification-badge");

    if (!badge) {
      if (badgeRetryAttempts < MAX_BADGE_RETRIES) {
        badgeRetryAttempts += 1;
        window.requestAnimationFrame(attemptStart);
      }
      return;
    }

    startNotificationPolling();
  };

  if (
    document.body.dataset.role === "recruteur" &&
    document.querySelector(".global-notification-badge")
  ) {
    attemptStart();
  } else {
    document.addEventListener("navbarReady", attemptStart, { once: true });
  }
}

// Auto-start avec attente
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNotifications);
} else {
  initNotifications();
}
