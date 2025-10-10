import multer from "multer";
import { Application } from "../models/Application.js";

// Multer en mémoire (on pourra pousser sur S3 plus tard)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5Mo
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf")
      return cb(new Error("PDF uniquement"));
    cb(null, true);
  },
});

export async function postApply(req, res) {
  try {
    const { full_name, email, phone, message, ad_id } = req.body;
    if (!full_name || !email || !phone)
      throw new Error("Champs requis manquants");
    if (!req.file) throw new Error("CV requis (PDF)");

    // TODO: uploader req.file.buffer vers S3/Cloud, récupérer cv_url
    const cv_url = null; // placeholder

    await Application.create({
      full_name,
      email,
      phone,
      message,
      cv_url,
      ad_id: ad_id ?? null,
    });

    // TODO: flash success; ici je renvoie la home avec un flag
    return res
      .status(200)
      .render("home", { title: "EVT Job board", success: true });
  } catch (err) {
    console.error("[apply]", err);
    return res.status(400).render("home", {
      title: "EVT Job board",
      error: err.message || "Erreur lors de l'envoi de la candidature",
    });
  }
}
