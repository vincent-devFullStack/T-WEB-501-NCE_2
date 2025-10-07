console.log("search.js loaded");

// Attendre que le DOM soit chargé
window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready");

  const dropdown = document.querySelector(".dropdown-check");
  const dropbtn = document.querySelector(".dropdown-check .dropbtn");

  console.log("dropdown:", dropdown);
  console.log("dropbtn:", dropbtn);

  if (dropbtn) {
    dropbtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = dropdown.classList.toggle("open");
      dropbtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Fermer en cliquant ailleurs
  document.addEventListener("click", (e) => {
    if (dropdown && !dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });
});
