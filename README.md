# Magnussons CRM

## Ändra hinderbeskrivningen med bevarad rapportör – v67

När rapportören eller en administratör ändrar ett öppet produktionshinders beskrivning ligger registrerat rapportörs-ID, namn och rapporttid kvar. Redigeraren registreras i den befintliga händelsen; redigeringen flyttar inget ansvar. Därmed kan en administratörs textändring inte längre tömma rapportörens hinderansvar i kontoändringens kontroll.

Rapportering, beskrivningsredigering och registrering av lösningen har skilda instruktioner och handlingar. Dialogen visar kund, affär, order, arbetsreferens och det ursprungliga underlaget. Lokalt skriven text finns kvar vid fel i den öppna dialogen; den är inget varaktigt privat utkast.

De fyra berörda beskrivnings- och lösningsfälten har begränsad höjd och intern rullning för att göra lång text och tangentbordsfokus hanterbara på små skärmar. Hinderdialogens titel samt rubrikerna för registrerat underlag och lösning får radbrytas inom tillgänglig bredd. Jobbdetaljernas motsvarande breddanpassning gäller när hinderhanteringen är öppen. Hinderformulärens knappar har uttrycklig minimihöjd 44 CSS-pixlar som lokalt designmål. Övriga textfält följer sin tidigare utformning. Faktiska slutliga browserbelägg redovisas i [VALIDATION](VALIDATION.md).

När hinderformuläret är öppet visas jobbdatum i en kolumn på smala skärmar. Långa knapp- och varningstexter får radbrytas inom jobbvyns tillgängliga bredd; innehållet finns kvar.

Jobbdetaljernas två hindertextfält rullar vyn till fältet vid fokus utan att ändra text, fokus eller sparunderlag. Det är en lokal anpassning för ett faktiskt fynd där ett fokuserat fält delvis låg utanför skärmen.

Kod `7aece13c6905eac12dd0eb5a345b373e13092d3c`, GitHub app-main `67d53b987554449298c78b8dfa3ba943ed8b6cd0` via [PR #108](https://github.com/ludros93-prog/MAgnussons-CRM/pull/108). Kontroller: Alla fem obligatoriska kontroller passerade på den frysta slutkandidaten; varje exitkod var 0 och samtliga 337 spårade filer, head och träd var oförändrade efter provet. Live: Version 67 är publicerad med lyckad deploy på samma befintliga Site och adress på [samma CRM-adress](https://magnussons-crm.rosen123.chatgpt.site), verifierad källa `6ed430523ab5c55cb7f23688513448728f80a947`. Dokumentationen har separat revision. [VALIDATION](VALIDATION.md) anger belägg och gränser.

Ingen ny lagring eller formatgräns: v66-golvet efter äldre jobbansvarsrättning gäller fortsatt. Granskat byte av hinderansvar, verkliga personalprov och full hostad återställning återstår. Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten. Codex-referensen är oläst.

## Historik före v67

# Magnussons CRM

## Rätta äldre jobbansvar med granskning – v66

Administratören kan välja **Rätta äldre jobbansvar** för ett aktuellt jobb som är lämnat eller tryckt och bara har ett sparat ansvarigt namn. Läs det äldre namnet och tidsfältet, välj ett befintligt anslutet CRM-konto, beskriv det verkliga underlaget och granska före **Registrera rättning**. Det valda kontot får jobbansvaret från rättningen; namnet identifierar ingen tidigare person.

Mängder, tryck, kassation, delleveranser, hinderansvar och kommersiellt orderansvar bevaras. Andra oklara eller motsägande kopplingar behöver sina egna granskade arbetsflöden. Efter hanterat ansvar behöver kontoändringens granskning hämtas igen.

Ny rättningshistorik kräver **v66-kompatibel läsare och skrivare**. Backupformatet är fortsatt `magnussons-crm-1`; inga SQL-tabeller eller migrationer tillkommer. [OPERATIONS](OPERATIONS.md) beskriver arbetsgången. Fem obligatoriska slutkontroller passerade på exakt ren och oförändrad kod `36723ebb39b83623b0ddc27733d8b702515aaeec`, träd `11419ea162363bf95b744b7c94d352c68cb8cfbe`: regressioner, TypeScript, bygge, isolerad D1/R2-runtime och diffkontroll. Kontrollkvitto SHA-256 `f69375d58d09b44ac9ba6b44aaf08180297be52b868e5762593882a4db5113e8`.

GitHub app-main: `9d239cfaf14a6a14d538833dde44b02f7dce4c9b`. Main-CI `37814702689` är completed/success med samtliga 13 steg på exakt app-main `9d239cfaf14a6a14d538833dde44b02f7dce4c9b`. Sites **v66** är publicerad från source `9d976e0ac746796977d48ad11d1062adfb12a3e0`, version `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_bc068e7250a48191aae8c62728539bab`. Deploy `appgdep_6ac7d0da31708191aeb81131ad613855` gav terminalt `succeeded` direkt, faktisk uppdateringstid `2026-10-08T17:20:37.463233+00:00`. Färsk återläsning bekräftade samma URL, custom-delning revision 2, hela åtkomstpolicyn, runtime-miljö revision 1 och automationer oförändrade. Native arkivmetadata stämmer med lokalt verifierad tarhash, storlek och antal. Samma [Magnussons CRM-adress](https://magnussons-crm.rosen123.chatgpt.site) används; dokumentationen har separat revision.

Verkliga personalinloggningar, personalpilot, full hostad återställning samt kommersiell/privat/extern personalavveckling och Sites-åtkomst återstår. Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten.

## Historik före v66

# Magnussons CRM

## Se arbetet som spärrar kontoändringen – v65

Under **Konton & roller → Ändra → Granska kontoändringen** kan administratören välja **Visa arbete som spärrar ändringen**. Listan visar arbetsyta, arbetsreferens, order-ID, produktionsstatus och konkret orsak för varje **Jobbansvar** eller **Öppet hinderansvar**. **Visa fler ansvarsdelar** hämtar nästa 20.

Ett jobb kan ha två ansvarsdelar, och ett skickat jobb kan ha ett öppet hinder. Äldre oklara kopplingar visas utan att en person gissas från namnet. Listan är läsande; granskad rättning av oklara kopplingar behöver ett separat arbetsflöde. [Arbetsgång](OPERATIONS.md) och [verifiering](VALIDATION.md) beskriver omfattningen.

Kod: `7d99c066e435a082fe3673636977676ff2079058`. GitHub app-main: `12c1ac6a794a7728f40f2fa080ae49eaf1a51fb8`, produkt-PR [#104](https://github.com/ludros93-prog/MAgnussons-CRM/pull/104). Live: **v65**, verifierad Sites-källa `9fe2deaf213944105264362cdcd807c0e1086436` och lyckad publicering på [samma CRM-adress](https://magnussons-crm.rosen123.chatgpt.site). Dokumentationen har separat revision.

Full kommersiell/privat/extern personalavveckling, samordnad Sites-åtkomst, granskad rättning av äldre identitetskopplingar, verkliga personalinloggningar, personalpilot och full hostad återställning återstår. Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten. Codex-referensen är oläst; den uttryckliga briefen och färskt repo används.

## Historik före v65

# Magnussons CRM

## Granska kontoändringar innan produktionsåtkomst minskas – v64

Under **Konton & roller** visar **Granska kontoändringen** vad som behöver lämnas över innan ett aktivt CRM-konto inaktiveras eller får mindre produktionsbehörighet. Kontrollen visar **Jobbansvar**, **Öppet hinderansvar** och **Kopplingar att granska** per lagrad arbetsyta. Ett tomt urval i den vanliga produktionskön räcker inte.

Administratören får ett tydligt besked före sparning. Kvarvarande ansvar och oklara kopplingar spärrar ändringen; inget arbete flyttas automatiskt. Vid fel finns formulärvärdena kvar. En osäker sparning kräver återläsning; en bekräftad sparning visas som sparad även om översikten inte kunde uppdateras. [Arbetsgång](OPERATIONS.md) och [verifiering](VALIDATION.md) beskriver omfattningen.

Kod: `c56486d42ad289bdbf722b74faab5cb1fafe229e`. GitHub app-main: `0aa9d5ca01a0014f1b8e10f434bda9ea45e112d9`, produkt-PR [#102](https://github.com/ludros93-prog/MAgnussons-CRM/pull/102). Live: **v64**, lyckad publicering 2026-10-08 13:15:11 UTC på [samma CRM-adress](https://magnussons-crm.rosen123.chatgpt.site). Verifierad Sites-källrevision `c7bea6df6bd6857adcbd18a66dfcd92a1aaba17a` har samma produktträd. Begränsad delning är bevarad; verkliga personalinloggningar återstår.

Kontrollen gäller registrerat produktionsansvar. Kommersiellt ansvar, privata utkast och mejl, externa konton och Sites-åtkomst behöver separata arbetsflöden. Full personalavveckling, verkliga personalinloggningar, personalpilot och full hostad återställning återstår. Huvudmåtten är fortsatt försäljning mot månads-/årsmål, marginal och nya prospects.

## Historik före v64

# Magnussons CRM

## Produktionsarbete per konto – v63

Under **Konton & roller** kan administratören inventera ett kontos öppna produktionsjobb och hinder i den valda arbetsytan. Välj ett konto eller en arbetskö och använd **Granska jobbansvar** för befintlig granskad överlämning, eller **Öppna jobbet** för nästa arbetsmoment. Jobbansvar och hinderansvar visas var för sig. Orderns kommersiella ansvar ligger kvar.

Inaktiva konton och oklara identitetskopplingar syns i underlaget. Konton med samma namn skiljs åt med konto-ID. Ett tomt urval betyder inte att kontot kan stängas. [Arbetsgång](OPERATIONS.md) och [aktuellt testbelägg](VALIDATION.md) beskriver omfattningen.

Källkandidat `e0958b8c1ec3880ca9a209339ed23b9e29a450d9`. GitHub app-main `361703b7d862a3c0cb578beaf71379a00877699d`. Samma [Magnussons Site](https://magnussons-crm.rosen123.chatgpt.site) har publicerad version 63 från källrevision `5690de11319ca1fa1d87165b9a0e713e47a831de`, deployment `appgdep_6ac776182d34819180ab1ab716188046` med status succeeded. Dokumentationen sparas separat från appversionen.

Full personalavveckling, verifierade personalinloggningar, faktisk pilot och full hosted återställning återstår. Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten.

## Historik före v63

# Magnussons CRM

## Granskat produktionsansvar för ett jobb – v62

Administratören kan tilldela eller byta vem som håller ihop ett aktivt jobb i tryck och lager. Öppna jobbet, välj **Tilldela produktionsansvar** eller **Byt produktionsansvar**, välj ett befintligt CRM-konto, skriv varför och granska innan du sparar. **Orderansvar** visas separat och ligger kvar. Mängder, instruktioner och registrerade leveranser följer jobbet.

Konton med samma namn skiljs åt med sitt verkliga konto-ID. Sparat ansvar och tidigare byten kan följas i jobbets ansvarshistorik. En ändring i jobbet eller det valda kontot kräver ett nytt granskningsunderlag; en osäker sparning får en tydlig återförsöksväg. [Arbetsgången finns i OPERATIONS.md](OPERATIONS.md).

Källrevision `d1b47198a3986a20d40006dd249658e302eb5bbf`, träd `609632102d6619d27d1a1a3add285dffb867fd8c`. Slutkandidaten är oberoende källgranskad och har fem gröna obligatoriska kontroller samt 33 faktiska browserfall. GitHub-main och publicerad version redovisas separat: Produkt-PR [#98](https://github.com/ludros93-prog/MAgnussons-CRM/pull/98) slogs samman med aktuell bas till app-main `139407e3164b8c7baef7d5fbd356340596f58dc1`, samma produktträd. PR-CI [37752477119](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37752477119) och app-main-CI [37753435157](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37753435157) har vardera 13 gröna steg. Dokumentationen hanteras i en separat revision efter produktleveransen. Samma [Magnussons Site](https://magnussons-crm.rosen123.chatgpt.site) har version 62, källrevision `18b2d59e8a9022a59b336173e4b5d984b635db1e`, lyckad deployment `appgdep_6ac75bdc35648191b85f4391757838d2`. Alla 321 källfiler och produktträdet matchar den testade kandidaten. Lokalt paket (98 filer, 5 273 600 tarbyte) matchar native metadata/hash; native payload har inte laddats ned för bytejämförelse. Full begränsad delningspolicy revision 2, runtime-konfiguration revision 1 och noll automations är oförändrade. Dokumentationsrevisionen publiceras inte som ny appversion.

Ändringen gäller ett aktivt jobb. Full personalavveckling, verkliga personalprov, verifierad inloggning för Sebbe och levande Fortnox-/Outlookanslutningar är fortsatt separata införandefrågor. Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten; TB är inget huvudmått. Nästa steg: Inventera samtliga öppna produktionsjobb för ett konto inför personalbyte och koppla granskad överlämning till säker kontoinaktivering. Behåll kommersiellt ansvar och historiska resultat; full Sites-/flerarbetsyteavveckling och faktisk personalpilot återstår.

## Historik före v62

# Magnussons CRM

## Aktivitetens ansvar och förberedelsernas ansvar – v61

En företagsaktivitet har nu eget stabilt ansvar. Varje förberedelse behåller sitt eget ansvar, datum och status. Ett byte av aktivitetsansvar flyttar därför inte checklistans uppgifter. I kalendern visar separata rubriker vilken nivå du granskar.

Administratören kan för en planerad aktivitet välja **Byt aktivitetsansvar**, eller **Granska aktivitetens ansvar** när en äldre namnkoppling behöver förankras. Dialogen visar aktivitetens nuvarande ansvar, förberedelserna som ligger kvar, ett uttryckligt val av mottagare, orsak och granskningsruta. Vanlig kalenderredigering ändrar inte ett redan registrerat aktivitetsansvar. Ett äldre privat utkast med eget ändrat ansvar kräver ett uttryckligt ställningstagande.

V61 är publicerad efter obligatoriska regressioner, TypeScript, bygge och isolerad runtime på exakt slutkandidat samt 23 lokala browserfall och grön PR-/main-CI. Fullständig spårbarhet, formatgräns v61 och publiceringsbegränsningar finns i aktuell STATUS och VALIDATION.

Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten. Denna leverans ansluter inga Fortnox-, Outlook-, produkt- eller AI-konton och bekräftar ingen persons inloggning. Fullständig överlämning av en medarbetares arbete och verkligt återställnings-/personalprov är fortfarande separata uppgifter.

## Historik före v61

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
