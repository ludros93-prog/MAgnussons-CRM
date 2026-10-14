# Magnussons CRM

Magnussons CRM samlar säljarens arbetsdag, kunduppföljning, offerter och order samt tryck-, lager-, leverans- och fakturaunderlag. Appen är byggd för fyra säljare och två personer i tryck/lager, med svenska texter, stora tryckytor och rollanpassade arbetsvyer.

## Viktigaste arbetsflöden

- **Min dag:** uppgifter, kundlöften, uppföljning och nästa aktivitet.
- **Kunder och prospects:** gemensamt register, prospektering, kundvård och årsplanering.
- **Offerter och order:** godkännande, korrektur, tryck, lager, leverans, mottagande och fakturaunderlag som separata steg.
- **Tryck & leverans:** rollstyrda köer utan priser, marginaler, fakturor eller privata säljutkast.
- **Resultat:** försäljning mot mål, marginal och nya prospects när underlaget finns.

## Köra lokalt

Krav: Node.js 22.13 eller senare och pnpm 11.25.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Grundkontroller:

```bash
pnpm lint
node node_modules/typescript/bin/tsc --noEmit --incremental false
node tests/outlook.mjs
pnpm build
```

CI kör dessutom den byggda API-/lagringskontrollen i `tests/runtime-smoke.mjs`. Driftkonfiguration och befintlig Site-identitet finns i `.openai/hosting.json`.

## Kända begränsningar

- Fortnox, Outlook och webbshop ska inte betraktas som fungerande integrationer förrän respektive anslutning är verifierad med rätt konto.
- Kundimport från Fortnox-export behöver ett verkligt, rensat exempel och fastställd fältmappning innan skarp import.
- Roller, konto-/säljarprofilkopplingar och daglig användbarhet måste verifieras av Magnussons i deras faktiska arbetsvyer.
- Användartestprotokollet i [agent/USABILITY.md](agent/USABILITY.md) är ännu inte ett genomfört personaltest.
- GitHub-merge publicerar inte automatiskt till Site; källan byggs och publiceras separat.

## Projektstyrning

Aktuella leveranser finns i [agent/BACKLOG.md](agent/BACKLOG.md), kort körhistorik i [agent/LOG.md](agent/LOG.md) och produktkrav i [PRODUCT.md](PRODUCT.md). Tidigare långa README-, BACKLOG- och LOG-versioner är bevarade oförändrade under [`docs/archive/2026-10-14/`](docs/archive/2026-10-14/).
