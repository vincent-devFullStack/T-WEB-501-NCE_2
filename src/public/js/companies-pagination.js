// Client-side pagination for the companies grid

function getItemsPerPage(grid, cards) {
  if (!cards.length) return 0;

  const originalDisplay = cards.map((card) => card.style.display);
  cards.forEach((card) => {
    card.style.display = "";
  });

  const rowOffsets = [];
  let itemsPerPage = cards.length;

  for (let i = 0; i < cards.length; i += 1) {
    const top = cards[i].offsetTop;
    if (!rowOffsets.includes(top)) {
      rowOffsets.push(top);
      if (rowOffsets.length === 4) {
        itemsPerPage = i;
        break;
      }
    }
  }

  cards.forEach((card, index) => {
    card.style.display = originalDisplay[index];
  });

  return Math.max(itemsPerPage, 1);
}

function setupCompaniesPagination() {
  const grid = document.querySelector(".companies-grid");
  if (!grid) return;

  const cards = Array.from(grid.children);
  if (!cards.length) return;

  let itemsPerPage = getItemsPerPage(grid, cards);
  if (itemsPerPage >= cards.length) return;

  let currentPage = 1;
  let totalPages = Math.ceil(cards.length / itemsPerPage);

  const pagination = document.createElement("div");
  pagination.className = "companies-pagination";

  const prevBtn = document.createElement("button");
  prevBtn.className = "btn btn-secondary";
  prevBtn.type = "button";
  prevBtn.textContent = "Page précédente";

  const info = document.createElement("span");
  info.className = "companies-pagination__info";

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn";
  nextBtn.type = "button";
  nextBtn.textContent = "Page suivante";

  pagination.append(prevBtn, info, nextBtn);
  grid.insertAdjacentElement("afterend", pagination);

  function update() {
    cards.forEach((card, index) => {
      const pageIndex = Math.floor(index / itemsPerPage) + 1;
      card.style.display = pageIndex === currentPage ? "" : "none";
    });
    info.textContent = `Page ${currentPage} / ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  prevBtn.addEventListener("click", () => {
    if (currentPage <= 1) return;
    currentPage -= 1;
    update();
    grid.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  nextBtn.addEventListener("click", () => {
    if (currentPage >= totalPages) return;
    currentPage += 1;
    update();
    grid.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  let resizeTimeout = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const newItemsPerPage = getItemsPerPage(grid, cards);
      if (newItemsPerPage === itemsPerPage) return;
      itemsPerPage = newItemsPerPage;
      totalPages = Math.ceil(cards.length / itemsPerPage);
      currentPage = Math.min(currentPage, totalPages);
      update();
    }, 200);
  });

  update();
}

document.addEventListener("DOMContentLoaded", setupCompaniesPagination);
