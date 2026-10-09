# Magnussons CRM – designriktning

## Granskning i jobbets sammanhang – v62

Jobbet visar **Produktionsansvar** och **Orderansvar · ligger kvar** bredvid de konkreta handlingarna **Tilldela produktionsansvar** och **Byt produktionsansvar**. Användaren ska förstå vem som håller ihop produktionen och vilket kommersiellt ansvar som följer ordern. Ett konto-ID skiljer verkliga konton med identiskt namn och roll; inga kontaktadresser gissas.

Dialogen går från nuvarande ansvar till nytt konto, skäl, jobbunderlag och en uttrycklig granskningsruta. Valet är tomt från början. **Spara produktionsansvar** beskriver den faktiska handlingen. Mängder och instruktioner visas som registrerat underlag som följer jobbet. Uppdatering av underlag är en separat läsning och ett medvetet nytt val; ett konfliktfel får inte ersätta användarens text eller visa ett påhittat sparresultat.

Designmålet är en kolumn, begripliga hela svenska knapptexter och vertikal scroll på små skärmar, med nya vanliga tryckytor minst 44×44 CSS-pixlar. Långa namn och konto-ID får radbrytas. Dialogrubriken tar initialt fokus; tangentbordsfokus stannar i den aktiva dialogen och återgår till öppnaren eller en logisk efterföljare. Osparade val kräver ett uttryckligt stängningsval.

Utförd verifiering för `d1b47198a3986a20d40006dd249658e302eb5bbf`: Browseragenten öppnade elva skärmbilder och root ytterligare fyra faktiska bildutsnitt. Svenska handlingar, full radbrytning, separata ansvar och synligt fokuserat sparande kontrollerades på smala skärmar. Förstorad text använder vertikal scroll. Detta ersätter inte användartest med personalen. 33/33 browserfall passerade på exakt slutbygge: båda adminingångarna, 320/390/1280px, CSS-text 2×, native tangentbord/fokus, stängningsval, faktisk 403/409, uttrycklig återinläsning, dubbelklick och tappad/felaktig kvittens efter riktig skrivning, kontobyte/arbetsytebyte samt fem andra roller. Syntetiskt underlag skapades med 90 faktiska POST200 och tio kontoavläsningar. Råa 18 tabeller och R2 samt 321 källfiler/97 buildfiler kontrollerades före/efter; egna testprocesser, lagring och portar är stängda. Browserrapport SHA-256 `49647981b62e0ca112309be58d79d749b3c6b515582f216a88af7b258b95cb9f`. Eventuella misslyckade försök och omprov: Den frysta browserkörningen passerade första gången. Förberedelsens egna adress-/kassationsfält och förväntade 400/403/409-statusar rättades till de verkliga API-kontrakten innan körningen; ingen produktkod ändrades för att få ett browserprov grönt.

Färsk officiell inspiration finns i [RESEARCH](agent/RESEARCH.md): Saleshub AI för ansvar i jobbets sammanhang, Lime för särskilt ansvarsfält och handlingsverb, Salesforce för tydligt postansvar, W3C för dialogfokus, omflöde och lokala tryckytor. Detta är Magnussons egna utformningsval. Det innebär inga leverantörsanslutningar, full WCAG-garanti eller godkänd personalpilot.

## Historik före v62

# Magnussons CRM – designriktning

## Förstå vilken nivå som får nytt ansvar – v61

Kalenderns aktivitet visar **Aktivitetens ansvar** med en egen administratörshandling. Checklistans rader visar sina förberedelseansvar och behåller sina egna handlingar. Parentdialogens rubrik **Byt aktivitetsansvar** eller **Förankra aktivitetens ansvar** och blocket **Förberedelsernas ansvar · ligger kvar** förklarar följden före sparning.

Den första vyn prioriterar nuvarande ansvar, aktivitetsdatum, status och det tydliga faktumet att förberedelsernas ansvar ligger kvar. Fullständiga förberedelser och aktivitetsdetaljer kan utvecklas för kontroll. Mottagarvalet börjar tomt; orsak och granskningsruta är synliga. Vanliga användare får inga osynliga administrativa genvägar via kalenderredigeringen.

Svenska verb beskriver handlingen. **Läs in** och uttrycklig användning av aktuellt underlag skiljs åt. Sparstatus skiljer på vad som faktiskt är bekräftat och vad som fortfarande är osäkert. Osparad orsak är inte ett serverlagrat privat utkast. Äldre privata aktivitetsutkast visar särskilda rubriker för aktivitet och förberedelse; återställning av registrerat ansvar kräver ett uttryckligt val.

Oberoende browsergranskning läste nio av de 23 faktiska slutbilderna. Root läste dessutom tre slutbilder för smal normal vy, smal CSS 2×-text och bred separat aktivitets-/förberedelsevy. Tydliga svenska rubriker och handlingar, radbrutna knappar och synligt fokus kontrollerades. Rootbelägg: `root-visual.json`; full WCAG-, skärmläsar-, fysisk telefon- eller personalacceptans har inte provats.

Slutlig lokal Chromium-körning på exakt 7056a62/träd eb83c76 gav `PASS_FINAL_BROWSER` i 23 skilda fall. Matrisen omfattar 320×360, 390×844 och 1280×900 med normal och exakt CSS 2×-text, tangentbord/fokus, 44px-kontroller, fryst underlag, båda öppningsvägarna, faktisk 403/409, förlorad svarskropp, dubbelklick, explicit legacy-förankring, två äldre privata format och stängd historik. 29 byggda HTTP-anrop konstruerade underlaget; positiva privata/Outlook-/R2-data och 18 råtabellers övriga poster bytekontrollerades före/efter. Alla egna previewprocesser och temporär lagring städades. `browser/final-074521/report.json` har SHA-256 `e904a4aa6077a1a9d01c1467ed18301025b10ba30239f701d0cdbd6d710e7a13`.

Åtta officiella källor lästes 2026-10-08: Saleshub om synligt ansvar/status, Lime om kontextrelevanta verb och särskild ansvarstilldelning, Salesforce om egen aktivitetsägare skild från relaterad post samt W3C om reflow, 44×44 Enhanced och dialogfokus. Kortcitat, exakta länkar och begränsningar finns i RESEARCH. Research-SHA-256: `04ba877848523f4f835734ea969d430c510071f094e8c0c4cf4c1c46c038934c`.

Stabila UUID, adminroll, CAS, idempotens, fryst granskningsunderlag och privatutkastregler är Magnussons egna implementationer. Källorna styrker inte att vår produkt motsvarar leverantörernas drift, integrationer eller design. 44 CSS-pixlar är ett lokalt kontrollmål med inspiration från Enhanced/AAA; det är inget påstående om full AA-/AAA-efterlevnad. CSS 2×-textprov, syntetisk browser och tidigare v60-bilder är inte ett verkligt telefon-, zoom-, skärmläsar- eller personalprov.

## Historik före v61

# Magnussons CRM – designriktning

## En förberedelse, två tydliga ansvar – v60

Kalenderns ljusa förberedelserader visar **Förberedelsens ansvar**, **Klart senast** och **Öppen/Klar** med egen administrativ sidohandling. Dialogen skiljer radens ansvar från **Aktivitetens ansvar · ligger kvar** och visar fryst planering i ett expanderbart avsnitt. Svenska verb skiljer hämta, läsa in, granska och spara; känd nekning och tappad bekräftelse ger olika besked med bevarad avsikt.

Den slutliga 24-fallsmatrisen verifierade tydligt separata aktivitets-/förberedelseansvar, långa namn/orsaker, explicit jämförelse, känd nekning kontra obekräftad sparning, fokusåtergång och mobil/tangentbord i tre viewportar med normal/CSS 2× text. Faktiska skärmbilder inspekterades. Detta är browser-/geometribelägg för berörda flöden. Lokala 44-px-tryckytor, radbrytning och avgränsad vertikal scroll gäller den berörda dialogen/raderna. Orsakfältet har fast storlek och egen vertikal scroll: ett faktiskt 320×360-prov visade tidigare att lång text växte till 2 643 px och flyttade tangentbordsfokus utanför vyn. Endast dialogens textruteregel rättades; slutprovets resultat anges ovan. [VALIDATION](VALIDATION.md) anger provgränser; [RESEARCH](agent/RESEARCH.md) belagd Saleshub-/Lime-/Salesforce-inspiration. Full tillgänglighetsgranskning och personalpilot återstår.

## Historik före v60

## Kundkontaktens ansvar med leveransen som underlag – v59

**Leveransuppföljning**, skilda uppgifts-/kundrelations-/orderansvar och expanderbar fryst **Leverans & kontakt** visar ändringens omfattning. Fulla identiteter finns i detaljer. Svenska knappar skiljer hämta, läsa in och granska. Känd servernekning bevarar avsikten; tappad bekräftelse får ärligt besked om möjlig sparning/exakt återförsök.

22 slutbrowserfall prövade mobil/desktop, strikt större text, native fokus och faktiska konflikter/nekningar/replay. Root öppnade fyra slutbilder; stora/långa värden radbryts i vertikalt scrollbar dialog. [VALIDATION](VALIDATION.md) anger gränser; [RESEARCH](agent/RESEARCH.md) belagd Saleshub-/Lime-/Salesforce-inspiration. Full tillgänglighetsgranskning och personalpilot återstår.

## Historik före v59

## Rätt identitet före arbetsmenyn – v58

Svensk neutral start/felvy, arbetsyta/återförsök och produktionens rätta vy direkt. Outlook döljer gamla data före effektstädning; DraftProvider behåller sin nyckel.

Root öppnade fyra slut-PNG: start 320, fel 390/2×, första produktionsvy och mobilmeny/fokus. Stor text rullar vertikalt. [VALIDATION](VALIDATION.md) anger browser-/tangentbordsprov; [RESEARCH](agent/RESEARCH.md) skiljer officiella principer från lokala val. Pilot/full tillgänglighetsgranskning återstår.

## Historik före v58

## Tydlig aktivitet och kundrelation i samma granskning – v57

Dialogen visar **Kundavstämning**, **Kommande kundbehov** eller **Prospektkontakt** på svenska. **Uppgiftens nuvarande ansvar** och **Kundrelationsansvar · ligger kvar** ligger i separata textblock. Ett profil-ID eller grön profilstatus säger inte att personen äger hela kundrelationen eller har verifierad konto-/Sitesåtkomst. **Följ upp** förblir arbetsflödets vanliga handling; **Byt uppgiftsansvar** är den administrativa sidohandlingen.

Kundplanens eller prospekteringens sparade underlag visas läsande i ett expanderbart avsnitt. Ingen ny planredigering blandas in i överlämningen. Fullständig identitet finns nära den kortare målprofilväljaren och i **Visa registrerade ansvarskopplingar**. Målval/orsak/granskning börjar utan påhittad överföring. Svenska verb anger vad som händer: hämta, läsa in nytt granskningsunderlag, granska och spara.

Relevant konflikt bevarar öppen text och fryst underlag. Läsning antar inte en ny version; uttrycklig inläsning kräver ny granskning och väljer ingen ersättare automatiskt. Ändrat osparat formulär stängs via **Fortsätt redigera** eller **Stäng utan att spara**. Ett obekräftat tidigare sparförsök kan redan ha ändrat CRM; stängning är ingen ångrahandling. Något privat serverutkast finns inte i denna dialog.

Den befintliga formulärstrukturen använder avgränsad scroll/radbrytning och fokusåtergång till användbar öppnare eller uppgiftsavsnitt i samma identitet/vy. Två tidigare browserprov hittade faktiska brister: toppreglaget **Stäng** var 38 px högt vid 320 × 360; efter den första rättelsen klarade mobilen 44 px men desktopens prospekteringsunderlag blev 42 px på grund av senare CSS. Den riktade rättelsen ger uppgiftsdialogens knappar, sammanfattningar och granskningsrad minst 44 px, radbryter dess huvud på mobil och förstärker bara sammanfattningsselektorn mot den senare regeln. Ingen global knappregel eller sänkt provgräns införs. Två senare locatorfel i QA rättades utan appändring; samma verkliga öppnarnod och aktuellt namn prövas fortsatt vid fokusåtergång. Den färska hela körningen har 24/24 PASS; slutbrowserkvittens: 24/24 PASS; Root öppnade fem faktiska slut-PNG: mobil 390×844, desktop 1280, fokuserad sparknapp vid 320×360 med exakt dubblerad CSS-text, desktop med dubblerad text och sparad äldre förankring. Uppgiftsansvar och kvarvarande kundrelationsansvar är läsbara, ljusa underlagskort/svenska handlingar behåller befintligt formspråk och lång text visas inom rullande dialog. Sparad förankring byter synligt till Byt uppgiftsansvar. Bilderna är scrollade vyer, inte ett påstående att hela dialogen syns samtidigt. Detta är inte fysisk telefon, verklig sidzoom, personalacceptans eller full WCAG-granskning. [VALIDATION](VALIDATION.md) skiljer de faktiska appfelen från harnessdiagnoser och anger provens gränser, inklusive fysisk telefon, hjälpmedel och full tillgänglighet.

Fem officiella källor finns i [RESEARCH](agent/RESEARCH.md). Salesforce skiljer aktivitetens ansvar från relaterad kund/post; Lime beskriver kontextnära handlingar och skillnaden mellan ansvarstilldelning och information; Saleshub beskriver samlat kund-/aktivitetsarbete. Svenska typnamn, 44-px-val, Magnussons behörighet, fryst granskning och atomiska skrivregel är lokala produktbeslut. Ingen leverantörsprodukt, notifiering eller integration ansluts genom inspirationen.

## Historik före v57


## Samma kundkort, tydlig ny relation och uppföljning – v56

**Kundrelationen är avslutad** leder administratören till **Återöppna kundrelation** på samma kundkort. Kundrelation, resultatprofil och inloggningsåtkomst uttrycks separat. Dialogen visar fullständigt kundnamn, tidigare profilstatus, målprofil med full identitet och ett uttryckligt relationsval. Långa namn kan kortas i väljaren men finns i närliggande beskrivning med profil-ID.

Orsak, uppföljningstext, datum och granskningsruta börjar tomma. **Det här ändras** och **Tidigare arbete och resultat finns kvar** förklarar följden innan **Spara återöppnad kundrelation**. Befintligt arbete ligger i en egen läsande lista med registrerat ansvar. Dialogen erbjuder inga val för att flytta tidigare aktiviteter.

Hämtning, explicit adoption, konflikt och sparning har egna besked. Ett otillgängligt mål väljs inte om automatiskt. Text bevaras i den öppna dialogen men är inget privat serverutkast. Formulärstrukturen är stabil medan användaren granskar; lång text radbryts, dialog/textfält har avgränsad scroll och vanliga kontroller har minst 44 px avsedd höjd. Fokus återgår till användbar öppnare eller kundkortets beständiga rubrik i samma identitet/vy.

Browsergranskningen hittade ett faktiskt klippt årtal i det inbyggda datumfältet vid 320 × 360 med exakt dubblerad text. Mobilformuläret ger fältet mer utrymme och visar **Valt datum:** med hela årtalet i en separat tidsangivelse. Fältet är kopplat till datumtexten via `aria-describedby`; tomt och ogiltigt datum beskrivs uttryckligt. Detta är en lokal rättelse av begriplig datumvisning, ingen garanti för andra webbläsares kalenderkontroller eller full tillgänglighet.

Slutbrowserprov: 18/18 PASS; Root öppnade och granskade åtta faktiska slut-PNG från mobil/desktop, inklusive 320×360 och 390×844 med exakt dubblerad CSS-text, inbyggt datumfält, fokuserad sparknapp, explicit profil/relationsval, relaterad konfliktadoption, tappat svar och återöppnat kundkort. Årtalet ryms före kalenderikonen vid 320×360; den fullständiga svenska datumtexten visas separat. Långa texter radbryts och dialogen scrollar. Enradiga redigerbara fält scrollar inom fältet; godtyckligt långa inmatningar visas inte samtidigt. Ett engelskt nätverksfelprefix kvarstår före begriplig svensk åtgärdstext. Detta är inte full sidzoom, fysisk telefon eller en fullständig lokaliserings-/tillgänglighetsgranskning. [VALIDATION](VALIDATION.md) anger faktiska kvitton och gränsen mot fysisk telefon, hjälpmedel och personalacceptans. Fem officiella källor finns i [RESEARCH](agent/RESEARCH.md); svenska val, atomisk sparning och vår återöppningsregel är lokala produktbeslut, inte kopierad Salesforce-/Lime-policy.

## Historik före v56


## Tre begripliga tillstånd och granskat profilavslut – v55

**Resultatprofil**, **CRM-konto** och **Sidåtkomst** får separata textbesked. Aktuell/historisk profil innebär inte aktivt/avstängt konto eller verifierad sidåtkomst. Fullständigt namn, profil-ID, äldre ansvarskoppling och arbetsyta finns nära **Granska profilavslut**. Handlingens kvittens gäller resultatprofilen i vald arbetsyta.

Dialogen visar hela profilens blockerare, vad som ändras/bevaras, orsak och en uttrycklig granskningsruta. Filter i översikten påverkar inte denna kontroll. Hämtning, adoption av aktuell version, ändrad orsak, sparning och faktiskt resultat har skilda besked. Konflikt och läsfel behåller öppen text. Ändrat osparat formulär stängs via ett uttryckligt kasseringval; något privat serverutkast finns inte.

Långa identiteter och orsak radbryts. Dialogen har begränsad höjd och scroll, textfältet egen begränsad rullning och vanliga kontroller minst 44 px avsedd höjd. Fokus återgår till användbar öppnare eller aktuell profilrubrik när öppnaren försvinner, bara i samma identitet/vy. Slutbrowserprov: 16/16 PASS; Root öppnade och granskade åtta faktiska slut-PNG från desktop/mobil, inklusive 320×360, 390×844, fokuserad sparknapp med dubblerad CSS-text, separat kontobesked, historik och konfliktadoption. Ingen horisontell klippning syntes i dessa bilder; mycket långa syntetiska namn radbryts över många rader. Detta är inte full sidzoom eller fysisk telefonverifiering. [VALIDATION](VALIDATION.md) anger faktiska kvitton och gränsen mot fysisk telefon, hjälpmedel och personalacceptans.

Sju officiella Saleshub-/Lime-/Salesforce-källor finns i [RESEARCH](agent/RESEARCH.md). Lokala designval och Magnussons serverregler är separata från leverantörernas konto-/SSO-/SCIM-regler. B07:s första laddning och andra kvarvarande arbetsflöden är egna uppgifter.

## Historik före v55

## Intuitiv adminöverlämning – v54

**Överlämna arbete** placerar sällan använd personaladministration i **Konton & roller**. Profil, arbetskategori och lokal sökning har egna etiketter. Full personidentitet visas intill den kortare väljaren. Kortens tydliga verb leder till relevant befintlig granskning; status och osäker identitet uttrycks med text och färg. Antal skiljer visade poster, matchande poster och hela valt ansvar så filtrering inte ser ut som färdig överlämning.

Full kund-/posttext radbryts i kort, en kolumn på mobil och två på bredare skärm. Nya vanliga kontroller har minst 44 px avsedd höjd; lång text och uppmätt 2× text ingår i den avgränsade browsermatrisen. Befintliga orsakfält för uppgift, möte och affär/order fick rullbar begränsad höjd efter faktisk kortskärmsfriktion. Affärs-/orderväljarens långa mottagartext fick högst två synliga rader; fullständigt namn, ansvarskoppling och profil-ID finns i den separata beskrivning som väljaren refererar till med `aria-describedby`. Fokus återgår till användbar öppnare eller, när raden försvinner, samma inventerings synliga rubrik. Ny arbetsyta/användare får inget gammalt profilval eller gammal dialog från inventeringen.

Slutbrowserprov: 31/31 godkända och root:s oberoende granskning av 11 faktiska slutbilder; [VALIDATION](VALIDATION.md) anger faktiska kvitton, rättade fynd och provgränser. Officiella Saleshub-, Lime-, Salesforce- och W3C-principer finns i [RESEARCH](agent/RESEARCH.md). Detta är ingen fysisk telefon-/hjälpmedels-/personalacceptans eller full WCAG-bedömning. B07:s första laddning/mobilmeny är fortsatt separat och översikten är inget klart avvecklingsflöde.

## Historik före v54

## Begripligt årshjul med eget ansvar – v53

**Mina behov** och **Teamets behov** gör ansvarsvalet tydligt. Kort och månadsöversikt visar full kund-/behovstext utanför en separat **Öppna kundkort**-kontroll. Kontakt senast, kundens leveransbehov och behovsansvar har egna etiketter. Statusen **Planerat** hålls samman. Kundkortets kompakta vy bevarar sammanhanget från en årshjulsuppgifts uppföljning.

Överlämningen har tomt målval, inga förvalda uppgifter, orsak och en uttrycklig granskningshandling. Vald profil visas högst på två rader i kontrollen; full identitet och ansvarskoppling syns intill och beskrivs via `aria-describedby`. Formulärets hämtning, inläsning och sparning är olika handlingar. Innehållsredigeringen visar sparad/föreslagen version och läser om serverägt ansvar vid uttrycklig adoption. Öppen text bevaras vid fel; synlig text förklarar att privat serverutkast ännu saknas.

Slutmatrisens 22 syntetiska browserfall omfattar 320/390/1280 px, avgränsad 2× text, lång kund-/profiltext, minst 44 px för nya vanliga handlingar samt native fokusåtergång. Efter överlämning när kortet försvinner ur **Mina behov** återgår fokus till den synliga listans rubrik. Formulärets footer använder faktisk höjd och vanlig flödesplacering när den skulle ta för stor del av en kort skärm. Elva faktiska PNG-bilder granskades separat; [VALIDATION](VALIDATION.md) anger slutkod, kvitton och gränser.

Detta är inget fysisk telefon-, OS-tangentbords-, skärmläsar-, personal- eller fullständigt WCAG-godkännande. Global första laddning/mobilmeny återstår som separat B07-arbete. [RESEARCH](agent/RESEARCH.md) skiljer officiella leverantörsprinciper från våra lokala val.

### Historik: v52 – Separata kundrelationer och kundärenden

Kundvård visar två tydliga vägar: **Kundrelationer** och **Mina kundärenden**. Ärenderaden visar kund, beskrivning, nästa åtgärd, tidsgräns, ärendeansvar och separat kundansvar. **Öppna kundärendet** ger en fokuserad start vid ärendets rubrik i den privata planen när underlaget har lästs in; fortsatt inmatning avbryter en väntande fokusflytt. Vanlig öppning av kundplanen behåller sitt tidigare beteende.

Överlämningen har en egen granskningsdialog med tomt målval och inga förvalda uppgifter. Faktiskt sparat profil-ID skiljs från granskad äldre källprofil; full mottagaridentitet står intill den högst tvåradiga väljaren och finns i dess beskrivning. Längre orsak har intern rullning. Nya vanliga handlingar och uppgifts-/granskningsrader har lokalt mål minst 44 px, med radbrytning och synligt fokus. Hämtning, adoption och sparning har olika svenska handlingar.

Slutliga browserprov: 22/22 godkända på byggd isolerad Worker/D1/R2 med faktiska roller, 320/390/1280 px, 2× dialogtext, verklig 409, dubbelklick och privat utkaståterläsning/adoption/publicering; 282 källfiler/96 distfiler oförändrade, positiva 18 råtabeller och R2-/Outlook-/utkastgränser verifierade. [VALIDATION](VALIDATION.md) anger den faktiska mobil-/textmatrisen och dess gränser. Dialog-/layoutprov ersätter inte fysisk telefon, skärmläsare eller observerad personalacceptans. Officiella principer och våra egna lösningar skiljs i [RESEARCH](agent/RESEARCH.md).

### Historik: v51 – Granskat onboardingansvar

Behåll kundsammanhanget och skilj checklistans privata redigering från gemensam överlämning. Nuvarande ansvar, aktiv mottagarprofil, valda/återstående uppgifter, orsak och granskningsruta leder till en konkret svensk sparhandling. Endast administratören får ändringskontrollen.

Dialogen har en gemensam huvudrullningsyta; orsakfältet har dessutom intern rullning för längre text. Native tangentbordsfokus och tydlig stängning är verifierade i slutmatrisen. Vald profil visar högst två rader; full identitet och ursprunglig ansvarskoppling syns intill och beskrivs via aria-describedby. Alternativlistan behåller full text. Klickbara uppgifts-/granskningsetiketter och nya vanliga handlingar har lokalt mål minst 44 px; detta är inget generellt WCAG-AA-minimum eller certifiering.

19 syntetiska browserfall och separat visuell bildgranskning redovisas i [VALIDATION](VALIDATION.md), med avgränsat 2×-textprov. Verklig personalacceptans, fysisk telefon och skärmläsare återstår. Den globala laddningsvyn är fortsatt separat designarbete.

Designen är ett huvudkrav och ska utvecklas med inspiration från Saleshub, Lime och Salesforce. Målet är att CRM-ovan personal snabbt förstår kunden, sitt ansvar och nästa handling. Designarbetet ingår i vidareutvecklingen av den befintliga appen.

## Gemensamt uttryck

Utgå från CRM:ets befintliga logotyp, mörka navigation, ljusa arbetsytor och röda handlingsknappar. Nuvarande variabler är `--foreground: #182740`, `--primary: #ce3545` och `--care: #087e70`. De är verifierade i koden, inte en fastställd grafisk profil för företaget. Nya vyer ska dela samma former, typografi och avstånd.

- Visa den viktigaste arbetsuppgiften först, med kund, orsak, ansvarig, datum och en tydlig handling.
- Skilj primär handling från navigation och redigering. Svenska verb ska beskriva det som faktiskt händer.
- Använd lugna bakgrunder, tydliga rubriker och grupperad information. Fler kort eller färger får inte göra arbetsordningen svårare att förstå.
- Status ska ha text och vid behov ikon. Färg får inte vara enda sättet att förstå försenat, blockerat eller klart.
- Använd läsbar löptext, synligt tangentbordsfokus och mobila handlingar på minst 44 px. Långa namn, mejladresser och instruktioner ska brytas inom sin yta.
- Visa tomt läge och saknat underlag med en begriplig nästa handling. Inga dekorativa prognoser, påhittade resultat eller falska integrationsstatusar.

## Kundval på korta skärmar – v50

Statisk full kundtext och nästa handling har egna ytor. Mobilens knapp ligger under texten, datorns bredvid. Kundval/nykund har minst 44 px höjd och fokusram. En gemensam vertikal rullningsyta håller sökning, val och stängning åtkomliga; långtext förkortas inte.

[VALIDATION](VALIDATION.md) skiljer browserprov från personalacceptans; [RESEARCH](agent/RESEARCH.md) skiljer officiella principer från vår tillämpning.

## Historik: Hitta tillbaka efter arbetsytebyte – v49

Aktuell väljare eller namngiven rubrik ger en tydlig start efter användarens byte. Gamla popupens sena stängning får inte fokusera en ersatt kontroll. Väljaren har 3 px fokusram, 4 px offset och 8 px scrollmarginal; rubriken använder v48:s ram. På dator växer/radbryts headern naturligt, med avsiktlig padding och mellanrum, och hela väljartexten får plats utan radklippning. Fortsatt inmatning/navigation/fel/annan identitet avslutar återgången; detta är ingen generell fokus-/retrygaranti.

[VALIDATION](VALIDATION.md) har prov/bilder/gränser; [RESEARCH](agent/RESEARCH.md) har källor. Personalacceptans återstår.

## Historik: Återgå till rätt kund efter stängning – v48

Användarens stängning återför fokus till samma kundkontroll i samma identitet/vy; bakgrundsladdning/navigation flyttar inget fokus genom funktionen. En borttagen, dold, inaktiverad eller ändrad kontroll ersätts av vyns namngivna rubrik med synligt fokus. Reservrubrikens fokusram får 8 px scrollmarginal och behöver utrymme för ramens 3 px plus 4 px offset; vanliga öppningskontroller behåller sin scrollregel. Sparspärrar och annan öppen dialog skyddas.

[VALIDATION](VALIDATION.md) anger faktiskt slutprov och visuellt underlag. Officiella W3C-/Radixprinciper och CRM-inspiration finns i [RESEARCH](agent/RESEARCH.md). Personalens förståelse återstår. Extrema långa sökträffar på kort mobilskärm har en separat observerad layoutgräns; se VALIDATION/BACKLOG.

## Historik: Responsivt kundregister – v47

Kundregistret visar fullständigt kundnamn och kontaktperson, kundansvarig, nästa verkliga öppna uppgift eller planerade CRM-möte och en separat nästa avstämning. Raderna staplas på mobil och använder flera kolumner när utrymmet finns. **Öppna kundkort** är en egen svensk knapp med minst 44 px höjd; det långa namnet ligger utanför knappen så även en kort skärm kan visa hela den fokuserade kontrollen. Samma kund-ID, befintliga sök-/ansvarsfilter, ordning och kundkort används.

Nästa aktivitet beräknas endast från redan registrerade öppna uppgifter och CRM-möten med status planerat för samma kund. Tidigast datum/tid visas; en uppgift med endast förfallodatum kommer före ett tidsatt möte samma dag. Avslutade uppgifter samt genomförda/avbokade möten räknas inte. **Ingen öppen uppgift eller planerat CRM-möte** beskriver det som faktiskt saknas i CRM, inte kollegornas Outlook. **Nästa avstämning** är kundens separata plan; passerat datum och idag visas i text och skapar ingen uppgift eller kundkontakt.

Ett uttryckligt profil-ID med matchande ursprunglig ansvarskoppling ger profilens aktuella namn. Sammanfallande namn särskiljs med den ursprungliga kopplingen. Ett äldre tomt ID, en felaktig koppling eller en inaktiv profil får ett synligt besked; namn/alias används inte för att hitta på en ID-koppling. Läsningen ändrar inget ansvar. Ett tomt sökurval skiljs från ett tomt kundregister. Läsaren får ingen knapp för att skapa kund. Knappen öppnar befintligt kundkort; den avslutar ingen aktivitet och öppnar inget nytt mötesflöde.

Ett separat diagnostikprov på den tidigare kandidaten `12987587` visade att dekorativa företagsinitialer radbröts och gick utanför sin fasta 40 px-ruta vid exakt fördubblad beräknad font, 12→24 px. Kvittot `/workspace/scratch/crm47/browser/icon-diagnostic.json`, SHA256 `bc71fecc381dff4eaf082b219a05ca14f7eaa2a24900ffb15243e2dfe13ade68`, bevarade alla 18 råtabeller och två R2-objekt. Slutlayouten sätter lokalt `white-space: nowrap`, `overflow-wrap: normal` och bredd/höjd `max(40px,2.5em)` på just kundregistrets dekorationsruta. Den behåller 40 px vid normal text och växer med initialernas font. Initialerna är fortsatt dekorativa (`aria-hidden`); det fullständiga kundnamnet visas separat. Tidiga kandidatprover ersätter inte slutproven på `418531aa80e359ece524352a22a26a6cbc571e8d`.

Ljus arbetsyta, mörk navigation, befintliga relationstexter och lugn gruppering består. Nästa öppna aktivitet får egen bakgrund, medan passerat datum även förklaras med text. Fullt kundnamn ligger utanför den självständiga öppningsknappen; dess fulla fokusruta ska kunna bli synlig med vanlig Tab även på en kort skärm. Inga ellipser eller radbegränsningar döljer listans kärnuppgifter.

Fem slutkontroller och 17 lokala browserfall passerar på slutkandidat `418531aa80e359ece524352a22a26a6cbc571e8d`; app-PR #68 är sammanslagen till app-main `6102c4eb2b47913a303ba03da6ffdd1e9f807f6b` med gröna exakt-head/main-checks. Sites v47 är publicerad 2026-10-07 08:52:19 UTC från verifierad source `b3118e0671a1967e90c14f3e2d9fd46893b05452`. Riktiga konto-/personalprov återstår. Root granskade faktiska slutbilder vid 390 normal, 1280 desktop och 320 med fördubblad paneltext: fullständiga kärnuppgifter och synlig öppningsknapp, med initialerna på en rad i sin ruta. Mycket långa testvärden kräver vertikal scroll. Kvitto `/workspace/scratch/crm47/root-visual-review.json`, SHA256 `c086965b9571f7b1ae40be80b7b7b1298a2748831051443ddf7c83b453bb1b85`. Ett separat läsande fokusdiagnostikprov öppnade samma syntetiska kundkort med native Tab/Enter och stängde med Escape. Både byggd v46-baslinje `04dfa5cd` och den tidigare v47-kandidaten `12987587` tappade fokus till BODY, utan återgång till öppningsknappen. Detta är ett reproducerat äldre problem som inte rättas i denna listleverans, inget positivt Escape-/fokusåtergångsresultat. Baslinjekvitto `/workspace/scratch/crm47/browser/focus-baseline.json`, SHA256 `23fd1b643ec10fe1b609e26f39d9337eb5916414bf8d76ad21406f666f7d26b7`; kandidatkvitto `/workspace/scratch/crm47/browser/focus-candidate.json`, SHA256 `dea7e3195b450761fa9094d4fa5cfed79beb17d8510b35792feed18a19f4dc1d`. Båda behöll alla 18 råtabeller, privat-/arbetsyte-/Outlookunderlag och två R2-objekts byte/hash/metadata, utan browser-skrivningar, sidfel eller externa anrop. Fokusåtergång efter stängt kundkort behöver egen följande rättning och nya prov. [VALIDATION](VALIDATION.md) anger exakta mått, faktiskt provade fall och gränser. Officiella principer och våra egna visningsregler skiljs i [RESEARCH](agent/RESEARCH.md).

B07 är fortsatt öppet för observerad personalpilot och annan friktion. Efter denna avgränsade kundregisterleverans är **fokusåtergång när kundkortet stängs** och **fokus efter arbetsytebyte** nästa designarbete. B01b2:s specialflödesansvar/full personalavveckling, separat chefsroll, övriga privata specialdialoger, separat konto-/utkast-/Outlookbackup, hostingåterställning och faktiska integrationer kvarstår. Proven ger ingen världsranking eller garanti om personalens användbarhet. Refererad Codex-task är oläst eftersom relevant `read_thread` saknas; explicit brief/repo används.

## Historik: Läsbar Min dag med större text – v46

Den privata sparstatusen kan brytas på flera rader, fokusetikettens text kan krympa och radbrytas bredvid sin ikon, och långa ord i tomma paneler bryts inom panelen. Det rättar klippningen av privat sparstatus och tom kontakttext samt fokusetikettens överbredd utan att förkorta statusmeddelanden eller dölja text. Min dags knappar i privat sparstatus, exempelvis återförsök, ryms och kan radbrytas inom sin yta med minst 44 px höjd. Den höjdgränsen gäller dessa knappar, inte alla CRM-kontroller. Befintliga färger, ikoner, kundsammanhang och primära handlingar används fortsatt.

Privat utkaststatus ska visa hela beskedet i sin egen yta. Fokusetiketten behåller både ikon och ord, så färg ensam inte bär betydelsen. Den tomma kontaktpanelen visar ett ärligt besked om att aktuella uppföljningssignaler saknas. Att radbryta texten skapar varken nya kundbehov eller en sparningskvittens.

På slutkandidat `04dfa5cd` passerade 29 Chromium-fall på 320×360, 390×844 och 1280×900, med normal/exakt fördubblad beräknad måltext. Textnoder mättes mot egen yta och klippande föräldrar i båda riktningarna; privat status, fulla långa fel och återhämtningshandlingar rymdes. Native Tab/Enter provade relevanta handlingar. Root granskade fem faktiska slutbilder; normal mobil/desktop behöll arbetsordningen och fördubblad 320 px-text radbröts med synlig ikon. Rapport SHA256 `46cf88a30f0963b67c0cc623efc8cf7883db106f2ba223adb273fc8e12ac60cf`. Det är avgränsade lokala syntetiska prov, ingen helsidig zoom, fysisk telefon, skärmläsare eller personalacceptans.

Riktningen följer Saleshub, Lime och Salesforce: samlat kundsammanhang, tydlig nästa aktivitet och begriplig arbetsordning. Den konkreta radbrytningen och våra prov är Magnussons egen tillämpning; officiella källor och deras gränser finns i [agent/RESEARCH.md](agent/RESEARCH.md). Befintlig mörk navigation, ljusa arbetsytor, röda handlingar och gröna kundvårdsmarkeringar består.

B07:s personalobservation återstår. Mobilkundlistan och fokus efter arbetsytebyte behåller sina mål nedan. [VALIDATION](VALIDATION.md) anger aktuell prov-/publiceringsgräns; detta avsnitt gör ingen allmän tillgänglighets- eller användargaranti.

## Kundkortets första designleverans

Kundöversikten samlar nästa steg, kontaktplan, order/leverans och tidslinje i tydliga sektioner. Lokal sektionsnavigation hjälper användaren att hitta rätt utan att lämna kunden. Försenad, dagens och kommande aktivitet använder text tillsammans med färg. Nästa aktivitet behåller samma befintliga uppföljningsflöde.

Kontaktuppgifter och ansvar får en kompakt, läsbar presentation. Interna anteckningar benämns som anteckningar i tidslinjen. Orderdatum, kundkontakt och nästa planerade avstämning är skilda uppgifter. Designen ändrar inte affärsregler, roller, privat kommunikation eller datalagring. Nästa aktivitet har sin handling före datum och ansvar på mobilen. Korta synliga mobiltexter behåller fullständiga ARIA-namn. Långa ord bryts inom sin yta och sektionsknapparna får två kolumner vid 320 px.

## Inspiration och kontroll

Leverantörskällor och avgränsade designlärdomar dokumenteras i [agent/RESEARCH.md](agent/RESEARCH.md). Vår tillämpning är anpassad till Magnussons arbetsmoment; leverantörernas färger, varumärken och produktlöften återanvänds inte som våra.

Designarbetets kvalitetsregel är att kontrollera berörda vyer på dator och mobil med tangentbord, långa värden, tomma data och relevanta roller. D01:s tidigare slutbygge 4 och den exakta v19-artefakten passerade 16 scenarier och 36 layout-/skärmbildskontroller för kundkortet, inklusive kontrollerad textförstoring 200 procent. Det är historiskt kundkortsunderlag med textstorlek/radhöjd, inte browserns sidzoom. Skärmbilder, mätningar och provgränser finns i [VALIDATION.md](VALIDATION.md). Browserprov visar layout och arbetsflöde; personalens användbarhet behöver observeras i deras verkliga arbete.

### Begriplighet i det befintliga användarprovet

I T26 och B07:s befintliga pilotmoment ska en CRM-ovan användare kunna svara på tre frågor utifrån den berörda vyn: Vilken kund och egen-/team-/arbetsyta arbetar jag i? Vad behöver min uppmärksamhet och vilken handling kommer härnäst? Är mina uppgifter sparade som privat utkast eller inlämnade till gemensamt CRM?

Observera vad personen faktiskt väljer och registrera feltolkningar, backningar och behov av hjälp per moment. Ett förlorat eller nekat svar får inte tolkas som bekräftad CRM-sparning. Använd befintliga pilotuppgifter och fiktivt underlag; detta inför inget nytt testprogram eller påhittat tidsmål. Browserprov ska kontrollera att rätt information och handling går att nå. De besvarar inte frågan om personalen förstår vyn utan handledning.

Mobilkundregistrets och kundkortets lokala prov finns i historiken; v49 ovan rättar den avgränsade arbetsytefokusluckan. Personalens förståelse och andra observerade designproblem återstår. Följande krav hålls åtskilda från faktiska prov:

| Arbetsmoment | Önskat beteende och avgränsad kontroll |
| --- | --- |
| Hitta en kund på mobilen | På 320/390 px ska kundlistan visa kundnamn, ansvarig och nästa aktivitet eller ett ärligt besked om att den saknas. Kundkortet ska kunna öppnas med vanlig pointer och tangentbord. Långa värden ska vara läsbara inom vyn utan att kundens viktigaste handling kräver horisontell scroll; inga påhittade ansvariga eller aktiviteter fyller tomma fält. V50:s kundväljare har full text, egen handling och nåbar stängning; lokala slutprov finns i VALIDATION. Personalobservation återstår. |
| Stänga kundkortet | V48 återför efter användarens stängning fokus till samma öppningskontroll i samma kund-/identitets-/vysammanhang, annars vyns namngivna rubrik. Bakgrund/navigation/annan dialog flyttar inte fokus genom denna funktion. Bevara kund-ID, scrolläge, roller och privata utkast. Slutprov och gränser finns i VALIDATION; personalacceptans återstår. |
| Byta arbetsyta | V49 återför efter ett uttryckligt byte till den aktuella tillgängliga arbetsyteväljaren, annars aktuell tillgänglig namngiven huvudrubrik, för samma konto/medlemskoppling/roll och vy. Fortsatt användarinmatning, navigation, fel eller annan identitet avslutar återgången; retry/bakgrundsladdning återupplivar den inte. Slutprov och gränser finns i VALIDATION; personalacceptans återstår. |

Kundkortets normala 390/320 px-vyer visar första handlingen direkt i de tidigare proven. Extra långa värden på 320 px kräver vertikal scroll. D01 publicerades i v19 och kvarstår i v22 enligt [VALIDATION.md](VALIDATION.md). Vid v19 kunde bannern täcka den globala arbetsyteväljarens pointerklick på 320 px och tangentbord användes för initieringshinten. Detta fynd ligger till grund för den slutprovade och publicerade v20-rättningen nedan. Autentiserad live-UI och personalens användbarhet är fortfarande inte verifierade.

## Historik: Global mobilheader

På smala skärmar ska huvudraden växa när navigationen radbryts, så att arbetsyteväljare och övriga kontroller ryms ovanför arbetsytans banner. Långa vy- och arbetsytenamn får radbrytas inom sin yta. Behåll befintliga färger, texter och byten mellan arbetsytor; den fria tryckytan ska vara minst 44 px hög. Layouten ska fungera med pointer och tangentbord samt förstoring, med befintliga roller och skydden för privata utkast vid arbetsytebyte.

Den publicerade v20-artefakten har passerat 13/13 vanliga pointerklick utan force och 13/13 tangentbordsåtergångar med Tab/Space/End/Enter på 320/390/768/1440 px, med långa värden och ett läsarfall. Kontrollernas text och ikoner ryms i headern ovanför bannern. Kontrollerad 200 procent textförstoring omfattar endast header/banner; det är inte sidzoom eller global WCAG-certifiering. Arbetsytebyte remonterar provider och återställer fortfarande fokus till BODY. Väljaren nås med fyra Tab på mobil och tio på dator. Samma reset reproducerades i ett oförändrat v19-fall på 1440 px; automatisk fokusbevaring påstås inte. Slutartefakt och publicering kvitteras i VALIDATION. Leverantörs- och tillgänglighetsprinciperna finns i [agent/RESEARCH.md](agent/RESEARCH.md).

## Fortsatt designarbete

Efter kundkortet: en konsekvent visuell hierarki för kundregister, offertunderlag och Tryck & leverans; gemensamma statusord och datum; formulär med få nödvändiga uppgifter först. Fortsätt från observerad friktion och bevara Min dags fokus på personligt arbete. Månads-/årsförsäljning, marginal och nya prospects är huvudmåtten; TB blir inget huvudmått.


## Synlig status i privata kundflöden – publicerad v23

Vid arbete långt ned i kundplan, bearbetning och onboarding ska en kort statusyta fortsätta visa privat serversparning och en relevant nästa handling. Kundens CRM ändras först vid uttrycklig sparning där. Färg kompletterar statusorden. Långa fel och revisionsval ligger kvar i formuläret med en fokuserbar väg från statusytan; de ska inte låsas över mobilens arbetsfält.

Statusytans och sparhandlingarnas verkliga höjd ger rullningsutrymme för fokus även när texten radbryts. Fälttext, serverfel och befintliga konfliktval bevaras. Det frysta v23-bygget passerar 26/26 browserfall och 6/6 tangentbordsfall med kontrollerad 200 procent fälttext, kort viewport och faktisk lokal sparning/konflikt/återförsök. Under 540 px höjd ligger nedersta handlingarna i normalt scrollflöde; de kan nås och rullas fram med Tab utan att döljas helt av statusytan. En stor textarea visas delvis och scrollas. En duplicerad CRM-feltoast tas bort endast i dessa flöden; exakt fel ligger kvar i dialogen. VALIDATION kvitterar faktisk v23-publicering. Fysisk telefon, skärmläsare och personalacceptans kräver separat prov; automatisk browserkontroll är ingen allmän tillgänglighetscertifiering.


## Kundvårdens relevanta handlingar, v24

Affärsingångarna Återköp/Merförsäljning följer nu befintlig säljar-/adminförmåga; reader behåller läsning och historik utan de två oanvändbara formuläringångarna. Detta är en avgränsad tydlighetsförbättring enligt aktuella leverantörsprinciper i RESEARCH. Roll-/kort-/navigeringsprov på 320/390/1440 px och komponentrender passerar. Det generella affärsformulärets min-content-bredd och fem px klippta footer är däremot belagda gamla fel med långt kundnamn, lika före/efter. Nästa formulärdesign ska rätta dessa mått och provas med sparstatus, textförstoring och kort viewport utan att sänka kraven. Fysiskt mobil-/personalprov är fortsatt oprövat.


## Generella formulär – publicerad v25

Långa kundnamn, valtext och befintlig privat sparstatus ryms inom formuläret. Krympbara kolumner ger en kolumn på mobil; svenska handlingar radbryts och har minst 44 px höjd. Footer tar hänsyn till safe-area och ligger i vanligt scrollflöde vid kort viewport. Textareas behåller sina rader, full text, intern scroll och manuell resizing.

Native fokus kan visa en textmarkör samtidigt som fältets nederkant ligger bakom en radbruten footer. Hjälpen mäter därför aktuella kanter för det fortfarande fokuserade generella fältet och rullar bara dialogen vid behov. Den ändrar inga värden, ingen fokusdestination och ingen sparning. Workorder och privata kundflöden är oförändrade.

Slutbygget passerar 18/18 fall och 77 formprov på 320/390/768/1440, kort 390×460 och kontrollerad 200 procent dialogtext, samt åtta dropdowninteraktioner. Alla 1 937 Tab-fältbesök har fri helbox med befintlig tolerans. V24-fyndet ovan är historiskt; faktisk rättning/publicering kvitteras i VALIDATION. Portalernas textförstoring, fysisk telefon/OS-tangentbord, skärmläsare och personalanvändbarhet är inga godkända prov här. Färska leverantörs-/webbstandardkällor finns i RESEARCH.

## Synlig laddning och nåbara statusknappar – publicerad v26

Generella formulär visar nu det befintliga laddnings-/felbeskedet och Försök igen även innan ett privat record finns. Öppna uppgifter kan vara osparade; först ett lyckat privat återförsök ger Sparat som privat utkast. Ett rent formulär och inställningar får ingen falsk privat bekräftelse.

Radix Tab-wrap kan fokusera en knapp utan att rulla den till synlig yta. Den befintliga generella scrollhjälpen omfattar därför även utkastets statusknappar och mäter fri yta före aktuell footer. Den ändrar inte fokus, text eller sparning. Workorder, reader, footer och andra dialogers kontrakt består. Lång feltext får vara större än skärmen och läses med vertikal scroll.

Slutkälla 809b77e passerar 10/10 Worker-/Chromiumfall, sex återhämtningsflöden och 12 native Tab-/pointerkontroller på 320/390, kort 390×460 och kontrollerad exakt 200 procent dialogtext. Samma96 distfiler är oförändrade. Officiella Salesforce/Lime/W3C-principer och deras gränser finns i RESEARCH. Samlad/sticky spar-/CRM-felstatus och hjälpmedelsannonsering är fortsatt nästa arbete. Fysisktelefon/OS-tangentbord, skärmläsare och personalprov är oprövade; ingen generell användbarhetsgaranti följer av dessa kontroller.

## Bestående textstatus utan extra mellanrum – publicerad v27

Generella formulär behåller en text-only polite/atomic statusregion även när ingen sparning pågår. Clean-regionen klipps visuellt med befintlig sr-only-utility och ligger utanför gridflödet; den tas inte bort eller göms från hjälpmedel. Tider och handlingsknappar ligger utanför regionen. Väntande arbete, privata sparningar, fel och konflikt använder tidigare svenska texter och visuella statusar utan fokusflytt.

Slutbrowser 13/13 på 1a7e841 verifierar samma nod, exakt oförändrade clean-mått mot v26, native Tab/pointer, verklig 200-procenttext och faktisk privat CAS409. Första kandidatens extra 14 px är rättade. 96 byggfiler är oförändrade efter prov. Ingen faktisk skärmläsaruppläsning eller generell tillgänglighetscertifiering påstås. Officiella W3C/Salesforce/Lime-källor och deras gränser finns i RESEARCH; samlad privat-/CRM-felstatus är nästa avgränsning.

## Samlad privat/CRM-status – publicerad v29

Generella formulär samlar privat utkaststatus och besked från CRM-/stängningsförsök vid spara- och stängknapparna. En bestående textregion med role=status, aria-live=polite och aria-atomic=true ger sammanfattningen; tider, hjälprad och detaljknapp ligger utanför. Fullständiga privata besked och befintliga återförsöks-/versionsval finns kvar i formuläret. Visa besked/Granska flyttar fokus till rätt detalj först när användaren väljer handlingen. Statusändringar flyttar inte fokus.

Footerns faktiska höjd mäts och används för att hålla samma fokuserade generella fält synligt. Den följer normalt scrollflöde när viewporthöjden är högst 540 px eller dess uppmätta höjd överstiger halva tillgängliga vyhöjden; annars behålls sticky. Clean-formulärets hjälprad förklarar Spara utan privat sparbekräftelse eller extra privat DOM-gap. Inställningar och läsare får egna tydliga besked. Slutbrowser passerar 23/23 fall på oförändrad artefakt med 119 bilder/19 före-/efterauditer; fem generella former med normal/computed200-text bevarar fokus och markering genom autosave. I kort 390×460/text200-vy syns respektive Tab-fokuserad knapp helt, medan status och alla handlingar kräver scroll. V29 är faktiskt publicerad; se VALIDATION för source/main/live och fullständiga belägg. Faktisk skärmläsaruppläsning, fysisk telefon/OS-zoom/tangentbord och personalanvändbarhet är fortsatt oprövade.

## Nåbar mobilmeny på korta skärmar – publicerad v40

Mobil navigation ska gå att använda från början av en kort skärm, utan att först öppnas i större viewport. En namngiven modal panel, tydlig svensk Stäng och egen vertikal rullning håller arbetsområden nåbara. Text och ikon visar handlingarna. Menyval stänger panelen och avslut återför fokus med bevarat sidläge.

Ctrl/Cmd+B öppnar inte mobilmenyn när en annan modal dialog är öppen. När viewporten går över till desktopbredd stängs den mobila panelen; den återöppnas inte automatiskt när skärmen blir smal igen. Desktopens befintliga menyval och tangentbordsväxel behålls. Breda, korta skärmar använder den befintliga sidmenyn i sidans layout. Vid minst 768 px bredd och högst 540 px höjd får hela den menyn egen vertikal rullning; header, val och footer ligger i samma rullningsyta. Menyns val pressas därmed inte ihop till en smal remsa mellan header och footer. Den vanliga höga desktoplayouten behålls. I mobilpanelen och den breda, korta sidmenyn får svenska menyval, företagsnamn och profiltext radbrytas inom sin yta. Magnussons symbol får en innehållsanpassad box när texten förstoras; menyknapparnas höjd växer med texten och är minst 44 px.

52 unika färska Chromiumkontexter PASS för fryst slutkandidat 776d1a43: 20 pointer, 3 tangentbord, 2 initial Shift+Tab, 4 sök-/avbryt, 2 långsidrullning, 4 breddbyte, 5 roller, 2 andra modaler, 6 desktop med samtliga val, 2 mobil textförstoring och 2 bred kort textförstoring. Extra textförstoringsbilder är visuell evidens och tillför inga fall. Mobil 320/390×360/844 och 767×390: Stäng, Escape, backdrop och val; verklig native Tab/Shift+Tab, synlig full knappbox och hit-test, verklig Ctrl+B-öppnare från sökfält med bevarat huvudtext-/scrolläge. Inline 768×390, 844×260/390/540/541 och 1280×900: samtliga sex val via Tab/Shift+Tab och pointer. Breddbyte stänger utan återöppning; seller/reader/production/print/warehouse, företagsdialog och portalled Select. Kontrollerad exakt 200 procent font (15,2→30,4 px), inte full browserzoom, vid 320/390×360 och 768/844×390. [VALIDATION](VALIDATION.md) skiljer faktisk layout/native tangentbord från personal-, telefon- och hjälpmedelsprov. Nästa avgränsning: **B01b2: stabil ansvarig för öppna affärer och order, med granskad överföring och bevarat historiskt resultat**. B01b2:s stabila kommersiella ansvar, övriga specialdialoger, fokus efter arbetsytebyte, mobilkundlista, separat utkast-/konto-/Outlookbackup, hostingbudget/återställning och personalpilot kvarstår.

Officiella källor och vår avgränsade tillämpning finns i [RESEARCH](agent/RESEARCH.md).

## Begriplig kommersiell överlämning – publicerad v41

Ansvarsbyte är en relevant svensk handling vid den affär/order som ska byta ansvar. Granskningen visar kund, aktuellt ansvar, ny profil, nödvändiga åtaganden, frivilligt valda uppgifter och arbete som blir kvar. Ny ansvarig och valfria uppgifter har inga förval; nödvändiga åtaganden visas som obligatoriska. Orsak och avsikt bevaras vid fel. Ett ändrat gemensamt underlag upphäver granskningen; användaren får välja ett nytt underlag uttryckligen. Synlig spar-/felstatus, väntspärr, stängningsval och nåbara svenska handlingar stödjer mobil och tangentbord.

21 unika browserfall passerade på b382ddc/tree4e47 med samma byggda Worker och oförändrad distmanifest. Rapporten har inga browserfel eller externa anrop. Granskad affärs-/orderöverlämning, obligatoriska/valfria uppgifter, faktiskt dubbelklick och en överlämningshistorik, förlorad kvittens med samma intent/ID, transportfel, verkligt lokalt samtidig API-ändring och 409 följt av explicit nytt underlag och ny granskning, busy/stängningsskydd, osparad råtext/native beforeunload och fokus. Säljare/läsare/produktion/tryck/lager saknar adminingång; produktionens Ditt jobb bevaras för faktisk syntetisk user_id. Viewport 320×360, 390×844 och 1280×900; uppmätt dubblerad text i dialog och Select, Tab/ShiftTab och synligt fokus. [VALIDATION](VALIDATION.md) anger faktiska provgränser. Detta är inga personal-/telefon-/skärmläsarprov. [RESEARCH](agent/RESEARCH.md) skiljer leverantörsprinciper från egna kontrakt.

Nästa avgränsning: **B01b2:s återstående operativa ID-migrering och granskade personalöverlämning med bevarad historisk attribution**. Full B01b2, separat affärschefsroll, övriga privata specialdialoger, mobilkundlista/fokus efter arbetsytebyte, separat utkast-/konto-/Outlookbackup, hostingbudget/återställningsrutin, faktiska integrationer och personalpilot kvarstår.

## Begripligt kundansvar och granskat underlag – publicerad v42

Kundkortets ansvarshandling visar kunden, aktuellt ansvar, ny profil, uttryckligt valda aktiviteter och arbete som ligger kvar. Ny profil och aktiviteter saknar förval. Profilnamn tillsammans med ursprunglig ansvarskoppling hjälper när namn sammanfaller. Läsning av ett ändrat underlag och valet att använda det är skilda handlingar; nytt underlag kräver ny granskning. Kunddialogens valda profil visas i en egen DOM-span inne i Select.Value; just den textytan begränsas till två rader. Trigger har lokalt krympbar flexlayout med minWidth0 och overflow-skydd. Radix2.3.7 använder eget child-innehåll och ersätter inte denna span med ItemText-portalen. Hela det valda profilnamnet och ursprungliga ansvarsetiketten visas direkt under väljaren och kopplas med aria-describedby; popup och granskning behåller full text. Orsak och tillåtna val bevaras vid fel. Väntspärr, osparat stängningsval, synlig status och identitetsavgränsning för arbetsyta, användar-ID, medlems-ID och serverroll hindrar att lokala val förs över till nästa sammanhang. Misslyckad hämtning visar läs-/åtkomstfel och blir inget nytt granskningsunderlag. Detta ger inget nytt varaktigt privat serverutkast.

Slutlig oförändrad kandidat 0338cdc6/tree0fb144e passerade 25 av 25 browserfall utan sidfel eller externa anrop. Root har läst rapporten, verifierat frysta käll-/distmanifest och granskat tre bilder från just slutkörningen. Tydlig kundöverföring och noll förvalda uppgifter, giltig granskning, smutsig-form-skydd för Escape/utanför/kryss och beforeunload, 503 och retry med bevarad avsikt, misslyckad refresh, verklig relaterad 409 och separat hämtning/adoption, busy-stängning, dubbelklick och exakt förlorat ACK-replay, tillåten orelaterad ändring, inaktivering av mål, identitybyten för användare/roll/medlem/workspace, fem serverroller utan administrativ överföringsingång och filtrerade kommersiella kundfält för produktionsrollerna. Layoutprov i 320/390/1280 px och lokalt beräknad 200-procentstext. Samtliga 18 tabellnycklar kontrollerades; 13 otillåtna tabeller, tre positiva Outlooktabeller, privat utkast, annan workspace och två R2-filer bevarades. [VALIDATION](VALIDATION.md) anger faktiska provgränser. Detta är inga personal-/telefon-/skärmläsarprov. [RESEARCH](agent/RESEARCH.md) skiljer leverantörsprinciper från egna kontrakt.

Nästa avgränsning: **Stabilt uppgiftsansvar med profil-ID och granskad personalöverlämning som bevarar historiska försäljningsresultat och privat kommunikation**. Full B01b2, profil-ID för ansvariga på uppgifter, möten och specialflöden samt komplett personalavveckling, separat affärschefsroll, övriga privata specialdialoger, mobilkundlista/fokus efter arbetsytebyte, separat utkast-/konto-/Outlookbackup, hostingbudget/återställningsrutin, faktiska integrationer och personalpilot kvarstår.

## Begripligt uppgiftsansvar – v43

Min dags kopplade uppgifter och uppgiftssignaler följer den egna profilens UUID. Teamets ansvarstext visar aktuellt namn, oföränderlig ursprunglig etikett vid dubbla namn och **ansvar behöver förankras** för äldre ansvar utan profil-ID, även när etiketten redan matchar en granskad profil. Etiketten är visning, inte ny personidentitet. Vanliga uppgiftsrader behåller Följ upp; inga nya överlämnings-/redigeringsingångar påstås.

Fjorton slutbrowserfall och fem separata Worker-HTTP-fall passerar på samma frysta källa. Layout/tangentbord avser 320/390/1280 px och avgränsad 200-procentstext. Resumed generic edit och gammal basis provas via syntetiskt sparat privat utkast med tydlig **Ansvarskoppling**, kopiering och uttryckligt aktuellt versionsval. Root granskade fyra slutbilder; exakta rapport-/bildhashar finns i VALIDATION.

B07 har observerad kvarvarande 200-procentsklippning i befintlig utkaststatus, fokustagg och tom kontaktvy. Slutproven med fördubblad text avser ändrade uppgiftsetiketter, rader/knappar, scopeknappar och dokumentbredd, inte hela Min dag eller WCAG. Kod-/hashjämförelsen mot v42 visar oförändrade berörda områden; den är inget separat byggt v42-runtimeprov.

Nästa separat designarbete är denna klippning samt tidigare öppna mobilkundlista/fokus efter arbetsytebyte. Fysisk telefon, OS-tangentbord/zoom, skärmläsare och personalens förståelse är inte verifierade genom Chromiumproven.

## Begriplig uppgiftsöverlämning – v44

**Följ upp** fortsätter vara uppgiftsradens vanliga handling. Administratörens mindre framträdande **Byt uppgiftsansvar/Förankra ansvar** visas i relevant kunduppgiftssammanhang. Granskningen visar samma uppgift och kund, aktuell person, vald profil, orsak och att kund-/affärs-/order-/historiskt resultatansvar hålls isär. Målprofil och granskningsbekräftelse saknar förval.

Även uppgifter längre än sju dagar framåt går att nå under den från början stängda gruppen **Senare planerade uppgifter**. Gruppen återanvänder vanliga uppgiftsrader och samma ansvarshandlingar; dagens och kommande sju dagars grupper behålls. Urvalet följer vald egen/teamvy. Gruppen gör senare arbete nåbart utan att lägga det i dagens prioritet.

Profilväljaren använder lokalt krympbar layout och högst två rader i valt fält; fullt valt namn och ursprunglig ansvarskoppling finns direkt nedanför samt i popup och granskning. Radbrytna svenska knappar har minst 44 px höjd. Dialogen rullar på kort mobilskärm, har synlig Stäng och håller native fokuserad kontroll nåbar genom att mäta dess aktuella kanter. Underlagshämtning, basisadoption och sparning är separata begripliga handlingar. Lång orsak och feltext bevaras. Busy spärrar ändring/stängning; dirty stängning kräver uttryckligt val. Ändrad användare, medlem, roll, arbetsyta eller uppgift avgränsar lokala val.

Det nya formuläret sparas inte varaktigt som privat serverutkast. Hjälptexten förklarar att orsak/val finns kvar i öppen dialog och bör kopieras före omladdning. Ingen falsk privat sparstatus visas.

Slutbrowser passerade **30 Chromium-fall och en separat faktisk Worker-HTTP-sekvens**, 2026-10-07 05:40:32.602086–05:41:34.037923 UTC, på oförändrad provkandidat `1980a3d`/träd `e3b96a2c` med exakt 270 källfiler och 96 distfiler. Egen migrerad lokal D1/R2 och syntetiska autentiserade identiteter användes; inga sidfel eller externa anrop. Rapport `/workspace/scratch/crm44/browser/run-054032/report.json`, SHA256 `bf8972567f25577ad24e0a1f50607b660fb993ba9a69c931dc98a0965773b08e`. Viewportproven är 320×360, 390×844 och 1280×900; vid 320×360/390×844 fördubblades faktiskt beräknad fontstorlek lokalt i nya dialogen och öppnad Select-popup. Fullt långt valt namn/ansvarskoppling och popup hölls inom horisontella gränser. Native Tab/Shift+Tab höll kontroller i dialogen och inom skärmen med nåbar stängning och återfört fokus. Detta är begränsade ändringsprov, ingen helsidig 200%-zoom eller full Min dag-/WCAG-/skärmläsar-/fysisk telefon-/personalacceptans. Root granskade fyra bilder från samma slutkörning: mobilens fullständiga valda profil, 320×360 med fördubblad beräknad dialogtext, desktopdialog och äldre v43-utkastets konfliktgranskning. Kvitto `/workspace/scratch/crm44/browser/root-visual-review.json`, SHA256 `193a7fac3e68309baa77846b14d309b04b5fb9a1b9f4df6a624afe9f0215d02f`. Håll tidigare observerad 200%-klippning i befintlig utkaststatus, fokustagg och tom kontaktvy som öppen B07-punkt. Den nya granskningens prov är ingen allmän WCAG-, OS-zoom-, fysisk telefon-, skärmläsar- eller personalacceptans. [RESEARCH](agent/RESEARCH.md) skiljer faktisk leverantörsprincip från vår egen dialog-/ansvarsmodell.

## Mötesansvar med tydlig granskning – v45, 2026-10-07

Vanlig möteshandling behålls; administratörens **Byt mötesansvar**/**Förankra mötesansvar** är en separat mindre framträdande handling för aktuellt planerat möte. Dialogen visar kund, möte/tid, tidigare och vald person, orsak och exakt avgränsning. Mål och granskning börjar tomma. Fullständigt valt namn med ursprunglig ansvarskoppling skiljer sammanfallande namn åt; etikett, text och handling förklarar äldre tom koppling utan att gissa en person.

Hämtning, uttryckligt nytt granskningsunderlag och CRM-sparning är skilda handlingar. Fel behåller lokal orsak/val och förklarar att första skrivningen kan ha lyckats. Synlig stängning, dirty-/busy-vakt, fokusåtergång och nåbara kontroller stöder tangentbord och kort mobilvy. Lokal text är ingen bekräftad privat serversparning; hjälptexten kräver kopiering före omladdning.

Egen/teamets mötesurval använder stabilt profil-ID när det finns; aktuellt namn är visning. Generell redigering förklarar skrivskyddat ansvar efter initiering. Gamla privata generiska mötesutkast visar Ansvarskoppling/Ansvarshistorik-konflikt och bevarar råvärden för granskning/kopiering. Detta är skilt från ansvarsdialogens lokala avsikt.

Slutbrowser har 31 fall plus en faktisk HTTP-sekvens. För ändrad dialog och popup provades 320×360, 390×844 och 1280×900 samt faktiskt fördubblad beräknad text vid de två mobilstorlekarna. Vald ansvarstrigger är avsiktligt begränsad till två rader; fullständig vald profil/ansvarskoppling finns i separat synlig beskrivning och aria-describedby. Native Tab/Shift+Tab, nåbara kontroller, stängning/fokusåtergång och horisontella dialog-/popupgränser kontrollerades. Detta är ändringsprov, ingen helsidig 200%-zoom eller allmän WCAG-/telefon-/personalacceptans. Rapport och rootens bildgranskning finns i [VALIDATION](VALIDATION.md).

Detta stänger inte B07:s tidigare observerade klippning av utkaststatus, fokustagg och tom kontaktvy eller uppgifterna mobilkundlista/workspacefokus. Fysisk telefon/OS-tangentbord, skärmläsare, personalacceptans och en helsidig WCAG-bedömning är separat underlag. Officiella principer och våra egna domän-/designval skiljs i [RESEARCH](agent/RESEARCH.md).
# Årsplanering: fortsätt privat och spara uttryckligen – crm73

Behovsformuläret visar vald kund, synlig privat sparstatus och två tydliga handlingar: **Spara utkast & stäng** respektive **Spara behov och påminnelse**. Min dag och årshjulet öppnar det valda privata utkastet; datum, kund och referens skiljer liknande rubriker åt. Tekniska referenser och hela bevarade underlaget finns i utvecklingsbara detaljer, medan vanliga fält använder svenska verksamhetsord.

Privata versionsval och ändrat CRM-underlag har egna jämförelser och uttryckliga val. Ofärdiga datum får inte krascha kontaktberäkningen. Textfältens begränsade höjd, radbrytning, synliga fokus och uppmätt flöde för höga sparpaneler återanvänder befintlig utkastdesign. Browsergeometri, textförstoring och observerade personalprov ska rapporteras som egna prov; kodgranskning och komponentprov är inte sådana resultat.
