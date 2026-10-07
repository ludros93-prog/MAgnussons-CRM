# Magnussons CRM

## Kundärenden med eget ansvar – v52

Kundvård visar **Kundrelationer** och **Mina kundärenden** separat. Kundärendets ansvar följer en stabil profil; administratören förankrar eller byter det med orsak, granskning och uttryckligt valda öppna ärendeuppgifter. Kundplanens privata text och kundrelationens ansvar ligger kvar.

Lokala slutkontroller för kod `2e3c102e3c7664adc9b27d2e5775023542ebfe70`: samtliga fem obligatoriska kontroller passerade på ren, oförändrad kandidat. Slutliga browserprov: 22/22 godkända på byggd isolerad Worker/D1/R2 med faktiska roller, 320/390/1280 px, 2× dialogtext, verklig 409, dubbelklick och privat utkaståterläsning/adoption/publicering; 282 källfiler/96 distfiler oförändrade, positiva 18 råtabeller och R2-/Outlook-/utkastgränser verifierade. App-main: `a81ce8870d8b1badf5cb4a7d85c0fe54178939f9`. Samma Site: version `52`, succeeded. [VALIDATION](VALIDATION.md) anger exakta bevis, återgångsgräns och kvarvarande prov.

### Historik: v51 – Onboardingansvar

Onboarding får stabil ansvarig profil och granskad administratörsöverlämning med uttryckligt valda öppna uppgifter. Fem obligatoriska lokala kontroller, slutliga 19 browserfall och CI för exakt slut-head är godkända. Profilväljare och orsakfält är verifierade i den avgränsade mobil-/textmatrisen.

App-main: `298c3ac219cf67f86fbf1aac5bf29beff9c4b2df`. Samma Site: version `51`. [VALIDATION](VALIDATION.md) anger kod, releasebevis, återgångsgräns och provens begränsningar.

### Historik: v50

CRM för Magnussons med egen arbetsdag, säljuppföljning, kundvård, order, tryck och lager. Version 13 är ursprunglig utgångspunkt. Aktuell agentetablering finns i [STATUS-2026-10-05.md](STATUS-2026-10-05.md), med tidigare granskning och pilotgränser i [STATUS-2026-10-04.md](STATUS-2026-10-04.md); verksamhetsbeslut och acceptansprov i [HANDOFF-2026-10-04.md](HANDOFF-2026-10-04.md). Ursprunglig källrevision och överföringsstatus finns i [SOURCE.md](SOURCE.md).

Kundväljaren får full text, egen **Öppna kundkort**/**Välj kund**-knapp och en rullningsyta för korta skärmar.

Fem slutkontroller och 51 lokala browserfall passerade på fryst kandidat `8886c46d3ebe67e9d737a17ab52deaabbe2d4738`. [App-PR #74](https://github.com/ludros93-prog/MAgnussons-CRM/pull/74) är sammanslagen till app-main `5d67eacd6555090482f3c155fb916359a4d67f8a`; exakt-head och app-main-CI är gröna. Samma Site publicerade v50 från source `4a62752ee5a1b2cde42e928221e64e1835ad7070`, succeeded 2026-10-07T13:55:50.690411+00:00. [VALIDATION](VALIDATION.md) skiljer kod, main, live och provgränser.

### Historik: v49

V49 återför efter användarvalt arbetsytebyte fokus till aktuell väljare, annars aktuell tillgänglig rubrik. Fortsatt inmatning avslutar återgången. Datorheadern växer/radbryts vid behov så hela arbetsytetexten och fokusramen ryms.

Fem obligatoriska slutkontroller och 54 lokala browserfall passerar på ren kandidat `ba0fb8cffb89846f9def7ca9c89432fe9df04a3a`. [App-PR #72](https://github.com/ludros93-prog/MAgnussons-CRM/pull/72) är sammanslagen till app-main `beeba143f53771fe12a8700027db115b3c858d3f` efter grön exakt-head-CI; app-main-CI är också grön. Samma Site har publicerad v49 från verifierad source `df00f356d53f19aa8c08a372f569b6c3d7bb8b14`, succeeded 2026-10-07T12:17:48.787839+00:00. Autentiserad live-UI och riktiga konto-/personalprov återstår. [STATUS](STATUS-2026-10-05.md), [VALIDATION](VALIDATION.md) och [DESIGN](DESIGN.md) anger provgränser och nästa arbete.

### Historik: v48

V48 återför fokus efter användarens stängning av kundkortet till samma öppningskontroll, eller till vyns namngivna rubrik om kontrollen saknas. Bakgrundsladdning och navigation flyttar inte fokus genom denna funktion. Arbetsytebytets separata fokuslucka och observerad personalpilot kvarstår.

Fem obligatoriska slutkontroller och 41 lokala browserfall passerar på ren kandidat `5357d1ff0b2d2b994b35d4aa2d687c7b825df3e8`. [App-PR #70](https://github.com/ludros93-prog/MAgnussons-CRM/pull/70) är sammanslagen till app-main `245512582ebffb328ae2b6664eeb334629784392`; exakt-head och app-main-CI är gröna. Samma Site har publicerad v48 från verifierad source `ca1681891da9a26f30c5639360c3081c72e0dd7a`, succeeded 2026-10-07 10:06:08 UTC. Riktiga konto-/personalprov och autentiserad live-UI återstår. [STATUS](STATUS-2026-10-05.md), [VALIDATION](VALIDATION.md) och [DESIGN](DESIGN.md) anger provgränser och nästa arbete.

### Historik: v47

V47 gör **Kundregister** responsivt: fullständigt kundnamn, kundansvarig och nästa verkliga öppna uppgift eller planerade CRM-möte visas med en separat avstämningsplan. **Öppna kundkort** har en egen tydlig knapp. Fem slutkontroller och 17 lokala browserfall passerar på slutkandidat `418531aa80e359ece524352a22a26a6cbc571e8d`; app-PR #68 är sammanslagen till app-main `6102c4eb2b47913a303ba03da6ffdd1e9f807f6b` med gröna exakt-head/main-checks. Sites v47 är publicerad 2026-10-07 08:52:19 UTC från verifierad source `b3118e0671a1967e90c14f3e2d9fd46893b05452`. Riktiga konto-/personalprov återstår. [STATUS](STATUS-2026-10-05.md), [VALIDATION](VALIDATION.md) och [DESIGN](DESIGN.md) skiljer lokala prov, main och publicerad version. V46:s Min dag-förbättringar består och dokumenteras som historik.

Vid v47 var fokusåtergång efter stängt kundkort och arbetsytebyte öppna designuppgifter. V48 rättar den avgränsade kundkortsåtergången ovan.

### Historik: v46

V46 förbättrar läsbarheten i **Min dag**: privat utkaststatus, dagens fokusetikett och texten när inga kunder behöver kontakt får plats även med större text. Nästa handling, ordning och svenska statusord består. Fem slutkontroller och 29 lokala browserfall passerar på slutkandidat `04dfa5cd`; app-PR #66 är sammanslagen till main `acc744d1` med gröna exakt-head/main-checks. Sites v46 är publicerad 2026-10-07 07:45:58 UTC från verifierad source `c8c922b3`. Riktiga konto-/personalprov återstår. [STATUS](STATUS-2026-10-05.md), [VALIDATION](VALIDATION.md) och [DESIGN](DESIGN.md) skiljer lokala prov, main och publicerad version. Autentiserad live-UI och personalens användbarhet återstår att observera.

## Utveckling och kontroller

Använd Node.js 24 och pnpm 11.25.0. Kör från projektets rot:

```sh
pnpm install --frozen-lockfile --prod=false
node tests/outlook.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Regressionstesterna täcker även CRM, v12 och v13. De använder isolerad SQLite och ersättningar för R2 och Microsoft Graph. Inga riktiga kundkonton eller externa tokens behövs. GitHub Actions kontrollerar pull requests och push till main när arbetsflödet finns i respektive revision. Kontrollera utfallet i PR:ens Checks-flik.

Lokalt kan den portabla utvecklingsservern startas med `pnpm dev`. Databas och inloggning måste förberedas enligt projektets driftinstruktioner. För en hanterad Sites-miljö används Sites-flödet för profil, installation, förhandsvisning och publicering.

## Kodöversikt

| Plats | Innehåll |
| --- | --- |
| `app/` | Sidor och server-API |
| `components/` | Säljarens, ledningens och produktionens vyer |
| `lib/` | Domänregler, roller, datalagring och integrationer |
| `drizzle/` | Databasmigreringar |
| `tests/` | Regressionstester |

## Arbetsflöde

Skapa en branch för en avgränsad ändring, kör kontrollerna och öppna en pull request. Beskriv vilket arbetsmoment som förbättras och vad som har verifierats. [AGENTS.md](AGENTS.md) gäller även när Codex eller en annan kodassistent arbetar i repot.

Det löpande CRM-bygguppdraget finns i [agent/MISSION.md](agent/MISSION.md), med [prioriterad arbetslista](agent/BACKLOG.md), [körinstruktion](agent/RUNBOOK.md), [leverantörskällor](agent/RESEARCH.md) och [verifieringslogg](agent/LOG.md). Agenten förbättrar befintligt CRM självständigt enligt Ludwigs mandat den 5 oktober; schema och faktiskt verifierade resultat dokumenteras separat.

GitHub lagrar källkod och granskningshistorik. Kunddata och uppladdade filer ligger i driftmiljön och ingår inte i en Git-backup. En merge publicerar inte automatiskt CRM:et; publicering sker separat genom Sites och ska kunna kopplas till en bestämd källrevision.

## Produkt- och driftunderlag

- [PRODUCT.md](PRODUCT.md): produkt och arbetsflöden.
- [DESIGN.md](DESIGN.md): visuellt uttryck, kundkort och designkontroller.
- [OPERATIONS.md](OPERATIONS.md): drift, åtkomst och återställning.
- [OUTLOOK.md](OUTLOOK.md): Outlook-konfiguration och gränser.
- [CLAUDE_REVIEW.md](CLAUDE_REVIEW.md): källhänvisningar och verifieringsunderlag för en oberoende v13-granskning.

Riktiga Outlook-, Fortnox-, AI- och webbshopskopplingar är inte aktiverade av denna GitHub-förberedelse. Godkända kodtester är inte bevis på produktionsberedskap eller på att säljarna klarar arbetsflödet utan hjälp.
