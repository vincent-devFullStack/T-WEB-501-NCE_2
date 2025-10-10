export async function listAdsPage(req, res) {
  // TODO: plus tard -> fetch DB (models/Ad.js)
  // Pour l’instant, on affiche la page vide, le front (load-jobs.js) remplira.
  return res.render("ads/index", { title: "Offres récentes", ads: [] });
}
