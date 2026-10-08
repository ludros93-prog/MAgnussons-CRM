# Magnussons CRM – order, tryck och lager

## Tilldela eller byta produktionsansvar – v62

Produktionsansvarig håller ihop nästa steg i jobbet. Orderansvarig behåller kund- och affärsansvaret.

1. Öppna det aktuella jobbet i produktionskön. Administratören kan även gå till **Tryck & leverans → Gemensam kö → Öppna jobb**.
2. Läs **Produktionsansvar** och **Orderansvar · ligger kvar**. Välj **Tilldela produktionsansvar** om jobbet saknar ansvarig, annars **Byt produktionsansvar**.
3. Välj **Produktionsansvarig efter ändringen**. Kontrollera namn, roll och konto-ID, särskilt om två konton har samma namn.
4. Skriv **Varför ändras produktionsansvaret?** Läs vem som tar över och jobbets registrerade underlag. Antal, tryck, kassation, leveranser, instruktioner och korrektur följer jobbet.
5. Markera **Jag har granskat produktionsansvaret** och välj **Spara produktionsansvar**. Använd sedan det sparade ansvaret och jobbets ansvarshistorik för att se utfallet.
6. Om underlaget har ändrats: välj **Hämta aktuellt underlag**, läs ändringen och välj uttryckligen **Läs in nytt granskningsunderlag**. Dina val och skäl bevaras, men måste granskas igen. Vid osäker sparning följer du dialogens återförsöksväg; systemet visar inte ett säkert resultat innan det är känt.

Vill du stänga med osparade val får du välja **Fortsätt redigera** eller **Stäng utan att spara**. Byte av inloggad användare eller arbetsyta avslutar denna lokala granskning. Det är inte ett sparat privat utkast.

Tilldelningen gäller ett jobb och ändrar inte mängder eller kundacceptans. Produktionsrollen kan fortfarande hjälpa till att registrera arbetet enligt sina befintliga rättigheter. Kontot måste ha tilldelad åtkomst för att personen ska kunna använda CRM; ett ansvarsbyte är ingen ny inbjudan eller verifierad inloggning.

Tekniskt belägg för källrevision `d1b47198a3986a20d40006dd249658e302eb5bbf`: Det frysta bygget kördes i lokal Cloudflare workerd med persistenta isolerade D1/R2-bindningar. Verkliga HTTP-flöden verifierade kontoval, roller, dubbelklick/exakt återförsök och oförändrade positiva privata/Outlook-/filsentineler. Full NDJSON-återställning läste tillbaka tre filer på 13 500 000 byte, filhashar/versioner/länkar samt produktionsaudit. Åtta semantiskt korrupta strömmar med korrekt checksumma nekades atomiskt. Detta är lokal runtime, inte full hosted återställning. 33/33 browserfall passerade på exakt slutbygge: båda adminingångarna, 320/390/1280px, CSS-text 2×, native tangentbord/fokus, stängningsval, faktisk 403/409, uttrycklig återinläsning, dubbelklick och tappad/felaktig kvittens efter riktig skrivning, kontobyte/arbetsytebyte samt fem andra roller. Syntetiskt underlag skapades med 90 faktiska POST200 och tio kontoavläsningar. Råa 18 tabeller och R2 samt 321 källfiler/97 buildfiler kontrollerades före/efter; egna testprocesser, lagring och portar är stängda. Browserrapport SHA-256 `49647981b62e0ca112309be58d79d749b3c6b515582f216a88af7b258b95cb9f`. Faktiska API-handlers med 18 migrerade SQLite-tabeller verifierade sena mål-/aktörskontroller, förnyad aktörsidentitet, relaterad CAS och orelaterad ombasering, dubbelklick, ABA, förlorad kvittens och rollback. Kundgodkänd 50→48, ändrad order 40→45, kassation/delleverans och oberoende kommersiellt/hinderansvar bevaras. 20 korrupta JSON/NDJSON-importer nekas före skrivning; legacy okänd medlem/revision 8 och avbrytning→återinlämning bevaras. Datakompatibilitet och återställningsväg beskrivs i [RUNBOOK](agent/RUNBOOK.md). Faktisk oförändrad v61-kod kördes i elva prov: sju läs-/exportvägar tappar nya fält i returnerat underlag; två restorevägar och vanlig orderskrivning tappar dem i faktiskt sparade SQLite-rader; en äldre kontroll är kompatibel. Exakt kopierad v62 återläste JSON/NDJSON med audit och användar-/member-ID bevarade, endast fil-ID remappades för tre filer (138 byte). Tre privata råformat klarade save/read/replay och främmande konto-/Outlook-/fildata bevarades. Alla 321 nya/316 äldre källfiler jämfördes mot faktisk Git-källa. Separat gammal hosted Worker och live-rollback är inte provade.

## Historik före v62

# Magnussons CRM – order, tryck och lager

## Granska och ändra en företagsaktivitets ansvar – v61

Aktivitetens ansvar och en förberedelses ansvar visas separat. Förberedelserna ligger kvar hos sina ansvariga när aktivitetens ansvar ändras. En genomförd eller inställd aktivitet visar historiskt ansvar och har ingen sådan ändringsåtgärd.

1. Öppna den planerade aktiviteten i kalendern, eller **Granska** i inventeringen av medarbetarens arbete.
2. Välj **Byt aktivitetsansvar**. För äldre namnansvar heter handlingen **Granska aktivitetens ansvar**, och dialogen kan visa **Förankra aktivitetens ansvar**.
3. Läs **Aktivitetens nuvarande ansvar** samt **Förberedelsernas ansvar · ligger kvar**. Utveckla förberedelserna när du behöver granska deras egna ansvar, datum och klarstatus.
4. Välj uttryckligen **Aktivitetsansvarig efter ändringen**. Valet börjar tomt. Skriv varför aktiviteten ska byta ansvar och markera **Jag har granskat aktivitetsansvaret**.
5. Välj **Spara aktivitetens ansvar**, eller **Spara förankrat aktivitetsansvar**. Synlig sparstatus skiljer på pågående, avvisat, konflikter och bekräftat resultat.

Ändrat kalender-/profilunderlag behöver läsas in och jämföras. Att hämta underlaget betyder inte att det ersätter det redan granskade underlaget; användaren väljer uttryckligen att granska det aktuella. Egen orsak och fortsatt giltigt mottagarval bevaras, medan granskningsrutan måste markeras på nytt.

Ett osäkert svar är ett osäkert resultat. Samma åtgärd kan återförsökas utan att klienten uppfinner en ny överföring. Pågående sparning låser dialogen. Att stänga ett ändrat osparat formulär visar att texten inte är ett sparat privat utkast och erbjuder uttrycklig stängning eller fortsatt arbete. Fokus återgår till öppnaren eller en logisk efterföljare när den finns kvar.

I vanlig aktivitetredigering är **Aktivitetens ansvar** läsbart när stabila profiler är initierade. Om ett äldre privat utkast innehåller eget ändrat ansvar finns **Använd registrerat aktivitetsansvar**. Valet ändrar bara det privata underlaget; ett nytt kalenderunderlag behöver fortfarande jämföras separat före delad sparning. Utkastets ursprungliga innehåll finns i förhandsgranskningen med tydliga aktivitets-/förberedelserubriker.

Slutkandidatens byggda Worker kördes isolerat med faktisk HTTP och syntetisk D1/R2-adapter. Samtliga 15 nya aktivitetsflaggor och 13 befintliga förberedelseflaggor passerade, inklusive verklig roll-/kontospärr, parent-/förberedelse-CAS 409, atomisk rollback vid ledgerfel, dubbelklick och exakt återförsök efter förlorad svarskropp. JSON och NDJSON återlästes med 18 råtabeller, tre filer och 13 500 000 filbyte; ett integritetsgiltigt men felrefererat underlag avvisades atomiskt. Regressionen bevarar mängdfallen 40→45 med förnyad acceptans, 50→48 med granskat godkännande, kassation och delleverans. Inga riktiga order skrevs. `runtime/final-runtime-3.json` och checks-app-3:s faktiska loggar är beläggen; hosted återställning är inte verifierad.

Slutlig lokal Chromium-körning på exakt 7056a62/träd eb83c76 gav `PASS_FINAL_BROWSER` i 23 skilda fall. Matrisen omfattar 320×360, 390×844 och 1280×900 med normal och exakt CSS 2×-text, tangentbord/fokus, 44px-kontroller, fryst underlag, båda öppningsvägarna, faktisk 403/409, förlorad svarskropp, dubbelklick, explicit legacy-förankring, två äldre privata format och stängd historik. 29 byggda HTTP-anrop konstruerade underlaget; positiva privata/Outlook-/R2-data och 18 råtabellers övriga poster bytekontrollerades före/efter. Alla egna previewprocesser och temporär lagring städades. `browser/final-074521/report.json` har SHA-256 `e904a4aa6077a1a9d01c1467ed18301025b10ba30239f701d0cdbd6d710e7a13`.

Ingen kund-/medarbetaravisering skickas av ansvarsåtgärden. Den bekräftar inte verklig inloggning, externa anslutningar eller accepterad ordermängd.

## Historik före v61

# Magnussons CRM – order, tryck och lager

## Överlämna en eventförberedelse – v60

1. Admin: öppna **Företagets aktiviteter** och välj **Granska förberedelsens ansvar**/**Byt förberedelseansvar** på vald öppen rad. **Överlämna arbete** öppnar samma granskning. En öppen förberedelse efter genomförd/avbokad aktivitet kan granskas utan att aktiviteten återöppnas.
2. Läs **Förberedelsens nuvarande ansvar** och **Aktivitetens ansvar · ligger kvar**. Öppna **Aktivitetens planering · ligger kvar** för det frysta underlaget. Denna handling byter inte den övergripande aktivitetens namnansvar.
3. Välj aktiv ansvarig, skriv varför och markera granskningen. **Spara förberedelsens ansvar** överlämnar raden; **Spara förankrat ansvar** kopplar uttryckligen samma äldre person till sin profil. Okänd/motsägande personkoppling ska inte gissas.
4. Vid konflikt/nekning: behåll öppen text, välj **Hämta aktuellt underlag**, sedan **Läs in nytt granskningsunderlag**, och granska igen. Hämtning ersätter inte det tidigare underlaget. Obekräftad sparning kan ha lyckats; återförsök samma oförändrade avsikt eller läs in/granska nytt underlag.
5. **Redigera aktivitet** och kryssrutan för klart arbete bevarar ansvarshistoriken. Äldre privata aktivitetsutkast kan behöva **Granska aktuell aktivitet** och **Använd aktuellt underlag och behåll mina uppgifter**. Din planeringstext ligger kvar; eget ändrat ansvarsval publiceras inte som ett ogranskat byte.

Ansvarsgranskningens orsak/val är inget privat serverutkast; **Stäng utan att spara** kasserar lokal text efter uttryckligt val. Kalenderredigeraren har separat privat utkastflöde. [RUNBOOK](agent/RUNBOOK.md) anger v60:s data-/återgångsgräns. Ingen kalenderinbjudan eller avisering skickas av ansvarsbytet.

## Historik före v60

## Överlämna leveransuppföljningen – v59

1. Admin: **Byt uppgiftsansvar**/**Förankra ansvar** på öppen **Leveransuppföljning** i **Min dag**, eller **Granska leveranskontaktens ansvar** i **Överlämna arbete**.
2. Läs skilda uppgifts-/kundrelationsansvar och **Leverans & kontakt · oförändrat vid ansvarsbytet**: orderansvar, kontaktvägar och registrerat mottagande. Dialogen skapar inget mottagande/kundgodkännande; saknat/tvetydigt underlag spärrar byte.
3. Välj aktiv ansvarig, ange orsak, granska och välj **Spara nytt uppgiftsansvar**/**Spara förankrat ansvar**.
4. Vid ändrat underlag/känt nekat försök: läs beskedet, **Hämta aktuellt underlag**, **Läs in nytt granskningsunderlag**, granska igen. Hämtning ersätter inte tidigare underlag; orsak och fortsatt giltiga val bevaras.
5. Obekräftad sparning kan ha lyckats: återförsök samma oförändrade avsikt eller hämta/läs in/granska. Nytt mål är en ny avsikt.

Formuläret är inget privat serverutkast; kopiera orsaken före reload. [RUNBOOK](agent/RUNBOOK.md) anger v59:s data-/återgångsgräns.

## Historik före v59

## Kom igång och återförsök laddningen – v58

1. Kontrollera **Arbetsyta** i startvyn. Arbetsmenyn väntar på känd roll.
2. Vid fel: läs beskedet och välj **Försök igen** eller rätt arbetsyta.
3. Tillåtna arbetsvyer öppnas när användaren är känd. Tryck/lager får sitt arbetsflöde direkt.
4. Outlook följer den tillåtna live-identiteten. Gamla svar fyller inte nästa identitets vy; avbrott ångrar ingen redan accepterad serverhandling.

Microsoft-kontoprov, full personalavveckling och privat backup återstår. [RUNBOOK](agent/RUNBOOK.md) kräver fortsatt v57-kompatibel läsare/skrivare.

## Historik före v58

## Överlämna en kundavstämning, ett kundbehov eller en prospektkontakt – v57

1. Logga in som administratör och öppna den befintliga öppna uppgiften i **Min dag** eller via **Konton & roller → Överlämna arbete**. Välj **Byt uppgiftsansvar**. De nya specialtyperna måste sakna affärskoppling. Kontrollera kund, aktivitetstyp, fullständiga ansvariga/profil-ID och arbetsyta. Okänd eller motsägande personkoppling ska inte gissas.
2. Läs **Uppgiftens nuvarande ansvar** och **Kundrelationsansvar · ligger kvar**. Öppna vid behov det läsande kundplan-/prospekteringsunderlaget. Överlämningen gäller denna aktivitet; hela relationen eller planens ansvar byts inte här. Prospektkontakt kräver ett kvarvarande relevant prospekt utan omvandlad affär. Kommande kundbehov kräver ett sparat behov och datum.
3. Välj **Ansvarig efter ändringen** bland tillgängliga aktiva granskade profiler och skriv **Varför ändras ansvarskopplingen?**. För blank äldre ansvarskoppling kan **Förankra ansvar** kräva uttryckligt val av den faktiskt matchande profilen. Välj inte ett namn enbart därför att det liknar äldre text.
4. Läs **Granska ändringen**, markera **Jag har granskat uppgiftsansvaret** och välj **Spara nytt uppgiftsansvar** eller den särskilda förankringsknappen. Servern sparar uppgiftsansvar och historik tillsammans. Själva överlämningen skapar eller avslutar ingen uppgift och registrerar ingen genomförd kundkontakt.
5. Vid konflikt: behåll öppen orsak, välj **Hämta aktuellt underlag**, sedan **Läs in nytt granskningsunderlag** och granska igen. Ett inte längre tillgängligt mål töms; ingen ersättare väljs automatiskt. Hämtning är läsning och ändrar inte ditt frysta granskningsunderlag före uttrycklig inläsning.
6. Kontrollera faktiskt sparbesked och **Tidigare ansvarsändringar**. Vanligt plan-/prospektsparande bevarar denna uppgifts ansvar. Ett tappat svar kan redan ha registrerat ändringen; stängning återställer inte servern. **Stäng utan att spara** kasserar lokal osparad text efter uttryckligt val. Formuläret har inget privat serverutkast.

**Följ upp** har kvar sitt befintliga kundkontakt-/nästaaktivitetflöde. Kommande kundbehov kan inte klarmarkeras där. De tre specialkälltyperna utan affärskoppling bevarar sitt exakt registrerade profil-ID för en ny nästaaktivitet; andra/manuella källtyper följer tidigare regler. Ny kanonisk kundaktivitet, senare kvalificering och ny affär utgår fortsatt från kundrelationsansvarig.

Konto, sidåtkomst, privata utkast/Outlook, andra arbetsytor och produktionens användaransvar hanteras separat. Event/checklistor och leverans-/okända uppgifter får ingen ny generell överföringsväg genom detta arbete. Flytta inte historiskt resultat för att få tom ansvarskö.

**Återgång:** efter en direkt överföring av de tre specialtyperna krävs v57-kompatibel **läsare och skrivare**. Äldre oförändrad v56 kan även avvisa laddning/export/restore. Oförändrade databasfält/SQL gör inte äldre app säker. Behåll v57-kompatibel korrigering eller utför en faktiskt verifierad full återställning med plan för senare arbete; [RUNBOOK](agent/RUNBOOK.md) och [VALIDATION](VALIDATION.md) beskriver provmiljö och begränsningar.

## Historik före v57


## Återöppna en avslutad kundrelation – v56

1. Logga in som administratör och öppna det befintliga avslutade kundkortet. Välj **Återöppna kundrelation**. Kontrollera samma kund och fullständiga kundnamn, tidigare kundrelationsansvarig, profil-ID och arbetsyta; skapa inget nytt kundkort för återöppningen. Servern behåller kundens befintliga ID.
2. Välj **Ny kundrelationsansvarig** bland tillgängliga aktiva granskade profiler. Samma redan aktiva profil kan behålla ansvaret. Ett historiskt eller oklart tidigare ansvar ska inte gissas; dialogens servergranskning visar om ansvarskopplingen först behöver hanteras.
3. Välj **Relation efter återöppningen**: Prospekt, Aktiv kund eller Vilande utifrån faktiskt underlag. Profilens aktiva status är inget kundbehov. Startad ofullständig onboarding måste vara klar för valet Aktiv kund; återöppningen ändrar inte checklistan.
4. Skriv **Varför återöppnas kundrelationen?**, beskriv vad den nya uppföljningen ska göra och välj ett giltigt datum idag eller senare. Läs **Befintligt öppet arbete behåller sitt ansvar**. Uppföljningen blir en ny uppgift; tidigare aktiviteter flyttas eller avslutas inte.
5. Granska sammanfattningen: status, ansvarig, orsak, ny aktivitet och det arbete/resultat som bevaras. Markera granskningen och välj **Spara återöppnad kundrelation**. Servern sparar delarna atomiskt och registrerar den faktiska återöppningen.
6. Vid konflikt: behåll öppen text, välj **Hämta aktuellt underlag**, sedan **Läs in nytt granskningsunderlag**. Granska igen; ingen ny ansvarig väljs automatiskt om den tidigare inte längre är tillgänglig. Ändrade fält tömmer granskningen. Vid tappat svar kan en tidigare sparning redan vara registrerad; stängning återställer inte servern.

Den befintliga tvåstegsvägen finns kvar: granska kundansvarsbyte, därefter ändra kundrelationens status i dess vanliga formulär. V56 lägger till den samlade adminvägen; vanliga roller får ingen ny generell återöppningsregel. V55:s skydd för avslutade resultatprofiler består.

Tidigare försäljning, kvalificeringar, mål, affärer/order och gamla aktiviteter behåller sina ansvariga. Konto, sidåtkomst, privata utkast/Outlook och andra arbetsytor ändras inte. Formuläret har inget privat serverutkast; kopiera nödvändig text före omladdning eller stängning utan sparning. Generell historisk affärs-/orderredigering och full personalavveckling är fortfarande separata arbeten.

**Återgång:** v56 inför inget nytt lagringsfält eller SQL. V55-kompatibel app är fortsatt minsta säkra skrivare efter profilavslutshistorik; äldre oförändrad v54 är fortsatt osäker. [RUNBOOK](agent/RUNBOOK.md) och [VALIDATION](VALIDATION.md) anger faktiskt prövad kompatibilitet/återställning och dess miljö.

## Historik före v56


## Granska och avsluta en resultatprofil – v55

1. Logga in som administratör. Öppna **Konton & roller → Överlämna arbete** och välj den stabila säljarprofilen. Kontrollera namn, profil-ID, äldre ansvarskoppling och arbetsyta.
2. Använd befintliga granskade överlämningar för kvarvarande arbete. Öppna sedan **Granska profilavslut**. Dialogen granskar hela profilens operativa underlag; kategori, sökning och antal synliga kort påverkar inte kontrollen.
3. Läs alla blockerare och deras kund-/postunderlag. Öppna specialuppgifter och eventförberedelser som saknar granskad överföring måste fortfarande hanteras i sina egna befintliga flöden. Avsluta inget arbete utan faktiskt underlag för dess status. Minst en annan aktiv granskad profil måste finnas kvar.
4. Läs vad som ändras och bevaras. Skriv varför resultatprofilen ska bli historisk, markera granskningen och välj **Gör profilen historisk i denna arbetsyta**. Servern sparar profilstatus, operativ ansvarskoppling och avslutshistorik tillsammans.
5. Vid ändrat underlag behålls din orsak i dialogen. **Hämta aktuellt underlag** är läsning; **Läs in aktuellt granskningsunderlag** antar aktuell version och tömmer granskningen. Kontrollera igen innan du markerar och sparar. En ny orsak tömmer också granskningen.
6. Läs faktiskt framgångsbesked och den sparade historiken. Historisk profil och sparad kontolänk finns kvar; äldre resultat flyttas inte till en ersättare. Ett tappat svar är inget bevis på misslyckad skrivning: hämta aktuellt underlag och använd befintlig återförsökshantering. Stängning återställer inte ett redan registrerat avslut.

**Konto och sidåtkomst är separata.** Kontrollera det personliga CRM-kontot i **Registrerade CRM-konton** och Sitesåtkomsten i dess avsedda administration. Profilvyn läser inte Sitesmedlemskap. Ett profilavslut gäller vald arbetsyta; andra arbetsytor och produktionens användar-ID granskas separat. Inga privata utkast/Outlookdata flyttas eller raderas. Skriv inte att personen är helt avvecklad utifrån profilstatusen.

**Historiska kundkort:** tidigare poster och resultat finns kvar, men vanlig redigering av kund-/affärs-/orderunderlag kan nekas efter borttagningen av den operativa ansvarskopplingen. V55 har inget generellt återöppningsflöde. Ändra inte historiskt försäljningsansvar för att kringgå spärren; nästa flöde behöver granska aktivt kundrelationsansvar separat.

**Osparad text:** Formuläret har inget privat serverutkast. Orsaken finns kvar medan dialogen är öppen; stängning av ändrat formulär kräver ett uttryckligt val. Kopiera nödvändig text före omladdning eller stängning utan sparning.

**Återgång efter ny avslutshistorik:** använd v55-kompatibel app. Äldre oförändrad v54 kan skriva bort `retirementHistory`. Ingen SQL-migration behövs, men äldre skrivare är inte säkra efter den additiva JSON-ändringen. [RUNBOOK](agent/RUNBOOK.md) och [VALIDATION](VALIDATION.md) anger backupgräns och faktiskt verifierad kompatibilitet/återställning.

## Historik före v55

## Granska en persons kvarvarande arbete – v54

1. Logga in som administratör och öppna **Konton & roller → Överlämna arbete**. Om säljarprofiler inte är granskade/initierade, börja i **Mål & inställningar**. Översikten kopplar inga äldre namn automatiskt till personer.
2. Välj profil och läs full identitet samt äldre ansvarskoppling intill väljaren. Även inaktiv profil kan ha arbete kvar. Välj **Ansvar som behöver granskas** för omappade eller motsägande poster; gissa inte person från namnet eller kundansvaret.
3. Läs kategorier och **Visar … av …**. Sökning/kategori begränsar urvalet; **Återställ filter** visar det igen och **Visa fler ansvarsposter** fortsätter listan. Antalet gäller ansvarsdelar: en kund kan ha flera.
4. Öppna radens **Granska**-handling. Befintlig dialog bestämmer vad som får överlämnas. Välj aktiv mottagare, tillåtna uppgifter och orsak, granska och spara enligt dialogen. Kundansvar öppnas på kundkortet. Inga mål eller uppgifter väljs automatiskt av inventeringen.
5. Om handlingen i stället öppnar kundkort eller företagsaktivitet, läs varför separat överlämning saknas/blockeras. Öppna `csm`, `csm_need`, `prospecting`, `delivery` och okända specialuppgifter ska fortsatt granskas; de har ingen egen granskad överföring i v54. Ett event kan vara avslutat medan en förberedelse är öppen.
6. Använd **Hämta aktuellt underlag** efter arbetet. Profil/filter bevaras och fel visas. En rad kan försvinna när ansvaret överförts; vid stängning går fokus då till inventeringens synliga rubrik.

**Personalavveckling återstår.** Ingen rad eller tom lista stänger kontot eller inaktiverar profilen. Nuvarande aliasregel blockerar borttagning även när historiska ansvar finns; förväntad historik får inte flyttas eller raderas för att kringgå den. Kontobehörighet, säljarprofil, produktionsjobb/-problem, event/checklistor och privata Outlook-/utkastdata kräver separata kontroller. Den här vyn skickar inga mejl eller inbjudningar.

**Återgång:** V54 ändrar inte API, servermodell, lagringsfält eller SQL. V53 är formatkompatibel UI-återgång för denna del. V53:s äldre lagringsgränser består, inklusive att oförändrad v52 inte är säker skrivare efter v53-behovshistoria. Gemensam CRM-backup omfattar fortfarande inte konton, privata utkast eller Outlook. Ingen faktiskt verifierad hostingåterställning påstås. [VALIDATION](VALIDATION.md) anger slutbevis.

## Historik före v54

## Granskat årshjulsansvar – v53

1. Öppna **Kunder → Årsplanering → Mina behov** eller **Teamets behov**. Läs kund, kontakt senast, kundens leveransbehov och behovsansvar. Kundkortets kompakta årshjul visar samma kunds behov utan det globala ansvars-/årsfilter som används i fullvyn.
2. Som administratör: välj **Förankra behovsansvar** eller **Byt behovsansvar** på ett planerat behov. Läs nuvarande ansvar och full mottagaridentitet intill väljaren. En äldre tom koppling kan förankras till samma person; okänd/motsägande källa gissas inte. Känd inaktiv källa kan lämna över till aktiv mottagare.
3. Välj uttryckligen de tillåtna öppna fristående årshjulsuppgifter som ska följa med. Ingen är förvald. Ange orsak, granska sammanställningen och spara. Avslutade uppgifter, affär-/orderkopplat arbete, andra behov och arbetsflöden behåller ansvar.
4. Vid ändrat underlag: **Hämta aktuellt underlag** behåller formulärets tidigare version. **Läs in nytt granskningsunderlag** antar den aktuella versionen uttryckligen, behåller orsak och möjliga val och kräver ny granskning.
5. Ett oklart sparbesked kan följa efter en lyckad skrivning. Hämta/granska utfallet eller återförsök med samma oförändrade val. Dialogen bevarar text vid fel men är inget privat serverutkast; kopiera orsaken före omladdning. Stängning återställer inte möjlig CRM-skrivning.
6. Använd **Ändra behov** för text/datum. Sparat ansvar bevaras. Vid konflikt: hämta och **Läs in nytt underlag**, jämför sparat/föreslaget innehåll och granska före ersättning. De fem serverägda fälten `owner`, `ownerProfileId`, `responsibilityTransfers`, `completedAt` och `dealId` läses om; innehållsförslaget ligger kvar. Även detta formulär saknar privat serverutkast och återupptagning efter omladdning.

**Återgång:** v53 utökar behovs-JSON och uppgiftshistorik utan SQL-migration. Oförändrad v52 kan skriva bort nya behovsfält och avvisa uppgiftens `source:'yearwheel'`; den är inte en säker skrivande återgång efter nya v53-data. Bevara en kompatibel v53-korrigering eller verifiera full databas-/fil-/versions-/länkåterställning från före förändringen med plan för senare arbete. Lokal syntetisk återställning är inget faktiskt hostingprov. Gemensam CRM-backup omfattar inte konton, privata utkast eller Outlook; återställda profilmedlemskopplingar töms och återansluts uttryckligen. [VALIDATION](VALIDATION.md) anger exakta belägg.

### Historik: v52 – Granskat kundärendeansvar

1. Öppna **Kundvård → Mina kundärenden**; välj vid behov **Alla ansvariga** för teamet. Ärendet följer sitt eget ansvar, kundrelationen sitt kundansvar.
2. Som administratör: välj **Förankra ärendeansvar** eller **Byt ärendeansvar** för ett sparat öppet ärende. Välj en aktiv granskad profil och läs full identitet intill väljaren. Samma person kan förankra ett äldre tomt ID; okänd/motsägande källa gissas inte. En granskad inaktiv källperson kan lämna över.
3. Välj bara de tillåtna öppna ärendeuppgifter som ska följa med. Ingen är förvald. Ange orsak, granska ansvar och uppgiftsval och spara. Övriga uppgifter och ansvar ligger kvar; ingen kundkontakt registreras.
4. Vid ändrat underlag: **Hämta aktuellt underlag** behåller den tidigare granskningen. **Läs in nytt granskningsunderlag** väljer den aktuella versionen uttryckligen, behåller orsak och möjliga val och kräver ny granskning.
5. Ett oklart sparbesked kan följa efter en lyckad skrivning. Hämta och granska utfallet eller återförsök med samma oförändrade val. Öppen dialog bevarar text vid fel; den är inget varaktigt privat utkast. Kopiera orsaken före omladdning. Stängning återställer inte en möjlig CRM-skrivning.
6. Fortsätt den privata kundplanen separat. Ett gammalt utkast kan behöva jämföras med aktuell kundversion. **Använd aktuellt underlag och behåll mina uppgifter** kopierar endast `issueOwner`, `issueOwnerProfileId` och `issueResponsibilityTransfers`; all annan privat text och fält av samma version bevaras.

Vid ärendets första registrerade ansvar måste ett komplett öppet ärende få ett uttryckligt aktivt profilval efter profilinitiering. Ett äldre ärende som saknar ansvar, profil-ID och historia får samma möjlighet när det öppnas, även om text finns kvar. Efter registrerat ansvar används granskad överlämning för byte; lösning/återöppning behåller ansvar och historia. Kundplanen har en gemensam föränderlig ärendeplats, inget nytt ticketregister.

**Återgång:** v52 utökar JSON och Task-historik utan SQL-migration. När de nya fälten/historiken registrerats är oförändrad v51 ingen säker skrivande återgång: gammal kod kan avvisa uppgiftshistoria eller skriva bort ärendefält. Använd en v52-kompatibel korrigering eller verifierad data-/filåterställning från före förändringen med en plan för senare arbete. Faktisk hostingåterställning återstår. CRM-backup omfattar inte konton, privata utkast eller Outlook-anslutningar; säljarprofiler behöver uttrycklig återanslutning. [VALIDATION](VALIDATION.md) skiljer syntetiska parser-/runtimeprov från verklig drift.

### Historik: v51 – Granskat onboardingansvar

Onboarding får en egen stabil ansvarig säljarprofil. Administratören förankrar äldre ansvar eller byter ansvar med orsak, granskning och uttryckligt valda öppna onboardinguppgifter. Ingen uppgift är förvald. Kund-, affärs-, order- och resultatansvar behålls. Den personliga vyn **Nya kunder** följer onboardingansvaret; äldre tomma ID:n använder befintligt ansvar för visning.

1. Öppna kundens onboardingchecklista. Efter profilinitiering visas ansvar som läsbar information.
2. Som administratör: välj **Förankra onboardingansvar** eller **Byt onboardingansvar**.
3. Välj aktiv granskad mottagarprofil och läs hela ansvarskopplingen intill väljaren.
4. Välj endast öppna onboardinguppgifter som ska följa med. Övriga och avslutade uppgifter behåller ansvar.
5. Ange orsak, granska sammanställningen och bekräfta granskningen.
6. Spara. Historiken bevarar tidigare faktiskt profil-ID, profiler/namnsnapshots, orsak och registrerande person.

Äldre tomt ID kan förankras till samma person. En inaktiv utgående person kan lämna över utan återaktivering. En redan förankrad profil kan inte skapa ny överföring till sig själv. Saknad/motsägande koppling behöver granskning. Administratören och eventuell kontokopplad mottagare kontrolleras även vid transaktionen. Profil-ID och historik skyddas vid vanlig checklistredigering; efter profilinitiering ändras ansvar endast genom granskad överlämning.

**Hämta aktuellt underlag** hämtar information; **Läs in nytt granskningsunderlag** använder den uttryckligen och kräver ny granskning. Orsak och möjliga val bevaras. Överlämningen är inget varaktigt privat utkast: kopiera orsaken före omladdning. Ett äldre privat checklistutkast behåller sina värden men kan få konflikt efter ansvarsändringen; uttrycklig jämförelse med aktuell version uppdaterar ansvarsbasis och bevarar övriga privata uppgifter. Oklart sparbesked kräver återläsning eller samma oförändrade återförsök.

**Driftgräns:** v51 utökar JSON och Task-historik utan ny SQL-tabell. När nytt onboardingprofil-ID eller historik registrerats, även utan överföring, är oförändrad v50 ingen säker återgång. Bevara v51-formatet och servervalideringen vid korrigering. Äldre återgång kräver verifierad snapshot före förändringen med filer, versioner och kopplingar samt plan för senare arbete. Ingen faktisk hostingåterställning är gjord. Återställda säljarprofiler saknar kontokopplingar tills dessa återansluts uttryckligen; historiska aktörsuppgifter ger ingen behörighet. Konton, privata utkast och Outlook-anslutningar ingår inte i CRM-backup. [VALIDATION](VALIDATION.md) anger releasebevis och provgränser.

## Kundval på korta skärmar – v50

1. Sök på företag, kontaktperson, e-post eller organisationsnummer.
2. Läs kund och ansvar; rulla dialogen vid lång text.
3. Välj **Öppna kundkort** vid sökning eller **Välj kund** för att fortsätta med anteckning, affär, aktivitet eller möte. Valet sparar inget nytt gemensamt CRM-underlag.
4. Avbryt med X eller Escape.

[VALIDATION](VALIDATION.md) redovisar slutprov och kompatibilitet. Kundval är navigation/val av sammanhang, inte registrerad kundkontakt eller CRM-inlämning.

## Historik: Byt arbetsyta och fortsätt – v49

1. Öppna **Arbetsyta** med pointer eller tangentbord och välj **Demoyta** eller **Teamets arbetsyta**. Valet syns i väljaren/bannern.
2. Utan fortsatt inmatning återgår fokus till den nya tillgängliga väljaren, annars aktuell tillgänglig huvudrubrik. Fortsätt med Tab.
3. Fortsatt inmatning eller ett laddningsfel avslutar återgången. Befintligt återförsök återupplivar den inte.

Byte registrerar ingen kontakt/CRM-inlämning. Privata utkast/serverroller består. [VALIDATION](VALIDATION.md) anger prov/återgång.

## Historik: Stäng kundkortet och fortsätt – v48

1. Öppna kundkortet från befintlig kundhandling.
2. Stäng med Escape eller kundkortets stängknapp. När samma öppningskontroll finns kvar i samma konto/roll, arbetsyta och vy ligger fokus där igen. Fortsätt med Tab.
3. Saknas kontrollen fokuseras vyns namngivna huvudrubrik. Funktionen återför inte fokus från en annan öppen dialog.

Sparning och kundansvarsöverlämning behåller sina stängningsspärrar. Bakgrundsladdning, programmatisk navigation och identitetsbyte ger ingen kundkortsåtergång. Stängning registrerar ingen kontakt eller CRM-inlämning.

[VALIDATION](VALIDATION.md) anger publicering/prov/återgångsgränser. Ingen migration; v47 återför fokusluckan. Ingen live-rollback/hostingåterställning. Arbetsytefokus återstår.

## Historik: Hitta kunden och öppna kundkortet – v47

1. Öppna **Kunder**. Sök som tidigare eller välj ansvarig för att begränsa urvalet.
2. Läs kundnamn, kontaktperson och kundansvarig. Ett besked om äldre/felaktig ansvarskoppling är ett granskningsbehov; visningen tilldelar ingen person automatiskt.
3. Läs **Nästa öppna uppgift** eller **Nästa planerade CRM-möte**. Datum, eventuell mötestid och ansvarig kommer från befintligt arbete. Om inget sådant finns visas det uttryckligen. Kundens **Nästa avstämning** står separat och är inte en automatiskt skapad aktivitet.
4. Välj **Öppna kundkort** med pointer eller Tab/Enter för att fortsätta i samma befintliga kundkort. Att öppna eller läsa registrerar ingen kontakt, avslutar inget arbete och ändrar inget ansvar.

Ett tomt sökurval ber dig ändra sökning eller ansvarsurval. Ett verkligt tomt register får ett eget besked. Endast administratör/säljare får skapa-kund-knappen; serverns roller och produktionsvy gäller fortsatt.

Ändringen omfattar fyra presentationsfiler: nya `components/customer-register.tsx` och `app/customer-register.css`, importen i `app/layout.tsx` och kundregisterrenderingen i `app/page.tsx`. Övriga 272 spårade basfiler är byteidentiska; modeller, provider, API, serverroller, privat sparning, CAS/idempotens, DB/R2 och driftkonfiguration består. Ingen SQL-migration eller nytt lagringsformat införs. Kvitto `/workspace/scratch/crm47/compatibility.json`, SHA256 `d1cf6440b490580c73cd0f1d571891a5253aaf839e7ff48cc08dbf032b89fa0e`. V46 är formatkompatibel som UI-återgång men återför den breda kundtabellen. Äldre modellbundna återgångsgränser, inklusive v44:s risk att skriva bort mötesprofil/historia, består. Ingen faktisk live-rollback eller hostingåterställning utfördes.

Fem slutkontroller och 17 lokala browserfall passerar på slutkandidat `418531aa80e359ece524352a22a26a6cbc571e8d`; app-PR #68 är sammanslagen till app-main `6102c4eb2b47913a303ba03da6ffdd1e9f807f6b` med gröna exakt-head/main-checks. Sites v47 är publicerad 2026-10-07 08:52:19 UTC från verifierad source `b3118e0671a1967e90c14f3e2d9fd46893b05452`. Riktiga konto-/personalprov återstår. [VALIDATION](VALIDATION.md) anger slutkandidat och provgränser. Ett separat prov visade att stängning av kundkortet med Escape tappar fokus till BODY både i v46 och v47; återgång till öppningsknappen är inte verifierad och behöver rättas separat, tillsammans med fokus efter arbetsytebyte. Autentiserad live-UI, fysisk telefon och observerat personalarbete återstår att prova.

## Historik: Läsa arbetsdagen med större text – v46

I **Min dag** får privat utkaststatus, fokusetikett och tomma paneltexter radbrytas inom sin yta. Läs hela statusbeskedet före nästa handling. **Privat utkast** och **inlämnat till CRM** betyder fortfarande olika saker; att texten får plats ändrar inte sparutfallet. Fortsätt med befintliga **Fortsätt**, **Följ upp** och kund-/möteshandlingar.

Endast de två presentationsfilerna ändras; övriga 272 spårade filer är byteidentiska med basen. Modeller, provider, API, roller, privat sparning, CAS/idempotens, DB/R2 och driftkonfiguration består. Ingen SQL-migration eller nytt lagringsformat införs. V45 är formatkompatibel som UI-återgång men återför klippning/överbredd; äldre modellbundna återgångsgränser, inklusive v44:s risk att skriva bort mötesprofil/historia, består. Ingen faktisk live-rollback eller hostingåterställning utfördes. Kvitto `/workspace/scratch/crm46/compatibility.json`, SHA256 `aaf9b4604eb6446bc38a47e9bfa495066ff9e00cbbe486847d2dcb25298ce32d`.

Fem slutkontroller och 29 lokala browserfall passerar på slutkandidat `04dfa5cd`; app-PR #66 är sammanslagen till main `acc744d1` med gröna exakt-head/main-checks. Sites v46 är publicerad 2026-10-07 07:45:58 UTC från verifierad source `c8c922b3`. Riktiga konto-/personalprov återstår. [VALIDATION](VALIDATION.md) anger kontroller och gränser. Autentiserad live-UI, fysisk telefon och observerat personalarbete återstår att prova.

## Byt eller förankra mötesansvar – v45

1. Som administratör: öppna **Min dag** för dagens/kommande möten eller **Kalender → Kundmöten i CRM** för andra datum. Välj vid behov teamets möten och hitta ett nu planerat möte. Granskade säljarprofiler behöver finnas.
2. Välj **Byt mötesansvar** eller **Förankra mötesansvar**. Funktionen ändrar ansvaret för just detta möte.
3. Välj aktiv granskad ansvarig. Valet börjar tomt. Fullständigt namn och ursprunglig ansvarskoppling hjälper när namn sammanfaller. Samma aktiva person kan förankra äldre blank koppling; okänd äldre person måste hanteras separat.
4. Ange orsak. Läs möte, kund, mötestid och nuvarande/vald person. Markera **Jag har granskat mötesansvaret** och välj **Spara förankrat ansvar** eller **Spara nytt mötesansvar**.
5. Vid ändrat underlag: **Hämta aktuellt underlag** gör bara hämtning. **Läs in nytt granskningsunderlag** väljer uttryckligen den aktuella versionen och behåller orsak samt tillåtna val. Granska igen före sparning. Ett misslyckat lässvar blir inget nytt underlag.
6. Vid sparfel finns lokala val kvar medan dialogen är öppen. Ett obekräftat svar kan följa efter lyckad skrivning; återförsök med samma oförändrade val eller hämta och granska utfallet. Väntande skrivning spärrar ändring/stängning. Smutsig stängning kräver **Fortsätt redigera** eller **Stäng utan att spara**; stängning återställer ingen möjlig tidigare CRM-skrivning.

Kopiera orsaken före omladdning. Ansvarsdialogen är inget varaktigt privat serverutkast och texten försvinner om du stänger utan att spara. Privata meddelanden/utkast flyttas inte till ny mötesansvarig. Kundens, affärens, orderns, tidigare uppgifters och historiskt försäljningsresultats ansvar ligger kvar. Tid, status, plats och anteckningar ändras inte av ansvarshandlingen; ingen kalenderinbjudan skickas.

Under **Tidigare ansvarsändringar** finns mötets serverägda historia med person, orsak, aktör och tid. Egen mötesvy följer profil-ID för kopplade möten; namn är visning. Äldre tomt ID visas som behov av förankring och fylls inte automatiskt vid läsning. Efter profilinitiering är befintligt generellt mötesansvar skrivskyddat; nytt möte behåller ansvarsväljaren. Vanlig redigering/avslut med oförändrad äldre ansvarig behåller exakt ID, även blankt eller inaktivt. En ny automatisk uppföljningsuppgift när mötet markeras genomfört får samma exakta profil-ID, inklusive blankt, och egen tom uppgiftshistoria; tidigare uppgifter flyttas inte.

Överlämning gäller nu planerade möten. Det befintliga formuläret kan återöppna ett genomfört möte till planerat; ingen ny oföränderlig historisk livscykel införs. Ett möte som nu är genomfört eller avbokat har ingen tillåten ansvarshandling.

Gamla generiska privata v44-mötesutkast kan kräva granskning av **Ansvarskoppling** och **Ansvarshistorik**. Läs konflikten, kopiera råvärden och välj aktuell version uttryckligen före CRM-sparning. Automatisk omläsning godkänner inget nytt underlag. Detta sparade privata utkast är skilt från den nya ansvarsdialogens lokala orsak och val.

V44 är inte en säker skrivande återgång efter att nya mötesfält registrerats. Ett faktiskt isolerat prov körde v44:s MeetingSchema från exakt basrevision `bba8a1e5d156e858d2bb208c97ef0bb0e017a3c7` på syntetiskt underlag: både ownerProfileId och responsibilityTransfers strippades. Kvitto `/workspace/scratch/crm45/contract/v44-parser-rollback-proof.json`, SHA256 `34c71f4acb00feea6e30fde45b2a033b804cd1bf44377019f2f7f13740cfc828`. Behåll v45-modellen/serverreglerna genom schemabevarande framåträttning eller verifierad datamedveten återställning. Tidigare Task-/kund-/kommersiella återgångsgränser består. Ingen faktisk live-rollback eller hostingåterställning har utförts.

JSON/NDJSON bevarar och validerar mötesprofil/historia; medlemslänkar rensas fortsatt i återställningsmålet och konton/privata utkast/Outlook har separat backupbehov. Fem slutkontroller, isolerad runtime/restore och 31 browserfall plus en faktisk HTTP-sekvens passerar på kandidat `de76cb0f`. App-PR #64 är sammanslagen till main `308d9e1`; exakt-head/main-CI är gröna. Sites **v45 är publicerad 2026-10-07 06:42:46 UTC** från verifierad source `b4ea99ee`. Anonym startsida och CRM-API gav 401/401; autentiserad live-UI och riktiga konto-/personalprov återstår. Dokumentationsleveransen är separat och återpublicerar inte appen. [VALIDATION](VALIDATION.md) anger fullständiga käll-/testkvitton och provgränser. B01b2:s specialansvar/full personalavveckling, B07:s tidigare klippning, verkliga konton/integrationer/personal och hostingåterställning återstår. Codex-referensen är oläst.

## Byt eller förankra uppgiftsansvar – v44

1. Som administratör: öppna **Min dag**, välj vid behov teamets uppgifter och hitta en öppen fristående kunduppgift. För arbete längre än sju dagar framåt, öppna **Senare planerade uppgifter**. Granskade säljarprofiler behöver finnas.
2. Välj **Byt uppgiftsansvar** eller **Förankra ansvar**. Funktionen gäller fristående manual/care/meeting_followup utan affärskoppling. Uppgifter som styrs av en affär, order eller ett särskilt kundflöde överförs där.
3. Välj uttryckligen en aktiv granskad ansvarig. Valet börjar tomt. Fullständigt namn och ursprunglig ansvarskoppling hjälper när namn sammanfaller. För äldre blankt ansvar kan samma aktiva person väljas för förankring; okänd äldre person måste hanteras separat.
4. Ange varför kopplingen förankras eller byts. Läs uppgift, kund, nuvarande/vald person och orsak. Markera **Jag har granskat uppgiftsansvaret** och välj **Spara förankrat ansvar** eller **Spara nytt uppgiftsansvar**.
5. Om underlaget ändrats: **Hämta aktuellt underlag** gör endast hämtning. **Läs in nytt granskningsunderlag** är ditt uttryckliga versionsval och behåller orsak samt fortfarande tillåtna val. Granska igen innan sparning. Ett misslyckat lässvar blir inget nytt underlag.
6. Vid sparfel finns lokala val kvar medan dialogen är öppen. Ett obekräftat svar kan följa efter lyckad skrivning; återförsök med samma oförändrade val eller hämta och granska utfallet. Under väntan är ändring/stängning spärrad. Smutsig stängning kräver **Fortsätt redigera** eller **Stäng utan att spara**; stängning återställer ingen möjlig tidigare CRM-skrivning.

Detta formulär har inget nytt varaktigt privat serverutkast. Kopiera orsaken före omladdning; lokal dialogtext är ingen backup. Privata meddelanden/utkast följer inte med till en ny uppgiftsansvarig. Kundens, affärens, orderns och historiska försäljningsresultatets ansvar ligger kvar. Uppgiftens datum, status och instruktion ändras inte av ansvarshandlingen.

Under **Tidigare ansvarsändringar** finns serverägd uppgiftshistoria, inklusive senare granskade kund-/affärs-/orderöverlämningars källkoppling. Nya parentöverföringar lägger till matchande uppgiftshistoria atomiskt; äldre redan sparade parenthistorier skrivs inte om. En nästa Följ upp-uppgift har egen tom historia med bevarat ansvar. Efter profilinitiering är befintliga generella Task-formulärs ansvar skrivskyddat; ny uppgift behåller ansvarsväljaren. Avslutade uppgifter har tydlig hjälptext om bevarat historiskt ansvar.

Äldre privata underlag kan behöva explicit aktuell granskning av **Ansvarshistorik**, med text/kopiering bevarad. JSON/NDJSON ska bevara nya historie-/profilkopplingar; medlemslänkar rensas fortsatt i målmiljön och konton/utkast/Outlook har separat backupbehov. V43 är inte en säker skrivande återgång efter att ny uppgiftshistoria registrerats. Ett faktiskt isolerat prov körde v43:s TaskSchema från basrevisionen på syntetiskt underlag: ownerProfileId bevarades men responsibilityTransfers strippades. Kvitto `/workspace/scratch/crm44/contract/v43-parser-rollback-proof.json`, SHA256 `774079eb8d3b7137d3ea8802b1aebd4a6ff71c82569385b31d41733038ca8b39`. V42:s äldre ID-risk består. Behåll ny modell/serverregler genom schemabevarande framåträttning eller verifierad datamedveten återställning; ingen faktisk live-rollback eller hostingåterställning har utförts. Fem obligatoriska slutkontroller och faktisk lokal D1/R2-restore passerar enligt [VALIDATION](VALIDATION.md). Det syntetiska äldre privata v43-Task-formuläret bevarade och kunde kopiera exakta råa uppgiftsdata och fryst gammal basis före explicit versionsval; **Ansvarshistorik** namngavs i konflikten och befintligt ansvar var skrivskyddat. Rapportens fallnamn säger ”raw reason”, men detta fall provar Task-data/titel och kopiering, inte en orsak i nya ansvarsdialogen. Separata nya dialogfall verifierar bevarad rå orsak/val vid smutsig stängning, native beforeunload, läsfel, 409, 503 och förlorad kvittens. Nya Task-formulär behöll ansvarsväljaren, fick aktivt servervalt profil-ID/tom egen historia och arkiverade sitt privata utkast atomiskt. Se [VALIDATION](VALIDATION.md) för slutbrowserns 30 fall plus en faktisk HTTP-sekvens och provgräns.

App-PR #62 är sammanslagen till main `6cb366c` efter exakt-head CI success; Sites-source `e2bfc7c` är pushad med samma träd. Sites **v44 är publicerad 2026-10-07 05:48:20 UTC** från verifierad source `e2bfc7c`; app-main `6cb366c` och både exakt-head/main-CI är gröna. Anonym startsida och CRM-API gav 401/401; autentiserad live-UI och riktiga konto-/personalprov återstår. Dokumentationsleveransen är separat och återpublicerar inte appen. Se [VALIDATION](VALIDATION.md) för fullständiga käll-/testkvitton. B01b2 är fortsatt delvis levererat. Mötes-/specialflödesansvar, full personalavveckling, verkliga konto-/personal-/integrationsprov och hostingåterställning återstår. Codex-referensen är oläst.

## Historik: Uppgiftsansvar – v43, 2026-10-07

Detta avsnitt beskriver den då publicerade v43. Anvisningen om ansvarsbyte i ett befintligt generellt uppgiftsformulär är historisk; i v44 gäller den granskade ansvarshandlingen ovan. Nya uppgifter behåller ansvarsväljaren.

Vanliga uppgiftsrader använder fortsatt **Följ upp**. Efter granskad profilinitiering förankrar servern nytt ansvar eller ett uttryckligt ansvarsbyte i en aktiv granskad profil i befintligt generellt uppgiftsformulär. Före initieringen tillåts tomt ansvarsprofil-ID. En vanlig redigering/ett avslut med oförändrad äldre ansvarig behåller tidigare ID, även ett tomt ID eller en inaktiv/ej listad person. Detta inför ingen separat Byt uppgiftsansvar-dialog eller ny publik redigeringsingång.

Nya automatiska uppgifter kan följa medfört/källans ansvarsprofil-ID eller en redan granskad profil med matchande oföränderlig ansvarsetikett, även inaktiv. Helt omappat ansvar förblir tomt; befintliga tomma uppgifter/källposter skrivs inte om. Kund-/affärs-/orderöverlämningar stämplar bara deras redan avsedda uppgifter inom befintlig atomisk historik. Receipt-GET projicerar exakt order-ID/tomt värde utan skrivning eller aliasförankring.

I Min dag följer ID-kopplade egna uppgifter/signaler profilens UUID. Äldre uppgifter utan profil-ID behåller etiketturval. Aktuellt namn och ursprunglig etikett särskiljer lika namn; **ansvar behöver förankras** anger att uppgiften ännu saknar profil-ID, även när ansvarsetiketten redan matchar en granskad profil.

Task-/receiptbasis omfattar profil-ID och upptäcker därmed även en ID-ändring med oförändrad etikett. Äldre frysta privata underlag kan därför kräva ny granskning av **Ansvarskoppling**. Öppen text/kopieringsväg bevaras; privata baser skrivs inte om automatiskt och CAS kringgås inte. JSON/NDJSON bevarar och validerar ansvarsprofil-ID:n, medan aktuella medlemslänkar fortfarande rensas vid restore. Privata utkast, konton och Outlook ingår inte i CRM-kopian. **V42 är inte en säker skrivande rollback**: dess äldre TaskSchema strippade det nya fältet i ett isolerat parserprov. Bevara modellen/serverreglerna genom schemabevarande framåträttning eller en verifierad datamedveten återställningsväg.

Vid gammalt uppgiftsutkast: läs konflikten **Ansvarskoppling**, kopiera öppna uppgifter och granska aktuell sparad version innan versionsval. Automatisk omläsning godkänner inte ett nytt underlag. Befintliga överlämningsformulär har lokal text-/stängningsvakt; kopiera osparad orsak före reload.

B01b2 är fortsatt delvis levererat: uttryckligt granskad fristående uppgiftsöverlämning, återstående mötes-/specialflödesansvar och full personalavveckling återstår. Historiskt försäljningsresultat, privat kommunikation och fysisk produktionshistorik bevaras. Separat affärschefsroll, övriga privata specialdialoger, mobilkundlista/workspacefokus, separat backup, hostingbudget/återställning, riktiga integrationer och personalpilot kvarstår.

## Stabilt kundansvar – v42, 2026-10-07

1. Som administratör: öppna kundkortet och välj **Byt kundansvar**.
2. Välj en annan aktiv, granskad säljarprofil. Visningsnamn och ursprunglig ansvarskoppling skiljer profiler med samma namn åt. Ange varför ansvaret byts.
3. Välj endast de öppna fristående aktiviteter som också ska överföras. Ingenting är valt från början; andra personers, avslutade och särskilda affärs-/orderuppgifter behåller sitt ansvar.
4. Läs gammalt/nytt kundansvar, valda aktiviteter och arbete som blir kvar. Bekräfta granskningen och använd den uttryckliga överföringen.
5. Vid konflikt: hämta aktuella uppgifter. Detta ändrar inte ditt valda granskningsunderlag; välj nytt underlag uttryckligen och granska igen med orsak och tillåtna val kvar.
6. Under pågående skrivning är ändring och stängning spärrade. Vid osparade val måste du välja att fortsätta eller kasta lokala ändringar. Ett obekräftat svar kan betyda att ändringen redan sparats; återförsök med samma oförändrade val eller hämta och granska utfallet.

Kundansvar får en stabil profilkoppling. Efter granskad profilinitiering sätter servern `ownerProfileId` för nya kunder, kundimport och omvandling av företagsleads mot en aktiv granskad säljarprofil. Befintliga kunder med tomt ansvarsprofil-ID fylls inte automatiskt vid läsning eller vanlig redigering. På kundkortet kan administratören välja **Byt kundansvar**, välja en annan aktiv profil, ange orsak och uttryckligen välja vilka öppna fristående aktiviteter som ska följa med. Ny profil och uppgiftsval börjar tomma; granskningen måste bekräftas före överföring.

`Customer.ownerProfileId` är ett additivt fält med tomt standardvärde för äldre poster. En godkänd administrativ kundöverlämning förankrar ansvaret i profilens oföränderliga UUID. Servern kontrollerar ansvarshistoriens profilkedja och att kundens slutliga ansvar stämmer med den senaste överföringen. Kundansvar, valda uppgifter och serverägd historia sparas tillsammans med fryst underlag, CAS och befintligt request-ID-skydd. Generella formulär/import kan inte ändra befintligt ID eller skriva egen överföringshistoria. Att hämta aktuella uppgifter ersätter inte öppningens underlag; ett ändrat underlag kräver ett uttryckligt nytt val och ny granskning. Orsak och val bevaras vid fel; en förlorad kvittens kan följa efter en lyckad skrivning. Dialogens identitet omfattar arbetsyta, användar-ID, medlems-ID och serverroll. Hämtning av aktuell state lämnar ett läs-/åtkomstfel vid fel; ett misslyckat svar behandlas inte som nytt granskningsunderlag.

Detta är ytterligare en avgränsad B01b2-del, inte full personalöverlämning. Befintliga omappade kunder får inget gissat ansvarsprofil-ID från namn eller mejl. Endast uttryckligt valda öppna fristående aktiviteter med kundens tidigare ansvar kan följa med; uppgifternas ansvariga får inga nya profil-ID:n i denna leverans. Kund- och uppgiftsposternas befintliga stabila ID:n ändras inte. Affärer, order, möten, onboarding, kundvårdsärenden och årshjul behåller sitt separata ansvar. Historiska fakturor, vunna affärers ansvar, prospectattribution och mål flyttas inte. Produktionsanspråk, registrerade mängder, revisioner och kundgodkännanden bevaras. Säljar-, läsar- och produktionsroller får ingen ny administrativ eller privat åtkomst. Ingen integration, kundacceptans, faktura eller utskick skapas.

Kundens ansvarsprofil-ID lagras additivt i befintlig JSON; ingen SQL-migrering krävs. Äldre exporter kan läsas med tomt standardvärde, och vanlig läsning/skrivning fyller inte implicit i gamla tomma ansvarsprofil-ID:n på befintliga kunder. **V41 är inte en säker skrivande rollback** efter registrering av det nya kundfältet: dess äldre kundschema kan strippa `ownerProfileId` vid nästa skrivning. V40 saknar dessutom senare kommersiella ID-/historikfält. Behåll den nya modellen, serverreglerna och kompatibel klient genom en schemabevarande framåträttning eller verifierad datamedveten återställningsväg. Ingen faktisk live-rollback eller hostingåterställning har genomförts. CRM-backup bevarar kundens profil-ID och ansvarshistoria men aktuella kontolänkar rensas i målmiljön och måste väljas uttryckligt igen. Privata utkast, konton och Outlook ingår fortfarande inte.

Överlämningsdialogens text-/stängningsvakt är lokal, inte ett nytt varaktigt privat serverutkast. Kopiera osparad orsak före omladdning. Alla skrivprov använder syntetiska data i isolerad SQLite/workerd/D1/R2. Browser-/CI-prov är inga autentiserade live-UI-, verkliga personal-/konto-/integrations-, fysisk telefon/OS-tangentbords-, skärmläsar- eller hostingåterställningsprov. Ingen WCAG-certifiering, världsranking eller personalacceptans utlovas. Codex-tasken `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant `read_thread` saknas; explicit brief/repo används. Scheman, prompter och aktivering är oförändrade. Inga kundmejl eller riktiga kundorder skrivs.

[VALIDATION](VALIDATION.md) skiljer faktisk testmiljö från drift/personal.

## Byt affärs- eller orderansvar – v41, 2026-10-07

1. Som administratör: öppna den relevanta affären/orderpanelen och välj **Byt affärsansvar** eller **Byt orderansvar**.
2. Välj ny aktiv säljarprofil. Visningsnamn och ursprunglig ansvarskoppling skiljer profiler med samma namn åt. Ange varför ansvaret byts.
3. Läs **Nödvändiga åtaganden**; dessa följer alltid med. Välj endast de **Valfria uppgifter** som också ska överföras.
4. Jämför vad som överförs och vad som behåller sitt ansvar. Bekräfta granskningen och använd den uttryckliga sparhandlingen.
5. Vid konflikt: hämta aktuella uppgifter och välj nytt granskningsunderlag uttryckligen. Orsak och tillåtna val bevaras; granskningen måste göras igen.
6. Ett obekräftat svar kan följa efter att ändringen sparats. Behåll samma val för återförsök eller hämta/granska det registrerade utfallet. Under pågående sparning är ändring/stängning spärrade.

Detta är en avgränsad B01b2-del. Kundansvar, historiska fakturor, vunna affärers ansvar, prospectattribution och mål flyttas inte. Produktionsanspråk, registrerade mängder, revisioner och kundgodkännanden bevaras. Befintliga tomma ansvar-ID:n migreras inte automatiskt från namn eller mejl. Stabilt ID används efter uttrycklig granskning och underlag; hela kund-/uppgifts-/mötes-/specialflödesmigreringen och personalavveckling är inte genomförda. Säljar-, läsar- och produktionsroller får ingen ny administrativ eller privat åtkomst. Ingen integration, kundacceptans, faktura eller utskick skapas.

Additiva ID-/historikfält lagras i befintliga JSON-poster; ingen SQL-migrering krävs. Äldre exporter kan läsas med tomma standardvärden för de nya fälten. Det gör **inte v40 till en säker skrivande rollback**: dess äldre scheman kan strippa nya ansvar-ID:n och historik vid nästa skrivning. Behåll den nya modellen, serverreglerna och kompatibel klient genom en schemabevarande framåträttning eller verifierad datamedveten återställningsväg. Ingen faktisk live-rollback eller hostingåterställning har genomförts. CRM-backup bevarar kommersiella ID:n/historik men aktuella kontolänkar rensas i målmiljön och måste väljas uttryckligt igen. Privata utkast, konton och Outlook ingår fortfarande inte.

Överlämningsformuläret har lokal text-/stängningsvakt; detta är inget nytt varaktigt privat serverutkast. Kopiera osparad orsak före omladdning. Alla skrivprov använder syntetiska data i isolerad SQLite/workerd/D1/R2. Browser-/CI-prov är inga autentiserade live-UI-, verkliga personal-/konto-/integrations-, fysisk telefon/OS-tangentbords-, skärmläsar- eller hostingåterställningsprov. Ingen WCAG-certifiering, världsranking eller personalacceptans utlovas. Codex-tasken `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant `read_thread` saknas; explicit brief/repo används. Scheman, prompter och aktivering är oförändrade. Inga kundmejl eller riktiga kundorder skrivs.

[VALIDATION](VALIDATION.md) skiljer faktisk testmiljö från drift/personal.

## Använd mobilmenyn – v40, 2026-10-07

1. Välj menyknappen i huvudraden (**Öppna meny**). Panelen **Meny** har en synlig **Stäng** överst.
2. Rulla inne i menyn för att nå de nedersta verktygen på en kort skärm. Stängningsraden ligger kvar.
3. Välj ett arbetsområde. Menyn stängs och den valda sidan visas.
4. Välj **Stäng** eller tryck Escape för att återgå till öppnaren. Tab och Shift+Tab går mellan panelens kontroller när den är öppen.

Ctrl/Cmd+B öppnar inte mobilmenyn när en annan modal dialog är öppen. När viewporten går över till desktopbredd stängs den mobila panelen; den återöppnas inte automatiskt när skärmen blir smal igen. Desktopens befintliga menyval och tangentbordsväxel behålls. Breda, korta skärmar använder den befintliga sidmenyn i sidans layout. Vid minst 768 px bredd och högst 540 px höjd får hela den menyn egen vertikal rullning; header, val och footer ligger i samma rullningsyta. Menyns val pressas därmed inte ihop till en smal remsa mellan header och footer. Den vanliga höga desktoplayouten behålls. I mobilpanelen och den breda, korta sidmenyn får svenska menyval, företagsnamn och profiltext radbrytas inom sin yta. Magnussons symbol får en innehållsanpassad box när texten förstoras; menyknapparnas höjd växer med texten och är minst 44 px.

Ingen datamigrering krävs. V39 använder samma server- och privata utkastformat och är en datakompatibel UI-återgång för just menyändringen; den återför de rättade navigeringsfelen. Ingen faktisk live-rollback eller hostingåterställning har genomförts. Tidigare begränsningar för återgång till äldre utkastformat gäller fortsatt. CRM-backup omfattar fortfarande inte privata utkast, konton eller Outlook.

Detta är en avgränsad navigeringsändring. API, CRM- och utkastprovider, serverroller, privata utkastformat, SQL/schema, localStorage-nycklar, CAS, atomiska skrivningar och idempotens ändras inte. Ingen ny integration, kontakt, kundacceptans eller fakturering införs. B05 och B01b2 förblir öppna. Browserprov avser isolerad Chromium/runtime med syntetiska data. Autentiserad live-UI, verkliga personal-/konto-/integrationsprov, fysisk telefon/OS-tangentbord, skärmläsare och faktisk hostingåterställning är oprövade. Ingen allmän WCAG-certifiering, världsranking eller personalacceptans utlovas. Codex-tasken `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant `read_thread` saknas; explicit brief/repo används. Scheman, prompter och aktivering är oförändrade. Inga kundmejl eller riktiga kundorder skrivs.

Källa/main/live och provbelägg finns i [VALIDATION](VALIDATION.md).

## Fortsätt en privat företagsaktivitet – v39, 2026-10-07

1. Välj **Ny aktivitet** i företagskalendern eller öppna ditt eget utkast från **Min dag → Fortsätt där du slutade** eller **Mina privata aktivitetsutkast**. Sälj- eller administratörsbehörighet krävs.
2. Skriv rubrik, planering och förberedelser. Även ofärdiga fält kan sparas privat. Läs sparstatusen: privat sparat betyder att endast ditt utkast har sparats.
3. Välj **Spara utkast & stäng** för att fortsätta senare. Om sparning misslyckas stannar panelen öppen. **Visa hela mitt bevarade underlag → Kopiera hela mitt underlag** ger hela råversionen.
4. Vid två enheters konflikt: jämför **Mitt öppna underlag** med **Sparad privat serverversion**, markera **Jag har jämfört de privata versionerna och vill välja underlag.** och välj uttryckligt serverversionen eller **Spara mina uppgifter som ny utkastversion**. Detta publicerar inget.
5. Om teamets aktivitet ändrats: välj **Granska aktuell aktivitet**, jämför, markera **Jag har jämfört mina uppgifter med den aktuella aktiviteten.** och välj **Använd aktuellt underlag och behåll mina uppgifter**. Dina privata råvärden behålls; kalendern är fortfarande oförändrad. En borttagen aktivitet måste hanteras separat.
6. Fyll i det giltiga kalenderunderlaget och välj **Spara i företagskalendern** när teamet ska se det. Kalenderaktiviteten och avslut av exakt sparat utkast sker tillsammans. Inga Microsoft-kalenderinbjudningar skickas.
7. Vid obekräftad kalendersparning kan första försöket redan ha lyckats. **Försök samma kalendersparning igen** behåller exakt begäran; ändra inte uppgifterna för att återförsöka den.
8. För att avsluta bara det privata utkastet: **Ta bort privat utkast → Ja, ta bort utkast**. Detta tar inte bort teamets aktivitet.

Misslyckad privat sparning behåller panelen och full kopierbar text. **Stäng och behåll på denna enhet** kräver återläsning av samma lokala reservkopia; det är ingen bekräftad serversparning eller driftbackup och skyddar inte mot rensad enhetslagring. **Ta bort privat utkast** är ett separat bekräftat val och tar inte bort en gemensam kalenderaktivitet. Efter förlorad arkivkvittens kan en enda commit redan ha lyckats; exakt arkiveringsreplay eller automatisk lokal rensning utlovas inte.

V38:s generella formhantering kan inte återuppta det nya aktivitetskuvertet i en kompatibel editor. Operativ återgång till bara äldre UI är därför inte verifierat säker: behåll v39:s serverskydd och kompatibla editor eller stäng av äldre aktivitetsredigering/publicering. Ingen datamigrering eller faktisk rollback har genomförts. CRM-backup omfattar fortfarande inte privata utkast, konton eller Outlook. Nästa avgränsning: **Åtkomlig mobilmeny på korta skärmar med bevarat fokus och sidinnehåll**. Global sidebaröverlagring vid 390×360 är ett separat observerat navigeringsfel och är inte rättat här; jämför äldre byggd runtime innan det kallas tidigare befintligt. B01b2:s stabila kommersiella ansvar, övriga specialdialoger, mobilkundlista/fokus, separat utkast-/konto-/Outlookbackup, hostingåterställning och personalpilot kvarstår. [VALIDATION](VALIDATION.md) skiljer isolerade prov från verklig drift.

## Återhämta eget artikelutkast – v38, 2026-10-06

1. Öppna ditt utkast från **Min dag → Fortsätt där du slutade** eller **Mina artikelutkast** i katalogen. Med säljarroll kan du läsa och kopiera egna uppgifter; redigering/publicering kräver administratör.
2. Läs **Mitt öppna underlag** och **Visa hela mitt bevarade underlag**. Kopiera lokala ändringar om du vill behålla dem inför versionsbyte.
3. Välj **Hämta sparad serverversion** och jämför **Hämtad serverversion**. Hämtningen ersätter inte dina lokala uppgifter.
4. Markera **Jag vill ersätta mina lokala ändringar med den visade serverversionen** och välj **Använd den visade serverversionen** endast om du vill ersätta det öppna underlaget. Detta arkiverar inget och ändrar ingen CRM-artikel.
5. Arkivering är ett eget val: **Arkivera sparat privat utkast → Ja, arkivera utkast**. Bara en giltig, redan sparad egen version får arkiveras; förändrat underlag kräver ny granskning.

**Stäng och behåll på den här enheten** kräver faktisk återläsning av samma lokala reservkopia. Det är ingen bekräftad serversparning eller driftbackup. Saknad, felaktig eller redan arkiverad serverversion får inte väljas som ett aktivt sparat utkast; det öppna underlaget bevaras för kopiering. Om reservkopian inte kan bekräftas stannar panelen öppen: kopiera underlaget innan du lämnar det. Rensad enhetslagring skyddas inte av denna lokala kopia.

Om serverunderlaget har ändrats kan arkivering nekas med 403 av identisk-data-spärren eller med 409 av revisionskontrollen. Ingen ny arkivering görs då; hämta och granska igen. Efter en förlorad arkivkvittens kan en enda commit redan ha lyckats och GET visa ett avslutat utkast. Den lokalt valda råversionen bevaras; ingen ny bekräftad arkivering, exakt arkiveringsreplay eller automatisk rensning av den lokala kopian utlovas. En tidigare obekräftad CRM-sparning kan redan ha lyckats; privat återhämtning/arkivering återställer ingen sådan ändring. [VALIDATION](VALIDATION.md) anger provgränser och separat backupbehov.

## Historik: Fortsätt privata artikeluppgifter – v37, 2026-10-06

Som administratör: öppna en artikel eller välj att lägga till en artikel. Skriv de uppgifter du har. Tomma eller ofärdiga textfält kan ligga i utkastet; före **Spara artikel i CRM** måste artikeluppgifterna vara giltiga och artikelkällan finnas. Saknad pris-/kostnadsuppgift blir inte automatiskt noll.

**Spara utkast & stäng** sparar bara ditt privata underlag. Vänta på bekräftad privat sparstatus innan du lämnar fliken; sparfel behåller panelen och texten. Fortsätt från **Min dag → Fortsätt där du slutade** efter omladdning. **Visa artikelutkastets uppgifter** visar sparat innehåll och referens, och **Valt privat artikelutkast** visar vilket underlag du arbetar i. Privata utkast visas för din användare i rätt arbetsyta.

**Spara artikel i CRM** är den uttryckliga registerändringen. Servern använder exakt sparade värden, artikelunderlag och privat sparversion och arkiverar utkastet atomiskt med registerändringen. **Ta bort privat utkast** kasserar ditt privata arbete och återställer ingen möjlig tidigare CRM-sparning. Vid okänd kvittens kan artikeln redan vara sparad; **Försök samma CRM-sparning igen** återförsöker samma handling.

Om kollegan har ändrat artikeln: välj **Granska aktuell artikel**, jämför med ditt ursprungliga underlag och välj uttryckligen **Använd detta underlag och behåll mina värden**. Detta väljer underlag i ditt privata utkast. Registerändringen kräver fortfarande **Spara artikel i CRM**. Om ett nytt utkast kolliderar med en befintlig källa/artikelnummer/variant får det inte skriva över den; öppna och granska den registrerade artikeln.

Om du senare har säljarroll kan du läsa/kopiera ditt eget sparade artikelutkast och ta bort en identisk, redan serverbekräftad version. Artikelredigering och CRM-publicering kräver administratör. En annan användares privata underlag blir inte tillgängligt genom chefs-/administratörsroll.

Arkivering med säljarroll gäller bara ett oförändrat, redan serverbekräftat eget artikelutkast. Om lokala ändringar väntar på sparning eller har sparfel när rollen ändras till säljare bevaras de, men servern nekar skrivning med 403 och arkivering kan inte slutföras genom att skriva de lokala ändringarna. Hela privata kuvertet kan läsas/kopieras i förhandsvisningen. Denna begränsning är inte ett färdigt rollbytesflöde; säker hantering och uttryckligt val av den sparade serverversionen är nästa avgränsning.

Typen form och kopplingen article använder befintlig utkastlagring utan SQL-migrering. V36 kan läsa/lista och arkivera dessa formdata; dess generella editor är ingen säker operativ återgång. Behåll V37:s serverskydd och en kompatibel editor, eller stäng av äldre artikelredigering/publicering. Ingen faktisk rollback eller äldre UI-publicering har prövats. CRM-backup innehåller fortfarande inte utkast/konton/Outlook; separat driftåterställning återstår. [VALIDATION](VALIDATION.md) skiljer isolerade prov från riktiga konton, personal och live-UI.

## Jämför privata leveransutkast – v36, 2026-10-06

Om ordern har flera leveransutkast: jämför **Utkast för mottagningsbesked** eller **Utkast för leveranskontroll** och innehållsraderna innan du väljer **Fortsätt med detta utkast**. På Min dag får leveransutkast samma förhandsvisning. Öppna **Visa alla utkastuppgifter** för alla fem fullständiga fält, valt läge, tid med sekunder och den stabila utkastreferensen. Läs även fält som hör till det andra läget när du behöver jämföra två lika utkast. Referensen identifierar ett visst privat utkast; den anger ingen enhet eller orderrevision.

**Ändrat** kan beskriva en lokal ändring. Den befintliga privata sparstatusen visar separat om servern har bekräftat sparningen, om ändringar väntar eller om ett fel/en konflikt behöver hanteras. Valet öppnar utkastet med dess befintliga originalunderlag. Förhandsvisning och innehållsvisning sparar eller registrerar inget i CRM. Under **Valt privat utkast** i dialogen kan du se vilket privat utkast du arbetar i; mottagande/leveranskontroll registreras endast genom den uttryckliga CRM-handlingen.

Om innehållet inte kan läsas visas ett tydligt besked. Förhandsvisningen fyller inte i egna standardvärden och ersätter inte dina bevarade uppgifter. Använd den befintliga återhämtnings-/kopieringsvägen i dialogen.

Lagring, kuvert, API och serverregler är oförändrade från v35; ingen SQL-migrering behövs. V35 är datakompatibel vid UI-återgång, men återför den äldre väljaren. Separat konto-/utkastbackup och hostingåterställning är fortsatt oprövade. [VALIDATION](VALIDATION.md) skiljer lokala syntetiska prov från verkliga konton/personal/live-UI.

## Privata leveransutkast – v35, 2026-10-06

Öppna en skickad order under På väg till kunden. Välj registrering av mottagande eller problem och fyll i uppgifterna. **Spara utkast & stäng** sparar privat och stänger först när serversparningen är bekräftad. Dialogens provade stängningsvägar följer samma sparning. Vänta på privat Sparat innan du lämnar fliken; lokal reservkopia är inget löfte om offlinefunktion. Utkastet kan fortsättas från Min dag efter omladdning eller på annan enhet. Om flera privata utkast finns för ordern väljer du ett uttryckligen.

Mottagningsdatum, mottagare, anteckning, problemtext, nästa kontroll och valt läge sparas tillsammans med ursprungligt leveransunderlag. Att spara privat ändrar ingen order eller bevakningsuppgift. Saknade datum/fält får ligga i utkastet, men explicit CRM-registrering kräver fortfarande giltiga uppgifter och faktisk bekräftelse. Ta bort i Min dag kasserar utkastet; det återställer ingen redan registrerad leverans.

En kollegas leveransändring kräver Granska aktuell leverans och ditt uttryckliga val av nytt underlag. Valet kan sparas privat men registrerar ingen leverans. En annan enhets privata revision ger i stället utkastkonflikt med uttryckligt versionsval. Fel eller förlorad kvittens bevarar texten; oförändrat CRM-återförsök använder samma sparade privatversion, innehåll och begärans-ID. Servern arkiverar exakt utkastversion atomiskt med leveransändringen.

Ny typ `receipt` använder befintlig `crm_drafts`; inga SQL-tabeller eller kolumner läggs till. V34:s klient kan inte återuppta typen. Vid UI-återgång ska receipt-format, kompatibel klient och serverns roll-/basis-/CAS-/idempotensregler bevaras. Använd inte en äldre klient för att kassera ett okänt utkast. Ingen rollback har genomförts. Gemensam CRM-kopia omfattar fortfarande inte privata utkast, konton eller Microsoft. Aktiva utkast av alla typer hindrar osäker restore; separat konto-/utkastbackup och faktisk hostingåterställning återstår.

Slutkontroller, källrevision, main och faktisk publicering finns i [VALIDATION](VALIDATION.md). Detta är syntetiska utvecklingsprov; verkliga konton, personal, telefon, skärmläsare och autentiserad live-UI är oprövade.

## Kontaktspärr i Företagsökning, 5 oktober 2026

Säljare och administratör kan välja **Spärra prospektering** eller **Återöppna kontakt**, med en obligatorisk orsak. Beslutet sparar autentiserad aktör, tid och revision; äldre beslut finns kvar. Spärrade poster kan visas genom filtret Kontaktstatus, men kan inte föras till nykundsbearbetning genom `lead_convert`. Kontaktlänkar i den spärrade posten visas som text. Spärren styr Företagsökning; befintliga kundkort och deras aktiviteter behöver separat kontaktpolicy när fler utskicksvägar byggs.

Återimport bevarar beslut och kundkoppling, även när datakällan ändras för samma organisationsnummer. Tioställigt organisationsnummer, med/utan bindestreck, och SCB:s juridiska persons nummer med prefix 16 får samma nyckel. Detta är formatmatchning, ingen kontroll mot ett externt företagsregister. Utan organisationsnummer krävs exakt samma datakälla och källans företags-ID för säker matchning. Namn/ort gör inga företag identiska; tvetydig import som kan motsvara en spärrad post stoppas med krav på kompletterad identitet.

Import kan inte skapa eller skriva över spärrhistorik, flytta befintligt kundansvar eller injicera en återöppning. Gamla dubblettrader med samma företagsidentitet delar effektivt senaste beslut. Samtidig ändring av samma underlag kräver medveten omläsning och behåller användarens orsak och avsikt. Oberoende ändringar och samma request-ID kan återförsökas enligt befintlig CAS/idempotens.

Ingen SQL-migrering behövs: LeadSchema läser gamla poster med tom historik och lagrar nya fält i befintlig JSON. Strömmad CRM-kopia inkluderar historiken. **Återpublicering av äldre kod efter att nya kontaktbeslut skrivits är inte en säker rollback**: äldre LeadSchema kan strippa fälten vid senare skrivning. Bevara nya fält och använd en verifierad återställningsväg vid en sådan ändring.

Det löpande utvecklingsmandatet och körningen finns i [agent/MISSION.md](agent/MISSION.md) och [agent/RUNBOOK.md](agent/RUNBOOK.md). Tekniska resultat finns i [agent/LOG.md](agent/LOG.md) och [VALIDATION.md](VALIDATION.md).

## Aktuell komplettering 4 oktober 2026

Se [STATUS-2026-10-04.md](STATUS-2026-10-04.md) för aktuell kravmatris. Historiska v12/v13-prov längre ned är inte riktiga hosting-/kontoprov.

**Backup:** Hämta CRM-kopia med kundfiler exporterar nu en strömmad `.ndjson`-fil (`magnussons-crm-backup-2`). Kopian behandlar en fil i taget och kräver verifierad slutmarkör vid återställning. Det finns ingen separat totalgräns på 10 MB för filinnehållet. Gränserna är 5 MB per fil, 200 filer per kund, 2 000 filer totalt och 16 MB CRM-data inklusive filförteckning. Driftleverantörens request-/CPU-/minnesgränser måste fortfarande provas med rätt volym i en isolerad hostingmiljö. En avbruten eller ändrad export får ingen giltig slutmarkör.

Återställaren verifierar filstorlek, SHA-256, hela paketets integritet, kund-/korrektur-/arbetsversionskopplingar och slutet av filen. Den lägger nya filobjekt åt sidan och skriver CRM-data/filmetadata atomiskt till en tom målmiljö. Bekräftat misslyckande städar bara de nya objekten. Okänt commitutfall bevarar objekten tills utfallet kan kontrolleras. Samma begäran kan återförsökas. Originalets filer lämnas orörda och nya fil-ID:n kopplas till återställda referenser.

Tidigare `magnussons-crm-backup-1` JSON-kopior kan fortfarande läsas; dessa har sina ursprungliga 10 MB fil-/16 MB paketgränser. Den äldre JSON-exporten finns också kvar i API:et utan `format=stream`. Inget av formaten omfattar konton, Outlook-anslutningar/cache eller privata utkast. Kopior innehåller kunddata och ska förvaras utanför det publika repot.

**Direktleverans:** Använd Registrera direktleverans i ordervyn/orderns guide. Ange faktiskt skickat antal per artikelrad, datum, leveranssätt, mottagare, adress där den behövs och belägg. Delvis skickat lämnar kvarvarande åtagande öppet. Faktura och kundmottagande registreras separat efter fullständigt leveransunderlag. Äldre skickade order saknar ibland rader/belägg; de märks overifierade och behöver granskad komplettering, utan uppfunna historiska mängder.

**Hinder:** Spara hinder och Hindret är löst är separata handlingar. Den senare kräver en upplösningsorsak och rapportörens eller administratörens behörighet. Lösningen sparar aktör och tid; att tömma textfältet löser inget hinder. Ett öppet hinder blockerar tryck, avsändning och avslut genom mängdminskning.

**Samtidighet och resultat:** Kundplan, bearbetning, onboarding och företagskalender kontrollerar underlaget från öppningen/klicket. Vid konflikt behålls texten och aktuell version måste läsas in medvetet. Fakturaansvar sparas separat från nuvarande orderansvar; namnbyte och överföring av allt öppet arbete kräver fortfarande stabila kommersiella ID:n.


## Dagligt arbete

1. Registrera/importera kunder under Inställningar. CSV-importen förhandsgranskas och kan kopplas till Fortnox kundnummer. Befintliga kundkort skrivs inte över.
2. Registrera artiklar med källa, artikelnummer, färg, storlek, variant-ID, produktlänk och aktuella priser. Import stöder CSV. Ny webbshop läggs till som separat artikelkälla.
3. Skapa affärsutkast eller kundbekräftad order under Artiklar & beställning. Förslag kan kompletteras med tryck, frakt och övriga kostnader i affärens kalkyl före accept. En kundorder skickas inte till webbshoppen.
4. En accepterad beställning öppnar guiden Färdigställ order: leveransadress, låsta artikelrader, uppladdning/val av skiss, verkligt kundgodkännande, leverantör och tidsplan finns på samma sida. Skisser sparas direkt bland kundens gemensamma filer.
5. Lämna till tryck och lager sparar hela godkännandet och tryckordern i en transaktion. Ogiltig filversion, fel antal eller felaktiga datum lämnar utkastet kvar utan delvis inlämnad order. Datum följer tryck → utleverans → kundens leveransdag. Orderns leveransadress sparas som en egen ögonblicksbild.
6. Lager registrerar mottagna antal per artikelrad. Tryck kan ta emot arbetsordern och registrera färdigtryckta antal, högst vad som är mottaget. Hinder meddelas säljaren och blockerar färdigmarkering/utleverans tills de lösts.
7. Lager registrerar utleverans per rad, högst vad som är färdigtryckt, med separat adress, mottagare och valfri fraktreferens för varje försändelse. Delleveranser lämnar återstående antal i kön. Efter sista utleveransen lämnar ordern aktiva köer och säljaren får notis och uppgift att fakturera. Skickad innebär inte bekräftat mottagen av kund, och bokför inte försäljning automatiskt.
8. Under På väg till kunden bevakas skickade order även efter fakturering. Registrera försening och nästa kontroll, eller faktiskt mottagningsdatum och vem/vilket underlag som bekräftat leveransen. Bekräftelsen avslutar bevakningen och skapar kunduppföljning. En fakturasammanställning per order stöds efter att hela ordern skickats. Flera fakturor/krediter och separat kundmottagande per försändelse stöds ännu inte.

En arbetsorder kan avbrytas och lämnas in på nytt innan fysisk hantering eller kundgodkänd antalminskning registrerats. När mottagna, tryckta eller skickade varor finns ska ett hinder registreras; ett nytt arbetsunderlag får inte nollställa de befintliga antalen. Detta gäller även äldre avbrutna arbetsorder. Tidigare tryckrevision med skissreferens, artikelrader, datum och aktörer sparas vid ominlämning. Redan utlevererade order kan inte flyttas tillbaka till produktion.

## Min dag och privata utkast

Sedan v30 betyder Spara utkast & stäng i Följ upp alltid privat sparning av hela utkastet, även utan anteckning. Kontaktresultat, datum, avslutsmarkering och nästa steg/datum bevaras. Samma sak gäller X/Escape och dialogens vägar till offert eller kundflöde; misslyckad flush hindrar stängning/navigering. Ett redan skapat orört utkast ligger också kvar. Använd Ta bort → Ja, ta bort utkast i Min dag för att ta bort det från aktiva utkast. Privat sparning uppdaterar ingen CRM-kontakt eller uppgift; anteckning och övriga valideringar krävs fortfarande vid CRM-inlämning. Det separata sparflödet och mobilknapparna är verifierade enligt [VALIDATION](VALIDATION.md), utan ändrad lagring eller migration.

Sedan v28 använder öppna `delivery`-kontaktuppgifter efter mottagen leverans Följ upp. Ange vad som hände och välj faktisk kontakt, inget svar eller internt arbete; avsluta/planera om och ange nästa aktivitet vid behov. Dessa uppgifter sparas tillsammans. Bara faktisk kontakt uppdaterar senaste kontakt, och separat kundavstämning flyttas inte. Mottagande, fakturering, överlämning och korrektur-/orderdeadline behåller sina särskilda flöden. Slutprov/publicering finns i [VALIDATION](VALIDATION.md); ingen lagringsmigrering krävs och v27 är datakompatibel återgång. Ingen rollback eller faktisk hostingåterställning har genomförts.

Startytans huvudknapp öppnar den föreslagna aktivitetens vanliga arbetsdialog. Snabbvalen Anteckna, Ny offert/order och Sök kund behåller kundvalet. Statuskorten flyttar fokus till dagens arbetslista eller orderhinder. Försäljningskortet öppnar aktuell rapportmånad och rätt egen/team-vy. Konton utan säljarprofil får inga personliga nollsiffror; administratören väljer Öppna teamets dag. Läsare kan se leveransunderlag men erbjuds ingen bekräftelse- eller sparhandling. Sparstatus och eventuella fel för privata utkast ska vara synliga även på mobil.

Teamets arbetsyta och Min dag öppnas som standard. Dashboardens personliga urval styrs av inloggningens koppling till ansvarig säljare. Alla personliga resultat, mål, aktiviteter och genvägar använder samma urval. Teamets dashboard är ett separat menyval för ledning/administratörer och summerar hela företaget. Min dag visar personliga aktiviteter, orderhinder, kundmöten, kontaktbehov, pågående utkast och leveransbevakning. Administratören kan växla till hela teamet. Huvudmenyn har de dagliga verktygen; övriga funktioner finns under Fler verktyg. Återköp från kundvården väljer en tidigare accepterad beställning och kopierar dess rader till en ny affär, med nytt krav på pris- och kundbekräftelse. Om tidigare produktion är färdigtryckt eller skickad sparas dess skiss, instruktioner och arbetsversionsreferens som förslag till det nya underlaget. Godkännanden återanvänds inte.

Beställningar, tryckunderlag, kundanteckningar, uppföljningar och vanliga kund-/affärs-/order-/aktivitets-/mötesformulär sparas som privata utkast separat per inloggad användare och arbetsyta i `crm_drafts`. De påverkar inte gemensam CRM-version, kalkyl eller produktion före inlämning. Ofullständiga fält får sparas. Sparade utkast kan fortsättas efter omladdning eller på annan enhet. Osparade ändringar har en reservkopia i webbläsarens localStorage, avskild per användare och arbetsyta och varnar innan fliken lämnas; vänta på Sparat innan fliken stängs. Två enheter kan inte tyst skriva över samma version. Vid konflikt väljer användaren uttryckligen vilken version som ska användas. Kundacceptansen i katalogen nollställs när underlaget ändras.

Utkast arkiveras samtidigt som motsvarande order/tryckarbete skapas. Misslyckad inlämning eller samtidig ändring behåller utkastet. Utkast kan kasseras från Min dag eller katalogen. Högst 100 aktiva utkast per användare/arbetsyta. Privata utkast ingår inte i den gemensamma CRM-exporten.

### Privata kundflöden, B05a

Kundplan, bearbetning och onboarding använder separata utkasttyper `plan`, `prospecting` och `onboarding` med `context=customerId`. Innehållet omfattar ofullständiga formulärfält och det ursprungliga kundunderlaget. De är privata per autentiserad användare och arbetsyta, även gentemot andra administratörer. Sparning av ett utkast ändrar ingen gemensam CRM-version, kundkontakt eller aktivitet. Min dag och kundflödet låter användaren fortsätta arbetet. Företagsevent och andra specialdialoger omfattas inte av denna del.

Inlämning använder exakt sparad utkastversion och kundbasis. Kundändring och arkivering sker i samma CAS-skyddade transaktion; förlorat svar kan återförsökas med samma begäran. Kollegans kundändring och en annan enhets utkastrevision är olika konflikter. Texten bevaras och en aktuell kundversion måste granskas uttryckligen. Krysset för en avstämning idag avmarkeras vid återupptagning; servern kräver dessutom dagens explicit sparade kontaktmarkering. Komplett onboardingchecklista avslutar inte onboarding utan dess uttryckliga slutknapp.

Ingen SQL-migrering eller ny gemensam kundmodell införs. Utkasten lagras som nya typer i befintlig `crm_drafts`; tidigare utkastformat förblir läsbara. Äldre v18 kan inte redigera eller återuppta de nya typerna. Vid återgång ska de privata raderna bevaras och en kompatibel version publiceras för fortsatt arbete; använd inte en äldre klient för att kassera ett okänt utkast. Befintliga skydd för säljar-ID:n och kontaktspärr gäller fortsatt. CRM-kopia omfattar fortfarande inte privata utkast, konton eller Outlook. Separat driftbackup för dessa tabeller behöver provas; denna ändring bevisar ingen hostingåterställning.

Äldre skickade order som saknar leveransbevakning får en deterministisk mottagningsuppgift i läsvyn. Den sparas vid nästa CRM-skrivning. GET skriver inte arbetsytan. Uppgiften kan inte bockas bort som vanlig aktivitet; faktisk leverans avslutar den. Fakturering avslutar bara fakturauppgiften.

Personlig månadsförsäljning räknas från den ansvariges fakturor i månaden, årsförsäljning från samma ansvarigs fakturor i kalenderåret. Egna månadsmål kommer från säljarmålen och egna årsmål kan anges separat. Utan uttryckligt årsmål används endast en summa av tolv kompletta månadsmål; delvis satta månadsmål visas inte som ett helårsmål. Företagets budget används aldrig som den enskildes mål. Noll är ett satt mål, men ger ingen procentberäkning. Marginal räknas på försäljningen för just de fakturor som också har kostnad. Kvalificering grupperas efter svensk kalendermånad.

Konton utan giltig säljarkoppling får en tydlig uppmaning att koppla profil, utan att automatiskt visa teamets siffror som personliga. Ledning/administratörer kan öppna teamvyn manuellt. Konton & roller visar skillnaden mellan en ansvarig i kundregistret och ett faktiskt personligt konto. Profilen Ledning & säljare motsvarar admin med säljarkoppling och ger full administration. Detta är inte en begränsad chefsroll. Befintliga säljares åtkomst till delade kunddata är fortsatt gemensam; personligt urval är inte sekretess mellan säljarna.

## Säkrare uppdateringar och dataexport

Kund-, affärs-, order-, aktivitets- och mötesformulär behåller en oföränderlig bas från öppningen. Servern kräver samma postunderlag vid uppdatering; en ny global version efter konflikt får inte tyst ersätta basen. Formuläret visar ändrade fält och låter användaren kopiera sitt utkast innan aktuella uppgifter läses in. Artikelredigering och artikelkällor har motsvarande ändringsvakter. Viktiga ändringar av ansvar, datum, priser, korrekturgodkännande och fakturauppgifter får före/efter-text i kundhistoriken. Detta är inte en fullständig administrativ revisionslogg.

Affärens nästa aktivitet styr datum, text och ansvar i den öppna offert-/behovsuppgiften. En avklarad uppgift återskapas inte när enbart övrig offerttext rättas. Uppföljningsfält redigeras via affären; uppgiften kan klarmarkeras separat.

Kvantitetsdialogen utgår från en bestämd arbetsversion och registreringshistorik. Ny händelse eller arbetsversion kräver inläsning av aktuella antal. Registreringar sparar tid, användare och berörda rader. Befintliga helorderbekräftelser visas som äldre registreringar; historiska arbetsversioner summeras aldrig med nuvarande.

Den äldre JSON-exporten innehåller bara CRM-data och avvisas vid återställning om den hänvisar till saknade kundfiler. Funktionen CRM-kopia med kundfiler innehåller också samtliga kundfiler och kontrollsummor. Se återställningsprovet nedan. Ingen referens eller godkännandestatus raderas tyst.

## Roller och notiser

- Administratör: hela CRM inklusive import, artikelregister, inställningar och konton.
- Säljare: kundarbete, orderbeställning, uppföljning och aktivitetsplanering. Aktiv säljare ska kopplas till ansvarig säljare under konton.
- Tryck: arbetsordrar, skisser, mottagning av arbetsorder, färdigtryckt och hinder.
- Lager: arbetsordrar, skisser, varumottagning, utleverans och hinder.
- Läsare: läsbehörighet till säljarbetsytan.

Tryck/lager får filtrerade serversvar utan kalkyler, fakturor, privata anteckningar, prospektlistor eller Outlook. Rollerna behöver även få personlig Site-åtkomst; att lägga till en CRM-roll skickar ingen inbjudan. Säljarnotiser riktas efter orderns kundansvariga. Administratörer ser alla arbetsnotiser. Läsmarkering är personlig.

Aktiva arbetsvyer pollar normalt var 30:e sekund samt vid fokus. Pollning pausar vid öppna dialoger, formulärfält, utfällda detaljer samt artikel-/inställningsvyer. Versionskontroll och idempotenta skrivningar skyddar samtidiga ändringar. Notiser är i CRM, inte push eller e-post. Notisernas antal, deadlines och kundsignaler följer personligt/teamurval; gemensamma teamnotiser finns i båda vyerna. Säljarens orderkö och faktureringsantal följer samma ansvarigfilter som leveransbevakningen.

## Prospektering och planering

Företagsökningen gäller importerade listor, inte hela Sveriges företag. Filtrera på företag/org.nr, bransch, ort, antal anställda, befattning och radie. Radien beräknas som fågelväg från ungefärliga Vinslöv (56.104866, 13.913155); företag utan koordinater utesluts vid radiefilter. Kontaktuppgifter kommer från underlaget, aldrig gissad AI-data. Import kräver angiven källa. Konvertering skapar prospekt, kontaktpersoner och nästa aktivitet; befintligt organisationsnummer länkas till rätt kund.

Företagskalendern har event, kampanjer, intern planering och checklistor med ansvariga/deadlines. Årsresultat och årsmål visas för hela företaget separat från månadsurvalet. Resultat utgår från manuellt registrerade fakturor.

Notisvyn visar datumstyrda uppgifter, aktiva orderdeadlines, kundkontaktssignaler och förslag sex månader efter ett artikelköp. Återköp beräknas ur registrerade fakturadatum och artikelrader, grupperat på källa, artikelnummer och variant. Två eller fler order märks som återkommande. Ny kundkontakt efter sexmånadersdagen tar bort signalen. Detta är regler, inte AI eller säkerställda behov.

## Externa anslutningar – ännu inte aktiva

- Fortnox: kund- och artikel-CSV kan importeras. Ingen automatisk kundsynk, fakturaläsning eller fakturaskrivning. API kräver registrerad integration, rättigheter och kundens anslutning.
- Webbshop: produktreferenser och lokalt artikelregister; ingen kataloghämtning, lagerstatus eller orderöverföring. Bekräfta leverantör och stöd för både nuvarande och kommande webbshop. Ett Fortnox-artikelregister är inte nödvändigtvis hela webbshopens sortiment. Unitedprofile beskriver att deras leverantörskatalog inte exporteras via API/fil.
- Företagsdata: CSV-import; ingen Vainu-anslutning eller liveföretagssökning. Kräver licensierad källa och verifierade svenska datafält.
- Outlook: befintlig implementation läser personliga mejl och kalender efter konfiguration/anslutning, med uttrycklig delning av kunddialog. Den skickar inte mejl/inbjudningar och gör inte gemensam tillgänglighetsbokning. Avstängd för tryck/lager.
- AI: ingen aktiv textmodell, automatiskt mejlskrivande eller ljudtranskribering. Anteckningsfunktionen sparar text. E-postlänkar öppnar användarens e-postprogram.

## Validering

`node tests/outlook.mjs` kör CRM/operations-testsviten och Outlook-tester. SQLite kör riktiga migreringar och API-skrivningar; R2 och Microsoft Graph ersätts med kontrollerade svar. Tester använder aldrig produktionsdata. Sviten kontrollerar personliga kontra gemensamma KPI:er, kostnadsunderlag, personliga årsmål och konton utan säljarprofil. Den täcker även konflikter med upprepat sparförsök, uppföljningsdatum, strukturerade varianter, delmottagning/tryck/utleverans, spärrar mot för tidig fakturering, äldre kvantiteter, 100-raders notiser, saknade filer vid återställning och samtidiga utkast, atomisk inlämning, en orderändring mitt i förberedelsen, saknade underlag, återköp och försenad leverans efter fakturering. Detta ersätter inte ett användartest med Sebbe och en säljare i verkliga kundärenden. TypeScript kontrolleras med `node node_modules/typescript/bin/tsc --noEmit`. Publicering använder Sites build/package-flöde. Ingen automatisk drift-/belastningsgaranti följer av dessa tester.

## Primärkällor kontrollerade 2026-09-15

- https://support.fortnox.se/produkthjalp/fakturering/export-av-kundregister
- https://support.fortnox.se/produkthjalp/fakturering/export-av-artikelregister
- https://www.fortnox.se/developer/authorization/get-authorization-code
- https://www.fortnox.se/developer/guides-and-good-to-know/scopes
- https://support.unitedprofile.com/hc/sv/articles/8753082473500-Erbjuder-ni-export-av-produktdata
- https://www.unitedprofile.se/integration
- https://developers.vainu.com/docs/quick-start
- https://developers.vainu.com/docs/filtering-company-data
- https://www.hembygd.se/vinslovs-hembygdsforening/plats/431780

## Task-oriented interface (September 2026)

- Sales starts in Min dag. Five primary sections: Min dag, Kunder, Offerter & order, Kalender, Resultat. Customer workflows, print/warehouse, correspondence and administration remain available through contextual navigation. Resultat keeps personal/team sales and goals; daily task lists live in Min dag.
- Global create/search requires a deliberate customer selection. Creating a missing customer resumes the chosen note, offer, activity or meeting flow. Customer dialogs return to their customer card and underlying list/filter. Ordinary customer/deal/order/task/meeting/note forms now have persistent private drafts. Settings retain a discard warning. Catalog and production drafts remain persistent and private.
- `follow_up` atomically saves the note, explicit task completion/rescheduling, optional next task and canonical deal next step. Allowed kinds also include csm, csm_issue, csm_need, prospecting, onboarding, care and year:*. Protected business tasks cannot be completed through the focused dialog. Issue callbacks synchronize the issue plan; needs, onboarding and annual tasks keep their business deadlines and receive a separate manual callback task. Only actual contact updates lastContact; nextReview is not implicitly extended. Quote/discovery and unanswered attempts require a next action. The basis covers the task and the linked deal's ownership/stage/next action; stale basis returns 409 even after a workspace refresh. Request IDs prevent duplicate side effects.
- Customer details use progressive disclosure. Order preparation shows one of five steps at a time; review links return directly to missing details. Keyboard focus moves to the active step heading. Approved line and proof gates, atomic handoff, partial quantities and invoice rules are unchanged.
- Sales production cards summarize work with expandable details. Print/warehouse actions live in their department views, including for admins. Read-only expanded production cards do not pause automatic state refresh. The sales order scope is visible and editable above orders and customer receipts.
- Verified with CRM/Outlook mock regression tests and TypeScript/build checks. Browser interaction and actual user usability have not been tested in this revision. No external service was connected and audience was not expanded.


## Förändringar efter Saleshub-inspiration och oberoende granskning, 2026-09-16

Kundkortets överblick samlar nästa aktiviteter, order, behov, kontaktdatum och en sökbar tidslinje. CRM-händelser och tillgänglig Outlook-korrespondens visas tillsammans; Outlooks befintliga personliga delningsregler gäller. Min dag visar regler för offertuppföljning två dagar efter missat datum och chefsuppföljning efter fem dagar, samt leverans inom fem dagar som saknar underlag. Reglerna är läsvyer med stabil identitet och försvinner när villkoren upphör. De skickar inte externa meddelanden och körs inte som bakgrundsjobb.

En importerad aktiv kund får nästa avstämning inom sju dagar och en faktisk aktivitet. Aktiva kunder utan öppen aktivitet eller planerat CRM-möte får en signal. Vanlig anteckning med kundkontakt flyttar inte nästa avstämning. Ett avslutat CRM-möte skapar uppföljning.

Vunnen order kan ändras före tryck genom Ändra accepterad order. Spara ett förslag med orsak och nya rader; den tidigare accepterade ordern gäller tills ett nytt kundgodkännande registreras. Samma affär och order behålls, ursprungligt vinstdatum bevaras och godkända revisioner sparas. Korrektur och leverantör måste bekräftas igen. Pågående ändringsförslag blockerar fortsatt leverans/tryck och fakturering. Detta registrerar ett mottaget godkännande; ingen e-signering eller offertutsändning sker.

Kassation före/efter tryck registreras av lager respektive tryck, med orsak. Beställt antal gäller fortfarande och ersättningsbehov visas. Kundgodkänd minskning registreras av säljare/admin med antal, orsak, godkännare, datum och nytt överenskommet ordervärde. Den får bara avse saknade, ännu inte hanterade varor. En order på 50 med 48 skickade och två godkänt borttagna avslutas i produktionskön och kan faktureras. Faktisk utleveransdag bevaras även när överenskommelsen registreras senare. Helt nollställd order får inte bli en falsk leverans. En arbetsversion med kundgodkänd minskning får inte avbrytas och återskapas så att minskningen försvinner; rapportera hinder vid ytterligare ändring.

Skrivningar med egen post-/aktivitets-/produktionsbas får appliceras på aktuell arbetsyta när en kollega bara har ändrat annat. Samma underlag kontrolleras igen efter en faktisk databas-CAS-konflikt. Övriga kommandon behåller global versionsspärr. Idempotenta kommandon lagrar exakta skapade ID:n, aktör och innehållsfingeravtryck. Privata utkast har separat revisionskontroll. Formulär låses under sparning och utkast kan återupptas eller tas bort från Min dag.

Administratörer för första åtkomst anges i runtime-värdet CRM_BOOTSTRAP_ADMINS: en JSON-lista med email, name och owner. Befintliga medlemsrader gäller före bootstrap-konfigurationen; avstängda konton återaktiveras inte. Ingen utvecklaradress finns hårdkodad i koden. Förändring av ägarskap, avtal och återbindning av en återanvänd e-postadress hanteras fortfarande separat. Webbläsarassistentens läsverktyg är avstängt som standard och kan aktiveras för aktuell session under Inställningar. Det lämnar bara prioriteringsunderlaget, inte hela kundobjekt.

### Återställningsprov i isolerad miljö

Provdatum: 2026-09-16. Kommando: `node tests/outlook.mjs` (inkluderar `tests/v12.mjs`). Miljö: SQLite med riktiga migreringar/API och kontrollerad R2-ersättning. Resultat: godkänt.

- Export och import med kunddata, order, skiss-/korrekturreferenser, godkännandestatus och binär kundfil på 5 MB.
- Import till tom demoyta medan originalets filer finns kvar. Nya fil-ID:n och omskrivna referenser utan ändring av originalet.
- Felaktig kontrollsumma, saknad fil och fel version avvisas innan filer eller CRM-data skrivs.
- Avbruten filuppladdning och konkurrerande CRM-skrivning ger städning av endast nya temporära filer.
- Förlorat databassvar efter lyckad commit känner igen den sparade begäran och bevarar filerna. Om commit-resultatet inte kan fastställas behålls filerna för att inte radera en möjlig lyckad återställning.
- Samma begäran kan upprepas utan dubbel återställning.

Äldre JSON-kopians gränser: 5 MB per fil, 10 MB filer totalt, 16 MB hela paketet, 200 filer per kund och 2 000 filer totalt. Export stoppas om den skulle bli ofullständig. Import kräver helt tom arbetsyta utan filer eller öppna utkast. Outlook, konton, autentiseringshemligheter och privata utkast ingår inte. Kopian är en manuell CRM-återställningsväg, inte automatisk katastrofåterställning för hela driftmiljön.

Kvar före driftlöfte: verifiera plattformens skydd av inloggningsheadrar och återställning i den faktiska hostingen, åtkomst-/dataägarskap och supportansvar, samt användartest med Sebbe och en säljare. Riktiga Microsoft-/Fortnox-konton, mejlutsändning, webbshopsorder och AI/transkribering är inte anslutna. Inga nya personer har bjudits in i denna ändring.

Produktinspiration: Saleshub AI:s offentliga beskrivningar av kundkort, samlade aktiviteter, integrationer och villkorsstyrd uppföljning: https://saleshubai.se/funktioner och https://saleshubai.se/integrationer. Detta är inspiration för vårt eget arbetsflöde; inga påståenden om att deras anslutningar har prövats eller kopierats.

## Mobil och gemensam produktion (v13)

- Rollen `production` heter **Tryck & leverans**. Den får ta/lämna eget jobb, registrera mottagning, tryck, utleverans, kassation och hinder. Den får både tryck- och lagernotiser; ekonomifält, säljutkast, allmänna kundfiler, Outlook, medlemsadministration och backup är spärrade på servern.
- Arbetsansvar är en person med stabilt autentiserat ID. Det är ansvarsfördelning, inte exklusivt lås: andra behöriga får hjälpa till med fysiska registreringar. Aktören loggas. Egen monoton assignment-revision skyddar samtidig claim, ABA och omförsök; befintlig produktionsbasis skyddar antal separat.
- Arbetsfoton sparas omedelbart på kund + order + arbetsversion. Endast aktiva arbetsorder tar emot nya foton. Högst 5 MB JPG/PNG/WebP, med kontroll av filsignatur. Avdelningar kan bara läsa arbetsorders skisser och kopplade foton. Råa äldre order får sakna production/history. Kopian med filer bevarar arbetskopplingen vid återställning.
- Lägg till från knappen **I mobilen**: Safari / Dela / Lägg till på hemskärmen, alternativt Chrome / Lägg till på startskärmen. Manifest använder autentiserad hämtning; samma konto och behörighet. Internet krävs. Ingen offlinekö, bakgrundssynk eller push aktiveras av detta.
- Testat i isolerad SQLite/R2-harness: samtidiga anspråk och CAS-omförsök, rollgränser, personliga notiser, fotoavgränsning, föråldrad arbetsversion under uppladdning, tappat commitsvar, fotoåterställning och mottagning → tryck → utleverans. Detta är inte ett verkligt hosting- eller telefonprov.
- Installation, inloggning och fotoval behöver provas på Magnussons faktiska iPhone/Android före utrullning. Inga nya medarbetare har fått inbjudan i denna uppdatering; verifiera deras adresser och identitet vid uppläggning.

## Beständiga resultatprofiler, B01a

- **Personer bakom resultaten** under Mål & inställningar initierar profiler efter administratörens granskning av samtliga äldre ansvar och mål. Kontoval börjar utan länk. De erbjudna kontona är verifierade aktiva CRM-medlemmar med rätt sälj-/administratörsroll och uttrycklig operativ ansvarskoppling.
- Profil-ID och ursprunglig ansvarsetikett är oföränderliga. Visningsnamnet gäller resultatuppföljningen. Fakturans säljare kommer från orderansvaret vid första registrering, inte från den som matar in uppgifterna; senare omfördelning flyttar inte attributionen. Prospects räknas vid första kvalificering med motsvarande historiska profil-ID.
- Personligt resultat kräver rätt medlems-ID-länk efter initialisering. Samma namn, mejl eller ansvarsetikett ger ingen automatisk koppling. Ny/ändrad länk kontrolleras igen i den atomiska databasuppdateringen; ändrad länk har serverägd aktör, tid och orsak. Inaktiverade konton kan behållas i historiken utan att en ny person ärver resultatet.
- Äldre fakturor där dagens orderansvar har fyllts i som reserv ger ingen gissad personattribution. Beloppet ingår i teamtotalen och visas som omappat; samma gäller gamla kvalificeringar utan sparad ansvarssnapshot. Granska originalunderlaget innan en framtida migrationsfunktion kopplar sådana poster.
- Operativa ansvarsetiketter och kontrollerad överföring återstår som B01b. En tidigare registrerad etikett får inte tas bort och sedan återanvändas som en ny person. Nya ansvar kan få separata profiler; dessa får aldrig automatiskt äldre omappad historik.
- Backup/restore bevarar profilregistret, mål, attribution och kopplingshistorik. Aktuella kontolänkar rensas i målmiljön och måste väljas uttryckligt igen. Konton, inloggning och Outlook återställs fortfarande separat. Återläsningen ändrar inga CRM-roller eller plattformens delning.
- Ingen SQL-migrering krävs; befintliga JSON-poster får additiva fält. Efter profilinitialisering får tidigare kod som saknar dessa schemafält inte återpubliceras och skriva data: den kan kasta bort ID:n eller återgå till namnbaserade resultat. En återgång måste bevara den nya modellen och dess läs-/skrivskydd. Samma försiktighet gäller kontaktspärrens fält från föregående leverans.

## Granskat byte av kundansvar, B01b1

**Byt kundansvar** på kundkortet låter en administratör välja en annan aktiv, granskad säljarprofil, ange orsak och välja vilka öppna fristående aktiviteter som ska följa med. Målval och uppgiftsval börjar tomma. Granskningen visar gammalt/nytt kundansvar, valda uppgifter och övrigt ansvar som inte ändras genom denna handling.

Endast öppna uppgifter av typen `manual`, `care` eller `meeting_followup`, utan affärskoppling, på samma kund och med kundens nuvarande ansvariga kan väljas. Andra personers uppgifter, avslutade uppgifter, affärs-/orderuppgifter och specialflöden följer inte med automatiskt. Affärer, order, möten, onboardingansvar, ärendeansvar och årshjulsansvar ändras inte genom överföringen. Dessa behöver hanteras i sina arbetsflöden; ett kundansvarsbyte är ännu inte en komplett personalöverlämning.

Kundansvar, valda uppgifter och historik skrivs atomiskt. Historiken innehåller stabila profil-ID:n, ansvarsetiketterna vid överföringen, uppgifts-ID:n, orsak, tid och autentiserad aktör. Underlaget kontrolleras igen vid databasens CAS-återförsök. Ett ändrat överlämningsunderlag behöver läsas in och granskas på nytt; text och val behålls vid fel. Samma begäran får inga dubbla överföringar. Aktörens adminrätt och en eventuell kopplad mottagares konto kontrolleras även vid databasuppdateringen.

Efter profilinitialisering ändras befintlig kunds ansvar genom detta flöde, inte det vanliga kundformuläret. Vanlig kund-/importpayload kan inte skapa eller ändra överföringshistorik. En historikrefererad uppgift kan inte flyttas till en annan kund och bryta spårbarheten. Nya återköp och nya leveransuppföljningar följer aktuellt kundansvar; redan befintligt affärs-/orderarbete och historiska faktura-/prospectresultat bevaras.

Operativa poster använder fortfarande sina befintliga ansvarsetiketter. Det granskade överföringskommandot väljer profiler via stabila ID:n; full migrering av alla operativa referenser återstår. Inga verkliga konton, kundöverlämningar eller personalbeslut antas genom kodpublicering. CRM-kopia behåller ansvarshistoriken och verifierar kund-, profil- och uppgiftskopplingar, medan aktuella kontolänkar fortsatt återställs separat. Produktionsvyn får inte denna kommersiella historik.

Ingen SQL-migrering tillkommer. Äldre kod, inklusive v18, saknar det nya historikfältet och skrivskydden och får inte återpubliceras som skrivande rollback efter att nya överföringar registrerats. Bevara den additiva datamodellen och verifiera återställningsvägen. Isolerade prov är inte en genomförd live-återställning.

## Kundöversikt och svensk avsändningsdag, D01

D01 ändrar ingen SQL-migration, lagringsmodell, externa ID:n eller bilagekoppling. Produktionsavsändningens befintliga tidsstämpel jämförs med mottagningsdatum som Europe/Stockholm-kalenderdag; direkta försändelser behåller sina uttryckliga datum. Ogiltig icke-tom avsändningstidpunkt ger ett begripligt fel i stället för ett antaget datum. Underlaget skrivs inte om automatiskt. Befintliga backup-/återställningsprov ska köras för slutkandidaten; de är isolerade lokala prov, inte ett återställningsprov i Sites.

Vid problem med den nya presentationen ska en verifierad rättning eller enbart UI-återgång bevara B01b1/B05a-serverregler och befintliga historiker/utkast. Återpublicera inte v18 som skrivande rollback efter nya kundansvarshistoriker. Kod-/live-kvittens och källträd anges i PR för D01; D1/R2-bindningar och delning behålls.

## Mobilheader, aktörskontroll och svenska godkännandedagar, v20

V20 publicerades den 5 oktober med en mobilheader som växer när kontrollerna radbryts, så att bannern inte täcker arbetsyteväljarens tryckyta. Befintliga arbetsytebyten, privata utkast, revisionskontroller och rollgränser behålls. Slutprov på byggd artefakt och publiceringskvittens anges i VALIDATION och aktuell status; de är inte fysisk telefon- eller personalverifiering.

Huvudendpointens `POST /api/crm`, inklusive `type=restore`, läser om aktörens medlemskap och rätt till handlingen inför varje CAS-försök. Databasens atomiska skrivvillkor kräver fortfarande aktivt medlemskap med samma medlems-ID, användar-ID, roll och ansvar som servern nyss läst. Om dessa ändras före commit kan begäran inte skriva CRM-data, arkivera sitt utkast eller lagra mutationskvittensen med gammal behörighet. Omförsök kontrollerar aktuell roll igen. Detta kompletterar befintliga målprofillänkar, postunderlag och idempotens.

V20:s commitkontroll gäller huvudendpointen. Separata fil-, privata draft- och backup-/återställningsendpoints omfattades inte av den delens revokationsgranskning; v21-avsnittet nedan hanterar avgränsade skriv- och svarsvägar där.

Kundgodkänd antalminskning och accept av orderändring använder en gemensam Europe/Stockholm-kalenderdag för den lagrade inlämnings-/förslagstidpunkten. När tidsstämpeln finns ska kundens uttryckliga godkännandedatum vara tidigast den dagen och inte i framtiden; saknad äldre tidsstämpel förblir okänd. Avsändningsdag använder samma helper; direktleveransens uttryckliga datum behålls. Ogiltig icke-tom tidsstämpel ger ett begripligt fel före skrivning. Inget kundgodkännande eller gammalt underlag skapas eller flyttas automatiskt.

Inga SQL-migreringar, nya tabeller/kolumner, lagrade modellfält eller beroenden tillkommer. Datumhelpern och aktörsvillkoren använder befintligt underlag; hostingbindningar och delning ändras inte. En UI-återgång ska behålla dessa serverkontroller och svenska datumgränser tillsammans med B01/B05-historik och utkast. Återpublicera inte v18 som skrivande rollback. Detta historiska v20-avsnitt kvitterar ingen senare deploy, kontoanslutning eller live-återställning; faktisk v21-kvittens följer nedan.

## V21 den 6 oktober: separata återställnings-, fil- och utkastsvägar

Avgränsningen är `POST /api/crm/backup` för både äldre JSON och strömmad NDJSON, fil- och privata draftskrivningar samt aktuella behörighetskontroller före berörda läs-, replay- och konfliktsvar. Backupåterställning kräver aktuell administratör även vid SQL-commit och före återlämnad CRM-state. Filvägen ska behålla kund-/order-/arbetsversionsrättigheter; privata utkast ska behålla autentiserad användare, arbetsyta, koppling, revision och arkiveringsskydd.

Aktivt medlemskap, medlems-/användar-ID, roll och ansvar ska ingå i serverns skrivvillkor. När ett villkor inte längre matchar ska efterföljande CRM-/filmetadata-/kvittensskrivningar eller utkaständringar inte utföras med den gamla behörigheten. Ny kontroll före ett privat svar ska hindra att gammal roll eller viewer återanvänds vid läsning, exakt replay eller konflikt. Det är ingen garanti att redan skickade bytes kan återkallas eller att ett pågående svar kan stoppas efter senaste behörighetskontrollen.

D1:s SQL-batch och R2-filer är separata steg, ingen gemensam transaktion. Bekräftat avslag städar endast operationens nya R2-objekt. En förlorad commitkvittens behöver avstämmas mot sparad begäran och filreferenser innan något raderas; okänt utfall behåller objekten. Ett nekat svar efter en lyckad commit får inte radera registrerade kundfiler. Behörighetskontrollen ska bevara dessa regler för båda backupformaten och filuppladdningens återförsök.

Separat `GET /api/crm/backup` och strömexport, Outlook, medlemsadministration och faktisk hosting ingår inte i denna granskning. CRM-kopia omfattar fortsatt inte konton, Outlook eller privata utkast. Inga schema-/datamodell-/beroende-/backupformatändringar eller nya affärsdefinitioner införs. Kompatibel återgång ska behålla nya serverkontroller tillsammans med B01/B05:s historik/utkast och v20:s aktörs-, svenska datum- och orderregler; äldre kod utan dessa skydd är ingen säker skrivande rollback.

Detta är implementerat i PR #14 och publicerat som v21 den 6 oktober kl. 00:42:55 UTC. Slutkontroller och exakt GitHub-head/app-main/Sites-källa/deploy kvitteras i VALIDATION och aktuell status. Verkliga SQLite/API-prov kompletteras av isolerad workerd/D1/R2 och fyra fulla browserflöden på oförändrad artefakt. Mobil utkaststatus kräver vanlig scroll i ett långt formulär; det är ett kvarvarande designbehov, inte automatisk felstatussynlighet. Ingen riktig kontoanslutning, kundskrivning eller hostingåterställning påstås. Scheman, prompter och aktivering är oförändrade. Officiella källor och gränser finns i [agent/RESEARCH.md](agent/RESEARCH.md).

## Aktuell åtkomst under backupexport – publicerad v22

Separat `GET /api/crm/backup` binder JSON- och NDJSON-export till den ursprungliga serverlästa medlemsraden, aktiv adminroll, användar-ID, mejlidentitet och ansvar. Återkontrollerna är rena medlemsläsningar och får inte återskapa en raderad medlem eller återbinda ett konto. JSON lämnas först efter en ny kontroll; strömmen kontrolleras före nästa utlämning och slutpost, även efter fil-, hash- och snapshotväntan. Privata felsvar återkontrolleras också.

En pågående fil om högst 5 MB hålls privat till kontrollen efter läsningen. Inaktivering kan därför upptäckas när den filen har lästs klart; därefter lämnas ingen filpost eller giltig slutpost och inga följande filer hämtas. Klientens `cancel()` avbryter den aktiva R2-läsaren och stoppar fortsatt arbete. Källströmmen har köstorlek noll; HTTP-pipelinen och transporten kan ändå läsa och buffra redan auktoriserade poster. Redan utlämnade eller transportbuffrade bytes går inte att återkalla, och en redan startad HTTP200 blir en avbruten kropp snarare än en senare HTTP403. Ett trunkerat paket ska avvisas vid återställning.

HTTP-nedladdningen använder en direkt `FixedLengthStream` med exakt förväntad byte­längd. Den beräknas från headerns UTF-8, escapade fil-ID:n, base64längder, 64-teckenshashar och slutpostens fil-/byteantal; inga R2-filer förläses för längden. Workers ignorerar en manuellt satt Content-Length för vanlig ström. Den verkliga fixed-length-kroppen ska därför hindra en ren EOF från att se ut som en komplett nedladdning när producenten har stoppats utan slutpost. Framing måste provas med faktisk workerd-HTTP och browser, inklusive bibehållen längd genom proxyn. Node-testets längdmodell är inget sådant HTTP-bevis.

Format, filgränser, hashar, snapshotkontroll och lagring är oförändrade; inga migrationer, medlemsändringar eller kund-/filskrivningar tillkommer i återkontrollerna. Kompatibel återgång måste behålla detta exportskydd tillsammans med v20/v21:s serverkontroller, B01-historik och B05-utkast. Återpublicera inte en äldre skrivande version som saknar dessa skydd.

Behörighetsfrågor görs per fil/post, inte per godtycklig R2-chunk. Cloudflare dokumenterar 1 000 D1-frågor per Worker-invocation på Paid och 50 på Free. Manifestets 2 000-filgräns är en formatgräns, ingen garanti att hela mängden ryms i hostingens fråge-/överföringsbudget. Sites faktiska budget och maximal produktionsvolym är ännu inte verifierade; fortsatt volymarbete behöver en provad budget och vid behov export över flera requests. `enable_request_signal` ändras inte: syntetisk streamcancel bevisar inte faktisk Sites-disconnect. Klientens befintliga nedladdningslänk har ingen egen exportframgångsnotis; browserstatus måste verifieras separat. Sluttester, main och live kvitteras efter faktiskt utfall i VALIDATION/status.

Den kända längden sätts vid den sista Worker-gränsen, efter Vinexts vanliga handler. Vinext omsluter API-kroppen i en vanlig TransformStream för request-context-cleanup och förlorar annars källans längd. Den validerade backupresponsen lämnar en intern längdmarkör; custom-Worker verifierar metod, exakt endpoint, format, status, innehållstyp, encoding och positiv säker heltalslängd, tar bort markören och ger HTTP en verklig FixedLengthStream. Saknad/ogiltig markör för målresponsen stoppar kroppen med generiskt 503. Klientheaders används inte som längdkälla; andra omärkta svar går oförändrade genom samma handler.

V22 är faktiskt publicerad kl. 02:15:53 UTC med grön exakt-head/main-CI. Byggd lokal HTTP och native Chromium visar rätt komplett längd, misslyckad partial-download vid återkallelse och fullständigt återförsök; se VALIDATION för exakta käll-/artefakt-/deploykvittenser och gränser. Faktisk Sites-framing med autentiserat livekonto, maximal hostingvolym och återställning där är fortfarande oprövade. Inga data- eller formatmigrationer krävs; återgång måste behålla v20/v21/v22:s serverkontroller och fil-/utkasthistorik.


## Datakompatibilitet för mobilstatus i v23, 6 oktober

V23 från start-main `d9a117` ändrar endast presentation och klientens felbesked/återförsöksval i privata kundplaner, bearbetning och onboarding. API, draftdata, databas, R2, backupformat, identitet, CAS och atomisk arkivering är oförändrade. Saknat godkännande eller anslutning uppfinns inte. Fälttext och befintliga versionsval bevaras.

Återgång till den verifierade v22-källan `8636a5ef3205a3be590fb5b99ed635a90da275d6` kräver ingen datamigrering och kan återanvända samma DB/BUCKET och delning. Återgång återför dock mobilstatusens scrollbrist och det gamla footer-återförsökets skillnad mellan sparad checklista och onboardingavslut; ingen rollback har utförts här. Slutartefakt, runtime/browser och faktisk publicering kl. 04:04:02 UTC kvitteras separat i VALIDATION. Samma Site, exakt delningspolicy och envrevision 1/DB/BUCKET är bekräftade efter deploy. Anonyma live-GET gav 403/403; ingen autentiserad live-skrivning eller faktisk hostingåterställning ingår. Den senare dokumentationsleveransen återpublicerar inte appen.


## Kundvårdens rollstyrda affärsingångar, publicerad v24

V24 ändrar endast två knappvisningar i CustomerWorkflows med befintligt canEdit(admin/seller). Ingen lagring, migration, API, autentisering, medlemskoppling, CAS/idempotens, atomisk skrivning, draftmodell, filreferens eller backup ändras. V23 är datakompatibel återgång utan migration men återför missvisande reader-ingångar; ingen rollback utfördes. Samma Site, exakt custom-policy och envrevision 1/DB/BUCKET är bekräftade efter deploy 05:31:01 UTC. Anonyma GET gav 403/403. Backendens normala rollavvisning provades endast med syntetiska lokala konton; faktisk hostinginloggning och återställning kvarstår. Generella formulärs redan befintliga mobilbredd/footerbrist är dokumenterad i VALIDATION och BACKLOG. Den efterföljande dokumentationskvittensen kräver egen CI men ingen app-återpublicering.


## Datakompatibilitet och återgång för generella formulär – v25

V25 ändrar generella formulärs layout och residualscroll efter aktivt fältfokus. Ingen databas, draftpayload, API, filreferens, backup, roll, CAS/idempotens eller atomisk skrivning ändras. Ingen migration behövs; DB/BUCKET och envrevision 1 bevaras. Kundkortets läsvy, privata workflows och workorderguiden är undantagna. Textareas behåller full text och intern scroll; överhöga kontroller lämnas åt normalt native scroll, ingen pendling/refokus införs.

V24-källa `96191a927cc6c66f264909c246f0367cc2362868` är datakompatibel återgång men återför kända generella bredd-/footer-/fokusproblem. Ingen rollback utfördes. Samma Site publicerade v25 kl. 07:21:30 UTC med exakt oförändrad custom-policy; färska metadata bekräftar källrevision och deploy. Bara anonyma GET gav 403/403, inga riktiga kundskrivningar. Isolerad återställning med 13,5 MB testfiler är inget verkligt hostingåterställningsprov. Fysisk telefon/visualViewport, personal och riktiga konton/integrationer återstår. Den separata Markdownkvittensen har egen CI och kräver ingen ny app-publicering. Se VALIDATION för exakta hashar och kvit­tenser.

## Privata generella utkast: inläsning och återförsök – v26

Kund-/affärs-/uppgifts-/mötes-/generiska orderformulär visar befintlig laddning, serverfel och Försök igen även när inget privat utkast kunnat läsas. Vid laddningsfel kan privat sparstatus ännu inte bekräftas: behåll sidan öppen, återförsök och invänta Sparat som privat utkast. Misslyckad stängning behåller formulärets text. Readyclean formulär ger ingen sparbekräftelse utan record; settings, reader, OrderGuide och andra specialflöden får ingen ny privat åtkomst.

Samma provider, användar-/arbetsyteisolering, revisioner, request-ID, CAS, register/flush/consume och serverroller gäller. Scrollhjälpen ändrar bara positionen för det fortfarande fokuserade generella fältet/statusknappen efter verkliga kanter; den flyttar inte fokus och skickar inga data. Lagring, API, filformat och migreringar är oförändrade. V25-källa 03d2e61 är datakompatibel återgång men återför dolda laddningsfel/fokusproblem; ingen rollback utfördes.

Källa `809b77e992deb1244cf9cd06041161df40cf6f4f` och app-main `3d5096f9ab7787dd3f7d776639f73ea8b81621c6` delar träd `d83c2d726307d7b7336c2023735ce7572725bf5d`; v26-deploy succeeded 08:57:51 UTC med samma Site, DB/BUCKET, envrevision 1 och exakt oförändrad custom-policy. Alla96 byggfiler är oförändrade efter lokalQA ochpaketet med 97 filer är oförändrat efter save. Färsk metadata och anonyma GET 403/403 är efterkontroller; inga riktiga kundskrivningar eller autentiserade live-UI-prov. Testets privata HTTP-fel är kontrollerade browserresponses; lyckade återförsök använder faktisk lokal Worker/D1. Faktisk hostingåterställning och verkliga konton/personal/fysisk telefon är fortfarande oprövade. Se VALIDATION för exakta belägg.

## Bestående statusregion för generella privata utkast – v27

Generella privata formulärutkast har en bestående textregion med role=status, aria-live=polite och aria-atomic=true. Laddning, väntande, sparning, fel och konflikt uppdateras utan fokusflytt. Tidsstämpel och återförsöks-/versionsknappar ligger utanför regionen. Ett rent formulär har en tom visuellt dold region, utan extra layoutavstånd eller falskt Sparat. Övriga DraftStatus-konsumenter behåller tidigare DOM och beteende.

Utkastets Sparat gäller privat serversparning. Kundens gemensamma CRM ändras fortfarande genom dess uttryckliga sparhandling. Ett rent formulär har inga nya privata data eller falsk sparbekräftelse. Tider/retry/versionval ligger utanför annonseringsregionen; serverroller och befintliga skrivvillkor består. Endast FormDraftStatus använder opt-in; bland annat kundplanens befintliga statuskanal behålls.

Ingen lagring, migration, API, draftpayload, roll, medlemskoppling, CAS/request-ID, filreferens eller backup ändras. V26-källa 809b77e är datakompatibel återgång men återför avsaknad av generella hjälpmedelsstatusar; ingen rollback utfördes. [PR #26](https://github.com/ludros93-prog/MAgnussons-CRM/pull/26), exakt head `d4b5930fb17c63c0396144bb62ce175fd06e92f3`, passerade samtliga 13 CI-steg i körning 37443819268/jobb 112203701566, success observerat 09:35:36 UTC. App-main `7288f82a43c90f33f51d5911381bcc0a4badc0ee` och Sites-källa `1a7e8417446a3d1ce3ea0873219f7627e614df8c` har samma träd `93b957280fea53cff897101e03d267a70be06a64`. Även app-main-CI 37444304647/jobb 112205295134 passerade alla 13 steg, observerat 09:40:00 UTC. V27 publicerades 09:40:40 UTC på samma [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), med lyckad deploy, exakt oförändrad custom-policy och envrevision 1/DB/BUCKET. Färska metadata verifierar källa/version/deploy; anonyma GET / och /api/crm gav 403/403 med bortkastade kroppar. Inga riktiga kundskrivningar.

Samlad/sticky privat- och CRM-spar-/felstatus, stängningsbesked, andra specialdialogers hjälpmedelsarbete, fokusåtergång och mobilkundlista kvarstår. B01b2, hostingbudget/återställningsrutin och personalpilot är fortsatt prioriterade. Faktisk skärmläsaruppläsning, initialmountuppläsning, fysisk telefon/OS-tangentbord, autentiserad live-UI, personal och riktiga integrationer är oprövade. Codex-referensen är oläst eftersom relevant read_thread saknas. Isolerad återställning med testfiler är ingen faktisk hostingåterställning. Den efterföljande Markdownkvittensen återpublicerar inte appen.

## Generella formulärs spar- och stängningsbesked – v29, 2026-10-06

V29 visar privat status och CRM-/stängningsbesked tillsammans vid sparhandlingen. Privat utkast sparat bekräftar en privat revision, inte en CRM-commit. Ett obekräftat CRM-försök eller misslyckad sparning inför stängning får eget kvarstående besked även om privat autosparning senare lyckas. Uppgifterna och de detaljerade feltexterna finns kvar; använd befintlig spara-/stänghandling för återförsök. Ett förlorat eller nekat svar bevisar inte att en möjlig commit saknas. Visa besked/Granska flyttar fokus till detaljen först efter uttryckligt val.

Footerhöjden mäts efter radbrytning. Den ligger i normalt scrollflöde när viewporthöjden är högst 540 px eller footern överstiger halva tillgängliga vyhöjden; annars behålls sticky. Samma fokuserade generella fält rullas vid behov fritt från footern utan refokus. En bestående textregion annonserar sammanfattningen; tidsstämpel, hjälprad, detaljknapp och befintliga privata retry-/versionsval ligger utanför. Clean har inget privat gap eller falsk privat bekräftelse. Inställningar saknar privat autosparning; reader är fortsatt spärrad.

Ingen provider-/API-/serverroll-/payload-/postbasis-/CAS-/request-ID-/lagrings-/backupändring eller migration införs. Register/flush/consume och atomisk inlämning består; workorder och privata specialdialoger omfattas inte. V28-källa `317b640` är datakompatibel UI-återgång men återför statusproblemen; en återgång måste behålla befintliga server-/historikskydd. Ingen rollback eller hostingåterställning har utförts. Exakt-head/main-CI och 23/23 slutbrowserfall är gröna på oförändrad artefakt; verkliga konflikter, CRM400 och två förlorade kvittenser efter faktisk 200-commit med exakt replay utan dubbelmutation ingår. V29 är faktiskt publicerad 12:02:40 UTC på samma Site, källa `1ca6f2b`, envrevision 1 och exakt oförändrad custom-policy. Endast anonyma live-GET 403/403 utfördes, inga riktiga kundskrivningar. Fullständiga belägg och gränser finns i [VALIDATION](VALIDATION.md). Autentiserad hosting-UI, riktig skärmläsare/telefon/personal, kontointegrationer och faktisk hostingåterställning återstår.

## Bevarade uppföljningsutkast och mobiltext – v30, 2026-10-06

Följ upp-flödets stängning använder befintlig privat flush även när anteckningen är tom. Uttrycklig CRM-inlämning och kassering behåller sina olika betydelser. Befintlig privat konflikt/återförsök, lås, originalbasis, API, CAS, request-ID och atomisk konsumtion är oförändrade. CSS gäller bara FollowUp-dialogen och låter fält, status och långa knappar radbrytas utan mindre typsnitt. I kort mobilvy behöver användaren scrolla; respektive Tab-fokuserad stäng-/submitknapp är helt synlig även med faktiskt fördubblad text.

Ingen migration eller återställningsåtgärd behövs för denna leverans. Källa `6883f97`/app-main `051b460` delar testat träd. Obligatoriska kontroller, exakt-head/main-CI och 28/28 isolerade browserfall passerar. **V30 är publicerad 13:50:54 UTC** (15:50 Stockholm), med samma Site, envrevision 1 och exakt oförändrad custom-policy; DB/BUCKET är byteoförändrade i byggkonfigurationen. Anonyma live-GET gav 403/403. [VALIDATION](VALIDATION.md) samlar hela revision-/arkiv-/deploykvittensen och skiljer 25 privata fall från tre uttryckliga CRM-inlämningar. V29 är datakompatibel återgång men återför de rättade kassering-/layoutfelen; ingen rollback utfördes. Privata utkast ingår fortfarande inte i gemensam CRM-kopia; separat hostingbackup/återställning återstår. Metadata och lokal workerd/D1/R2 är inga riktiga konto-, integrations-, personal- eller hostingåterställningsprov.

Nästa riskgranskning gäller artikelpanelens källgranskade stängning vid busy/409/500, med isolerad reproduktion innan rättning. Följ upp-dialogens samlade sparstatus och exakta CRM-feltext är en separat återstående uppgift. B01b2, fokusåtergång, mobilkundlista, integrationer och personalpilot kvarstår.

## Historik: Artikelpanelen – main verifierad, v31-publicering blockerad, 2026-10-06

Artikelredigering låses under pågående sparning, med lokalt neutralt vänt-/obekräftatbesked. X/Escape/utanförklick och byte hindras tills anropet avslutats. Ett nekat eller förlorat svar behåller editorvärden/originalbasis; det bevisar inte att commit saknas. Verklig konflikt kräver uttrycklig Läs in aktuell artikel. Artikelserverutkast, omladdningsskydd och generell dirty-dismissal efter busy införs inte; katalogens privata beställningsutkast behåller sitt eget kontrakt. Mobiltoast kan visuellt överlappa retryknappen trots pointer-events:none; det är ett separat kvarvarande problem.

Ingen migration, API-/roll-/CAS-/request-ID-/lagrings-/backupändring krävs. Main `a9341c3` och source `299aaa9` delar testat träd; fem obligatoriska kontroller, exakt-head/main-CI och 13/13 isolerade corefall passerar. Native **v31 är sparad men deploy failed Unauthorized 14:50:08 UTC**, återläst failed 14:50:40 UTC. Orsaken är overifierad. V30 är senaste kända lyckade deployment (13:50:54 UTC), inte en verifierad aktuell dispatchrevision. Samma Site/URL och exakt custom-policy kvarstår; envrevision 1 är metadata, DB/BUCKET oförändrad byggconfig är inget livebindningsprov. Anonyma GET 403/403 kl. 14:51:30 UTC innebar inga autentiserade anrop eller kundskrivningar.

Diagnostisera Sites publiceringsautentisering och återanvänd samma sparade v31 när fungerande åtkomst verifierats; ändra inte audience eller bygg alternativ publicering som workaround. [VALIDATION](VALIDATION.md) håller version/arkiv/failed-deploy och efterkontroll samlade. V30 är datakompatibel återgång men återför det rättade pendingfelet; ingen rollback eller hostingrestore har utförts. Artikelbrowserns kund/order/utkast/filer/R2 är tomma; regression/runtime ger separat skydd och ingen verklig driftåterställning.

## Följ upp-status: publicerad v32 – 2026-10-06

Följ upp skiljer privat flush, CRM-inlämning och privat sparning inför stängning. Privat Sparat rensar inte ett obekräftat CRM-/leave-försök. Full servertext ligger i dialogen; tappat svar kan följa efter commit. Ny submit återställer sparfelet; stängningsfelet består tills dialogen lämnas/monteras om. Misslyckad privat flush hindrar stängning/navigation med bevarade fält och Försök spara utkast & stäng. Visa besked/Granska flyttar fokus bara efter uttrycklig handling. Lokal scroll visar samma fortfarande fokuserade, anslutna kontroll inom uppmätta kanter utan refokus eller skrivning; överhöga detaljer kräver vanlig scroll.

API/provider/roller, originalbasis, payload, CAS/request-ID, idempotens och atomisk utkastkonsumtion består; ingen migration eller backup-/filändring. Alla fem obligatoriska kontroller och **22/22 färska browserfall** passerar. Befolkat kund/order/faktura/fil/R2-underlag skyddas; 22 mellanfallsreset betyder att privat arkivering provas per fall. Konto-/arbetsyteprovet är native reload/cancellation, inget levererat stale React-callback. Readonly-dialogens UI och faktisk skärmläsare/telefon är inte verifierade. [VALIDATION](VALIDATION.md) anger hela scope och counts.

Source c9fb46f och app-main 3c0fdac delar testat träd med grön exakt-head/main-CI. **V32 deploy succeeded 16:15:59 UTC**, samma Site/URL, oförändrad custom-policy/ägare och envrevision 1. V31:s failed Unauthorized är historik med okänd orsak; v32 innehåller artikelpendingfixen. Anonyma GET 16:16:43 UTC gav 401/401 utan auth/kundskrivningar. Lokala 96 dist-/97 arkivfiler är byteverifierade och oförändrade. Native återläst tarhash skiljer sig från lokal råtarhash; nedladdning nekades med file could not be authorized or resolved. **Native byteidentitet och orsaken till hashskillnaden är overifierade**; native save/source/lyckad deploy verifieras separat. Inga livebindningar eller hostingrestore antas genom metadata. Ingen rollback utfördes; återgång ska behålla server-/B01-/B05-historik och återför annars de rättade UI-felen. Artikel-idle-utkast, toast, B01b2 och drift/pilot kvarstår.

## Artikelpanelen: lokalt stängningsval – v33, 2026-10-06

Ändringar eller obekräftad sparning ger fortsätt/kasta-val vid X/Escape/utanförklick. Fortsätt behåller editor/originalbasis; kassering gör ingen POST/commitåtergång. Läs in aktuell artikel ersätter uttryckligt uppgifterna. Pending spärrar stängning/redigering.

Fokus återförs till kvarvarande panel; samma kontroll framrullas efter storleks-/animationsändring. Initial fokus/native Tab/Shift+Tab/Escape mättes utan fokusreparation; retry/rebase-Tab börjar med `Close.focus`. [VALIDATION](VALIDATION.md) anger provgränser. API/roller/provider/CAS/request-ID/idempotens/lagring/filer/backup består; ingen migration/varaktig privat artikelutkastmodell.

Source `3a162b7`, main `590a9d087acce4c909a7530e3530d92acc6d2079`: deploy `appgdep_6ac537c8e1408191b9305a748a623a83` succeeded **18:03:13.722109 UTC**, envrevision 1. Datakompatibel v32-återgång återinför idle-textförlust; ingen rollback/hostingrestore utfördes. Toast/integrationer/pilot kvarstår.

## Leveransregistrering med granskning – publicerad v34

Ett gammalt leveransformulär kunde tidigare få 409 och sedan, vid oförändrat återförsök med ny arbetsyteversion, skriva över kollegans nyare problem och kontrolluppgift. `receipt_issue` och `receipt_confirm` behåller nu originalbasis för relevant order-, avsändnings-, mängd- och receipt-task-underlag. Servern jämför basis efter varje CAS-omläsning. Separata fakturor, kostnader, interna anteckningar och andra order låser inte registreringen; exakt request-ID/innehåll återspelas före konfliktkontrollen utan ny mutation.

Dialogen behåller mottagningsdatum, mottagare, anteckning, problemtext och nästa kontrolldatum, även i det inaktiva läget. Granska aktuell leverans visar sparat besked, ansvar, kontrolluppgifter, avsändningsdatum, mängder, leveransbevis och produktionshinder. Uttrycklig jämförelse krävs före Använd detta underlag och behåll min text. Granskning/adoption gör ingen POST. Ett synkront lås spärrar fält, dubbelklick och stängning under väntan. Bestående feltext och lokal fokusväg finns. Radbrytning är rättad även med förstorad mobiltext.

Ingen migration, ny tabell/kolumn, lagringsmodell, bilagehantering, rollmodell eller affärsdefinition införs. Äldre öppna v33-klienter utan expectedContext får 400: ”Ladda om CRM-sidan för att granska det aktuella leveransunderlaget. Kopiera först din osparade text.” V33 läser samma dataformat men dess gamla server återför överskrivningsfelet. Behåll nya serverkontrollen vid eventuell UI-återgång. Ingen rollback utfördes.

Source `bc1b5712220b862ad5640bd958589a6e4a8482b1`, lokal slutkod `2100b0c`, PR #41-head `05abdd66ff55ff6235c8bbea74e9c31dec355797` och app-main `c9c71f94ecf98b9afe2c1d21a26ecdd37a25ce58` delar träd `ed57569bd8f3b3bad9580bfd943cfeb63c308c29`.

Sites v34 sparades från den pushade källrevisionen och deploy `appgdep_6ac54ef320e481918fe28421c623c6c3` succeeded **2026-10-06 19:42:00.227968 UTC** på https://magnussons-crm.rosen123.chatgpt.site. Samma projekt, ägare, custom-policy och envrevision 1. Återläst version/source/deploy stämmer. Anonyma GET `/` och `/api/crm?space=live` gav 403/403 kl. 19:42:18 UTC; kropparna sparades inte. Inga autentiserade live-UI- eller kundskrivprov gjordes.

Lokala 96 distfiler och 97 tarfiler verifierades byte för byte och förblev oförändrade. Dist-manifest SHA256 `db2367370e10d510b5f17e72b0144ce44258cb039e96694a676dd7d313d7e48b`; råtar `45edc2ddb06db6da24f39c001462683a0aadde405717d6bd327bf177a684a4c8`, gzip `6bdf6f112e241e0c4639bc96be293b2489fa56d69241a32abc659c07adc41ddd`. Native återläst tarhash är `2136a6740817b844519a6ac9a6202f8a668fe31c7671ec525d2a97ca0f38a9a0`, 97 filer/4 280 320 byte. Hashen skiljer sig från lokal råtar; återhämtning nekades med `file could not be authorized or resolved`. Native byteidentitet och orsaken till skillnaden är overifierade. Native save/source/lyckad deploy kvitteras separat.

Den officiella Sites-källhelpern saknas i executor. Den tidigare granskade fallbacken använder kortlivad credential enbart via dold stdin/processmiljö, vanlig fetch/push utan force och kontrollerad fjärrbas `3a162b7`. Push `3a162b7→bc1b571` lyckades före native Save; auto-publicering var avstängd. Hostingmanifest/D1/R2-bindningar är oförändrade. Inget nytt schema eller återställningsformat införs.

B03:s avgränsade leveranskonflikt är levererad; hela order-/produktions- och driftpiloten är inte godkänd genom detta. B05:s varaktiga privata artikel- och leveransutkast/omladdningsskydd kvarstår, liksom B01b2, övriga specialdialoger, mobilkundlista, fokus efter arbetsytebyte och riktiga integrationer. Nästa genomförbara byggarbete är privat återupptagning med bevarat originalunderlag; personalpilot och faktisk hostingåterställning behöver verkligt underlag.

Alla skrivprov använder syntetiska data i isolerad SQLite eller lokal workerd/D1/R2. Verkliga personal-, konto-, integrations-, telefon-, skärmläsar- och hostingåterställningsprov är oprövade. Codex-referensen `01a104c7-a5c5-7350-8577-a4f941138061` är oläst: inget Codex read_thread-verktyg finns; brief/repo används. Scheman, prompter och aktivering är oförändrade.
