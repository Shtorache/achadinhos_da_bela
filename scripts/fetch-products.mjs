import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TEMP_DIR = join(ROOT, ".cache");
const DATA_DIR = join(ROOT, "data");
const LIST_URL =
  "https://www.mercadolivre.com.br/social/hhceadfgb76373/lists/db8534f1-1dc2-45e9-ac76-30686889652c";

mkdirSync(TEMP_DIR, { recursive: true });
mkdirSync(DATA_DIR, { recursive: true });

const CATEGORY_RULES = [
  ["Tecnologia", ["alexa", "echo", "smartphone", "xiaomi", "motorola", "oppo", "infinix", "redmi", "samsung", "carregador", "fone", "bluetooth", "cabo", "calculadora"]],
  ["Áudio e TV", ["caixa de som", "speaker", "boombox", "tribit", "tv ", "smart tv", "aiwa", "philco"]],
  ["Casa e Cozinha", ["panela", "assadeira", "pote", "peneira", "coador", "bule", "chaleira", "toalha", "colcha", "cobre leito", "mesa", "cadeira", "organizador", "caixa organizadora", "marmita", "vaso sanit", "filtro", "torneira", "cobertor", "ventilador", "chuveiro"]],
  ["Moda Feminina", ["feminin", "blusa", "camiseta feminina", "t-shirt", "calça jeans feminina", "cargo wide", "pantalona", "shorts jeans", "sapatilha", "tamanco", "chinelo", "bolsa feminina", "parka", "sobretudo", "mocassim feminina"]],
  ["Moda Masculina", ["masculin", "camisa masculina", "camiseta masculina", "jeans masculina", "calça masculina", "sapatenis", "sapato", "moletom", "dry fit", "camisa polo"]],
  ["Calçados", ["tênis", "tenis", "sapatênis", "sapatilha", "mocassim", "babuche", "sandália", "sandalia", "chinelo", "fila", "puma", "colcci", "olympikus", "kappa", "under armour"]],
  ["Fitness e Suplementos", ["whey", "creatina", "pre treino", "pre workout", "top fitness", "academia", "yoga", "corrida", "ciclismo", "óculos de sol para corrida"]],
  ["Pet Shop", ["cachorro", "gato", "pet", "nexgard", "coleira", "peitoral", "ração", "jabuti", "cágado", "caixa para jabuti"]],
  ["Bebês e Infantil", ["bebê", "bebe", "infantil", "baby", "cadeirinha", "cadeira para carro", "batizado", "body", "menino", "menina", "poncho infantil"]],
  ["Ferramentas e Construção", ["lixadeira", "furadeira", "makita", "serra", "tinta", "emborrachada", "manta líquida", "manta liquida", "piso premium", "borracha líquida", "borracha liquida", "adaptador de tomada", "transformador"]],
  ["Decoração e Jardim", ["orquídea", "orquidea", "flor artificial", "balanço suspensa", "balanco suspensa", "gazebo", "camping", "jardim"]],
  ["Papelaria e Utilidades", ["papel", "ferramentas kit", "palitos", "pilhas", "balança", "balanca", "talheres infantil", "ganchos"]],
];

function runPowerShell(command) {
  execFileSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { stdio: "inherit", cwd: ROOT }
  );
}

function fetchPage(pageNumber) {
  const target = join(TEMP_DIR, `page-${pageNumber}.html`);
  const url = `${LIST_URL}?page=${pageNumber}`;
  const command = `Invoke-WebRequest -UseBasicParsing '${url}' -OutFile '${target}'`;
  runPowerShell(command);
  return readFileSync(target, "utf8");
}

function parsePage(html) {
  const startToken = "_n.ctx.r=";
  const endToken = ";_n.ctx.r.assets.manifest";
  const start = html.indexOf(startToken);
  const end = html.indexOf(endToken);

  if (start === -1 || end === -1) {
    throw new Error("Falha ao localizar o JSON de renderização da página.");
  }

  const raw = html.slice(start + startToken.length, end);
  const ctx = JSON.parse(raw);
  return ctx.appProps.pageProps;
}

function buildImageUrl(template, pictureId, square, size) {
  return template
    .replace("{square}", square)
    .replace("{2x}", "")
    .replace("{id}", pictureId)
    .replace("{size}", size)
    .replace("{sanitized_title}", "");
}

function componentMap(card) {
  return Object.fromEntries(card.components.map((component) => [component.type, component]));
}

function normalizeCategory(title) {
  const lowerTitle = title.toLowerCase();

  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((keyword) => lowerTitle.includes(keyword))) {
      return category;
    }
  }

  return "Outros";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function resolveTemplateText(template, values = []) {
  if (!template) {
    return null;
  }

  let resolved = template;

  for (const value of values) {
    let replacement = "";

    if (value.type === "price") {
      replacement = formatCurrency(value.price.value);
    } else if (value.type === "label") {
      replacement = value.label.text;
    } else if (value.type === "icon") {
      replacement = "";
    }

    resolved = resolved.replace(`{${value.key}}`, replacement);
  }

  return resolved.replace(/\s+/g, " ").replace(/\s([,.!?:;])/g, "$1").trim();
}

function toProduct(card, pageProps, pageNumber, indexWithinPage) {
  const components = componentMap(card);
  const picture = card.pictures?.pictures?.[0];
  const currentPrice = components.price?.price?.current_price?.value ?? null;
  const previousPrice = components.price?.price?.previous_price?.value ?? null;
  const installments = resolveTemplateText(
    components.price?.price?.installments?.text,
    components.price?.price?.installments?.values
  );
  const reviews = components.reviews?.reviews;
  const highlight = resolveTemplateText(
    components.highlight?.highlight?.text,
    components.highlight?.highlight?.values
  );
  const promotions =
    components.promotions?.promotions?.map((item) =>
      resolveTemplateText(item.text, item.values)
    ) ?? [];
  const pictureTemplate = pageProps.polycardContext.picture_template;
  const imageUrl = picture
    ? buildImageUrl(
        pictureTemplate,
        picture.id,
        card.pictures?.square ?? pageProps.polycardContext.picture_square_default,
        "O"
      )
    : null;
  const trackingId = pageProps.metrics.tracking_id;
  const urlBase = card.metadata.url.startsWith("http")
    ? card.metadata.url
    : `https://${card.metadata.url}`;
  const urlFragments = (card.metadata.url_fragments ?? "").replace(
    "%7Btracking_id%7D",
    trackingId
  );

  const title = components.title?.title?.text ?? "Produto sem título";
  const category = normalizeCategory(title);

  return {
    id: card.metadata.id,
    position: (pageNumber - 1) * pageProps.limit + indexWithinPage + 1,
    page: pageNumber,
    title,
    brand: components.brand?.brand?.text ?? null,
    seller: components.seller?.seller?.text?.replace(/\s+\{icon_cockade\}/g, "") ?? null,
    category,
    price: currentPrice,
    previousPrice,
    discount:
      components.price?.price?.discount_label?.text ??
      (components.price?.price?.discount?.value
        ? `${components.price.price.discount.value}% OFF`
        : null),
    installments,
    rating: reviews?.rating_average ?? null,
    reviewsCount: reviews?.total ?? null,
    shipping: components.shipping?.shipping?.text ?? null,
    highlight,
    promotions,
    imageUrl,
    affiliateUrl: `${urlBase}${card.metadata.url_params ?? ""}${urlFragments}`,
    marketplace: "Mercado Livre",
    sourceProfile: "Bela Gimenes",
    sourceList: pageProps.listName,
  };
}

const firstPageProps = parsePage(fetchPage(1));
const totalPages = Math.ceil(firstPageProps.totalItems / firstPageProps.limit);
const products = [];

for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
  const pageProps = pageNumber === 1 ? firstPageProps : parsePage(fetchPage(pageNumber));
  pageProps.polycards.forEach((card, indexWithinPage) => {
    products.push(toProduct(card, pageProps, pageNumber, indexWithinPage));
  });
}

const categories = [...new Set(products.map((product) => product.category))].sort((a, b) =>
  a.localeCompare(b, "pt-BR")
);

const payload = {
  generatedAt: new Date().toISOString(),
  source: LIST_URL,
  profile: {
    name: "Bela Gimenes",
    description: "Achadinhos da Belinha",
    totalProducts: products.length,
    categories,
  },
  products,
};

writeFileSync(join(DATA_DIR, "products.json"), JSON.stringify(payload, null, 2), "utf8");

console.log(`Catálogo gerado com ${products.length} produtos em ${categories.length} categorias.`);
