# Achadinhos da Belinha

Storefront estática para reorganizar a lista de afiliados do Mercado Livre da Bela Gimenes.

## Como usar localmente

1. Gere o catálogo:
   `npm run build:data`
2. Suba um servidor local:
   `npm run serve`
3. Abra:
   `http://localhost:4173`

## O que a loja faz

- organiza os produtos por categoria;
- permite busca e ordenação;
- mostra imagem, preço, marca, vendedor e avaliação quando disponíveis;
- abre sempre a oferta original no Mercado Livre.

## Atualização do catálogo

O catálogo é gerado a partir da página pública da lista de afiliados. Se novos produtos entrarem na lista, rode `npm run build:data` novamente.

## Publicação no GitHub Pages

O projeto já inclui workflow em `.github/workflows/deploy-pages.yml`.

Passos:

1. Crie um repositório chamado `achadinhos_da_bela`.
2. Envie este projeto para a branch `main`.
3. No GitHub, em `Settings > Pages`, deixe a origem em `GitHub Actions`.
4. A URL final ficará em:
   `https://shtorache.github.io/achadinhos_da_bela/`
