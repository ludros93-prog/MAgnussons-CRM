# Magnussons CRM – aktuellt produktunderlag

## Ett granskat konto får det äldre jobbansvaret från rättningen – v66

**Rätta äldre jobbansvar** är administratörens avgränsade väg för ett aktuellt lämnat eller tryckt jobb med sparat ansvarigt namn, men utan användar-ID, medlems-ID eller registrerad ansvarshistorik. Handlingen finns på jobbkortet och i **Produktionsarbete per konto** för den berättigade jobbraden. **Sparat äldre underlag**, **Orderansvar · ligger kvar** och granskningen visar vad som ändras och vad som bevaras.

Det äldre namnet och tidsfältet visas som ej verifierade. Administratören väljer ett aktivt anslutet tryck-, lager-, produktions- eller administratörskonto och anger faktiskt underlag och orsak. Samma namn räcker inte för att välja ett konto; konto-ID skiljer alternativen åt. Rättningen registrerar nytt jobbansvar nu och fastställer varken tidigare person eller tidigare starttid.

En atomisk skrivning förankrar det valda jobbansvaret och registrerar första audit-raden med `resolve_legacy`, bevarat äldre namn och `legacyAssignedAt`. Ursprungliga användar-/medlems-ID:n är tomma. Faktisk rättningstid, vald kontoidentitet, administratör och orsak sparas. Tidigare mängder, moment, kundgodkännanden, ansvar för hinder, kommersiella ansvar och privata data bevaras. Fortsatta vanliga ansvarsbyten förlänger historiken.

Ändrat jobb, konto eller granskningsunderlag kräver ny granskning. Orsaken finns kvar i den öppna dialogen; vid inläsning kan ett otillgängligt kontoval tömmas. Om jobbet fortfarande har äldre namn utan identitetskoppling granskas rättningen igen. Om ansvar redan har förankrats visas aktuellt registrerat konto; dialogen stängs och jobbets vanliga ansvarsflöde används för en annan ändring. Formuläret är inget sparat privat utkast. Ett osäkert försök kan återförsökas med samma oförändrade begäran; stängning återställer ingen redan registrerad rättning.

Gränsen omfattar inga avslutade/avbrutna/utkastjobb, redan identifierade ansvar, trasiga medlemskopplingar, motsägande audit eller separata hinderidentiteter. Kontoändringens spärr gäller fortsatt och hämtas på nytt efter hantering. Tomt urval betyder ingen full personalavveckling.

Backupformat `magnussons-crm-1` består; inga SQL-tabeller eller migrationer tillkommer. Den nya audit-handlingen och det äldre tidsfältet kräver **v66-kompatibel läsare och skrivare** när rättningshistorik finns. En skrivande återgång får inte förlora denna historik; använd kompatibel kod eller en faktiskt verifierad full återställning med plan för senare arbete. Faktisk oförändrad v65 avvisade den nya auditen i 12 prov. V66 bevarade hela delade underlaget och ordnad aktuell/arkiverad ansvarshistorik genom autentiserad rättning/återförsök, vanlig orderskrivning, JSON/native NDJSON-export samt full JSON/native NDJSON-återställning med återläsning. Tre syntetiska provfiler, totalt 138 byte, och tre råa privata utkastformat kontrollerades; samtliga 18 råtabeller och positiva privata Outlook-/R2-sentineler jämfördes. Den extra arkiverade rättningsraden är en semantisk fixture, inget prov av dess arkiveringslivscykel. Kompatibilitetskvitto SHA-256 `9033719574abb5b12aeb19bad42a01edc6a673f2c54c6dd6f4f8788956e10168`. Dessa isolerade prov verifierar ingen full hostad återställning eller personalacceptans. [VALIDATION](VALIDATION.md) redovisar slutbeläggen.

Fem obligatoriska slutkontroller passerade på exakt ren och oförändrad kod `36723ebb39b83623b0ddc27733d8b702515aaeec`, träd `11419ea162363bf95b744b7c94d352c68cb8cfbe`: regressioner, TypeScript, bygge, isolerad D1/R2-runtime och diffkontroll. Kontrollkvitto SHA-256 `f69375d58d09b44ac9ba6b44aaf08180297be52b868e5762593882a4db5113e8`.

## Historik före v66

# Magnussons CRM – aktuellt produktunderlag

## Begripligt arbete bakom kontoändringens spärr – v65

**Arbete som spärrar ändringen** visas i administratörens kontoformulär när produktionskontrollen spärrar minskad åtkomst. **Visa arbete som spärrar ändringen** hämtar underlaget uttryckligt. Raderna håller ihop arbetsyta, arbetsreferens, order-ID, produktionsstatus, ansvarsdel och orsak. **Visar X av Y ansvarsdelar** anger hur mycket som är hämtat; **Visa fler ansvarsdelar** hämtar nästa 20.

Kvarvarande kontoansvar och oklara kopplingar har skilda orsaksbesked. Ett äldre namn väljer ingen person. Gemensam kö med tom identitet/namn är inte oklar identitet; ett inaktivt entydigt kopplat konto är inte okänt. Ett skickat jobb kan ha öppet hinderansvar, och samma order kan ha två ansvarsdelar.

Listan läser samtliga lagrade arbetsytor mot kontoändringens aktuella granskningskontext. Ändrat underlag kräver **Hämta kontoändringens granskning igen**. Nät-/format-/sidfel döljer tidigare detaljrader och bevarar formulärvärden. Byte eller stängning avslutar tidigare läsning; sena svar får inte visas för nytt underlag.

Listan flyttar inget ansvar, rättar ingen koppling och växlar inte arbetsyta. Rätt arbetsyta/jobbreferens tas till ansvarets befintliga arbetsflöde; granskad rättning av okända/motsägande äldre kopplingar återstår. Tom eller helt läst lista är inget generellt avvecklingsklartecken.

Ingen ny lagring/formatändring. Backupformat `magnussons-crm-1`, läsar-/skrivargräns v62 och v64:s kontoändringsspärr bevaras. [VALIDATION](VALIDATION.md) redovisar faktiska prov. Full kommersiell/privat/extern avveckling, Sites-åtkomst och personalpilot återstår.

## Historik före v65

# Magnussons CRM – aktuellt produktunderlag

## Minskad kontoåtkomst kräver aktuell produktionskontroll – v64

**Granska kontoändringen** hör till administratörens befintliga kontoformulär. Den behövs när ett aktivt CRM-konto inaktiveras eller en rolländring tar bort någon av kontots befintliga rättigheter för jobb eller hinder. Kontrollen följer verkliga rättigheter, inte bara rollnamnet. Namnbyte och ändringar som behåller dessa rättigheter omfattas inte av den nya produktionsgranskningen.

Kontrollen läser samtliga lagrade arbetsytor. **Jobbansvar** gäller aktuell produktion som är lämnad eller tryckt, kopplad till kontots registrerade användar-ID eller medlems-ID. **Öppet hinderansvar** gäller ett icke-tomt aktuellt hinder med kontots registrerade användar-ID, även på ett skickat jobb. Historiska produktionsrader används inte som aktuellt arbete.

Kvarvarande ansvar spärrar förlusten av de rättigheter som behövs för det arbetet. En okänd eller motsägande aktuell ansvarskoppling i någon arbetsyta spärrar även när den inte säkert kan kopplas till det valda kontot. Felaktig lagring ger inget klartecken. Servern kontrollerar samma konto, underlag och aktuella villkor igen före skrivning. Inga jobb, hinder eller kommersiella ansvar flyttas automatiskt.

Formuläret visar kontoidentitet, ändringen och separata antal per arbetsyta. **Produktionskontrollen tillåter den här ändringen** är ett avgränsat besked om produktionsansvar. Det bekräftar inte full personalavveckling, externa konton eller Sites-åtkomst.

Vid fel bevaras formulärvärdena. **Läs kontots aktuella status** visar nuläget utan att ersätta dem. **Läs in aktuellt konto och ersätt formulärvärden** är ett uttryckligt val. Saknad sparningskvittens stoppar direkt omsändning; bekräftad sparning följd av misslyckad uppdatering visas som sparad med behov av omläsning.

Ingen ny lagring, audit, ledger, massöverföring eller SSO byggs. Exakt upprepning genom ett redan nått slutläge är skild från varaktigt idempotens-/kvittensregister. Backupformatet är fortsatt `magnussons-crm-1`. Minsta kompatibla läsare/skrivare är fortsatt v62; en äldre läsare/skrivare saknar den nya åtkomstspärren. Källkandidat `c56486d42ad289bdbf722b74faab5cb1fafe229e`, träd `84eb44e6918c32e334a102b0880bcaa0751d3d61`. Tidigare kandidatprov är historik och räknas inte som slutkandidatens prov. [Faktisk verifiering](VALIDATION.md) redovisar slutkandidatens prov. Full kommersiell/privat/extern avveckling, Sites-åtkomst och verklig personalpilot återstår.

## Historik före v64

# Magnussons CRM – aktuellt produktunderlag

## Produktionsarbete per konto – v63

**Produktionsarbete per konto** hjälper en administratör att se kvarvarande aktuellt arbete inför överlämning. Inventeringen gäller vald demo- eller verksamhetsarbetsyta och jobb med status lämnad till produktion eller tryckt. Historiska, avslutade och avbrutna jobb ingår inte.

Kontot väljs uttryckligen. **Jobbansvar** och **Öppet hinderansvar** har separata fält och filter; samma jobb kan förekomma i båda ansvarsdelarna. Ett byte av jobbansvar flyttar inte hindrets ansvar eller orderns kommersiella ansvar. **Granska jobbansvar** öppnar v62:s befintliga granskade tilldelning/flytt för ett jobb. **Öppna jobbet** leder till produktionsarbetet.

Servern upplöser registrerade kontoidentiteter. Ett namn eller en säljarprofil blir ingen användaridentitet. Inaktiva konton behåller sina registrerade jobb. Saknade och motsägande kopplingar visas som granskningsbehov; namn används inte för att hitta på en ansvarig. Det nya API-svaret innehåller konto-ID, visningsnamn och roll men inte kontomejl eller råa autentiserings-ID:n.

Inventeringen är läsande. Underlag som ändrats, inte kan kontrolleras eller inte längre får läsas visas inte som aktuella jobb. Antalet före sökfilter hålls skilt från antal träffar och visade jobb. Mängder, acceptanser, korrektur, ansvarshistorik och privata utkast ändras inte av inventeringen.

Källrevision `e0958b8c1ec3880ca9a209339ed23b9e29a450d9`; [verifiering](VALIDATION.md). Ingen ny lagring införs; kompatibilitetsgränsen för befintliga ansvarsfält förblir v62. Ett tomt urval bekräftar varken fullständig personalavveckling eller att kontot kan stängas. Verklig kontoåtkomst och personalpilot återstår.

## Historik före v63

# Magnussons CRM – aktuellt produktunderlag

## Vem håller ihop produktionsjobbet? – v62

**Produktionsansvar** är ett separat ansvar för ett jobb. **Orderansvar** är det kommersiella ansvaret. En administratör kan granska och tilldela eller byta produktionsansvar på ett aktivt jobb som är lämnat till produktion eller tryckt. Historiska, avslutade och avbrutna jobb är inte mål för denna handling. Arbetssättet med **Jag tar jobbet**, **Lämna tillbaka till kön** och registrering av tryck, kassation och leverans finns kvar.

Mottagaren är ett verkligt, aktivt och kopplat CRM-konto med en tillåten produktionsroll: administratör, produktion, tryck eller lager. En säljarprofil och ett produktionskonto är olika identiteter. Kontot väljs tomt från början; namn, roll och konto-ID visas vid granskningen. Namn används inte för att gissa ett konto eller återskapa saknad äldre kontoidentitet.

Jobbets stabila användaridentitet är `assigneeId`; de nya serverägda fälten är `assigneeMemberId` och `assignmentHistory`. Varje ny registrerad ansvarshändelse får en revision och audit med jobb, aktör, tidigare och nytt konto, tid och skäl. En registrerad medlemskoppling kräver sammanhängande, icke-tom audit. Äldre ansvar med användar-ID men okänd medlemskoppling får behålla sitt verkliga underlag; en första ny audit kan därför börja efter revision 1. Den första auditposten får inte hänvisa till en tidigare registrerad medlemskoppling som saknar föregående audit. Vanliga orderändringar bevarar de nya serverägda fälten.

Ett äldre ansvar med namn men utan användar-ID blockeras för den här handlingen. Ingen ny identitet gissas; det kräver separat granskning och återställning av rätt underlag. Denna ändring innehåller ingen färdig återställningsdialog för det fallet. Kontrollerna upptäcker motsägande registrerade kedjor, men kan inte bevisa att varje borttagen historikprefix saknas, exempelvis efter att ett jobb har lämnats. Audit är inte kryptografiskt manipulationssäker.

Den granskade sparningen binder samma jobb och samma kontounderlag som användaren såg. Servern läser kontot igen och kontrollerar det vid den atomiska skrivningen. Ett ändrat jobb eller ett ändrat/inaktiverat konto kräver förnyad granskning. Ett återförsök efter osäker sparning återanvänder den ursprungliga begäran; ett dubbelklick ska inte skapa en andra ansvarshändelse. Faktiska API-handlers med 18 migrerade SQLite-tabeller verifierade sena mål-/aktörskontroller, förnyad aktörsidentitet, relaterad CAS och orelaterad ombasering, dubbelklick, ABA, förlorad kvittens och rollback. Kundgodkänd 50→48, ändrad order 40→45, kassation/delleverans och oberoende kommersiellt/hinderansvar bevaras. 20 korrupta JSON/NDJSON-importer nekas före skrivning; legacy okänd medlem/revision 8 och avbrytning→återinlämning bevaras.

Ansvarsflytten ändrar inte kundgodkännande, orderantal, korrekturversion, priser, marginalkostnader eller bokföring. Den skickar inga mejl, pushnotiser eller meddelanden. Full medarbetaravveckling och kontroll av faktisk kontoåtkomst återstår. Källrevision `d1b47198a3986a20d40006dd249658e302eb5bbf`; datakompatibilitet: Efter att v62 har skrivit de nya member-/historikfälten krävs v62-kompatibel läsare och skrivare. Äldre saknade fält får tomma värden utan namn→konto-gissning. Ingen maskinframtvingad versionsspärr infördes i backupmanifestet.

## Historik före v62

# Magnussons CRM – aktuellt produktunderlag

## Eget ansvar på företagsaktiviteten – v61

Företagsaktiviteten och varje förberedelse är relaterade poster med olika ansvar. Föräldraaktiviteten har additiva `ownerProfileId` och `responsibilityTransfers`. Granskat byte ändrar bara förälderns registrerade ansvar och ansvarshistorik; förberedelser, kundkopplade tidslinjeposter, datum och klarstatus förblir egna uppgifter.

- En inloggad administratör granskar en **planerad** aktivitet. Vanlig kalenderredigering ändrar inte ett registrerat ansvar efter att stabila profiler är initierade.
- Ny aktivitet kräver ett uttryckligt ansvarsalternativ. Servern kopplar den godkända profilen; klienten hittar inte på ett UUID.
- Äldre entydigt namnansvar kan förankras på samma profil. Ett namnbyte bryter inte ett registrerat profil-ID. En historisk källa kan vara inaktiv; mottagaren måste vara aktiv, entydig och operativ.
- Överföringen kräver vald mottagare, orsak och uttrycklig granskning. Servern skapar historik med källa, mottagare, aktör, tid, orsak och typ av åtgärd.
- Genomförda/inställda aktiviteter behåller sitt historiska ansvar. Läsning skapar inget nytt ansvar eller ny historik.
- Kalenderns ordinarie redigering visar befintligt aktivitetsansvar som läsuppgift. Ett äldre privat utkast med avsiktligt ändrat ansvar avvisas i det vanliga kalenderflödet; användaren får uttryckligen välja registrerat aktivitetsansvar och fortfarande jämföra förändrat kalenderunderlag.

Dialogen fryser både aktivitet, förberedelser och visade profilval. Ändrat relevant underlag kräver ny jämförelse och granskning. Osäkert svar innebär inte att gränssnittet påstår en lyckad skrivning. Exakt återförsök använder samma payload; serverns idempotens och CAS avgör om en tidigare åtgärd redan är sparad.

Oberoende källgranskning av exakt sluthead gav `PASS_CODE_REVIEW_NO_BLOCKERS` i åtta områden, med alla 23 ändrade filer och åtta relaterade skyddsfiler bytekontrollerade. `scope/final-code-review-3.json` har SHA-256 `e2fac0bf33c2a409f42f64da7f47a0f3c28b6e1b1ff8a39c1c756f41017d8162`. Läsgranskningen påstår inga egna körda tester; körda domän-/API-/lagringsprov finns i den obligatoriska regressionens och runtimens loggar.

Detta är ett avgränsat steg i B01b2. Det är ingen fullständig automatisk medarbetaröverlämning, avveckling av konton eller flytt av historiska försäljningsresultat. Ingen avisering, kundkommunikation eller extern anslutning tillkommer. Orderintag/fakturerad försäljning och kostnader i marginalen behöver fortfarande följa dokumenterade affärsdefinitioner.

## Historik före v61

# Magnussons CRM – aktuellt produktunderlag

## Förberedelsens ansvar är skilt från aktivitetens – v60

En administratör kan förankra äldre ansvar eller överlämna exakt en öppen eventförberedelse till en aktiv granskad profil. Samma rad får stabilt profil-ID och spårbar ansvarsändring. Granskningen slutför inget arbete, återöppnar ingen genomförd/avbokad aktivitet och flyttar inget kund-/affärs-/orderansvar eller historiskt resultat.

Vanlig redigering och klarmarkering bevarar registrerad identitet/historik. En rad med ansvarshistorik kan inte tas bort som vanlig förberedelseredigering. Ett äldre privat aktivitetsutkast bevaras vid konflikt; efter uttrycklig adoption följer oförändrat äldre ansvarsval den aktuella granskade raden, medan eget ändrat ansvarsval behöver separat granskning. Privatutkastets råa text och arkiverade kropp bevaras; kalenderns publicerade text trimmas enligt befintliga regler. Försäljning mot månads-/årsmål, marginal och nya prospects består; TB är inget huvudmått.

## Historik före v60

## Eget ansvar för kontakten efter leveransen – v59

**Leveransuppföljning** gäller kundkontakt efter registrerat mottagande. Granskat adminbyte omfattar vald öppen uppgift/historik/händelse; kundrelation, affär/order, mottagande, faktura och tidigare resultat ligger kvar. Entydig koppling, registrerat beslut/mottagande och komplett avsändningsunderlag krävs; saknat/motstridigt underlag spärrar byte.

**Följ upp** skiljer faktisk kontakt från försök/intern anteckning. Nästa leveranskontakt behåller exakt delegerat profil-ID och tom egen historik. Känd servernekning bevarar orsak/val; obekräftad sparning kan återförsökas med samma avsikt. Försäljning mot månads-/årsmål, marginal och nya prospects förblir huvudmått; TB är inget huvudmått.

## Historik före v59

## Börja i rätt arbetsvy – v58

Första laddningen visar ett neutralt besked. Vid fel kan användaren välja arbetsyta eller **Försök igen**. Känd identitet/roll öppnar tillåtna arbetsvyer; produktionsroller får sin arbetskö direkt.

Outlook följer arbetsyta/användare/medlem/roll. Avbrott ångrar ingen accepterad serverhandling; privata CRM-utkast behåller sin identitetskoppling. Huvudmått: försäljning mot månads-/årsmål, marginal och nya prospects; TB är inget huvudmått.

## Historik före v58

## Byt uppgiftsansvar, behåll kundrelationsansvaret – v57

Administratören kan överlämna en öppen **Kundavstämning**, **Kommande kundbehov** eller **Prospektkontakt** utan affärskoppling. **Byt uppgiftsansvar** visar uppgiftens nuvarande ansvar och **Kundrelationsansvar · ligger kvar** var för sig. För äldre blank profilkoppling visas **Förankra ansvar** när den verkliga personkopplingen kan granskas; okänd person väljs inte åt användaren.

Läs **Kundplanens underlag · oförändrat vid ansvarsbytet** eller **Prospekteringens underlag · oförändrat vid ansvarsbytet**. Välj **Ansvarig efter ändringen**, skriv **Varför ändras ansvarskopplingen?**, granska och markera **Jag har granskat uppgiftsansvaret**. **Spara nytt uppgiftsansvar** ändrar den befintliga uppgiftens ansvar och registrerar överföringen atomiskt. En förankring har motsvarande uttryckliga spartext. Ingen ny aktivitet skapas av själva överlämningen.

Befintlig uppgift behåller sitt registrerade ansvar när kundplan eller prospektering sparas senare. Ny kanonisk aktivitet använder fortfarande kundrelationsansvarig. Nästaaktivitet från de tre specialkälltyperna utan affärskoppling får källuppgiftens exakt registrerade profil-ID, utan kopierad överföringshistorik. Övriga/manuella Följ upp-källor behåller tidigare beteende; Kommande kundbehov kan fortsatt inte avslutas via Följ upp. Prospektkvalificering och nya affärer använder kundrelationsansvarig.

Kundkontakt, plan/kvalificering, gamla affärer/order/fakturor, mål och historiska resultat flyttas inte. Överlämningen skickar ingen avisering, skapar ingen affär och är inget konto-/Sitesavslut eller full personalavveckling. Försäljning mot månads-/årsmål, marginal och nya prospects består; TB är inget huvudmått.

Orsak/val bevaras vid fel i öppen dialog; hämtning och uttrycklig inläsning av aktuellt underlag skiljs åt och kräver ny granskning. Formuläret har inget privat serverutkast. Minsta kompatibla läsare och skrivare är v57 efter ny direkt specialuppgiftshistorik. [VALIDATION](VALIDATION.md) anger faktiska bevis och gränser.

## Historik före v57


## Återöppna relationen på samma kundkort – v56

Administratören öppnar ett avslutat kundkort och väljer **Återöppna kundrelation**. Dialogen visar kundens tidigare relation och kundrelationsansvarig med profil-ID. Välj en aktiv granskad ansvarig och **Prospekt**, **Aktiv kund** eller **Vilande**, skriv varför relationen återupptas och planera en ny uppföljning med egen beskrivning och datum. Ingen mottagare, relation, aktivitet eller granskning väljs åt användaren.

**Spara återöppnad kundrelation** sparar relation, kundrelationsansvar och en ny uppföljning tillsammans med spårbar historik. Samma kund-ID bevaras. Vid byte av profil registreras en verklig kundansvarsöverföring; samma redan aktiva profil kan behålla ansvaret utan falsk överföring. Aktiv kund kan inte väljas med startad ofullständig onboarding.

**Befintligt öppet arbete behåller sitt ansvar** visar vad som finns kvar. Gamla uppgifter, kundplan, onboarding, årshjul, kvalificeringar, offerter, order, fakturaunderlag, mål och historiska resultat flyttas inte. Senaste kundkontakt ändras inte. En planerad uppföljning är inget påstående om genomförd kontakt eller nytt behov.

Den tidigare tvåstegsvägen via granskad kundansvarsöverföring och vanlig statusredigering finns kvar med sina befintliga rättigheter. Generell historisk affärs-/orderredigering och full personalavveckling ingår inte. Konto/Sitesåtkomst och privata utkast/Outlook är separata. Försäljning mot månads-/årsmål, marginal och nya prospects består; TB är inget huvudmått.

Orsak och val bevaras vid fel i den öppna dialogen. Hämtning och uttrycklig inläsning av aktuellt underlag skiljs åt; nytt underlag eller ändrade fält kräver ny granskning. Formuläret har inget privat serverutkast. [VALIDATION](VALIDATION.md) anger faktisk release och provgränser.

## Historik före v56


## Gör en resultatprofil historisk med granskning – v55

Under **Konton & roller → Överlämna arbete** kan administratören välja profil och öppna **Granska profilavslut**. Dialogen visar fullständigt namn, profil-ID, äldre ansvarskoppling, vald arbetsyta och hela profilens kvarvarande ansvar. Listans sökning/filter räcker inte som avslutsunderlag; servern granskar samtliga ansvarsdelar.

När inget operativt ansvar återstår och minst en annan aktiv profil finns kan administratören ange orsak, granska och välja **Gör profilen historisk i denna arbetsyta**. Profilen blir historisk, dess operativa ansvarskoppling tas bort och avslutet sparas. Identitet, avslutat arbete, historiska resultat, mål och sparad kontolänk ligger kvar. Profilen kan inte väljas för nytt operativt arbete eller återaktiveras via vanlig profilredigering.

Tre skilda besked visas: **Resultatprofil**, **CRM-konto** och **Sidåtkomst**. Profilstatus eller kontolänk innebär inget verifierat besked om all personåtkomst. CRM-konto, andra arbetsytor, produktionens användaransvar, privata utkast/Outlook och Sitesåtkomst hanteras separat. **Profilavslut** är ingen full personalavveckling.

Historiska poster finns kvar för läsning och resultat. Vanliga redigeringsformulär för äldre kund-/affärs-/orderansvar kan nekas efter profilavslut. Generell historikredigering och återöppning ingår inte; ett kommande flöde behöver granska aktivt kundrelationsansvar utan att flytta tidigare försäljning.

Orsak och tidigare underlag bevaras vid fel i den öppna dialogen. Hämtning och uttrycklig inläsning av nytt granskningsunderlag skiljs åt; ny orsak eller nytt underlag kräver ny granskning. Formuläret har inget privat serverutkast. Försäljning mot månads-/årsmål, marginal och nya prospects består; TB är inget huvudmått. [VALIDATION](VALIDATION.md) anger faktisk release och provgränser.

## Historik före v55

## Arbetsöverlämning med synligt personansvar – v54

**Konton & roller → Överlämna arbete** är administratörens samlade inventering. Välj en stabil säljarprofil, även en inaktiv, eller **Ansvar som behöver granskas**. Arbetskategori, lokal sökning, antal och **Visa fler ansvarsposter** visar vad urvalet omfattar. Profilens fulla visningsnamn, äldre ansvarskoppling, profil-ID och kontolänkens närvaro framgår intill väljaren; kontolänken är ingen kontroll av aktuellt inloggningstillstånd.

Varje kort visar kund, arbetsdel, registrerat ansvar, eget datum, status, överföringsgräns och nästa handling. Kundrelationer, affärer, order, uppgifter, möten, onboarding, kundärenden och inköpsbehov kan ha olika ansvar. **Granska** öppnar befintlig objektspecifik överlämning; mottagare, orsak och tillåtna uppgiftsval granskas där. Översikten förankrar eller flyttar inget vid läsning och erbjuder ingen massöverföring.

Öppna specialuppgifter som saknar överlämningsstöd försvinner inte; rätt kundunderlag och förklaring visas. Event/förberedelser har namnansvar och produktionen användaransvar. Historisk försäljning, avslutat arbete, privata utkast och Outlook-data flyttas inte. **Inga poster** innebär aldrig färdig personalavveckling. Konto, profil och nuvarande aliasregel måste hanteras separat. Försäljning mot månads-/årsmål, marginal och nya prospects består; TB är inget huvudmått. [VALIDATION](VALIDATION.md) anger release och provgränser.

## Historik före v54

## Årshjul med eget behovsansvar – v53

**Kunder → Årsplanering → Mina behov** följer inköpsbehovets ansvar även när kunden tillhör någon annan. **Teamets behov**, år, lokal sökning och **Visa även hanterade** ger ett tydligt urval. **Kontakta senast** och **Kundens leveransbehov** är olika datum. Full kund-/behovstext visas med en separat **Öppna kundkort**-knapp. **Följ upp → Hantera inköpsbehovet** öppnar samma kunds kompakta planering, även för ett framtida behov som nu har en annan ansvarig.

Efter profilinitiering väljs en aktiv profil uttryckligen för ett nytt behov. Befintligt ansvar, även ett äldre tomt profil-ID eller en känd inaktiv profil, bevaras vid vanlig innehållsredigering. Läsning förankrar ingen person automatiskt. Administratören använder **Förankra behovsansvar** eller **Byt behovsansvar** för ett planerat behov, väljer aktiv mottagare och endast de tillåtna öppna årshjulsuppgifter som ska följa med. Inget mål eller uppgiftsval är förvalt. Orsak och granskning krävs. Kundrelation, tidigare affär, andra arbetsflöden och historiska resultat behåller sina ansvar.

Vid ändrat redigeringsunderlag finns innehållsförslaget kvar. **Hämta aktuellt underlag** läser utan att byta formulärets version. **Läs in nytt underlag** läser om sparat ansvar, historik och affärskoppling men behåller innehållsförslaget för jämförelse/granskning före sparning. Behovsformuläret och överlämningen är ännu inte privata serverutkast; kopiera text före omladdning.

Återkomst behåller samma föränderliga behovs-ID, ansvar och historia. Nya påminnelser kopierar behovets exakt registrerade profil-ID, även tomt/inaktivt. Ny affär kräver aktivt granskat behovsansvar efter profilinitiering; tidigare affärer flyttas inte av en senare behovsöverlämning. Ett behov innebär ingen kundacceptans. Försäljning mot månads-/årsmål, marginal och nya prospects består. [VALIDATION](VALIDATION.md) anger faktisk release och provgränser.

### Historik: v52 – Kundärenden med eget ansvar

**Kundvård → Kundrelationer** följer kundansvaret. **Mina kundärenden** följer ärendets stabila ansvar, även för en kund vars relation tillhör någon annan. **Alla ansvariga** visar teamets ärenden. Äldre tomma profil-ID:n använder registrerat ärendeansvar för urval; läsning förankrar ingen person automatiskt. **Öppna kundärendet** leder till ärendets fält i samma privata kundplan.

Administratören förankrar eller byter ett öppet ärendes ansvar med aktiv målprofil, orsak och granskning. Välj uttryckligen vilka tillåtna öppna ärendeuppgifter som ska följa med; ingen är förvald. Övriga uppgifter, kund-, affärs-, order-, onboarding-, mötes- och årshjulsansvar samt historiska resultat bevaras. Ett tidigare ägarlöst ärende får sitt första ansvar genom ett uttryckligt aktivt profilval när det sparas som öppet.

Kundplanens privata uppgifter ligger kvar vid ansvarsändringen. Ett gammalt utkast kräver uttrycklig jämförelse och adoption av aktuellt underlag; endast ärendets ansvar, profil-ID och ansvarshistoria uppdateras. Ärendets text/status och alla övriga privata fält bevaras. Löst och återöppnat ärende delar samma föränderliga plats i kundplanen; separata oföränderliga tickets ingår inte.

Försäljning mot månads-/årsmål, marginal och nya prospects består. [VALIDATION](VALIDATION.md) anger faktisk kod, main, publicering och provgränser; [OPERATIONS](OPERATIONS.md) beskriver överlämning och återgång.

### Historik: v51 – Onboarding med eget ansvar

Onboarding får en egen stabil ansvarig säljarprofil. Administratören förankrar äldre ansvar eller byter ansvar med orsak, granskning och uttryckligt valda öppna onboardinguppgifter. Ingen uppgift är förvald. Kund-, affärs-, order- och resultatansvar behålls. Den personliga vyn **Nya kunder** följer onboardingansvaret; äldre tomma ID:n använder befintligt ansvar för visning.

Checklistan och överlämningen har olika handlingar. Säljaren fortsätter sin privata checklista; administratören granskar ansvarsändring och valda uppgifter separat. Förlorat svar eller samtidiga ändringar ger besked med bevarad orsak och möjliga val. Avslutad onboarding behåller historik; löpande kundvård följer separat kundansvar.

Månads-/årsförsäljning mot mål, marginal och nya prospects består. Inga affärsdefinitioner, kostnader, konton eller kundgodkännanden har antagits. [VALIDATION](VALIDATION.md) anger kod/main/live, prov och begränsningar.

V47-underlaget nedan gör Kundregister responsivt med verklig nästa aktivitet och en separat avstämning. V46:s Min dag-förbättringar består. Tidigare granskade kund-, uppgifts-, affärs-, order- och mötesöverlämningar består. [STATUS](STATUS-2026-10-05.md), [VALIDATION](VALIDATION.md) och [OPERATIONS](OPERATIONS.md) anger faktisk källa, main, live och kompatibilitet.




## Kundval på korta skärmar – v50

Kundväljaren får full text, egen **Öppna kundkort**/**Välj kund**-knapp och en rullningsyta för korta skärmar.

Månads-/årsförsäljning, marginal och nya prospects förblir huvudmåtten. [VALIDATION](VALIDATION.md) anger faktisk leverans och provgränser; observerad personalacceptans återstår.


## Historik: Fortsätt i den valda arbetsytan – v49

Arbetsytebytet får en tydlig fokusstart; desktopheadern växer med texten.

Månads-/årsförsäljning, marginal och nya prospects förblir huvudmåtten. Ansvar, kontakt, privata utkast och affärsdefinitioner består. [VALIDATION](VALIDATION.md) anger kod/main/live/gränser; personalprov återstår.


## Historik: Fortsätt efter stängt kundkort – v48

V48 återför fokus efter användarens stängning av kundkortet till samma öppningskontroll, eller till vyns namngivna rubrik om kontrollen saknas. Bakgrundsladdning och navigation flyttar inte fokus genom denna funktion. Arbetsytebytets separata fokuslucka och observerad personalpilot kvarstår.

Samma kund-ID, konto/roll, arbetsyta och vy krävs för återgång. Sparning och kundansvarsöverlämning behåller sina stängningsspärrar. Kundkontakt, privat sparning, ansvar och resultat förändras inte.

V48 är publicerad på samma Site; [VALIDATION](VALIDATION.md) anger källa, main, live och faktiska prov. Försäljning mot månads-/årsmål, marginal och nya prospects förblir huvudmåtten.


## Historik: Hitta kund och nästa arbete – v47

Kundregistret visar fullständigt kundnamn och kontaktperson, kundansvarig, nästa verkliga öppna uppgift eller planerade CRM-möte och en separat nästa avstämning. Raderna staplas på mobil och använder flera kolumner när utrymmet finns. **Öppna kundkort** är en egen svensk knapp med minst 44 px höjd; det långa namnet ligger utanför knappen så även en kort skärm kan visa hela den fokuserade kontrollen. Samma kund-ID, befintliga sök-/ansvarsfilter, ordning och kundkort används.

Nästa aktivitet beräknas endast från redan registrerade öppna uppgifter och CRM-möten med status planerat för samma kund. Tidigast datum/tid visas; en uppgift med endast förfallodatum kommer före ett tidsatt möte samma dag. Avslutade uppgifter samt genomförda/avbokade möten räknas inte. **Ingen öppen uppgift eller planerat CRM-möte** beskriver det som faktiskt saknas i CRM, inte kollegornas Outlook. **Nästa avstämning** är kundens separata plan; passerat datum och idag visas i text och skapar ingen uppgift eller kundkontakt.

Ett uttryckligt profil-ID med matchande ursprunglig ansvarskoppling ger profilens aktuella namn. Sammanfallande namn särskiljs med den ursprungliga kopplingen. Ett äldre tomt ID, en felaktig koppling eller en inaktiv profil får ett synligt besked; namn/alias används inte för att hitta på en ID-koppling. Läsningen ändrar inget ansvar. Ett tomt sökurval skiljs från ett tomt kundregister. Läsaren får ingen knapp för att skapa kund. Knappen öppnar befintligt kundkort; den avslutar ingen aktivitet och öppnar inget nytt mötesflöde.

Fem slutkontroller och 17 lokala browserfall passerar på slutkandidat `418531aa80e359ece524352a22a26a6cbc571e8d`; app-PR #68 är sammanslagen till app-main `6102c4eb2b47913a303ba03da6ffdd1e9f807f6b` med gröna exakt-head/main-checks. Sites v47 är publicerad 2026-10-07 08:52:19 UTC från verifierad source `b3118e0671a1967e90c14f3e2d9fd46893b05452`. Riktiga konto-/personalprov återstår.

Fokusåtergång när kundkortet stängs, fokus efter arbetsytebyte och faktisk personalpilot återstår. Försäljning mot månads-/årsmål, marginal och nya prospects är huvudmåtten; denna listpresentation ändrar inga affärsdefinitioner eller mått. [DESIGN](DESIGN.md) beskriver riktningen och [VALIDATION](VALIDATION.md) faktisk verifiering.

## Historik: Läsbar Min dag med större text – v46

Den privata sparstatusen kan brytas på flera rader, fokusetikettens text kan krympa och radbrytas bredvid sin ikon, och långa ord i tomma paneler bryts inom panelen. Det rättar klippningen av privat sparstatus och tom kontakttext samt fokusetikettens överbredd utan att förkorta statusmeddelanden eller dölja text. Min dags knappar i privat sparstatus, exempelvis återförsök, ryms och kan radbrytas inom sin yta med minst 44 px höjd. Den höjdgränsen gäller dessa knappar, inte alla CRM-kontroller. Befintliga färger, ikoner, kundsammanhang och primära handlingar används fortsatt.

Privat utkaststatus och gemensam CRM-inlämning är fortsatt skilda besked. En läsbar status betyder det befintliga faktiska utfallet; den räknas inte som genomförd kundkontakt. Försenat, dagens möten, uppföljning och kunder att kontakta behåller sina handlingar och ansvar. Fem slutkontroller och 29 lokala browserfall passerar på slutkandidat `04dfa5cd`; app-PR #66 är sammanslagen till main `acc744d1` med gröna exakt-head/main-checks. Sites v46 är publicerad 2026-10-07 07:45:58 UTC från verifierad source `c8c922b3`. Riktiga konto-/personalprov återstår.

Mobilkundlista, fokus efter arbetsytebyte och faktisk personalpilot återstår. [DESIGN](DESIGN.md) beskriver riktningen och [VALIDATION](VALIDATION.md) den avgränsade verifieringen.

## Historik: Stabilt mötesansvar med granskad överlämning – v45

På ett planerat möte i Min dag eller **Kalender → Kundmöten i CRM** kan administratören välja **Byt mötesansvar** eller **Förankra mötesansvar**. Målvalet börjar tomt. Välj aktiv granskad profil, ange orsak och granska vilket möte och vilken person ändringen gäller. Äldre tomt ID kan förankras hos samma aktiva profil; okänd äldre person gissas inte. En granskad inaktiv person kan lämna över till aktiv ansvarig.

Egen mötesvy följer profilens UUID för kopplade möten. Visningen använder aktuellt namn och särskiljer sammanfallande namn med den ursprungliga ansvarskopplingen. Äldre tomma kopplingar behåller sitt tidigare etiketturval med synligt förankringsbehov; läsning byter eller migrerar inget ansvar.

Ansvar och serverägd möteshistoria sparas tillsammans med fryst underlag, CAS och request-ID-skydd. Historien visar tidigare faktiskt lagrat ID, granskad från-/tillprofil, namn-/ansvarssnapshots, orsak, autentiserad aktör och tid. Efter profilinitiering är befintliga generella mötesformulärs ansvar skrivskyddat; nyregistrering behåller aktiv profilväljare. Oförändrat ansvar vid vanlig redigering/avslut behåller tidigare ID, även blankt eller inaktivt.

Överlämningen ändrar bara det valda mötets ansvar. Mötestid, status, plats och anteckningar ligger kvar. Kund-, affärs-, order- och tidigare uppgiftsansvar samt historiskt försäljningsresultat bevaras; privata utkast/Outlook delas eller flyttas inte. Ingen Microsoft-inbjudan skickas. När mötet markeras genomfört och en ny automatisk uppföljningsuppgift skapas får den exakt mötets profil-ID, även blankt, och egen tom uppgiftshistoria. Detta omfördelar inga tidigare uppgifter.

Funktionen gäller aktuell status planerat. Befintligt återöppnande från genomfört till planerat finns kvar; detta är inget nytt oföränderligt möteslivscykelskydd. Ett möte som nu är genomfört eller avbokat kan inte överlämnas genom ansvarshandlingen.

**Hämta aktuellt underlag** bevarar den öppna granskningens tidigare version. **Läs in nytt granskningsunderlag** är det uttryckliga versionsvalet och kräver ny granskning. Fel bevarar lokal orsak/val medan dialogen är öppen. Kopiera orsaken före omladdning: formuläret är inget varaktigt privat serverutkast. Gamla generiska privata mötesutkast är separata sparade underlag och kan behöva granskning av Ansvarskoppling/Ansvarshistorik med råvärden/kopiering kvar.

Fem slutkontroller, isolerad runtime/restore och 31 browserfall plus en faktisk HTTP-sekvens passerar på kandidat `de76cb0f`. App-PR #64 är sammanslagen till main `308d9e1`; exakt-head/main-CI är gröna. Sites **v45 är publicerad 2026-10-07 06:42:46 UTC** från verifierad source `b4ea99ee`. Anonym startsida och CRM-API gav 401/401; autentiserad live-UI och riktiga konto-/personalprov återstår. Dokumentationsleveransen är separat och återpublicerar inte appen.

V44 är inte en säker skrivande återgång efter att nya mötesfält registrerats. Ett faktiskt isolerat prov körde v44:s MeetingSchema från exakt basrevision `bba8a1e5d156e858d2bb208c97ef0bb0e017a3c7` på syntetiskt underlag: både ownerProfileId och responsibilityTransfers strippades. Kvitto `/workspace/scratch/crm45/contract/v44-parser-rollback-proof.json`, SHA256 `34c71f4acb00feea6e30fde45b2a033b804cd1bf44377019f2f7f13740cfc828`. Behåll v45-modellen/serverreglerna genom schemabevarande framåträttning eller verifierad datamedveten återställning. Tidigare Task-/kund-/kommersiella återgångsgränser består. Ingen faktisk live-rollback eller hostingåterställning har utförts.

B01b2 är delvis levererat. Specialflödesansvar/full personalavveckling, B07:s tidigare textklippning, separat chefsroll, verklig personalpilot och driftsåterställning kvarstår. Utvecklingsprov ger inga riktiga konto-/integrationsgarantier.

## Historik: Granskad uppgiftsöverlämning – v44, 2026-10-07

Detta avsnitt beskriver den då publicerade v44. Uppgiftsfunktionerna består; mötesansvar och aktuella käll-/driftkvitton beskrivs i v45 ovan.

I Min dag kan administratören byta ansvar för en öppen fristående kunduppgift utan att samtidigt byta kundansvar. **Byt uppgiftsansvar** visas för kopplat ansvar; **Förankra ansvar** hjälper när uppgiften fortfarande har äldre tomt profil-ID. Välj en aktiv granskad person, ange orsak och granska uppgift, kund och ansvar före sparning. Val av samma person kan förankra den äldre kopplingen. Okänd äldre person gissas inte.

Även uppgifter längre än sju dagar framåt går att nå under den från början stängda gruppen **Senare planerade uppgifter**. Gruppen återanvänder vanliga uppgiftsrader och samma ansvarshandlingar; dagens och kommande sju dagars grupper behålls. Urvalet följer vald egen/teamvy.

Handlingen gäller manual/care/meeting_followup utan affärskoppling. Affärs-/orderåtaganden och särskilda kundflöden behåller sina avsedda överlämningar; avslutade uppgifter behåller historiskt ansvar. Vanliga **Följ upp** används fortsatt för anteckning, kontaktresultat, avslut och nästa steg. Ett ansvarsbyte är en egen avsikt och ändrar inget av detta.

Uppgiftens serverägda historia visar granskad tidigare/ny person, orsak, aktör och tid. Befintliga kund-/affärs-/orderöverlämningar sparar matchande uppgiftshistoria tillsammans med sin egen historia. Tidigare parenthistorik står kvar efter en senare tillåten uppgiftsöverlämning. Nästa Följ upp-uppgift får egen tom historia med bevarat ansvar. Generella befintliga uppgiftsformulär har efter profilinitiering skrivskyddat ansvar; nya uppgifter behåller ansvarsväljaren. För avslutade uppgifter förklarar formuläret att historiskt ansvar ligger kvar.

Transportfel och ändrat underlag bevarar lokala val i öppen dialog. **Hämta aktuellt underlag** ersätter inte granskningen; välj uttryckligt **Läs in nytt granskningsunderlag** och granska igen. Dialogen sparas inte som ett privat serverutkast: kopiera orsak före omladdning. Privata utkast eller kundmejl flyttas inte till den nya ansvariga.

V43 är inte en säker skrivande återgång efter att ny uppgiftshistoria registrerats. Ett faktiskt isolerat prov körde v43:s TaskSchema från basrevisionen på syntetiskt underlag: ownerProfileId bevarades men responsibilityTransfers strippades. Kvitto `/workspace/scratch/crm44/contract/v43-parser-rollback-proof.json`, SHA256 `774079eb8d3b7137d3ea8802b1aebd4a6ff71c82569385b31d41733038ca8b39`. V42:s äldre ID-risk består. Behåll ny modell/serverregler genom schemabevarande framåträttning eller verifierad datamedveten återställning; ingen faktisk live-rollback eller hostingåterställning har utförts.

Fem obligatoriska slutkontroller, isolerad runtime/restore och 30 browserfall plus en faktisk HTTP-sekvens passerar på fryst kandidat `1980a3d`. Sites **v44 är publicerad 2026-10-07 05:48:20 UTC** från verifierad source `e2bfc7c`; app-main `6cb366c` och både exakt-head/main-CI är gröna. Anonym startsida och CRM-API gav 401/401; autentiserad live-UI och riktiga konto-/personalprov återstår. Dokumentationsleveransen är separat och återpublicerar inte appen. [VALIDATION](VALIDATION.md) anger provgränsen. B01b2:s mötes-/specialflöden och full personalavveckling, B07:s tidigare stora-text-fynd, riktig personalpilot och driftsåterställning kvarstår.

## Historik: Stabilt uppgiftsansvar – v43, 2026-10-07

Detta avsnitt beskriver v43 vid publiceringen 04:46:17 UTC. V44-avsnittet ovan gäller nu: befintliga generella Task-formulär får efter profilinitiering inte byta ansvar; den granskade överlämningen används i stället. Nyregistrering behåller ansvarsväljaren.

`Task.ownerProfileId` förankrar uppgiftens ansvar i en säljarprofil; `Task.id` är dess redan befintliga post-ID. Efter granskad profilinitiering väljer servern en aktiv granskad profil vid nyregistrering eller uttryckligt ansvarsbyte i befintligt generellt uppgiftsformulär. Före initieringen tillåts tomt ansvarsprofil-ID. Befintligt oförändrat ansvar med tomt profil-ID förblir tomt, även vid redigering/avslut för en inaktiv eller ej längre listad ansvarig. Läsning förankrar inga äldre uppgifts- eller källposter.

Nya automatiska uppgifter använder ett medfört ansvarsprofil-ID eller ett relevant kund-/affärs-/order-ID med matchande ansvar; annars kan en redan granskad profils oföränderliga ansvarsetikett ge kopplingen. Inaktiva profiler får följa med från underlaget utan att stoppa orderarbete. Endast helt omappat ansvar förblir tomt. Befintliga kund-/affärs-/orderöverlämningars avsedda uppgifter får målprofilens ID atomiskt inom deras befintliga historik. Receipt-GET är striktare: den projicerar exakt orderns profil-ID eller tomma värde, utan aliasupplösning eller skrivning.

Min dags ID-kopplade egna uppgifter och uppgiftssignaler filtreras på profil-UUID; äldre tomma uppgifter behåller befintligt etiketturval. Visningen använder aktuellt profilnamn, ursprunglig ansvarsetikett vid samma visningsnamn och **ansvar behöver förankras** för äldre ansvar utan profil-ID efter initiering, även om ansvarsetiketten redan matchar en granskad profil. Order-/leveransköernas övriga urval är oförändrat. Vanliga uppgiftsrader öppnar befintligt **Följ upp**; ingen ny separat uppgiftsöverlämningsdialog, publik redigeringsingång eller auditmodell införs.

Äldre privata underlag kan kräva uttrycklig granskning av **Ansvarskoppling** med texten bevarad. [OPERATIONS](OPERATIONS.md) förklarar detta och återgångsgränsen; [VALIDATION](VALIDATION.md) kvitterar 14 browserfall plus fem HTTP-fall, tekniska kontroller och kod/main/live. Sites v43 är faktiskt publicerad; exakt källa/main/live och provgränser finns i VALIDATION.

B07 har observerad kvarvarande 200-procentsklippning i befintlig utkaststatus, fokustagg och tom kontaktvy. Slutproven med fördubblad text avser ändrade uppgiftsetiketter, rader/knappar, scopeknappar och dokumentbredd, inte hela Min dag eller WCAG. Kod-/hashjämförelsen mot v42 visar oförändrade berörda områden; den är inget separat byggt v42-runtimeprov.

B01b2 är fortsatt delvis levererat: uttryckligt granskad fristående uppgiftsöverlämning, återstående mötes-/specialflödesansvar och full personalavveckling återstår. Historiskt försäljningsresultat, privat kommunikation och fysisk produktionshistorik bevaras. Separat affärschefsroll, övriga privata specialdialoger, mobilkundlista/workspacefokus, separat backup, hostingbudget/återställning, riktiga integrationer och personalpilot kvarstår.

## Stabilt kundansvar – v42

Kundansvar får en stabil profilkoppling. Efter granskad profilinitiering sätter servern `ownerProfileId` för nya kunder, kundimport och omvandling av företagsleads mot en aktiv granskad säljarprofil. Befintliga kunder med tomt ansvarsprofil-ID fylls inte automatiskt vid läsning eller vanlig redigering. På kundkortet kan administratören välja **Byt kundansvar**, välja en annan aktiv profil, ange orsak och uttryckligen välja vilka öppna fristående aktiviteter som ska följa med. Ny profil och uppgiftsval börjar tomma; granskningen måste bekräftas före överföring.

`Customer.ownerProfileId` är ett additivt fält med tomt standardvärde för äldre poster. En godkänd administrativ kundöverlämning förankrar ansvaret i profilens oföränderliga UUID. Servern kontrollerar ansvarshistoriens profilkedja och att kundens slutliga ansvar stämmer med den senaste överföringen. Kundansvar, valda uppgifter och serverägd historia sparas tillsammans med fryst underlag, CAS och befintligt request-ID-skydd. Generella formulär/import kan inte ändra befintligt ID eller skriva egen överföringshistoria. Att hämta aktuella uppgifter ersätter inte öppningens underlag; ett ändrat underlag kräver ett uttryckligt nytt val och ny granskning. Orsak och val bevaras vid fel; en förlorad kvittens kan följa efter en lyckad skrivning. Dialogens identitet omfattar arbetsyta, användar-ID, medlems-ID och serverroll. Hämtning av aktuell state lämnar ett läs-/åtkomstfel vid fel; ett misslyckat svar behandlas inte som nytt granskningsunderlag.

Detta är ytterligare en avgränsad B01b2-del, inte full personalöverlämning. Befintliga omappade kunder får inget gissat ansvarsprofil-ID från namn eller mejl. Endast uttryckligt valda öppna fristående aktiviteter med kundens tidigare ansvar kan följa med; uppgifternas ansvariga får inga nya profil-ID:n i denna leverans. Kund- och uppgiftsposternas befintliga stabila ID:n ändras inte. Affärer, order, möten, onboarding, kundvårdsärenden och årshjul behåller sitt separata ansvar. Historiska fakturor, vunna affärers ansvar, prospectattribution och mål flyttas inte. Produktionsanspråk, registrerade mängder, revisioner och kundgodkännanden bevaras. Säljar-, läsar- och produktionsroller får ingen ny administrativ eller privat åtkomst. Ingen integration, kundacceptans, faktura eller utskick skapas.

Kundens ansvarsprofil-ID lagras additivt i befintlig JSON; ingen SQL-migrering krävs. Äldre exporter kan läsas med tomt standardvärde, och vanlig läsning/skrivning fyller inte implicit i gamla tomma ansvarsprofil-ID:n på befintliga kunder. **V41 är inte en säker skrivande rollback** efter registrering av det nya kundfältet: dess äldre kundschema kan strippa `ownerProfileId` vid nästa skrivning. V40 saknar dessutom senare kommersiella ID-/historikfält. Behåll den nya modellen, serverreglerna och kompatibel klient genom en schemabevarande framåträttning eller verifierad datamedveten återställningsväg. Ingen faktisk live-rollback eller hostingåterställning har genomförts. CRM-backup bevarar kundens profil-ID och ansvarshistoria men aktuella kontolänkar rensas i målmiljön och måste väljas uttryckligt igen. Privata utkast, konton och Outlook ingår fortfarande inte.

Nästa avgränsning: **Stabilt uppgiftsansvar med profil-ID och granskad personalöverlämning som bevarar historiska försäljningsresultat och privat kommunikation**. Full B01b2, profil-ID för ansvariga på uppgifter, möten och specialflöden samt komplett personalavveckling, separat affärschefsroll, övriga privata specialdialoger, mobilkundlista/fokus efter arbetsytebyte, separat utkast-/konto-/Outlookbackup, hostingbudget/återställningsrutin, faktiska integrationer och personalpilot kvarstår.

## Stabilt öppet affärs- och orderansvar – v41

Administratören kan välja **Byt affärsansvar** för en öppen affär som varken är vunnen/förlorad eller har en order, och **Byt orderansvar** för en order som ännu inte är uppföljd. Välj en annan aktiv, granskad säljarprofil, ange orsak och granska överlämningen. Nödvändiga öppna affärs-/orderåtaganden följer alltid med; valfria kopplade aktiviteter väljs uttryckligen och är inte valda från början. Valet av ny ansvarig börjar tomt.

Överföringen förankrar affärens eller orderns ansvar i ett stabilt `ownerProfileId`. Serverägd historia bevarar gamla/nya profil-ID:n, namn-/ansvarssnapshots, berörda uppgifter, orsak, tid och autentiserad aktör. Ansvar, valda uppgifter och historik skrivs tillsammans med fryst underlag, CAS och befintligt request-ID-skydd. Föråldrat underlag kräver ny granskning; generella formulär/import får inte kringgå det kontrollerade ansvarsbytet eller skriva egen överföringshistorik. Ett fel eller obekräftat svar bevarar orsak och val; första försöket kan redan ha lyckats.

Detta är en avgränsad B01b2-del. Kundansvar, historiska fakturor, vunna affärers ansvar, prospectattribution och mål flyttas inte. Produktionsanspråk, registrerade mängder, revisioner och kundgodkännanden bevaras. Befintliga tomma ansvar-ID:n migreras inte automatiskt från namn eller mejl. Stabilt ID används efter uttrycklig granskning och underlag; hela kund-/uppgifts-/mötes-/specialflödesmigreringen och personalavveckling är inte genomförda. Säljar-, läsar- och produktionsroller får ingen ny administrativ eller privat åtkomst. Ingen integration, kundacceptans, faktura eller utskick skapas.

Additiva ID-/historikfält lagras i befintliga JSON-poster; ingen SQL-migrering krävs. Äldre exporter kan läsas med tomma standardvärden för de nya fälten. Det gör **inte v40 till en säker skrivande rollback**: dess äldre scheman kan strippa nya ansvar-ID:n och historik vid nästa skrivning. Behåll den nya modellen, serverreglerna och kompatibel klient genom en schemabevarande framåträttning eller verifierad datamedveten återställningsväg. Ingen faktisk live-rollback eller hostingåterställning har genomförts. CRM-backup bevarar kommersiella ID:n/historik men aktuella kontolänkar rensas i målmiljön och måste väljas uttryckligt igen. Privata utkast, konton och Outlook ingår fortfarande inte.

Nästa avgränsning: **B01b2:s återstående operativa ID-migrering och granskade personalöverlämning med bevarad historisk attribution**. Full B01b2, separat affärschefsroll, övriga privata specialdialoger, mobilkundlista/fokus efter arbetsytebyte, separat utkast-/konto-/Outlookbackup, hostingbudget/återställningsrutin, faktiska integrationer och personalpilot kvarstår.

## Mobil navigation – v40

Mobilens menyknapp (**Öppna meny**) öppnar panelen **Meny** med synlig **Stäng** överst. Hela menyn har egen vertikal rullning under stängningsraden, så även de sista arbetsområdena och **Inställningar** i säljarbetsytan går att nå på korta skärmar. Val av ett arbetsområde stänger panelen; den valda sidan visas i den vanliga arbetsytan. Stäng/Escape återför fokus till den verkliga öppnaren, med menyknappen som reservmål när öppnaren försvunnit. Fokusåtergång använder `preventScroll` för att bevara sidans rullningsläge. Tangentbordets Tab/Shift+Tab stannar i den öppna modala panelen.

Ctrl/Cmd+B öppnar inte mobilmenyn när en annan modal dialog är öppen. När viewporten går över till desktopbredd stängs den mobila panelen; den återöppnas inte automatiskt när skärmen blir smal igen. Desktopens befintliga menyval och tangentbordsväxel behålls. Breda, korta skärmar använder den befintliga sidmenyn i sidans layout. Vid minst 768 px bredd och högst 540 px höjd får hela den menyn egen vertikal rullning; header, val och footer ligger i samma rullningsyta. Menyns val pressas därmed inte ihop till en smal remsa mellan header och footer. Den vanliga höga desktoplayouten behålls. I mobilpanelen och den breda, korta sidmenyn får svenska menyval, företagsnamn och profiltext radbrytas inom sin yta. Magnussons symbol får en innehållsanpassad box när texten förstoras; menyknapparnas höjd växer med texten och är minst 44 px.

Detta är en avgränsad navigeringsändring. API, CRM- och utkastprovider, serverroller, privata utkastformat, SQL/schema, localStorage-nycklar, CAS, atomiska skrivningar och idempotens ändras inte. Ingen ny integration, kontakt, kundacceptans eller fakturering införs. B05 och B01b2 förblir öppna.

[VALIDATION](VALIDATION.md) redovisar faktiska prov och gränser. Nästa avgränsning: **B01b2: stabil ansvarig för öppna affärer och order, med granskad överföring och bevarat historiskt resultat**. B01b2:s stabila kommersiella ansvar, övriga specialdialoger, fokus efter arbetsytebyte, mobilkundlista, separat utkast-/konto-/Outlookbackup, hostingbudget/återställning och personalpilot kvarstår.

## Företagsaktiviteter – v39

Säljare och administratörer kan planera en företagsaktivitet som ett eget privat utkast och fortsätta från **Min dag** eller **Mina privata aktivitetsutkast** i företagskalendern. Rubrik, rå text med radbrytningar/mellanslag, ofärdiga datum, ansvar, status och alla förberedelser bevaras privat; ursprungligt kalenderunderlag följer samma utkast. **Spara utkast & stäng** väntar på privat sparning. **Spara i företagskalendern** är ett separat uttryckligt val: aktiviteten uppdateras och exakt den sparade privata revisionen avslutas atomiskt. Privat autosparning ändrar inte teamets kalender.

En annan enhets privata version och en ändrad gemensam aktivitet är olika konflikter. Hela underlaget visas före val; jämförelse och en versionsbunden markerad bekräftelse krävs. Ändrade uppgifter ogiltigförklarar valet. Nytt granskat kalenderunderlag kan väljas med egna råvärden kvar, men en borttagen aktivitet återbildas inte tyst. Oförändrat CRM-återförsök efter förlorad kvittens behåller värden, originalbasis, privat revision och begärans-ID; ledgern kan återspela första framgång.

Misslyckad privat sparning behåller panelen och full kopierbar text. **Stäng och behåll på denna enhet** kräver återläsning av samma lokala reservkopia; det är ingen bekräftad serversparning eller driftbackup och skyddar inte mot rensad enhetslagring. **Ta bort privat utkast** är ett separat bekräftat val och tar inte bort en gemensam kalenderaktivitet. Efter förlorad arkivkvittens kan en enda commit redan ha lyckats; exakt arkiveringsreplay eller automatisk lokal rensning utlovas inte.

Befintlig utkasttyp `form` med context `company_event` används med ett nytt strikt kuvert. SQL, enumvärden och privat localStorage-nyckel är oförändrade. Ägare/arbetsyta, serverroller, CAS, atomiska skrivningar och idempotens består; privata utkast delas inte med andra användare. Kalenderinbjudningar skickas inte. B05 är bara delvis levererad.

Tidigare arbetsflöden från v38 och äldre behålls nedan.

## Syfte och dagligt arbete

Egna privata artikelutkast kan öppnas från Min dag och katalogen även efter ändring till säljarroll. Lokala väntande/felande uppgifter kan läsas och kopieras. **Hämta sparad serverversion** gör läsning utan att ersätta dem. Jämförelse, markerad bekräftelse och **Använd den visade serverversionen** krävs före lokalt versionsbyte; ändrat underlag ogiltigförklarar valet. **Arkivera sparat privat utkast** är en separat handling för en giltig, redan sparad egen version. Säljaren får inga nya rättigheter att redigera eller publicera artiklar.

**Stäng och behåll på den här enheten** kräver faktisk återläsning av samma lokala reservkopia. Det är ingen bekräftad serversparning eller driftbackup. Saknad, felaktig eller redan arkiverad serverversion får inte väljas som ett aktivt sparat utkast; det öppna underlaget bevaras för kopiering.

SQL, enumvärden, lagringsformat och privat localStorage-nyckel är oförändrade. Serverroller, privat ägare/arbetsyta, CAS, atomisk artikelpublicering och CRM-idempotens består. Privat arkivering ändrar inga kundorder, priser eller kundgodkännanden. B05 är inte slutförd.

Om serverunderlaget har ändrats kan arkivering nekas med 403 av identisk-data-spärren eller med 409 av revisionskontrollen. Ingen ny arkivering görs då; hämta och granska igen. Efter en förlorad arkivkvittens kan en enda commit redan ha lyckats och GET visa ett avslutat utkast. Den lokalt valda råversionen bevaras; ingen ny bekräftad arkivering, exakt arkiveringsreplay eller automatisk rensning av den lokala kopian utlovas. Se [VALIDATION](VALIDATION.md) för faktiska prov.

Nästa avgränsning: **Privata företagsevent med bevarat ursprungligt underlag och separat CRM-inlämning efter isolerad bristreproduktion**. Företagsevent använder lokal useState/stängning utan useDrafts enligt kodgranskning; separat browserförlustprov ska göras innan sådan förlust påstås. Global sidebaröverlagring vid 390×360 är ett separat observerat navigeringsfel och är inte rättat här; jämför äldre byggd runtime innan det kallas tidigare befintligt. B01b2, övriga specialdialoger, mobilkundlista/fokus, separat konto-/utkast-/Outlookbackup, hostingåterställning och personalpilot kvarstår.

### Historik: produktläget i v37

Sedan **publicerad v37** kan administratören skriva artikeluppgifter som ett privat utkast och fortsätta från Min dag. Bekräftad privat sparning bevarar även ofärdiga fält, källa, variant, pris/kostnad och ursprunglig artikelversion. **Spara utkast & stäng** behåller arbetet; **Spara artikel i CRM** uppdaterar artikelregistret och avslutar exakt det sparade utkastet tillsammans. Kollegans ändring eller en annan enhets sparversion kräver uttrycklig granskning. Ett nytt utkast får inte tyst skriva över en artikel med samma källa, artikelnummer och variant.

Artikelredigering/publicering är administratörsarbete. Den som senare har säljarroll kan läsa/kopiera eget sparat underlag och ta bort en identisk, redan serverbekräftad version, utan rätt att redigera eller publicera. Felaktigt underlag bevaras för återhämtning. Utkastet ändrar inga kundorder, avtalade priser, fakturor eller kundgodkännanden; produktanslutningar och marginalkostnader fastställs inte genom sparningen. Arkivering med säljarroll gäller bara ett oförändrat, redan serverbekräftat eget artikelutkast. Om lokala ändringar väntar på sparning eller har sparfel när rollen ändras till säljare bevaras de, men servern nekar skrivning med 403 och arkivering kan inte slutföras genom att skriva de lokala ändringarna. Hela privata kuvertet kan läsas/kopieras i förhandsvisningen. Denna begränsning är inte ett färdigt rollbytesflöde; säker hantering och uttryckligt val av den sparade serverversionen är nästa avgränsning. [VALIDATION](VALIDATION.md) redovisar exakt verifiering och gränser. Nästa avgränsning: **Säker läsning/kopiering och uttryckligt val av sparad serverversion vid rollbyte från administratör till säljare med lokala ändringar som väntar på sparning eller har sparfel**. Identisk, redan sparad egen serverversion kan arkiveras. Väntande/felande lokala värden bevaras och kan kopieras men nekas skrivning; säkert val av sparad serverversion vid rollbyte återstår. Därefter privata företagsevent: company-calendar har lokal useState/stängning utan useDrafts enligt kodgranskning, inte ett separat browserförlustprov. B05:s övriga specialdialoger, B01b2, mobilkundlista/fokus, driftbudget, separat konto-/utkastbackup, hostingåterställning och personalpilot kvarstår.

Sedan **publicerad v36** visar väljaren för leveransutkast och Min dag vad leveransutkastet handlar om innan det öppnas. Sammanfattningen följer mottagande eller leveransproblem. **Visa alla utkastuppgifter** visar alla fem fält, även de som hör till det andra läget, i full längd. Sekundprecision och stabil utkastreferens hjälper när titlar/tider sammanfaller; referensen finns även under **Valt privat utkast** efter valet. **Ändrat** kan vara en lokal ändring och ersätter ingen bekräftad privat sparstatus. Att läsa innehållet registrerar ingen leverans. Felaktigt utkast får en tydlig fallback utan påhittat innehåll. [VALIDATION](VALIDATION.md) anger vad som faktiskt provats; personalpilot och driftåterställning återstår.

Sedan **v35** kan säljare/admin spara leveransdialogen privat och fortsätta från Min dag. Valet mottagande/problem, alla fem fält och öppningens leveransunderlag följer med; även ofullständiga fält får sparas. Den privata sparstatusen skiljs från resultatet av CRM-inlämning. Stängning väntar på privat serversparning, och misslyckat försök behåller texten. Kollegans ändrade leveransunderlag och en annan enhets privata utkastrevision visas som olika konflikter. En granskning registrerar ingen leverans; ett uttryckligen valt aktuellt underlag kan sparas i det privata utkastet.

Bekräfta mottagen leverans eller spara leveransbevakning är fortfarande separata, uttryckliga CRM-handlingar. Servern kontrollerar originalunderlag, roll och exakt privat revision; godkänd leveransändring arkiverar det utkastet i samma transaktion. Begärans-ID bevaras vid oförändrat återförsök efter förlorad kvittens. Privat sparning är ingen kundacceptans, faktisk kontakt, mängdändring eller fakturering. 16 unika isolerade browserfall samt obligatoriska kontroller passerar. [VALIDATION](VALIDATION.md) anger provgränserna. Företagsevent och övriga specialdialoger återstår.

**Historiskt v34-beteende:** Dialogen behåller mottagningsdatum, mottagare, anteckning, problemtext och nästa kontrolldatum, även i det inaktiva läget. Granska aktuell leverans visar sparat besked, ansvar, kontrolluppgifter, avsändningsdatum, mängder, leveransbevis och produktionshinder. Uttrycklig jämförelse krävs före Använd detta underlag och behåll min text. Granskning/adoption gör ingen POST. Ett synkront lås spärrar fält, dubbelklick och stängning under väntan. Bestående feltext och lokal fokusväg finns. Radbrytning är rättad även med förstorad mobiltext.

**Historiskt v33-beteende:** Artikelpanelen erbjuder Fortsätt redigera eller Kasta formulärets ändringar när osparade uppgifter annars skulle försvinna. Fortsätt behåller text och ursprungligt underlag. Kassering skickar inget till CRM och återställer ingen möjlig tidigare sparning; varningen förklarar att artikeln redan kan ha sparats. Väntspärren består. Lokal fokusåtergång och framrullning omfattar artikelpanelen och dess bekräftelse. Då återstod varaktigt privat artikelutkast, omladdningsåterupptagning och granskning av toastens visuella överlapp.

Sedan **publicerad v32** samlar Följ upp privat utkaststatus, CRM-besked och sparning inför stängning vid handlingarna. Privat utkast sparat betyder inte att CRM uppdaterats. Ett tidigare obekräftat CRM-/stängningsförsök och full servertext ligger kvar även efter autosparning. Misslyckad flush behåller dialogen; Försök spara utkast & stäng återförsöker uttryckligt. Visa besked/Granska fokuserar rätt detaljer efter eget val, och samma native fokuserade kontroll scrollas vid behov fram inom dialogen utan refokus eller skrivning. **22/22 isolerade slutbrowserfall**, obligatoriska kontroller och exakt-head/main-CI passerar; [VALIDATION](VALIDATION.md) skiljer källa/main/live och provgränser. Inga nya lagrings-/roll-/CAS-/request-ID-regler eller verkliga anslutningar införs. V32 inkluderar artikelpendingfixen från PR #34; dess tidigare v31-publiceringsfel är historik.

Historiskt v31-underlag: artikelkod på main `a9341c3` låser redigering, artikelbyte och stängning under sparning. Fel bevarar öppna värden; framgång stänger panelen. Lokala besked skiljer väntan från obekräftat resultat. **13/13 isolerade corebrowserfall** och obligatoriska kontroller/exakt-head/main-CI passerar, men **sparad v31 saknar bekräftad lyckad publicering: Sites-deploy failed Unauthorized**. [VALIDATION](VALIDATION.md) anger belägg och publiceringshindret. Ingen privat artikelautosparning eller omladdningsåterupptagning tillkommer; stängning när busy är över kan fortfarande kasta osparad lokaltext. Mobiltoastens visuella överlapp är separat arbete.

Sedan **publicerad v30** bevarar Följ upp även utkast utan anteckning. Du kan ändra kontaktresultat, datum, avslut och nästa steg, spara privat och fortsätta efter omladdning. Spara utkast & stäng, X/Escape och dialogens offert-/kundflödesvägar kräver lyckad privat sparning. Även ett orört redan skapat utkast behålls tills det kasseras uttryckligt. Privat sparning avslutar ingen CRM-uppgift eller kundkontakt; CRM-inlämning kräver fortfarande giltig anteckning och nästa steg där reglerna kräver det. Följ upp-knapparna radbryts och ryms även i kort mobilvy med fördubblad text. **28/28 isolerade browserfall**, obligatoriska kontroller och exakt-head/main-CI passerar på publicerad source `6883f97`; [VALIDATION](VALIDATION.md) skiljer kod, main, live och provgränser. I v30-kvittensen återstod specialdialogstatus, artikelutkast, idle-stängning och toastöverlapp. Aktuell artikelstängning beskrivs i den senaste leveransen.

Sedan v29 samlar generella formulär privat sparstatus och besked från CRM-/stängningsförsök vid handlingsknapparna. Privat utkast sparat betyder inte att CRM har uppdaterats. Fullständiga besked och befintliga konfliktval nås med Visa besked/Granska; texten bevaras när ett försök misslyckas. Inställningar har ingen privat autosparning och reader behåller läsbehörighet. **V29 är faktiskt publicerad** från `1ca6f2b` efter grön exakt-head/main-CI, obligatoriska kontroller och 23/23 isolerade browserfall. [VALIDATION](VALIDATION.md) skiljer source/main/live och provgränser. Andra specialdialoger, fokusåtergång/mobilkundlista och personalpilot återstår.

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

## Levererat sedan v19: privata kundflöden

Kundplan, bearbetning och onboarding får privata serverutkast med återupptagning från Min dag. Ofärdiga uppgifter kan sparas utan att ändra kundens gemensamma CRM. Ursprungligt kundunderlag följer med; en ny global version ersätter det inte tyst. Kundkonflikter och en annan enhets utkastrevision visas separat och texten bevaras. Återupptagning avmarkerar dagens kundavstämning, som måste bekräftas uttryckligen igen.

Explicit sparning i CRM använder exakt utkastversion och arkiverar den atomiskt. Onboardingavslut och affärsskapande kräver egna handlingar. Företagsevent och övriga specialdialogers serverutkast återstår. Verifieringen finns i [VALIDATION.md](VALIDATION.md); B05a levererades i v19 och finns kvar i v22.

## Levererat sedan v19: tydligare kundkort

Kundkortets översikt grupperar nästa aktivitet, kontaktplan, order/leverans och tidslinje med tydliga rubriker och lokal sektionsnavigation. Försenad, dagens och kommande aktivitet visar status i text tillsammans med datum och ansvarig. Anteckningar benämns som anteckningar i historiken. Magnussons befintliga visuella uttryck och befintliga uppföljnings-/orderhandlingar behålls.

[DESIGN.md](DESIGN.md) ger gemensamma principer för fortsatt gränssnittsarbete med inspiration från Saleshub och Lime. Läs- och säljhandlingar skiljs åt för relevanta roller. Faktiska browser-/slutkontroller och kandidatens publiceringsläge redovisas i VALIDATION och PR-kvittensen; designkandidaten är ingen redan genomförd personalpilot eller ansluten integration.

Slutprovet för D01 upptäckte också en kalenderdagsgräns: produktionsavsändningens tidpunkt måste jämföras i Europe/Stockholm för att mottagande inte ska kunna registreras på dagen före svensk avsändning. Korrigeringen ändrar inga datum i sparat underlag och uppfinner inget kundmottagande.


## Levererat i v23: synlig status vid privat kundarbete

Kundplan, bearbetning och onboarding får en kompakt statusyta som följer med när användaren rullar formuläret. Den skiljer privat utkast från kundens gemensamma CRM och återanvänder befintlig serversparning och återförsök. Feltext och versionsval får plats i normalt flöde; en knapp flyttar fokus till rätt besked utan att kasta texten. Ett misslyckat onboardingavslut återförsöks med samma avslutsavsikt.

Detta är levererat i v23 för de tre kundflödena. Exakt serverfel ligger kvar utan en duplicerad toast över sparknappen. I kort mobilvy rullas de nedersta handlingarna fram; en lång textarea behöver fortsatt scroll. Generella kund-/orderformulär, övriga specialdialoger och personalprov återstår. VALIDATION kvitterar 26/26 browserfall, 6/6 tangentbordsfall, grön exakt-head/main-CI och faktisk publicering; proven använder syntetiska data och lokal lagring.


## Levererat i v24: rätt handlingar i Kundvård

Återköp och Merförsäljning visas för säljare/administratörer enligt det redan befintliga canEdit-villkoret. Reader kan läsa kundkort, historik och antalet öppna affärer och erbjuds inte de två formuläringångarna. Säljarens återköpsväljare och nya merförsäljningsaffär behåller sina tidigare flöden; inga serverrättigheter ändras. VALIDATION kvitterar 9/9 lokala roll-/navigeringsfall, 5/5 komponentfall och faktisk v24-publicering. Generella affärsformulärets mobilbredd med långt kundnamn och footerklippning var vid v24 fortfarande felaktiga, exakt oförändrade mot v23; de rättades i PR #22/v25. Detta är inget konto-/personalprov eller godkännande av hela mobilupplevelsen.


## Generella formulär på mobil – v25

Kund-, affärs-, order-, aktivitets-, mötes-, antecknings- och inställningsformulär håller långa värden och befintlig privat sparstatus inom sin bredd. Mobilen har en kolumn; text och knappar får radbrytas. Lång textarea använder befintliga rader och intern scroll. Aktiva generella fält rullas bara vid behov till fri yta efter den verkliga footerhöjden, utan refokus eller sparning.

Privata utkast, konflikter, serverroller och godkännanden behåller sina regler. Kundkortets läsvy, privata workflow-dialoger och workorder/OrderGuide får inte denna markör eller helper. Leveransen inför ingen ny sparstatusfunktion; samlade fel-/återförsöksflöden återstår. Slutprov, publicerad källa och verklig v25-deploy redovisas i VALIDATION; lokal browser är inget personal- eller livekontoprov.

## Generella privata utkast: tydlig inläsning och återförsök – v26

Laddning, feltext och Försök igen syns nu i stödda generella formulär även före ett läst privat record. Vid nätverks-/sparfel behålls öppna uppgifter; efter lyckat återförsök kan privat utkast återupptas med senaste text. Tab-fokus på utkastets statusknappar rullar dem fritt från verklig footer på den provade ytan.

Detta är en avgränsad presentation/fokusförbättring. Ingen provider-/CAS-/request-ID-/roll-/lagringsändring och ingen automatisk CRM-skrivning eller påhittad kundacceptans. Rent formulär/settings/reader får ingen falsk privat sparbekräftelse. VALIDATION skiljer10/10 isolerade browserfall, full regression/runtime och faktisk v26-publicering från personal-, telefon-, konto- och hostingåterställningsprov. Samlad/sticky status och hjälpmedelsannonsering kvarstår.

## Privat utkaststatus i generella formulär – v27

Generella privata formulärutkast har en bestående textregion med role=status, aria-live=polite och aria-atomic=true. Laddning, väntande, sparning, fel och konflikt uppdateras utan fokusflytt. Tidsstämpel och återförsöks-/versionsknappar ligger utanför regionen. Ett rent formulär har en tom visuellt dold region, utan extra layoutavstånd eller falskt Sparat. Övriga DraftStatus-konsumenter behåller tidigare DOM och beteende. Kund, affär, uppgift, möte och generisk order är browserprovade; generisk note-createUI ingår inte i dessa prov. Inställningar och läsare får inga nya privata skrivningar.

13/13 nya isolerade Worker/Chromiumfall och obligatoriska kontroller passerar, med faktisk privat CAS409 och oförändrade shared-data. Publicerad källa `1a7e8417446a3d1ce3ea0873219f7627e614df8c` och app-main `7288f82a43c90f33f51d5911381bcc0a4badc0ee` har samma träd. Se STATUS/VALIDATION för exakt deploy och gränser. Samlad/sticky privat+CRM-status och faktisk skärmläsar-/personalacceptans återstår.

## Kundkontakt efter mottagen leverans – v28

Kontaktuppgiften efter bekräftad mottagen leverans använder befintligt Följ upp: anteckning, faktiskt kontaktresultat, avslut/omplanering och nästa steg tillsammans. Ett kontaktförsök utan svar eller internt arbete blir ingen kundkontakt. Orderns mottagande, faktura och historiska ansvar samt kundens plan, onboarding och nästa avstämningsdatum behålls. Operativa godkännanden har fortfarande egna handlingar.

V28 är publicerad från `317b640e6d41b9e73dca0200f8208d0a5732701f`. Obligatoriska kontroller, exakt PR-head-/app-main-CI och 16/16 isolerade browserfall är gröna. [VALIDATION](VALIDATION.md) kvitterar källa, main, artefakt och lyckad deploy separat. Ingen ny anslutning, kundacceptans eller personalpilot följer av denna avgränsning.
