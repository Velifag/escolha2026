# Escolha 2026 — App Web Compartilhável

Este projeto é uma PWA estática, pronta para GitHub Pages.

## O que o usuário final faz
Abre um link no navegador. Não precisa instalar Python, Terminal, `.command` ou servidor local.

## Atualização automática
O workflow `.github/workflows/deploy.yml`:
1. roda a cada 6 horas;
2. baixa `consulta_cand_2026.zip` diretamente do CDN oficial do TSE;
3. filtra Presidente, Governador, Senador, Deputado Federal, Deputado Estadual e Deputado Distrital;
4. gera JSON por UF;
5. publica o site no GitHub Pages.

## Privacidade
As escolhas do usuário são salvas apenas no navegador (`localStorage`).
O app não envia a seleção para servidor.

## Neutralidade
O app não classifica, recomenda, compara ou ranqueia candidatos.
Exibe dados factuais oriundos da base pública do TSE.

## Fonte oficial
https://dadosabertos.tse.jus.br/pt_BR/dataset/candidatos-2026

## Cargos incluídos
- Presidente
- Governador
- Senador (2 escolhas)
- Deputado Federal
- Deputado Estadual/Distrital

## Ordem oficial da urna aplicada
1. Deputado Federal
2. Deputado Estadual/Distrital
3. Senador 1
4. Senador 2
5. Governador
6. Presidente
