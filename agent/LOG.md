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
- PR/SHA: PR #204; implementation `410db5b49596f44ca34c58f4ed3dd42a7109b352`; main `b264c71eba12e37f2e8deca648590294a520c138`.
- Verifiering: riktat React-livscykelprov, berörd lint, TypeScript, regression, bygge och grön CI.
- Publicering: v123; Source `bf674640875bdea5ee27a30e7b151aeeb61ad2c7`.
- Nästa: prova kolumnmappningen med en rensad Fortnox-export och därefter sök/uppföljning för en importerad kund.

## 2026-10-14 – sök importerad kund

- Vad: kundregistret och Sök kund hittar nu även Fortnox-nummer, telefon, e-post, adresser och importerade kontaktfält.
- För vem: säljaren kan hitta en importerad befintlig kund utan en extra registerpost och fortsätta med den skapade uppföljningen.
- Varför: importen skapade redan nästa aktivitet, men sökningen saknade den tydligaste Fortnox-nyckeln.
- PR/SHA: redovisas efter merge.
- Verifiering: 52 riktade kundurvals-/sökfall, berörd lint, TypeScript och bygge passerar lokalt; full regression och CI pågår.
- Publicering: redovisas efter verifierad Source/save/deploy på befintlig Site.
- Nästa: prova samma flöde med en rensad Fortnox-export och sedan förenkla prospekteringens nästa steg.
