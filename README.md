# Magnussons CRM

## Eget ansvar för varje eventförberedelse – v60

Administratören kan granska och överlämna en öppen förberedelse i **Företagets aktiviteter**. **Förberedelsens ansvar** och **Aktivitetens ansvar** visas separat. Ett uttryckligt profilval, en orsak och granskning ändrar bara den valda radens ansvar och registrerar historiken atomiskt. Vanlig aktivitetssparning och klarmarkering bevarar historiken.

App-PR #94 är på main och v60 är publicerad på samma begränsat delade Site. De fem slutkontrollerna och 24 isolerade browserfall är gröna; riktiga konto-/integrationsprov och personalpilot återstår. [OPERATIONS](OPERATIONS.md) beskriver stegen; [VALIDATION](VALIDATION.md) anger bevis/gränser. Ny förberedelsehistorik kräver **v60-kompatibel läsare och skrivare**. Aktivitetens övergripande ansvar, full personalavveckling och hostingåterställning återstår.

## Historik före v60

## Överlämna kundkontakten efter leveransen – v59

Administratören kan granska och byta ansvar för en öppen **Leveransuppföljning** efter registrerat kundmottagande och komplett avsändningsunderlag. Dialogen visar skilda uppgifts-, kundrelations- och orderansvar. Endast uppgiften överlämnas; mottagande, fakturering och tidigare resultat ligger kvar. Orsak/val bevaras vid fel.

Fem slutkontroller och 22 isolerade browserfall passerade. Samma Site har publicerad v59. [OPERATIONS](OPERATIONS.md) beskriver arbetssättet; [VALIDATION](VALIDATION.md) belägg/gränser. Ny länkhistorik kräver **v59-kompatibel läsare och skrivare**. Konto-/personalprov och full hostingåterställning återstår.

## Historik före v59

## Rätt arbetsvy från första laddningen – v58

CRM visar en neutral svensk startvy tills användaren är känd. Vid fel finns **Arbetsyta** och **Försök igen**. Tryck/lager får direkt sin tillåtna vy. Outlook följer rätt live-identitet och döljer tidigare innehåll vid byte.

Fem slutkontroller och 23 browserfall passerade; samma Site har publicerad v58. [OPERATIONS](OPERATIONS.md) beskriver starten; [VALIDATION](VALIDATION.md) anger bevis/gränser. Verkliga Microsoft-konton och personalpilot återstår.

## Historik före v58

## Överlämna en kundaktivitet med granskning – v57

Administratören kan välja **Byt uppgiftsansvar** för en öppen **Kundavstämning**, **Kommande kundbehov** eller **Prospektkontakt** utan affärskoppling. Välj en tillgänglig aktiv granskad profil, skriv varför och granska innan sparning. En enda skrivning ändrar uppgiftens ansvar och registrerar dess överföring/händelse. **Kundrelationsansvar · ligger kvar** visar vem som fortfarande äger relationen; kundplan, prospektkvalificering och tidigare resultat flyttas inte.

Befintliga kundplan-/prospektuppdateringar bevarar den överlämnade uppgiftens profil-ID. En ny kanonisk uppgift utgår fortfarande från kundrelationsansvarig. Följ upp och prospektkvalificering har kvar sina egna regler; överlämningen registrerar ingen kontakt, kvalificering, affär eller kundacceptans. [OPERATIONS](OPERATIONS.md) beskriver arbetssättet.

Kod `0928c096c2e54c264c1bc75bd7b00f696c6160f6`, app-main `c4a29ae0571b5d311851f1577ba969e9fbf20515`, [app-PR #88](https://github.com/ludros93-prog/MAgnussons-CRM/pull/88). Slutkontroller: 5/5 exit 0 på ren, oförändrad head: CRM/Outlook-regressioner, icke-inkrementell TypeScript, produktionsbygge, isolerad runtime och git diff --check; isolerade browserprov: 24/24 PASS. Samma Site version `57`, source `70ec24a37e0b0c30176c5a440bf9b02fc2e3fd6f`, deploy `appgdep_6ac6deba62088191a4cabc95fdfccbb1`, succeeded `2026-10-08T00:07:48.220332+00:00`. [VALIDATION](VALIDATION.md) skiljer kod-, GitHub- och publiceringsbevis.

Inga nya lagringsfält/tabeller eller SQL-migrationer. Efter direkt överföring av dessa specialuppgifter krävs **v57-kompatibel läsare och skrivare**: äldre oförändrad v56 avvisar den nya historiksemantiken även vid läsning, export och restore. Konto/Sitesåtkomst, privata data och full personalavveckling är separata; se [RUNBOOK](agent/RUNBOOK.md).

## Historik före v57


## Återöppna samma kundrelation med granskning – v56

Administratören kan öppna ett **Avslutat** kundkort och välja **Återöppna kundrelation**. Välj aktiv granskad kundrelationsansvarig, relation, orsak och en ny uppföljning med egen beskrivning och datum. En enda sparning återöppnar samma kund, förankrar kundrelationsansvaret och skapar den planerade uppgiften med en spårbar historikhändelse. Tidigare affärer, order, resultat och aktiviteter behåller sina ansvariga.

Den tidigare tvåstegsvägen – granskat kundansvarsbyte följt av vanlig statusredigering – finns kvar. Den nya adminhandlingen samlar återöppning och planerad uppföljning atomiskt. Den antar ingen kundkontakt, ny affär, kundacceptans eller generell återöppningspolicy. [OPERATIONS](OPERATIONS.md) beskriver valen och kvarvarande gränser.

Kod `58e82f68990074fca0f80ad7a961cb64f1506ea4`, app-main `a212b63dbd12c2bed5908623de53aed71c104deb`, [app-PR #86](https://github.com/ludros93-prog/MAgnussons-CRM/pull/86). Slutkontroller: 5/5 exit 0 på ren, oförändrad head: CRM/Outlook-regressioner, icke-inkrementell TypeScript, produktionsbygge, isolerad runtime och git diff --check; isolerade browserprov: 18/18 PASS. Samma Site: version `56`, source `f1191a9b7bbd89259a1eab366a3416a5e0f5e02c`, deploy `appgdep_6ac6cf51eecc8191bd16698b296c834a`, succeeded `2026-10-07T23:02:01.928120+00:00`. [VALIDATION](VALIDATION.md) anger faktiska kvitton och provgränser.

Inga nya lagringsfält/tabeller eller SQL-migrationer införs. Minsta kompatibla skrivare är fortsatt **v55** efter dess profilavslutshistorik; v56 höjer inte den gränsen. Konto/Sitesåtkomst, privata utkast och generell historisk affärs-/orderredigering ingår inte i återöppningen.

## Historik före v56


## Granskat avslut av resultatprofil – v55

Efter att öppet arbete hanterats kan administratören öppna **Konton & roller → Överlämna arbete → Granska profilavslut** och göra resultatprofilen historisk i vald arbetsyta. Servern kontrollerar hela profilens operativa underlag, oavsett sökning, kategori eller antal visade kort. Orsak och ny uttrycklig granskning krävs. Profil-ID, tidigare resultat, mål, avslutade poster och sparad kontolänk bevaras.

**Resultatprofil**, **CRM-konto** och **Sidåtkomst** visar olika tillstånd. Profilavslutet stänger inget konto och kontrollerar inte andra arbetsytor eller produktionens användaransvar. Det är därför ingen full personalavveckling. [OPERATIONS](OPERATIONS.md) beskriver handlingen och kvarvarande steg.

Kod `01bead7b097673b7c74499786e0f4a0bc602a4ca`, app-main `3162d6ef5546ac5192510a9b75799733714a923d`, [app-PR #84](https://github.com/ludros93-prog/MAgnussons-CRM/pull/84). Lokala slutkontroller: 5/5 exit 0 på ren, oförändrad head: CRM/Outlook-regressioner, icke-inkrementell TypeScript, produktionsbygge, isolerad runtime och git diff --check; isolerade browserprov: 16/16 PASS. Samma Site: version `55`, source `9fe89ae7167d6561ae56b99d822228effcd8f435`, deploy `appgdep_6ac6c009b0bc8191b6fc8f115b22f7ac`, succeeded `2026-10-07T21:56:49.614848+00:00`. [VALIDATION](VALIDATION.md) skiljer detta från verkliga konto-, integrations-, personal- och hostingåterställningsprov.

Profilavslutets historik kräver en **v55-kompatibel skrivare**. Äldre oförändrad v54 kan skriva bort den nya historiken och är därför ingen säker skrivande återgång efter nya v55-data. Behåll en v55-kompatibel korrigering eller genomför en faktiskt verifierad full återställning med plan för senare arbete; se [RUNBOOK](agent/RUNBOOK.md).

## Historik före v55

## Samlad arbetsöverlämning – v54

Administratören öppnar **Konton & roller → Överlämna arbete**, väljer en säljarprofil och ser personens kvarvarande kundrelationer och öppna ansvarsdelar. Sökning, arbetskategori och **Visa fler ansvarsposter** gör urvalet hanterbart. **Granska** öppnar rätt befintlig överlämning; orsak, mottagare, uppgiftsval och sparning görs där. Äldre eller oklar ansvarskoppling märks tydligt, och inaktiva profiler kan fortfarande ha arbete kvar.

Översikten stänger inget konto och flyttar inga historiska resultat, privata utkast eller personliga Outlook-data. Produktionspersoner och företagsevent har separata ansvar. Ett tomt urval innebär inte att en person kan avvecklas. [OPERATIONS](OPERATIONS.md) beskriver arbetssättet och kvarvarande gränser.

Verifierad kod `ab0d64dd7209cb2dc458742ac8a5903fd08a1378`, app-main `b4b75010a0cc3a59a232d3a983eaccff70a4da56`, [app-PR #82](https://github.com/ludros93-prog/MAgnussons-CRM/pull/82). Lokala slutkontroller: 5/5 godkända på oförändrad ren slutkandidat; isolerade slutbrowserprov: 31/31 godkända. Samma Site: version `54`, source `73fc3dd07d93077234a1acc07b56075f00beaf6d`, deploy `appgdep_6ac6b48932988191a6426b431da3c62f`, succeeded `2026-10-07T21:07:45.104197+00:00`. [VALIDATION](VALIDATION.md) skiljer kod, main, publicering och provens begränsningar.

## Historik före v54

## Årshjul med eget behovsansvar – v53

Under **Kunder → Årsplanering** visar **Mina behov** och **Teamets behov** kundens planerade inköp utifrån behovets ansvar, med olika datum för kontakt och leveransbehov. Administratören förankrar eller byter behovsansvar med orsak, granskning och uttryckligt valda öppna årshjulsuppgifter. Vanlig redigering behåller ansvar och visar ändrat underlag före ny sparning. Behovsformulärets text bevaras i den öppna dialogen men är ännu inget privat serverutkast.

Samtliga fem obligatoriska slutkontroller och 22/22 isolerade browserfall passerade på ren kandidat `355482080525a3ee8bd4e34cdf8921d5dd70eedf`. [App-PR #80](https://github.com/ludros93-prog/MAgnussons-CRM/pull/80) är sammanslagen till app-main `95b7af782b49aaa05f733da21cb1781fff0bb4f1`; exakt PR-head och app-main har 13/13 completed/success CI-steg. Samma Site publicerade version `53` från verifierad source `560a0c49fb7536ca6ff1ac1c25ffcd097c21ea75`, succeeded 2026-10-07T19:24:07.221448+00:00. [VALIDATION](VALIDATION.md) skiljer kod, main, publicering och kvarvarande konto-/personal-/återställningsprov.

### Historik: v52 – Kundärenden med eget ansvar

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
