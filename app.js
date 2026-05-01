const state = {
  products: [],
  filteredProducts: [],
  activeCategory: "Todos",
  query: "",
  sortBy: "relevance",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const categoryFilters = document.querySelector("#category-filters");
const resultsSummary = document.querySelector("#results-summary");
const productsGrid = document.querySelector("#products-grid");
const heroHighlightGrid = document.querySelector("#hero-highlight-grid");
const productTemplate = document.querySelector("#product-card-template");
const modal = document.querySelector("#product-modal");
const modalContent = document.querySelector("#modal-content");
const modalClose = document.querySelector("#modal-close");

function formatPrice(value) {
  return typeof value === "number" ? currencyFormatter.format(value) : "Consulte a oferta";
}

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function buildMeta(product) {
  const parts = [];

  if (product.rating) {
    const reviews = product.reviewsCount ? ` (${product.reviewsCount})` : "";
    parts.push(`★ ${String(product.rating).replace(".", ",")}${reviews}`);
  }

  if (product.shipping) {
    parts.push(product.shipping);
  }

  if (product.installments) {
    parts.push(product.installments);
  }

  return parts.join(" • ");
}

function sortProducts(products) {
  const sorted = [...products];

  switch (state.sortBy) {
    case "price-asc":
      sorted.sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY));
      break;
    case "price-desc":
      sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      break;
    case "rating-desc":
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case "title-asc":
      sorted.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
      break;
    default:
      sorted.sort((a, b) => a.position - b.position);
      break;
  }

  return sorted;
}

function filterProducts() {
  const query = normalizeText(state.query.trim());

  const filtered = state.products.filter((product) => {
    const matchesCategory =
      state.activeCategory === "Todos" || product.category === state.activeCategory;

    const haystack = normalizeText(
      [product.title, product.brand, product.category, product.seller].filter(Boolean).join(" ")
    );

    const matchesQuery = !query || haystack.includes(query);

    return matchesCategory && matchesQuery;
  });

  state.filteredProducts = sortProducts(filtered);
}

function renderFilters(categories) {
  categoryFilters.innerHTML = "";

  ["Todos", ...categories].forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${state.activeCategory === category ? " active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      state.activeCategory = category;
      filterProducts();
      renderFilters(categories);
      renderProducts();
    });
    categoryFilters.appendChild(button);
  });
}

function openModal(product) {
  const description = `${product.title} faz parte da seleção da loja. Ao seguir para a oferta, a navegação continua na página original do Mercado Livre, sem checkout nesta vitrine.`;

  modalContent.innerHTML = `
    <img class="modal-image" src="${product.imageUrl ?? ""}" alt="${product.title}" />
    <div class="modal-copy">
      <p class="product-category">${product.category}</p>
      <h2>${product.title}</h2>
      <p>${description}</p>
      <div class="modal-price">
        ${product.previousPrice ? `<span class="product-previous-price">${formatPrice(product.previousPrice)}</span>` : ""}
        <strong>${formatPrice(product.price)}</strong>
        ${product.discount ? `<span class="filter-chip">${product.discount}</span>` : ""}
      </div>
      <dl class="modal-grid">
        <div><dt>Marca</dt><dd>${product.brand ?? "Não informada"}</dd></div>
        <div><dt>Vendedor</dt><dd>${product.seller ?? "Mercado Livre"}</dd></div>
        <div><dt>Avaliação</dt><dd>${product.rating ? `${String(product.rating).replace(".", ",")} / 5` : "Sem nota pública"}</dd></div>
        <div><dt>Parcelamento</dt><dd>${product.installments ?? "Consulte a oferta"}</dd></div>
        <div><dt>Frete</dt><dd>${product.shipping ?? "Consulte na página original"}</dd></div>
        <div><dt>Origem</dt><dd>${product.marketplace}</dd></div>
      </dl>
      <div class="modal-actions">
        <a class="primary-link" href="${product.affiliateUrl}" target="_blank" rel="noreferrer noopener">Abrir no Mercado Livre</a>
        <a class="secondary-link" href="${product.affiliateUrl}" target="_blank" rel="noreferrer noopener">Ver oferta original</a>
      </div>
    </div>
  `;

  modal.showModal();
}

function renderHeroHighlights(products) {
  const picks = [...products]
    .filter((product) => product.imageUrl && typeof product.price === "number")
    .slice(0, 4);

  heroHighlightGrid.innerHTML = picks
    .map(
      (product) => `
        <a class="highlight-card" href="${product.affiliateUrl}" target="_blank" rel="noreferrer noopener">
          <img src="${product.imageUrl}" alt="${product.title}" />
          <strong>${product.title}</strong>
          <span>${formatPrice(product.price)}</span>
        </a>
      `
    )
    .join("");
}

function renderProducts() {
  productsGrid.innerHTML = "";

  if (!state.filteredProducts.length) {
    productsGrid.innerHTML = `
      <div class="empty-state">
        <h3>Nenhum produto encontrado</h3>
        <p>Tente outra busca ou mude a categoria selecionada.</p>
      </div>
    `;
    resultsSummary.textContent = "0 produtos encontrados.";
    return;
  }

  const fragment = document.createDocumentFragment();

  state.filteredProducts.forEach((product) => {
    const node = productTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector(".product-image");
    const badge = node.querySelector(".product-badge");
    const category = node.querySelector(".product-category");
    const title = node.querySelector(".product-title");
    const brand = node.querySelector(".product-brand");
    const previousPrice = node.querySelector(".product-previous-price");
    const price = node.querySelector(".product-price");
    const meta = node.querySelector(".product-meta");
    const button = node.querySelector(".product-card-button");
    const link = node.querySelector(".product-link");

    image.src = product.imageUrl ?? "";
    image.alt = product.title;
    badge.textContent = product.highlight || product.discount || "Oferta";
    badge.hidden = !badge.textContent;
    category.textContent = product.category;
    title.textContent = product.title;
    brand.textContent = product.brand ?? product.seller ?? "Mercado Livre";
    previousPrice.textContent = product.previousPrice ? formatPrice(product.previousPrice) : "";
    price.textContent = formatPrice(product.price);
    meta.textContent = buildMeta(product);
    link.href = product.affiliateUrl;

    button.addEventListener("click", () => openModal(product));
    fragment.appendChild(node);
  });

  productsGrid.appendChild(fragment);

  const categoryPart =
    state.activeCategory === "Todos" ? "em todas as categorias" : `na categoria ${state.activeCategory}`;
  resultsSummary.textContent = `${state.filteredProducts.length} produtos encontrados ${categoryPart}.`;
}

async function bootstrap() {
  const response = await fetch("./data/products.json");
  const payload = await response.json();

  state.products = payload.products;
  renderHeroHighlights(payload.products);
  renderFilters(payload.profile.categories);
  filterProducts();
  renderProducts();
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  filterProducts();
  renderProducts();
});

sortSelect.addEventListener("change", (event) => {
  state.sortBy = event.target.value;
  filterProducts();
  renderProducts();
});

modalClose.addEventListener("click", () => modal.close());
modal.addEventListener("click", (event) => {
  const rect = modal.getBoundingClientRect();
  const isInDialog =
    rect.top <= event.clientY &&
    event.clientY <= rect.top + rect.height &&
    rect.left <= event.clientX &&
    event.clientX <= rect.left + rect.width;

  if (!isInDialog) {
    modal.close();
  }
});

bootstrap().catch(() => {
  resultsSummary.textContent = "Não foi possível carregar o catálogo.";
  productsGrid.innerHTML = `
    <div class="empty-state">
      <h3>Falha ao carregar</h3>
      <p>Verifique se o arquivo <code>data/products.json</code> foi gerado e se a página está sendo servida por um servidor local.</p>
    </div>
  `;
});
