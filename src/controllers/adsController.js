import { Ad } from "../models/Ad.js";

export async function listAdsPage(req, res) {
  try {
    const ads = await Ad.listPublicWithRelations();

    return res.render("ads/index", {
      title: "Offres récentes",
      ads,
    });
  } catch (error) {
    console.error("Erreur lors du chargement des annonces:", error);
    return res.render("ads/index", {
      title: "Offres récentes",
      ads: [],
    });
  }
}
