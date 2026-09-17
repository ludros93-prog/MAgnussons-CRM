# Magnussons CRM – order, tryck och lager

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

Teamets arbetsyta och Min dag öppnas som standard. Dashboardens personliga urval styrs av inloggningens koppling till ansvarig säljare. Alla personliga resultat, mål, aktiviteter och genvägar använder samma urval. Teamets dashboard är ett separat menyval för ledning/administratörer och summerar hela företaget. Min dag visar personliga aktiviteter, orderhinder, kundmöten, kontaktbehov, pågående utkast och leveransbevakning. Administratören kan växla till hela teamet. Huvudmenyn har de dagliga verktygen; övriga funktioner finns under Fler verktyg. Återköp från kundvården väljer en tidigare accepterad beställning och kopierar dess rader till en ny affär, med nytt krav på pris- och kundbekräftelse. Om tidigare produktion är färdigtryckt eller skickad sparas dess skiss, instruktioner och arbetsversionsreferens som förslag till det nya underlaget. Godkännanden återanvänds inte.

Beställningar, tryckunderlag, kundanteckningar, uppföljningar och vanliga kund-/affärs-/order-/aktivitets-/mötesformulär sparas som privata utkast separat per inloggad användare och arbetsyta i `crm_drafts`. De påverkar inte gemensam CRM-version, kalkyl eller produktion före inlämning. Ofullständiga fält får sparas. Sparade utkast kan fortsättas efter omladdning eller på annan enhet. Osparade ändringar har en reservkopia i webbläsarens localStorage, avskild per användare och arbetsyta och varnar innan fliken lämnas; vänta på Sparat innan fliken stängs. Två enheter kan inte tyst skriva över samma version. Vid konflikt väljer användaren uttryckligen vilken version som ska användas. Kundacceptansen i katalogen nollställs när underlaget ändras.

Utkast arkiveras samtidigt som motsvarande order/tryckarbete skapas. Misslyckad inlämning eller samtidig ändring behåller utkastet. Utkast kan kasseras från Min dag eller katalogen. Högst 100 aktiva utkast per användare/arbetsyta. Privata utkast ingår inte i den gemensamma CRM-exporten.

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

Kopians gränser: 5 MB per fil, 10 MB filer totalt, 16 MB hela paketet, 200 filer per kund och 2 000 filer totalt. Export stoppas om den skulle bli ofullständig. Import kräver helt tom arbetsyta utan filer eller öppna utkast. Outlook, konton, autentiseringshemligheter och privata utkast ingår inte. Kopian är en manuell CRM-återställningsväg, inte automatisk katastrofåterställning för hela driftmiljön.

Kvar före driftlöfte: verifiera plattformens skydd av inloggningsheadrar och återställning i den faktiska hostingen, åtkomst-/dataägarskap och supportansvar, samt användartest med Sebbe och en säljare. Riktiga Microsoft-/Fortnox-konton, mejlutsändning, webbshopsorder och AI/transkribering är inte anslutna. Inga nya personer har bjudits in i denna ändring.

Produktinspiration: Saleshub AI:s offentliga beskrivningar av kundkort, samlade aktiviteter, integrationer och villkorsstyrd uppföljning: https://saleshubai.se/funktioner och https://saleshubai.se/integrationer. Detta är inspiration för vårt eget arbetsflöde; inga påståenden om att deras anslutningar har prövats eller kopierats.

## Mobil och gemensam produktion (v13)

- Rollen `production` heter **Tryck & leverans**. Den får ta/lämna eget jobb, registrera mottagning, tryck, utleverans, kassation och hinder. Den får både tryck- och lagernotiser; ekonomifält, säljutkast, allmänna kundfiler, Outlook, medlemsadministration och backup är spärrade på servern.
- Arbetsansvar är en person med stabilt autentiserat ID. Det är ansvarsfördelning, inte exklusivt lås: andra behöriga får hjälpa till med fysiska registreringar. Aktören loggas. Egen monoton assignment-revision skyddar samtidig claim, ABA och omförsök; befintlig produktionsbasis skyddar antal separat.
- Arbetsfoton sparas omedelbart på kund + order + arbetsversion. Endast aktiva arbetsorder tar emot nya foton. Högst 5 MB JPG/PNG/WebP, med kontroll av filsignatur. Avdelningar kan bara läsa arbetsorders skisser och kopplade foton. Råa äldre order får sakna production/history. Kopian med filer bevarar arbetskopplingen vid återställning.
- Lägg till från knappen **I mobilen**: Safari / Dela / Lägg till på hemskärmen, alternativt Chrome / Lägg till på startskärmen. Manifest använder autentiserad hämtning; samma konto och behörighet. Internet krävs. Ingen offlinekö, bakgrundssynk eller push aktiveras av detta.
- Testat i isolerad SQLite/R2-harness: samtidiga anspråk och CAS-omförsök, rollgränser, personliga notiser, fotoavgränsning, föråldrad arbetsversion under uppladdning, tappat commitsvar, fotoåterställning och mottagning → tryck → utleverans. Detta är inte ett verkligt hosting- eller telefonprov.
- Installation, inloggning och fotoval behöver provas på Magnussons faktiska iPhone/Android före utrullning. Inga nya medarbetare har fått inbjudan i denna uppdatering; verifiera deras adresser och identitet vid uppläggning.
