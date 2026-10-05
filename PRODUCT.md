# Magnussons CRM – aktuellt produktunderlag

Uppdaterat med byggkandidaten 2026-10-05. Publicerad bas, kandidat och kvarvarande pilotkrav skiljs åt i [STATUS-2026-10-05.md](STATUS-2026-10-05.md). Det ursprungliga v13-underlaget nedan utgår från arbetet den 16 september. Dagliga rutiner, driftgränser och verifieringsresultat finns i OPERATIONS.md. Microsoft-anslutningens omfattning finns i OUTLOOK.md.

## Syfte och dagligt arbete

Säljaren börjar i Min dag: egna uppgifter, order som kräver hjälp, kundmöten, kontaktbehov och privata utkast. Ledning med administratörsroll kan växla till teamets uppgifter och resultat. Ett personligt urval innebär inte sekretess mellan säljarna; säljteamet arbetar med gemensamma kunddata.

Kundkortet samlar nästa aktiviteter, kontaktuppgifter, kundplan, aktuella order och en sökbar historik. Anteckningar från möten och samtal kan skrivas direkt och sparas som privata utkast tills de publiceras på kunden. Tillgänglig Outlook-korrespondens visas med samma åtkomst och delningsregler som i korrespondensvyn. Inga riktiga Microsoft-konton är anslutna i denna leverans.

## Processmodell

- Prospektering håller företag, relevans, kontaktsteg och nästa aktivitet åtskilda från intäktsprognosen. Bekräftat behov kan omvandlas till en affär.
- Affär: identifierad, dialog, behov, lösning/prov, kalkyl, offert, beslut och accepterad. Aktiva affärer kräver nästa aktivitet och datum. Återköp får en egen affär på den befintliga kunden.
- Första accepterade affären skapar onboarding med kontrollpunkter, leveransåterkoppling och en framtida kundplan.
- Kundvård: mål, kontaktpersoner, återkommande inköpsbehov, avstämningar och kundärende med ansvarig. Uppföljning sker direkt från Min dag. Behovets leveransdatum ändras inte när ett nytt samtal planeras.
- Order: underlag, korrektur, leverantör, produktion, utleverans, kundmottagande och uppföljning. Produktion har radvisa mottagna, tryckta, kasserade och skickade antal. Kundgodkänd minskning är separat från kassation.

En accepterad order kan få ett versionshanterat ändringsförslag före tryck. Ny kundacceptans krävs och underlagen behöver bekräftas igen. Samma affär/order behålls. Fysisk hantering och kundgodkända antal får inte skrivas över av en ny arbetsversion.

## Resultat och automation

Försäljning räknas från registrerade fakturasammanställningar exklusive moms, med separata månads-/årsmål för säljare och företag. Kostnadstäckning visas vid marginalberäkning. Ordervärde är inte intäkt. En fakturasammanställning per order stöds efter utleverans; delfaktura, kredit och förskott ingår inte.

Resultat har fyra tydliga kort: rapportmånadens försäljning, kalenderårets försäljning, marginal med kostnadstäckning och nya kvalificerade prospects. Kort för försäljning och marginal öppnar fakturaunderlaget med samma historiska ansvar. Årsgrafen växlar mellan månadsvis och ackumulerat; månaden kan väljas i grafen eller beloppstabellen. Saknade mål ger luckor, inte ett automatiskt uppdelat årsmål. Framtida månader utan fakturor har inget ritat utfall.

Teamet använder samma resultatregler som personvyn. Placeringar är avstängda tills användaren väljer dem; marginal och fler mått visas efter ett extra val. Min dag visar en verklig nästa handling först: orderhinder, prioriterad signal, dagens uppgift, möte, leveransuppföljning eller kundkontakt. Kompakta snabbval och statuskort leder vidare till arbetet. Uppgifter, privata utkast och leveransbevakning behåller sina arbetsdialoger; månadsresultatet är en kompletterande översikt. Utan säljarprofil visas inga personliga nollsiffror. Administratören kan uttryckligen öppna teamets dag, medan privata utkast förblir egna.

Regler visar försenade offertkontakter, leveranser med saknat underlag och aktiva kunder utan planerad aktivitet. Importerade befintliga kunder får en första uppföljning. Signalernas villkor upphör när arbetet hanteras. Notiserna finns inne i CRM; det är inte AI eller externa pushutskick.

## Teknik, åtkomst och gränser

React/Vinext med D1-tabeller och R2-kundfiler. Servervalidering, personliga CRM-roller, kontroll av oförändrad post/arbetsversion och databasens CAS skyddar uppdateringar. Begärans-ID:n förhindrar dubbla sidoeffekter. GET projicerar äldre bevakningsuppgifter utan att skriva arbetsytan. Privata utkast har separat revisionskontroll, serversparning och lokal reservkopia per användare/arbetsyta.

Tryck/lager får operativa data utan kalkyl, fakturor, privata anteckningar eller Outlook. Säljare delar kundregistret. Bootstrap-administratörer är konfiguration; etablerade konton påverkas inte av senare fel i den konfigurationen. Plattformens inloggningsheadrar är fortfarande en förutsättning som ska verifieras med hostingägaren före driftlöfte.

CSV kan importera kunder/artiklar och bevara Fortnox-kundnummer. Ingen Fortnox-synk, automatisk fakturering, liveprospektering eller orderöverföring till webbshop är ansluten. Outlook-koden läser efter konfiguration men skickar inte mejl/inbjudningar. AI, ljudtranskribering och e-signering är inte aktiverade.

CRM-kopia med kundfiler kan exporteras och återställas till tom arbetsyta med integritetskontroller och omskrivna filreferenser. Konton, Outlook och privata utkast ingår inte. Den nya strömmade kopian saknar den äldre 10 MB-gränsen för samlade filer; en fil är fortfarande högst 5 MB. Övriga gränser och äldre JSON-formatets kompatibilitet framgår i OPERATIONS.md. Automatisk hostingbackup och ett faktiskt driftåterställningsprov återstår.

Flera leverantörer/tekniker per jobb, reklamation efter leverans, delfakturor/krediter, kundsammanslagning, stabila ansvarig-ID:n och storleksmatris är kvarvarande utvecklingsområden. All data laddas i arbetsytan; större datamängder kräver paginering/arkivering.

## Verifiering och nästa steg

`node tests/outlook.mjs` kör regressionsscenarier mot isolerad SQLite och kontrollerade R2/Graph-svar. Nya scenarier täcker 48 av 50, kassation/ersättningsvaror, 40→45 med förnyat godkännande, verklig CAS-konflikt, exakta återförsöksresultat och återställning med en 5 MB fil. TypeScript och produktionsbygge ingår. Detta bevisar inte användbarhet, verklig Microsoft-anslutning, plattformens headerskydd eller katastrofåterställning.

Låt Sebbe och en säljare själva genomföra: logga ett kundsamtal med nästa steg, ändra en accepterad order, hantera en delleverans/avvikelse och följa upp kunden. Mät hjälpbehov och tid. Därefter anslut och pröva de faktiska ekonomisystems- och Microsoft-kontona, och fastställ ägarskap, drift och support innan CRM säljs som färdig driftprodukt.

## Min produktion och mobil användning

Gemensam roll **Tryck & leverans** för de personer som hanterar hela flödet. Startsidan visar Mitt arbete, Gemensam kö och Avslutat. Korten visar kund, jobb, ansvarig, nästa moment och tre datum: tryckklart, skickas senast och hos kunden. ”Jag tar jobbet” flyttar ansvaret till den inloggade personen; avslutade jobb finns kvar i historiken.

Jobbet öppnas med nästa registrering först. Skiss, instruktion, antal per artikel, leveransadress, foton och historik finns i samma vy. Hinder meddelas säljaren och löses av den som registrerat dem eller en administratör. Utleverans och kundens mottagande är separata händelser.

Mobilanpassningen behåller säljarnas huvudsakliga navigering. Hemskärmsikon och installationshjälp finns via ”I mobilen”. Vyn kräver internet och har notiser inne i CRM; push och offlinearbete ingår inte. Sebastian Engqvist och den andra produktionsmedarbetaren ska få egna verifierade konton vid utrullning.

## Förbättringar 4 oktober 2026

- Direktleverans registreras separat med mängder per accepterad artikelrad, faktiskt avsändningsdatum, leveranssätt, mottagare och belägg. Delleverans avslutar inte hela åtagandet. Normal slutfakturaregistrering och mottagningsbekräftelse kräver leveransunderlag. Äldre order bevaras med synlig overifierad leveransstatus tills underlaget granskats.
- Ett produktionshinder löses genom en särskild handling med upplösningsorsak, aktör och tid. Tom text löser inget hinder; kundgodkänd mängdminskning får inte avsluta ett blockerat jobb.
- Kundplan, bearbetning, onboarding och företagsevent har oföränderlig underlagskontroll även efter konflikt/omläsning. Olika poster kan sparas samtidigt.
- En sparad fakturaansvarig bevarar månads-/årsutfall vid senare byte av orderansvarig. Full migrering av kommersiellt ansvar från namn till stabila ID:n återstår.
- CRM-kopior kan strömmas och återställas med mer än 10 MB filer i isolerade tester. Det är ännu inget bevis på faktisk hostingåterställning eller automatisk driftbackup.

Sebbes huvudmått är försäljning mot månads- och årsmål, marginal och nya prospects. Koden räknar fortfarande manuellt registrerade fakturasammanställningar exklusive moms; orderintag/fakturerat och marginalens kostnader är öppna affärsbeslut. TB är inte huvudmått. Chef/VD har fortfarande full adminbehörighet i dagens implementation; det är inte målbilden för en separat affärschefsroll.

## Byggkandidat 5 oktober: privata kundflöden

Kundplan, bearbetning och onboarding får privata serverutkast med återupptagning från Min dag. Ofärdiga uppgifter kan sparas utan att ändra kundens gemensamma CRM. Ursprungligt kundunderlag följer med; en ny global version ersätter det inte tyst. Kundkonflikter och en annan enhets utkastrevision visas separat och texten bevaras. Återupptagning avmarkerar dagens kundavstämning, som måste bekräftas uttryckligen igen.

Explicit sparning i CRM använder exakt utkastversion och arkiverar den atomiskt. Onboardingavslut och affärsskapande kräver egna handlingar. Företagsevent och övriga specialdialogers serverutkast återstår. Verifieringen finns i [VALIDATION.md](VALIDATION.md); kandidatkoden blir live först efter gröna kontroller, merge och lyckad Sites-publicering.
