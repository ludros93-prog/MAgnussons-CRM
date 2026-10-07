# Magnussons CRM – aktuellt produktunderlag

Publicerad v44 ger administratören granskad fristående uppgiftsöverlämning/förankring från Min dag och serverägd uppgiftshistoria. Senare planerade uppgifter är nåbara och gamla oförankrade ansvar behålls för uttrycklig granskning. V42:s kundansvar och V41:s affärs-/orderansvar består med matchande uppgiftshistoria i nya överlämningar. [STATUS](STATUS-2026-10-05.md), [VALIDATION](VALIDATION.md) och [OPERATIONS](OPERATIONS.md) anger faktisk källa, main, live och återställningsgränser.

## Granskad uppgiftsöverlämning – v44

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
