# Körlogg

Äldre fullständig körhistorik är bevarad oförändrad i [`docs/archive/2026-10-14/agent/LOG.md`](../docs/archive/2026-10-14/agent/LOG.md).

## 2026-10-14 – rollanpassad meny och kort dokumentation

- Vad: fem vardagsval för säljare/läsare, egen kö plus Notiser för tryck/lager och ett separat Admin-val endast för administratörer.
- Varför: ovana användare ska slippa administrativa val och snabbare hitta rätt arbetsmoment.
- Dokumentation: tidigare README, BACKLOG och LOG arkiverades byteoförändrade; aktuella filer är korta och handlingsinriktade.
- PR/SHA: PR #203; implementation `2cc750e486846a0f8028f309ca991115848c216e`; main `097c705e6e72650786b4570e6fb3c5aee04ad589`.
- Verifiering: rolltest, riktad ESLint, TypeScript, hela `tests/outlook.mjs` och produktionsbygge passerade lokalt.
- Lintbaslinje: hela `pnpm lint` har 277 äldre fel på oförändrad kod; inga regler eller befintliga fel ändrades.
- Publicering: v122 på befintlig Site; Source `19c5875df69d99f6700a5c051e05ef79b90b94eb`.
- Nästa: användartesta Min dag och hela orderöverlämningen i demoytan.

## 2026-10-14 – säkrare förhandsgranskning av kundimport

- Vad: en ny CSV ersätter alltid föregående förhandsgranskning; en avvisad fil lämnar ingen gammal aktiv importknapp.
- För vem: administratören ser filnamn, radstatus och automatisk kolumnkoppling innan något skrivs till CRM.
- Varför: minska risken att fel Fortnox-export importeras när ett senare filval inte kan läsas.
- PR/SHA: redovisas efter merge.
- Verifiering: riktat React-livscykelprov, lint, TypeScript, regression och bygge redovisas efter slutkontroll.
- Publicering: redovisas efter verifierad Source/save/deploy på befintlig Site.
- Nästa: prova kolumnmappningen med en rensad Fortnox-export och därefter sök/uppföljning för en importerad kund.

## 2026-10-14 – nästa komplettering direkt i orderguiden

- Vad/för vem: säljaren ser första saknade uppgift och går direkt till rätt steg; komplett underlag leder till granskning, aldrig automatisk inlämning.
- Varför: kontrollistan fanns först i sista steget och krävde onödigt letande i ett sparat arbetsunderlag.
- Omfattning: endast presentation/navigation; befintliga kontroller, utkast, sparning, antal och behörighet är oförändrade.
- Verifiering: faktisk OrderGuide i React-prov med tomt/delvis/komplett underlag, datum, konflikter, busy, fokus och inga skrivningar; TypeScript och ny kods ESLint passerar.
- PR/SHA: anges i produkt-PR och slutrapport; bas main `b264c71` och Site-Source `bf67464`.
- Publicering: v123 kvar tills exakt-head CI, merge och verifierad deploy; PR #205 lämnas separat blockerad.
- Nästa: användartesta orderförberedelsen och överlämningen med säljare respektive tryck/lager.
