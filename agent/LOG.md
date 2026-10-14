# Körlogg

Äldre fullständig körhistorik är bevarad oförändrad i [`docs/archive/2026-10-14/agent/LOG.md`](../docs/archive/2026-10-14/agent/LOG.md).

## 2026-10-14 – rollanpassad meny och kort dokumentation

- Vad: fem vardagsval för säljare/läsare, egen kö plus Notiser för tryck/lager och ett separat Admin-val endast för administratörer.
- Varför: ovana användare ska slippa administrativa val och snabbare hitta rätt arbetsmoment.
- Dokumentation: tidigare README, BACKLOG och LOG arkiverades byteoförändrade; aktuella filer är korta och handlingsinriktade.
- PR/SHA: PR #203; implementation `2cc750e486846a0f8028f309ca991115848c216e`; main-SHA redovisas efter merge.
- Verifiering: rolltest, riktad ESLint, TypeScript, hela `tests/outlook.mjs` och produktionsbygge passerade lokalt.
- Lintbaslinje: hela `pnpm lint` har 277 äldre fel på oförändrad kod; inga regler eller befintliga fel ändrades.
- Publicering: planerad v122 på befintlig Site efter grön exakt-head CI och merge; verifieras i slutrapporten.
- Nästa: användartesta Min dag och hela orderöverlämningen i demoytan.
