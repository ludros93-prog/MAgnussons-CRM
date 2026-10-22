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

## 2026-10-14 – orderguidens genväg publicerad

- Vad/för vem: nästa saknade orderuppgift kan nu öppnas direkt av säljaren; granskning och uttrycklig inlämning finns kvar.
- PR/SHA: #206, head `f1312ba42bce8474dc6511207c32fdc5884e9e97`; main `f48c7e043752b4c196b39a11225f441b9064808e`.
- Verifiering: exakt-head CI 38616435058 grön (regression, TypeScript, bygge, isolerad D1/R2); källblobbar matchar main och lokalt paketbygge passerar.
- Publicering: v124; Source `a86641a417586bae1559e448ed76cc1d4ab932c9`; terminal deploy succeeded. Åtkomstpolicy, auth-klient och scheman oförändrade vid efterkontroll.
- Avgränsning: ingen browser- eller personalacceptans påstås; detaljerade provkvitton finns i PR #206.
- Nästa: användartesta orderguidens nästa handling i demoytan. PR #205 är fortfarande separat blockerad.

## 2026-10-14 – nå hela företagsurvalet

- Vad/för vem: säljaren kan visa nästa 100 företag i sökurvalet i stället för att fastna vid de första 100.
- Varför: den tidigare fasta avklippningen krävde ett nytt filter för att nå senare företag; nu finns tydligt visat/totalantal och fokus på första nya kortet.
- Omfattning: enbart listvisning; filterbyte återställer första gruppen. Kontaktspärrar, kundkopplingar, konvertering och serverrättigheter är oförändrade.
- Verifiering: faktisk sökkomponent/domän med 237 syntetiska företag, alla filter, fokus, kundlänk, spärr/läsare och inga skrivningar; ESLint, TypeScript och produktionsbygge passerar.
- PR/SHA: slutrevision och fulla provkvitton anges i produkt-PR; bas main `f48c7e0`, Source `a86641a`.
- Publicering: v124 kvar tills exakt-head CI, merge och verifierad deploy. Ingen browser- eller personalacceptans påstås.
- Nästa: prova verklig prospektering i demoytan; PR #205 för kundsökning kvarstår separat blockerad.

## 2026-10-22 – datumöversikt för tryck och lager

- Vad/för vem: månad/dag och datumtyp i Tryck & leverans för öppna jobb i aktuell sökning; saknade datum visas separat.
- Varför: Sebbes önskemål den 19 oktober om månadsöversikt och dagsplan. Detta är deadlineöversikt, inte tidsbokning eller kapacitetslöfte.
- Omfattning: läsvy som öppnar befintliga jobb; inga nya lagringsfält, roller, orderhändelser eller integrationer.
- Källa: GitHub main `ff899dd`, identiskt träd med Sites Source `e572467`; öppna PR #202 och #205 lämnas orörda.
- Verifiering: React-prov för periodgräns, dag/månad, datumtyp, unika jobb, saknade datum, tomt urval och oförändrade indata; TypeScript, riktad ESLint och bygge passerar.
- Begränsning: förhandsvisningen nådde inte healthy före timeout. Browser- och personalprov är inte verifierade. Full regression/runtime och exakt-head CI redovisas i PR.
- Leverans: gren `feat/production-date-overview`; v125 kvar tills godkänd CI, merge och terminal deploy.
- Nästa: slutför kandidatens kontroll/publicering; håll IT-godkännande och verklig Outlook/Fortnox-anslutning separata från frontendarbete.
