# CRM118: fullständigt underlag före filstaging

Första SQL-läsningen behåller arbetsytans revision och felprioriteten kund 200 → historik 50 000 → arbetsyta 2 000. Dessa avslag sker före UUID. Därefter läser en D1-batch **12 SELECT**: arbetsytans version/settings, tio CRM-samlingar och alla arbetsytans filmetadata. Batchens revision måste vara exakt den ursprungliga; skillnad eller försvunnen arbetsyta ger 409 före UUID/R2. En senare snapshot får inte bli ny CAS-bas.

Efter aktuell medlemskontroll skapas faktisk filmetadata och händelse med två UUID. Befintlig `backupStreamHeader` mäter hela normaliserade kommande tillståndet, samtliga descriptors plus den nya filen och nästa revision. Över 16 000 000 UTF-8-byte utan LF ger 400 före R2 och databasändring; exakt gräns tillåts. Ogiltigt underlag ger generiskt 400 utan privata parservärden. Fel vid databasläsningen följer befintligt 503-flöde.

Befintlig atomisk trestatement-commit med ursprunglig CAS, medlem/orderpredikat och catch-/utfallsstädning är byteoförändrad. D1-transaktionen omfattar inte R2. Efter staging städas bara säkert osparad egen nyckel; okänt commitutfall behåller den. Ingen migration, schema-/backup-/filformatändring eller beständig replay införs. Föregående v114 kan läsa accepterade data men saknar denna headergrind. Ingen live-rollback har prövats.

Vid källfrysningen är kandidatens native-prov, fem slutkontroller, browserprov, exakt-head CI, merge och SOURCE/save/deploy/efterkontroll öppna. Senast verifierad live är v114/SOURCE `cdae9437c2d67f999a8174abd14af3ef3c331d28`. Full hostad återställning och separat backup för konton, privata utkast och Outlook är fortsatt oprövade; JSON-total/base64 och andra läsargränser återstår.

---

# CRM117: kundens filgräns och revision läses tillsammans

En samtidig kundfil eller ett arbetsfoto ska inte kunna lämna kunden med 201 filer och därmed stoppa båda backupformaten. Kundens filantal läses nu tillsammans med arbetsytans filantal, historikantal och CAS-revision i ett SQL-statement. Vid 200 befintliga filer avvisas uppladdningen med det befintliga beskedet ”Kunden har nått gränsen 200 filer.” före UUID och R2-staging. Befintliga filer raderas inte.

I en befintlig arbetsyta behålls felprioriteten kundens 200 filer → historikens 50 000 → arbetsytans 2 000. Saknad arbetsyta ger nu 404 innan kundtaket bedöms; detta är ett avsiktligt ordningsförtydligande. Serverbehörighet och inputkontroller samt hela currentMember-/UUID-/R2-/tre SQL-commit-/städ-/utfallssuffixet är byteoförändrade. Två samtidiga uppladdningar som läser 199 och samma revision får en vinnare vid 200; förloraren får befintligt CAS-avslag 409 och städar bara sin egen staged-fil.

200 är CRM-backupens befintliga kundgräns, inte en uppgiven Cloudflare-gräns. Ingen migration, fil-/backupformatändring, medlemskoppling eller beständig request-ID-replay läggs till. Samlad filmetadata/headerbudget, JSON-innehåll/totalbudget, andra läsarschemagränser, återställningens extra audits och verklig hostingåterställning återstår. En summa av metadata eller en header med tom files-lista räcker inte som nästa fullständiga budgetprov.

Öppningsbasen är färsk GitHub-main `09d068880f5e97895b659f756a0260300f9db4df`, träd `606f201872edd473f37a357873e937880f78e819`, och faktisk Sites-SOURCE `4244a5b98ade557db08adfc7c287872cede09a4a`, träd `363c2f5c2d6477cacca10806957e745ed5820165`, med lyckad live v113. Av 437 källfiler är 435 övriga byte-/lägeidentiska; main har endast senare backlog-/loggprefix som bevarar SOURCE:s hela historik. Egen worktree, branch och ägd lokal reservation används. Vid öppningen fanns inga öppna PR:er eller observerad konkurrerande publicering. Sites-identitet, begränsad delning, auth, miljö, DB/BUCKET och agenternas instruktioner/scheman bevaras.

Accepterade data är fortfarande läsbara med tidigare verifierad v113: inga nya fält eller format skapas. Kodåtergång till v113 tar bort den nya kopplingen av kundantal/revision och återinför därför just denna samtidighetslucka. Profilhistorik kräver fortfarande v55-kompatibel skrivare enligt körboken. Ingen live-rollback eller full hostad återställning är prövad; gemensam backup omfattar inte konton, privata utkast eller Outlook.

Vid denna källfrysning är baslinjer och riktade preliminära prov genomförda. Fem obligatoriska slutkontroller, browserprov på slutbygget, exakt-head CI, aktuell-bas merge och faktisk samma-Site-publicering återstår. Slutliga kvitton/revisioner/main/SOURCE/live anges separat i PR/task efter verkligt utfall. Syntetiska tekniska prov är ingen konto-, integrations-, kund- eller personalacceptans. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är fortsatt oläst; tillgängligt read_thread gäller Slack. Explicit brief och färsk repo används.

---

# CRM116: filuppladdning bevarar kopians filantal

Filuppladdning läser nu arbetsytans filantal, historikantal och CAS-revision i samma SQL-statement. Vid minst 2 000 befintliga filer avvisas en ny kundfil eller ett arbetsfoto med ett konkret svenskt 400-besked före UUID och R2-staging. Alla crm_files-rader i vald arbetsyta räknas, även historiska eller inte längre arbetskopplade filer; inga tidigare filer raderas. Det befintliga 50 000-historikbeskedet behåller sin prioritet. Hela currentMember-/UUID-/R2-/tre SQL-commit-/städ-/utfallssuffixet är byteoförändrat. Versionsökande konkurrerande filskrivning behåller befintlig CAS-grind och endast förlorarens egen staged-nyckel städas.

Ingen SQL-migration, lagringsvariant, filmetadata-/backupformatändring eller ändring av commit-SQL görs. Accepterade data kan läsas av tidigare kod. Föregående verifierade v111-källa är kodåtergångsvägen men saknar både CRM115:s historikskydd och CRM116:s filantalskydd; v112 är ännu inte ett verifierat publiceringsmål. Ingen live-rollback eller full hostad återställning har utförts. Konton, privata utkast, Outlook, serverroller, mängd-/revisionsregler, DB/BUCKET och begränsad delning bevaras.

CRM115:s konkreta publiceringshinder kvarstår vid öppningen: sparad v112 har native arkivhash `a6b49861cb221bacbfb03a848e788cf4998e58eece5bed29b36d2c785d755307` och 6 092 800 byte, skilda från det tidigare lokala paketets hash. En färsk auktoriserad hämtning gav åter `file could not be authorized or resolved`. Ingen ny publicering påstås och ingen tom källrevision skapas för att kringgå versionen. Den nya användbara kodändringen och dess senare verkliga käll-/save-/deployutfall redovisas separat.

2 000 är befintligt inkluderande filantal i både JSON-kopia och NDJSON-header/slutpost, ingen Cloudflare-gräns. Det nya skyddet garanterar inte full backupberedskap: samlad filmetadata/headerbudget, JSON-innehåll/totalbudget, andra läsarschemagränser, återställningens extra audits och verkliga D1/R2-/hostingbegränsningar återstår. Kundens separata 200-filfråga ligger fortfarande före revisionssnapshot; en ändring mellan dessa två läsningar ingår inte i denna fix. Uppladdning har inget beständigt request-ID-kvitto; samma pågående begärans metadataåterläsning är inget nytt HTTP-försöks idempotenta replay.

Vid denna källfrysning är ovanstående baslinjer och riktade preliminära prov genomförda. Fem obligatoriska slutkontroller, browserprov på slutbygget, exakt-head CI, aktuell-bas merge och faktisk samma-Site-publicering återstår. Slutliga kvitton/revisioner/main/SOURCE/live anges i PR/task efter verkligt utfall. Riktiga konton, personalacceptans, integrationer och hostad återställning är obekräftade. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är fortsatt oläst; tillgängligt read_thread gäller Slack. Explicit brief och färsk repo används.

---

# CRM115: filuppladdning bevarar historikens exportgräns

Filuppladdningen läser nu historikantal och arbetsytans CAS-revision i samma SQL-statement. Vid minst 50 000 befintliga händelser avvisas den nya kundfilen eller arbetsfotot med ett konkret svenskt 400-besked före filstaging. De tre commit-statementen, serverrollerna, ordningens underlagskontroll och städ-/utfallshanteringen är byteoförändrade. En versionsökande konkurrerande skrivning ger befintligt CAS-avslag; endast den förlorande uppladdningens egna staged-objekt städas. Historik raderas inte.

Ingen SQL-migration, lagringsvariant, filmetadata-/backupformatändring eller ändring av commit-SQL införs. Föregående v111-kod kan läsa accepterade data; återpublicering av dess verifierade källa är kodåtergångsvägen men tar bort det nya filhistorikskyddet. Ingen faktisk rollback eller återställning av riktiga data har utförts. Privata utkast, konton, Outlook, serverroller, mängd-/revisionsregler, scheman, prompter och aktivering ändras inte.

Detta är historikantal för filuppladdning, inte full backupberedskap. Samlad filmetadata/headerbudget, 2 000 filer per kopia, JSON:s innehålls-/totalbudget, andra läsarschemagränser och verklig hostingkapacitet/återställning återstår. Exakt 50 000 kan exporteras i de prövade små filfallen men lämnar inte automatiskt plats för återställningens extra kundaudits. Filuppladdning har inget beständigt request-ID-kvitto: återläst egen filmetadata kan bekräfta samma pågående begärans COMMIT, inte en ny HTTP-begärans idempotenta replay.

Vid denna källfrysning är ovanstående baslinjer och riktade preliminära prov genomförda. Fem obligatoriska slutkontroller, kontrollerat browserprov, exakt-head CI, aktuell-bas merge och samma Sites-publicering återstår. Faktisk kandidat/main/Sites-källa/live och slutresultat redovisas separat i PR/task efter verkliga kvitton. Konto-/personal-/integrationsprov och verklig hostingåterställning är obekräftade. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst: tillgängligt read_thread gäller Slack, inte Codex; explicit brief och färsk repo används.

---

# CRM114: gemensamma CRM-sparningar bevarar historikens läsargräns

Slutgrinden i `/api/crm` räknar nu den vanliga mutationens verkliga historik efter reducer och eventuell extra ändringsaudit. Över 50 000 händelser stoppas före denna mutations commit med ett konkret svenskt 400-besked. Återställning reserverar fortfarande en audit per kund med identiskt tidigare felbesked och ordning. Exakta redan sparade aktörs-/avsiktskvittot returnerar tidigare; säkert CAS-återförsök räknar om verklig konkurrerande tillväxt. Historik kapas inte och privat utkast förbrukas inte vid detta avslag. Befintlig separat 16 MB-dataheadergrind, kodningsprobe och restore-radbudget ligger kvar.

Ingen lagringsvariant, migration, SQL-tabelländring, backupformatändring eller ändring i commit-SQL införs. Öppningskällan v110 `b76b1d20e3652010aa3e0757cd9f43bb74c17c9d` kan läsa samma accepterade data; återpublicering av den är kodåtergångsvägen men tar bort den nya historikgrinden och kan återinföra luckan. Ingen återgång eller verklig återställning av kunddata utförs.

Förra automatiska main-kontrollen `38179212274`, jobb `114587990620`, avbröts av 15-minutersgränsen enligt faktiska GitHub-annotations. Install/regression/TypeScript/build var godkända, runtime avbrutet; den körningen räknas inte grön. CI-jobbens tidsbudget höjs 15→25 minuter. Alla kontrollkommandon, versioner, permissions, concurrency och utlösare behålls exakt; inget prov hoppas över. Det är jobbets körbudget, ingen ändring av agenternas schema/prompt/aktivering.

Detta skyddar gemensamma `/api/crm`-mutationers historikantal, inte varje CRM-skrivare eller hela backupens giltighet. Filuppladdningen har egen historikskrivning utanför denna grind. Filmetadata/innehåll, andra samlingars antal, historiktextens längd, JSON/base64-totalbudget, D1-/Workerkapacitet och verklig hostingåterställning återstår separat. Exakt 50 000 är läsarschemats gräns; en senare återställning behöver ytterligare kund-audits och kan därför fortfarande avvisas. Redan överstor historik ger avslag på nya gemensamma skrivningar, också utan nya events; inga poster raderas för att komma runt grinden.

Vid denna källfrysning är baslinjer och riktade Node-prov verifierade. Fem obligatoriska kontroller på slutlig head, byggd kandidatruntime, kontrollerat browserprov, exakt-head CI, aktuell-bas merge, eget SOURCE-bygge/paket och samma Sites-publicering återstår. Faktisk kandidat, GitHub-main, Sites-källa och lyckad liveversion redovisas separat i PR/task efter verkliga kvitton. Syntetiska tekniska prov är ingen konto-, integrations-, kund- eller personalacceptans. Refererad Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst: inget Codex read_thread-verktyg finns; explicit brief och färsk repo används.

---

# CRM113: vanliga CRM-ändringar bevarar dataexportens bytebudget

Den gemensamma slutpunkten för `/api/crm` mäter nu färdig dataheader med befintlig UTF-8-serializer efter genererad historik och med destinationens nästa revision, före denna CRM-mutations commit. Över 16 000 000 byte ger ett handlingsbart 400-besked utan att ändringen förbrukar privat utkast, kvitto eller kunddata. Exakt gräns går vidare till tidigare roller, atomisk commit, CAS och övriga kontroller. Äldre restore-besked/kodningsprobe/radbudget och tidigare exakt idempotenskvittos svar behåller sina vägar. Historia kapas inte och säkert återförsök mäter om efter verklig konkurrerande tillväxt.

Ingen lagringsmigration, SQL-tabelländring, exportformatändring eller ny åtkomst införs. Öppningskällan v109 kan läsa samma data; återgång till den källan tar bort den nya grinden och kan åter möjliggöra för stora headers, så den är ingen rekommenderad kapacitetslösning. Ingen verklig rollback/restore eller skrivtest på kundorder utförs. Lokal provstart via `node --input-type=module -e` låste Miniflares eval-hjälptråd innan D1; vanliga `.mjs`-teststarter löste det utan ändrad Worker/SQL eller svagare assertioner. Tidigare misslyckade körningar bevaras privat. Globalt ”Sparat i databas” är en generell arbetsytestatus, inte ett nytt kvitto för nekad modalåtgärd.

Grinden avser dataheader med `files: []`; destinationens filtabell behöver inte vara tom. Den garanterar inte komplett kopia med filmetadata/innehåll, JSON:s separata totalbudget, framtida schema-/historikantal/textgränser, D1-rad/query/batchkapacitet eller hostingens CPU/minne. Full header-serialisering innebär arbete per mutation; lokal runtime bevisar inte produktionsprestanda. En redan överstor arbetsyta får inte ett nytt undantag som kapar historik eller kringgår grinden. Bevara privat underlag och låt administratören utreda.

Vid denna källfrysning är riktade prov och eget preliminärt bygge gröna; fem obligatoriska kontroller på slutlig head, aktuell CI, merge, eget SOURCE-bygge/paket och samma Sites publicering återstår. Kandidat, GitHub-main, Sites-källa och live redovisas separat i PR/task efter faktiska kvitton. Den refererade Codex-tasken `01a104c7-a5c5-7350-8577-a4f941138061` är oläst: inget Codex read_thread-verktyg finns; explicit brief och färsk repo används.

---

# CRM112: äldre dataåterställning lämnar plats för återexport

Äldre ren dataåterställning (`/api/crm`, `type: restore`) mäter nu den färdiga dataheadern i UTF-8 efter genererad kundhistorik och med destinationens nästa revision. Över 16 000 000 byte stoppas före kodningsprobe, commit och R2; exakt gräns tillåts av denna grind och övriga kontroller krävs som tidigare. Samma serializer och gräns används av NDJSON-exporten. Historik kapas inte. Ett tidigare sparat exakt kvitto returneras fortfarande före förkontrollen; aktör och avsikt kontrolleras som tidigare.

Vid budgetfel: bevara originalkopian privat och utred den minimala feltexten. Kapa inte historik och byt inte importväg för att kringgå stoppet. Återställningen ersätter inte konton, medlemskopplingar, Outlook eller privata utkast. Kontrollera backupens faktiska omfattning och destinationsfilernas status före en verklig återställning.

Grinden gäller dataheadern vid första äldre dataåterställningen, med tom filförteckning (`files: []`). Källans filreferenser förbjuds som tidigare, men rutten bevisar inte att destinationens separata filtabell är tom. Full framtida backup med kvarvarande filmetadata, senare vanliga skrivningar och JSON-formatets egen total-/base64budget garanteras inte av denna kontroll. Befintlig SQL-radgrind på 2 000 000 byte och 50 000-händelsegrind behålls separat. Klientens oförändrade filgräns är 10 000 000 byte; POST-ruttens teckengräns räknar UTF-16-enheter och är ett annat mått.

Ingen lagringsvariant, migration, formatändring eller ändring av commit-SQL införs. Serverroller, privata data, CAS, idempotens, mängd-/revisionsregler och DB/BUCKET behålls. v108-kod kan läsa samma accepterade data. Återpublicering av granskad Sites-källa `946d38dc62f6784a9cfd5931a74236b7fe75332d` är kodåtergångsvägen men tar bort den nya exportbudgetgrinden; ingen sådan återgång eller verklig hostingåterställning har utförts.

Nästa avgränsade B04-spår är senare vanliga skrivningar efter en återställning vid exakt 16 MB: återställningsgrinden ger ingen framtida marginal för en ny anteckning. Detta är ett statiskt identifierat spår; separat handler-/native-reproduktion och åtgärd återstår. Total D1-batch-/databasbudget, hostingens CPU/minne, verklig hostingåterställning och separat backup för kontobindningar, Outlook och privata utkast återstår också. B01 är delvis öppet; B06/B07 kräver verkliga personer och konton.

Vid denna dokumentfrysning återstår obligatorisk regression, TypeScript, bygge, isolerad fullruntime och diffkontroll på den frysta slutrevisionen samt exakt-head CI, aktuell-bas merge och samma Sites-publicering. Kontrollerat browserprov återstår; den stora avvisade serverfixturen passerar inte klientens filgräns. Eventuellt UI-prov med liten syntetisk fil och injicerad serverfeltext redovisas separat från verkligt handler-/nativeavslag. Faktisk kandidat, GitHub-main, Sites-källrevision, lyckad liveversion och slutkontroller redovisas separat i PR/leveranskvittensen efter körning. Begränsad delning, miljö och agentaktivering ändras inte.

Syntetiska lokala Node-/Worker-/browserprov och grön CI bevisar inga riktiga kontoinloggningar, första verkliga sparningar, personalacceptanser, Fortnox-/Outlook-anslutningar eller verklig hostingåterställning. Inga riktiga kundorder används för skrivprov.

Tidigare dokumentation bevaras byteoförändrad nedan.

---

# CRM111: återställd kundhistorik ryms även efter nya auditposter

Äldre ren dataåterställning (`/api/crm`, `type: restore`) räknar nu originalhistorik plus en ny återställningshändelse per kund före historiktillägg, kodningsprov och commit. Över 50 000 händelser ger ett tydligt svenskt avslag utan skrivning. Exakt 50 000 tillåts; originalhistorik tas inte bort. Redan sparade exakta kvitton returnerar fortfarande före den nya grinden. Exportläsarens befintliga gräns ändras inte.

Vid historikgränsfel: bevara originalkopian privat; kapa inte händelser eller byt importväg för att kringgå stoppet. Ingen migrering införs. Återpublicering av granskad v107-källa ska bevara samma Site, DB/BUCKET och begränsad delning, men tar bort denna nya historikgrind. Ingen sådan återgång görs här.

Ändringen omfattar två tillagda rader i en route. Lagringsschema, sex migrationer, export-/backupformat, DB/BUCKET, konton, roller, privat kommunikation, CAS, idempotens och mängd-/revisionsregler behålls. Oberoende källgranskning verifierar oförändrad commit-funktion och SQL. v107 kan läsa samma data; återpublicering av dess källrevision är kodåtergångsvägen men återinför historikluckan. Ingen kodåtergång eller återställning av riktiga kunddata utförs.

Total D1-batch-/databasbudget, hostingens CPU/minne och verklig hostingåterställning återstår. Separat backup för kontobindningar, Outlook och privata utkast samt personlig inloggning, första verkliga sparning och personalacceptans är fortsatt obekräftade. B01 är delvis öppet; B06/B07 kräver faktiska personer/konton.

Nästa avgränsade B04-spår är den äldre dataåterställningens framtida exportheader: rent statiskt storleksunderlag med 160 händelser × 49 500 CJK-tecken gav 7 945 149 UTF-16-enheter i POST under dess 10M-grind, men 23 785 408 UTF-8-byte i framtida NDJSON-header över formatets 16M-gräns. Detta är endast kod-/storleksgranskning, inte schema-, handler- eller native-repro. Verklig repro och slutlig exportbudget återstår.

Vid denna dokumentfrysning återstår obligatorisk regression, TypeScript, bygge, isolerad fullruntime och diffkontroll på den frysta slutrevisionen samt exakt-head CI, aktuell-bas merge och samma Sites-publicering. Faktisk kandidat, main, Sites-källrevision och lyckad liveversion redovisas separat i PR/leveranskvittensen efter körning. Begränsad delning, miljö och agentaktivering ändras inte.

Tidigare dokumentation bevaras byteoförändrad nedan.

---

# CRM110: även äldre dataåterställning kontrollerar färdiga databasposter

Färsk levererad bas är CRM109/[PR #177](https://github.com/ludros93-prog/MAgnussons-CRM/pull/177): GitHub-main `c0ab72677334a84d617ccb1be4171a6580a1c0cf`, Sites-källa `48e44ea58483c37b9554919fa54298f9c1ca8f4e`, lyckad live v106. Alla 423 spårade filers bytes och Git-lägen matchade vid öppningen, träd `f2243421c2038f4b8438130731e247af4d0c47bf`. Egen branch och reservation används; ingen öppen PR eller konkurrerande publicering observerades.

Den äldre rena dataåterställningen (`/api/crm`, `type: restore`) kontrollerar nu samma dokumenterade 2 000 000-bytegräns som CRM-kopia med kundfiler. Hela slutliga SQLite-posten räknas: header, alla kolumner, genererad kundhistorik och denna routes faktiska mutationsresultat i kvittot. Kontrollen görs efter historiktillägget och före commit. Den faktiska DB-bindningen måste visa UTF-8; okänd eller annan textkodning ger avslag före skrivning. Vanliga skrivningar och redan genomförda exakta återförsök behåller sitt beteende.

Vid rad- eller kodningsfel ska originalkopian bevaras privat. Utred faktisk DB-bindning och berörd lagringspost; kapa inte historik eller byt importväg för att kringgå gränsen. CRM110 inför ingen migrering. Granskad återpublicering av v106-källa `48e44ea58483c37b9554919fa54298f9c1ca8f4e` är kodåtergångsvägen och ska behålla samma Site, DB/BUCKET och begränsad delning, men den återinför äldre dataåterställningens lucka. Ingen sådan återgång utförs här.

Lagringsschema, sex migrationer, data-/backupformat, DB/BUCKET, serverroller, privat kommunikation, CAS, idempotens och mängd-/revisionsregler ändras inte. Oberoende källjämförelse visar byteidentisk commit-funktion med dess SQL och bindvärden. v106-kod kan läsa samma data men saknar den nya grinden för äldre dataåterställning; ingen kodåtergång eller återställning av riktiga kunddata har utförts.

Total D1-batch-/databasbudget, hostingens CPU/minne och verklig hostingåterställning återstår. Separat backup för kontobindningar, Outlook och privata utkast samt personlig inloggning, första verkliga sparning och personalacceptans är fortsatt obekräftade. Grön lokal/CI-verifiering ersätter inte dessa.

Nästa B04-lucka: källschemat tillåter 50 000 historikhändelser, varefter dataåterställningen lägger till en per kund. Statisk kodgranskning visar att 50 000 + 1 eller 49 999 + 2 kan överskrida exportschemats gräns. Detta är ännu inte ett genomfört 50k-handler-/runtimeprov; repro och slutlig historikgrind återstår. Radgrinden i CRM110 löser inte händelseantalet.

Vid denna dokumentfrysning återstår den frysta slutrevisionens obligatoriska regression, TypeScript, bygge, isolerade fullruntime, diffkontroll, exakt-head CI, aktuell-bas merge och publicering på samma Site. Faktisk kandidat, GitHub-main, Sites-källrevision och lyckad liveversion redovisas separat i PR/leveranskvittensen efter körning. Begränsad delning, miljö, konton och agentaktivering ändras inte.

Tidigare dokumentation bevaras byteoförändrad nedan.

---

# CRM109: färdiga återställningsrader får plats före filskrivning

Färsk bas är levererad CRM108/[PR #176](https://github.com/ludros93-prog/MAgnussons-CRM/pull/176): GitHub-main `c02201adf6a600d1762ec6d1fe91d0cce7003597`, Sites-källa `d5742b825b189e95c0af9a15f3db02a072e45eae`, lyckad live v105. Alla 420 spårade filers bytes och Git-lägen matchade före ändringen, träd `69f944d6de1255a51660c903002ea3d5ce060268`. Egen branch/worktree och reservation används; inga öppna PR:er eller konkurrerande publicering observerades vid öppningen.

CRM-kopia med kundfiler i JSON och NDJSON kontrollerar nu varje färdig SQLite-rad mot D1:s dokumenterade 2 000 000 byte innan första filskrivning. Beräkningen omfattar SQLite-header, alla lagrade kolumner, genererad återställningshistorik, UUID-omappade referenser, filmetadata, settings och kvitto. Den faktiska databasens textkodning läses med en liten read-only-fråga; annan eller okänd kodning ger ett tydligt avslag före staging. Vanliga skrivningar och redan genomförda exakta återförsök behåller sitt beteende.

Vid radgränsfel: bevara originalkopian privat och använd feltexten för att utreda den berörda lagringsposten. Beskedet betyder att återställningen inte börjat skriva kundfiler eller uppgifter. Kapa inte historik och byt inte till den äldre dataimporten för att kringgå gränsen. Vid kodningsfel måste faktisk DB-bindning/kodning klarläggas före ett nytt försök; inga credentials eller exporter ska läggas i Git.

Schema, sex migrationer, backupformat, DB/BUCKET, serverroller, privat kommunikation, CAS, idempotens och mängd-/revisionsregler är oförändrade. Oberoende jämförelse av faktisk commit visar byteidentiska SQL-texter och bindvärden före/efter i 15 scenarier. v105-kod kan läsa samma data men tar bort denna nya förkontroll; ingen kodåtergång eller live-återställning har utförts.

Avgränsningen gäller CRM-kopia med kundfiler. Äldre rena dataåterställningen via `/api/crm` och vanliga skrivningar får ingen ny budgetgrind. Total D1-batch-/databasbudget, hostingens CPU/minne och verklig hostingåterställning återstår; lokala prov ersätter inte dessa. Separat backup för kontobindningar, Outlook och privata utkast samt personlig inloggning, första verkliga sparning och personalacceptans är fortsatt obekräftade.

Denna leverans ändrar ingen lagrad representation och kräver ingen migrering. Återgångsmålet är tidigare v105-källa `d5742b825b189e95c0af9a15f3db02a072e45eae`; en granskad återpublicering ska behålla samma Site, DB/BUCKET och begränsade delning. Ingen återgång utförs här och gammal kod saknar radförkontrollen.

Obligatorisk regression, TypeScript, bygge, isolerad native-runtime och diffkontroll på den frysta slutrevisionen samt exakt-head CI, aktuell-bas merge och samma Sites-publicering återstår vid denna dokumentfrysning. Faktisk kandidat, GitHub-main, Sites-källrevision och lyckad liveversion redovisas separat i PR/leveranskvittensen efter körning. Begränsad delning, konton, miljö och agentaktivering ändras inte.

Tidigare dokumentation bevaras byteoförändrad nedan.

---

# CRM108: registrerad medlemskoppling följer produktionsansvaret

Färsk bas är levererad CRM107/PR #175: GitHub-main `bca64ef09484db4f1cd62a1575fbcbd7fe7a1d85`, Sites-källa `8f958c1d1aa6afdfad5fe8150700c55dd00dec92`, lyckad live v104. Alla 418 spårade filers bytes/lägen och träd `95c5264f5eba039bae47f5ce2e0f9ff319d40e0f` matchade före ändringen. Egen branch/worktree och reservation används; inga öppna PR:er eller konkurrerande publicering observerades vid öppningen.

Sites-helpern hittades inte vid avgränsad installerad sökning; vissa kataloger nekade läsning. Befintlig källa öppnades före produktändringen med vanlig kortlivad Git-credential, utan publicering vid push. Token och konfidentiella nativevärden hålls utanför repo och rapporter. Samma Site, custom-delning revision 2, miljörevision 1, auth-identitet, DB/BUCKET och noll Sites-automations verifieras före och efter publicering. Overlay-fullhet hanteras med egna /dev/shm-kopior och jämförda låsta beroenden; installation av beroenden påstås inte och äldre källor/bevis bevaras. Inga riktiga kundorder, mejl, konton, åtkomstlistor, integrationer eller agentinställningar ändras i uppdraget.

Lagringsschema, migrationer, backupformat, medlems-CRUD, roller, privat kommunikation, CAS, idempotens, mängd-/revisionsregler, kommersiellt ansvar och DB/BUCKET är oförändrade. v104-kod kan läsa samma data men återinför ägarluckan; ingen kodåtergång eller verklig hostingåterställning utförs. Historisk identitet bevisar ingen aktuell behörighet.

Nästa genomförbara B04-del är faktisk lagringsbudget efter filomappning: ett giltigt syntetiskt domänunderlag växte från 1 999 700 till 2 003 235 UTF-8-byte i den verkliga SQL-byggarens JSON-bindning när 101 filreferenser ersattes med UUID:n; framtida NDJSON-header var 2 006 464 byte. SQL exekverades inte och ingen server-/hostad gränsöverträdelse påstås. D1 dokumenterar 2 000 000 byte för string/BLOB/hel rad; JSON-storlek ensam garanterar inte full rad. Förkontroll av slutligt lagringsunderlag före staging, verklig hostingåterställningsväg och separat backup för medlemskopplingar, Outlook och privata utkast återstår. B06/B07 kräver verkliga personer och konton.

Obligatorisk regression, TypeScript, bygge, isolerad native-runtime och diffkontroll på slutrevisionen samt exakt-head CI, aktuell-bas merge och samma Sites-publicering återstår vid denna dokumentfrysning. Faktiska slutresultat, separata GitHub-main-/Sites-källrevisioner och liveversion redovisas i PR/leveranskvittensen. Grön isolerad CI/runtime är inget konto-, integrations- eller personalprov.

Referens-tasken `01a104c7-a5c5-7350-8577-a4f941138061` är oläst: tillgängligt read_thread gäller Slack, inte Codex. Explicit brief och färskt repo används.

Tidigare dokumentation bevaras byteoförändrad nedan.

---

# CRM107: plats för återställningshistorik och filförteckning

Färsk bas är levererad CRM106/PR #174: GitHub-main `3eca951806e73e95bee28029d8b388b6d816d723`, Sites-källa `c77340f68e2044e4f5b3284900bd54cb10bde221`, live v103. Alla 416 spårade filers bytes/lägen och träd `4fa104620bfcc3da910d63e0bac0aac1c4780e8d` matchade före ändringen. Egen branch/reservation; inga öppna PR:er eller pågående publicering observerades vid öppningen.

Båda återställningsformaten mäter nu den färdiga framtida NDJSON-headern efter genererad kundhistorik, UUID-omappning av filmetadata/referenser och destinationens nästa revision. Över 16 000 000 UTF-8-byte ger ett tydligt fel före första filskrivning och transaktion. Originalhistorik kapas aldrig. Ett tidigare giltigt kvitto kan fortfarande återförsökas; full fil-/slutintegritet, aktör och avsikt kontrolleras som tidigare.

Detta gäller framtida NDJSON-header vid återställningsskrivningen. Det garanterar inte den äldre JSON-exportens separata total-/base64budget, stora accepterade native-commits, verklig hostingkapacitet, framtida nya data eller personal-/kontoacceptans. Format, migrationer, roller, privata data, CAS, idempotens och lagringsbindningar är oförändrade. v103-kod är kompatibel återgång men återinför det här felet; ingen återgång eller verklig hostingåterställning har utförts.

Sites-helpern hittades inte i den avgränsade installerade sökningen; vissa kataloger nekade läsning. Befintlig Sites-källa öppnades före produktändringen med vanlig kortlivad Git-credential, utan automatisk publicering. Token/privata nativevärden sparas inte. Samma Site, custom-delning revision 2, miljörevision 1, DB/BUCKET och noll Sites-automations ska verifieras oförändrade före och efter publicering.

Obligatorisk slutrevisionens regression, TypeScript, bygge, isolerad native-runtime och diffkontroll samt exakt-head CI, merge mot aktuell bas och samma Sites-publicering återstår vid denna dokumentfrysning. Faktiska slutresultat, separata main-/Sites-källrevisioner och liveversion redovisas i PR/leveranskvittensen. Ingen ändrad delning, miljö, kontobindning eller agentaktivering ingår.

Nästa B04-del: säker verklig hostingåterställning och verifiering av dess D1-/Workerbudgetar samt separat backup för kontobindningar, Outlook och privata utkast. Referens-tasken `01a104c7-a5c5-7350-8577-a4f941138061` är oläst: tillgängligt read_thread gäller Slack, inte Codex. Explicit brief och färskt repo har använts.

Tidigare dokumentation bevaras byteoförändrad nedan.

---

# CRM106: förbered återställningshistorik innan R2-staging

Färsk GitHub-main 840194740c8c66aecab65a12bc699e88b59e069a och faktiskt publicerad v102-källa 95b778a71777a045a2f7299a662070b9e0d342e4 öppnades före ändringen. Alla 414 filers bytes och Git-lägen matchade, träd 90fc46aced430c70f36b4d23d5276ffd2c6d5017. CRM105/PR #173 är levererad. Egen branch/reservation används; inga öppna PR:er eller främmande publicering sågs vid öppningen. Samma Site och begränsade custom-delning revision 2, miljörevision 1 och noll Sites-automations behålls.

Två backendmoduler och två nya isolerade testsuiter med befintliga entryanrop ändras. Befintliga SQL-migrationer, databas-/filformat, hostingidentitet, konton/roller, privat kommunikation, D1-commit/CAS och request-hashformat ändras inte. Full befintlig restore-validering körs på förberedd historik före remap/put; avslutaren tillför inget efter valideringen. Redan registrerade exakta återförsök behåller tidigare format- och integritetskontroller.

Riktade kandidatprov passerade: verkliga JSON-/NDJSON-handlers med migrerad minnes-SQLite, angränsande datumtextgränser inklusive Unicode, giltiga serverkopior med 50 000+1 respektive 49 999+2 historik-/kundantal som avvisas före första filskrivning och commit. 49 998 ursprungliga poster plus två återställningsposter passerar, med varje originalpost bevarad och giltig återexport i båda formaten. Förlorat commitsvar, exakt replay och äldre registrerade datum-/kapacitetskvitton täcks. Ett separat byggt Worker-prov med faktisk lyssnande HTTP, lokal D1/R2 och 28 anrop passerade: samma stopp utan staging/commit, verkliga filreferenser/bytes, återexport, medlemsfrikoppling och förlorat transaktionssvar. Alla 18 råtabeller samt positiva privata utkast, Outlook-, medlems- och R2-sentineler kontrolleras. Detta är isolerade syntetiska prov, inte verkliga konton, personalacceptans eller hostingåterställning.

Datakompatibilitet: inga konverteringar eller nya fält införs. Föregående v102 kan läsa dessa befintliga scheman, men en kodåtergång återinför de två accepteringsfelen. Historiska läsargränser i tidigare driftanteckningar gäller fortsatt; ingen live-återgång eller hostingåterställning har utförts. Medlems-/Outlook-/privatutkastlagren bevaras i proven och ingår fortfarande inte i CRM-kopian. En full hostingkopia behöver deras separata återställningsväg.

Officiell Sites-hjälpare saknas; vanlig kortlivad autentiserad Git används utan publicering vid push, följt av separat verifierat bygge/arkiv/save/deploy. Token hålls i minne, aldrig repo/bevis. Overlay-fullhet hanteras med nya egna /dev/shm-kopior och jämförda låsta beroenden; inga gamla källor/bevis raderas. Rättningen skyddar genererad historiks text-/antalgränser och fulla befintliga schema. Den reparerar inte redan ogiltiga historiska återställningar och garanterar inte alla separata byte-/runtimegränser. Nästa B04-del är 16 MB-headerns utrymme efter genererad historik/filomappning samt en säker verklig hostingåterställningsväg. D1:s dokumenterade budgetar kräver separat verifiering; ett lokalt 50 000-postersprov bevisar inte sådan hosted kapacitet. Separat backup för kontobindningar, Outlook och privata utkast samt verkliga konto-/personalprov återstår.

Slutlig obligatorisk regression, TypeScript, bygge, isolerad runtime, diffkontroll, exakt-head CI, aktuell-bas merge och samma Sites-publicering återstår vid denna dokumentfrysning. Källkod, GitHub-main och live redovisas separat i PR/leveranskvittensen efter faktisk körning. Tidigare dokumentation bevaras byteoförändrad nedan.

---

# Oförändrad lagring och åtkomst – CRM105

Ändringen gäller kundväljarens läsprioritering, etikett och förklaring. API, SQL-migrationer, lagringsmoduler, privat kommunikation/utkast, paketinputs, hostingbindningar, CAS och idempotens ingår inte i ändringsmängden. Ingen datakonvertering behövs. Sparad Site v101 är planerad datakompatibel UI-återgång; ingen faktisk live-rollback eller hostingåterställning har provats.

Samma Site appgprj_6aa71b309d90819181a32a9af6e6baf2, URL, begränsad custom-delning revision 2 och miljörevision 1 behålls. Öppningen fann inga öppna PR:er eller pågående publicering. Egen isolerad APP/SOURCE och privat provyta ligger på /dev/shm eftersom workspace-overlay är full; inga äldre källor/bevis raderades. Identiska låsta paketinputs medgav faktisk APP-kopia och SOURCE-hardlinks, inte en ny installation. Den officiella Sites-källhjälparen saknas efter begränsad sökning; vanlig autentiserad Git öppnade färsk källa före produktändringen.

B04 behöver en separat rättning: syntetiska verkliga import-/exporthandlers visar att obegränsad exportedAt kan skapa för lång återställningshistorik, och att ett giltigt servergenererat arkiv med 50 000 historikposter får 50 001 efter återställning av en kund. Båda kan därefter ge export 400. Detta har inte åtgärdats i CRM105 och är inget hostingprov. En kommande rättning ska validera hela resulterande tillståndet före staging/commit, bevara historik och täcka båda formatens gränser/replay.

Tidigare dokumentation bevaras byteoförändrad nedan. Detta är kandidatens verifierade läge före slutkontroller; slutrevision, CI, PR, main och publicering redovisas separat i leveranskvittensen.

---

# Använd Notisers personliga uppföljning – CRM104

Välj **Notiser** för din uppföljning. **Mina** betyder registrerade uppgifter och order för din kopplade säljarprofil samt kundsignaler inom ditt kundansvarsurval. Äldre poster utan profilansvar kan visas genom ditt giltiga kundansvar. Behörig administratör kan välja **Hela teamet**. Varje rad behåller sin befintliga handling **Öppna kund**, **Öppna order** eller **Planera kontakt**.

Visas **synligt urval**, kontrollera först det angivna hindret. Saknat kundansvar hanteras i **Konton & roller**; saknad eller motstridig profilkoppling i **Mål & inställningar**. Säljare ber en administratör kontrollera kopplingen. En tom eller delvis synlig kö bekräftar inte att allt arbete är utfört. Arbetsnotiserna ovanför följer sina registrerade mottagare och har separata läsmarkeringar.

Ingen lagringsändring eller migrering införs. Föregående publicerade v100 med källa f8ac99d05fc4adae952527ae5034e348286414d0 är datakompatibel UI-återgång, men återför felurvalet. Faktisk live-rollback och full hostingåterställning är inte provade.

Tidigare dokumentation bevaras byteoförändrad nedan. Slutrevisionens kontroller, PR, GitHub-main och publicering redovisas separat i leveranskvittensen; denna notis är kandidatens verifierade förfrysningsläge.

---

**CRM103 – placeringskontrollen stoppade föregående slutkandidat**

Den strikta kompatibilitetsgrinden stoppade `42519634e4a91418f406e3a2952b77e991a56206`: CSS-tilläggets 310 byte låg mitt i filen, så tidigare bytes fanns kvar men utgjorde inte hela prefixet som scope kräver. Samma tre regler har nu flyttats till faktiskt filslut; filen är exakt tidigare main-CSS plus det oförändrade tillägget, Git-läget oförändrat. Privat korrigeringsbevis `stylesheet-placement-correction.json` binder före-/efterbytes; aktuell CSS SHA-256 `631787a2a7c311fac97dce33202a8c5939aa099339110c6dd8b9cfbc7b8ae590`. Kravet och scopekvittot behålls. Ett statiskt delprov som endast kontrollerade att gamla bytes gick att återfå räcker inte för detta prefixkrav och kvalificerar inte leverans.

Den stoppade kandidatens regression, TypeScript och bygge hann faktiskt passera. Den egna femkontrollen avbröts med SIGTERM under isolerad runtime efter kompatibilitetsfyndet; processgruppen är stängd. Runtime och femkontrollen räknas inte som PASS. Kvittot/loggarna, avbrottet och det tidigare kandidaturvalets bevarandekvitto kvarstår som tidsbunden historik. Ny ren slutrevision kräver nya fem kommandon, exakt-head CI, faktisk prefix-/lagringsjämförelse och full APP-/SOURCE-browser. Ingen CRM103-merge, källsynkning eller publicering har skett; main/källa/live är fortsatt CRM102/v99 vid denna nya frysning.

---

**CRM103 – browserfynd korrigerade inför slutleverans**

Kandidat `64cbb0acc77563329ff0c534a04cd3ecd364f79e` klarade faktiskt alla fem obligatoriska kommandon (privat kvitto SHA-256 `af48df12e0a10764cf6cbeb9f63eb6c1b7b3f9e483e14c15ea16b617c5c5ff08`) och [exakt-head CI 38121749777](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38121749777). Native APP-browser stoppade sedan på horisontellt överflöde i två kundsignaler vid 1290 px och dubbel textstorlek. En kontaktpanelsregel rättade radbrytningen. Nästa undersökande mobilprov hittade verkligt överlapp: fasta 26 px antalsmarkeringar fick 38 px tecken; uppgiftsmarkeringen överlappade en knapp med 6 px och leveransköns markering nästa text med 3 px. En lokal MyDay-regel låter markeringarna växa med texten. Ett första försök behöll 26 px genom äldre importordning; det stoppet bevaras. Den korrigerade specificiteten gäller endast roten med klasserna my-day och visual-day.

Undersökande byggd revision `8b5cb4bffd89b834df7ded7d040f370120735b73` klarade de första 25 native browserfallen, inklusive Min dag/Kundvård vid 1290/390/320 px med normal och exakt dubbel text. Fall 26, Visa alla sex kunder, stoppade på provets antagande om fixtureinsättningsordning för de första fem kunderna. Den faktiska servern läser utan ORDER BY; alla sex egna kund-ID:n var rätt och rådata oförändrade. Provadaptern korrigeras genom att spara faktiskt GET-urval/ordning och jämföra hela objektsmängden mot rå fixture, utan förväntningar från DOM eller sänkta ID-/antal-/geometrikrav. Tidigare fem definitionsfiler och samtliga felkvitton bevaras. Undersökande prov kvalificerar inte slutleverans.

Aktuell ändringsmängd är **13 filer**: två produktfiler (MyDay och ett append-only CSS-suffix), tre regressionstestfiler och åtta dokument. Tidigare uppgifter om 12 ändrade/400 skyddade filer är v1-historik; slutjämförelsen ska kontrollera **399 skyddade filer av 412 tracked** samt hela tidigare CSS-prefixet och dess Git-läge. CSS-tillägget är exakt 310 byte, SHA-256 `5bbed2cf66fae089b071821f381129b3babe9d54bb45abf2c63d6f2e3c1d4b50`. Textstorlek, kontrolltyper, handlers, serverroller, övriga urval, finanshistorik, lagring, API, schema och migrationer behålls. Scopekvitto SHA-256 `dd3b3884fab5ae27a063dd148139fe0bdcdb2b6717974785837e411c36470bba` binder de faktiska browserstoppen och exakta ändringsvägarna.

Ny slutkandidat ska köra alla fem kommandon, egen exakt-head CI och full native APP-/SOURCE-browser med 28 fall. [PR #171](https://github.com/ludros93-prog/MAgnussons-CRM/pull/171) och task redovisar faktisk slutrevision/merge/save/deploy när de utförts. Vid denna dokumentationsfrysning är färsk GitHub-main `b20e018cb4aff3315f40408d73902f331dcbda43`, Sites-källa `bcd2fb7e87c798a93d2d1b2a41f49ba31f47002e` och **live v99**. Ingen CRM103-merge eller publicering har skett. Personlig inloggning, första verkliga sparning, personalacceptans, riktiga integrationer, hostad återställning och utförd live-rollback förblir obekräftade. B01/B04 personligt ansvar och återställning samt B06/B07 faktisk introduktion är fortsatt nästa verksamhetsgrindar efter verifierad teknisk leverans.

Tidigare kandidattexter nedan är bevarad historik med sina angivna revisioner.

---

# CRM103 – drift- och kompatibilitetsgräns

Sites-källan öppnades faktiskt före produktändringen i en separat egen SOURCE. Alla 411 committed bytes och Git-lägen motsvarade färsk main; ursprunglig fysisk SOURCE bevarades. Ordinarie kortlivad credential hanterades i dolt stdin utan persistens eller publish-on-push. En avgränsad hjälparsökning hittade ingen officiell Sites-workflowhelper; vanlig verifierad Git-/arkivväg används med `helper_run=false`, inte ett påstått helperprov. Samma befintliga Site och begränsade custom-delning revision 2, runtime revision 1 och noll automations bevaras.

Ändringen gäller endast `components/my-day.tsx` samt tre regressionstestfiler och åtta dokument. Inga lib-/backend-/API-/schema-/migrerings-/package-/hosting-/CSS-ändringar. Oförändrad lagring och samma backend som v99 ska beläggas med faktisk byte-/Git-lägejämförelse för slutkandidaten. Sparad v99 är ett kompatibelt UI-återgångsmål när jämförelsen passerar; inget hostat återställningsprov eller live-rollback är utfört.

CRM102 är avslutad: [PR #170](https://github.com/ludros93-prog/MAgnussons-CRM/pull/170), kod `8526084077667547a94943306d907463d49a679b`, GitHub-main `b20e018cb4aff3315f40408d73902f331dcbda43`, Sites-källa `bcd2fb7e87c798a93d2d1b2a41f49ba31f47002e`, **live v99**, lyckad terminal deploy `appgdep_6acb2cbcfa8881919499e4da480af1cc`. Färsk Site-/main-läsning och tidigare slutkvitto SHA-256 `38c0f7d42f29b829aab0f7302477c19e983301ee206cc1583a5c441fbd9d9d25` belägger detta. Äldre väntande kandidat- och stopptexter nedan är bevarad historik.

Inga skrivtester görs på riktiga kunder/order. Isolerad runtime/browser använder egna syntetiska D1-/R2-stores och återställnings-/städbevis. Konto-/profilåtgärder och verkligt personalprov kräver faktiska personers underlag; gröna mock-/CI-prov ersätter dem inte. Codex-referensen `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom tillgänglig read_thread gäller Slack, inte Codex. Uppdraget bygger på uttrycklig brief och färsk main.

CRM103 är vid denna dokumentationsfrysning en separat kandidat. Slutkandidatens fem obligatoriska kommandon, exakta head-CI, native APP-/SOURCE-browser, aktuell mergebas och faktisk merge/save/deploy redovisas efter utförd verifiering i leverans-PR och task. Ingen framtida leverans, personlig inloggning, verklig sparning, integration, personalacceptans eller hostad återställning påstås.

---

Historik före CRM103 bevarad byteoförändrad nedan.

**CRM102 – andra browserstoppet före leverans**

Den korrigerade kandidaten `37ae97cdeb78af6c040f5acde7611deab8979344` klarade återigen alla fem slutkommandon (kvitto SHA-256 `2afccc9ff25ddc6e831de8c38275a4e71d4908423f0fd28574fabfcc94563035`) och [exakt-head CI 38116332540](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38116332540). Desktopfallet vid 1290 px och dubbel text passerade; ansvarsetiketten var då läsbar. Nästa faktiska browserfall vid 390 px och dubbel text stoppade på horisontellt överflöde: dokumentbredd 592 px. Rågeometri visar sidrubrikens block till x592,4 samt knappen Skapa affär från sparat behov till x475,1 i en 390 px viewport. Ingen merge eller publicering skedde; samtliga tidigare kvitton/loggar/bilder bevaras.

Tre ytterligare CSS-regler, enbart under prospectvyn, begränsar rubrik-/knappblock till tillgänglig bredd, tillåter radbrytning och ger huvudrubrikens textrader större höjd. Fontstorlek, text, kontrolltyp, data och callbacks behålls. Nästa frysta revision ska klara en helt ny femkommandogrind, exakt-head CI och full APP-/SOURCE-browser; tidigare resultat gäller bara de angivna revisionerna. Uppgiften om 313 byteidentiska övriga produktfiler längre ned är historiskt v1-bevis; aktuell ändringsmängd är 19 filer med 392 skyddade filer. Main/live är fortsatt CRM101/v98 vid denna frysning. Slututfall redovisas i PR #170 och task.

---

**CRM102 – faktiskt browserstopp och avgränsad korrigering**

Kandidat `44a7a069bbacba35bc3eca1fb5f0bcf902dd4bfd` klarade alla fem obligatoriska slutkommandon: regressioner, TypeScript, bygge, isolerad runtime och diffkontroll. Privat slutkvitto SHA-256 `411de9ff8d7880791cf242a742cb76091c72c13a6ff24ae16b068ff9f9c09abc`. Native APP-browser stoppade därefter vid 1290 px och exakt dubbel textstorlek: prospectansvarets etikett hade 551 px text i 479 px tillgängligt utrymme och klipptes. Bara första browserfallet nåddes; inget fullständigt browser-PASS, merge eller publicering skedde. Diagnoskvitto SHA-256 `e017d7329113561f592443600e4bba8a891eef0288931210e8e77fc69d8b169d`. Syntetiska rådata, återställning och processstädning verifierades, noll browserskrivningar.

Korrigeringen tillför enbart prospectavgränsad CSS för radbrytning och växande höjd i ansvar/filter samt flexibla kort/statusrader. Befintliga CSS-bytes bevaras som prefix; fontstorlek, kontrolltyp, värden, eventhandlers och urvals-/historikregler ändras inte. Övriga möjliga textfel var inte belagda vid första stoppet och ska avgöras i nästa fulla browserprov. Fyra färska officiella MDN/W3C-artiklar med 13 byteverifierade citat stödjer läsbarhet vid textförstoring och reflow; privat researchkvitto SHA-256 `5cba2dbd23ec9486153a3beeaaa31496ddb974bf5321b48ad6117e2d45be04c7`. Lokal CSS och Chromium-prov är inte generell tillgänglighets- eller personalacceptans.

Ny fryst kandidat måste klara samtliga fem slutkommandon, exakt-head CI och separata APP-/SOURCE-browserprov före leverans. Vid denna dokumentationsfrysning ligger CRM102 i PR #170 och **main/live är fortsatt CRM101/v98**. Faktiska slutrevisioner och publiceringsutfall redovisas efter körning i PR/task. Ingen lagring/migrering ändras; v98 är kompatibelt UI-återgångsmål, inte ett utfört hostat återställningsprov. Nästa arbete följer verkliga kvarstående konto-/operativa ansvarshinder; B04/B06/B07 och personlig användning markeras inte klara.

---

**CRM102 – riktade prov före slutgrind**

41 nya normalizer-/AST-/Reactfall PASS; 3 456 kompletta historiska metricfält, 208 hela metric-/profil-/team-/årsjämförelser och sju jämförelser mot verklig tidigare workflow-kod. Tillsammans med de berörda och skyddade befintliga proven: 432 fall PASS, oförändrade produkt-/testbytes och noll HTTP. Privat riktat kvitto SHA-256 `63d4cedb355798f5ab2350bb36504baa169a6a0777426077140a1b7775de32cf`. Separat oberoende granskning gav 26 fall och 15 historikjämförelser PASS samt 25 bevarade verkliga AST-klausuler; 313 övriga produktfiler är byte-identiska med main. Två privata testadapterstopp rättades utan produktändring och deras råloggar bevaras. Dessa riktade prov är inte den slutliga kandidatens fem obligatoriska kommandon, CI, browser, personlig inloggning eller personalacceptans.

---

# CRM102 – samma kundansvar i Nykundsbearbetning

Nykundsbearbetning använder nu samma aktuella kundansvar som Mina kunder. Direkt ingång och personligt Resultat → Bearbeta företag återanvänder exakt medlemskopplad profil för registrerade kunder och kontots giltiga aktuella alias för äldre kunder utan profil-ID. Teamurval och uttryckligt valt annat ansvar behålls. Saknad eller motstridig koppling visas som ett synligt, möjligen ofullständigt urval; noll prospekt bevisar då inte att arbetet saknas. Kvalificeringshistorik, affärsdefinitioner, mål, fakturaägare och marginalmått ändras inte.

Färsk läsning 11 oktober löser föregående leveransstatus: [CRM101 PR #169](https://github.com/ludros93-prog/MAgnussons-CRM/pull/169) är merged. Kod `bade8f9132cbf07275974170b2563995d4ad525a`, GitHub-main `4b60d1e77fcd0573379da2ffcd99ca3c4b4dfa35`, Sites-källa `78cacb25d02f9039560d9f8333c01523398fce73`, **live v98**, terminal lyckad deploy på samma begränsade Site. CRM101:s fem slutkommandon, [CI 38110950908](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38110950908) och separata APP-/SOURCE-browserprov är verifierade för den revisionen. Privat slutkvitto SHA-256 `58fa459794295ea43fb298349dcc11a5bbef6c41b41975c8258e3ff17b378dde`. Äldre stopp och väntande texter nedan gäller föregående kandidater.

CRM102 är en ny kandidat. Läsande basprov på main gav 12 faktiska syntetiska PASS-fall och 40 bytekontrollerade produktmoduler: direkt prospektering, Mina kunder och Resultat-ingången hade samma antal men olika kund-ID:n; `_unassigned` kunde felaktigt bli kundalias. Privat baskvitto SHA-256 `735a58a2723550bc8826ded025d1dfd61c0680a76eed4892759f1090b8bf4bf8`. Produktändringen gäller två presentationsfiler och återanvänder etablerad kundurvalslogik, inte nya serverrättigheter. CRM102:s slutregressioner, TypeScript, bygge, isolerad runtime/browser, exakt-head CI, merge och publicering återstår här; deras slutliga faktiska revisioner redovisas i PR och task. Tidigare gröna kvitton ersätter inte dessa.

Ingen lagringsändring eller migrering planeras. Oförändrade skyddade backend-, schema-, API-, bindnings- och beroendefiler ska byte-/lägesjämföras mot både main och aktuell v98-källa före leverans. Samma Sites sparade v98 är kompatibelt UI-återgångsmål för denna presentationsändring; faktisk hostad backup/återställning eller live rollback är inte provad. Delningspolicy revision 2, runtime-miljö revision 1 och noll Site-automationer är färskt lästa och ska jämföras efter deploy. Officiell Sites-källhjälpare saknades vid begränsad sökning; explicit ordinarie Git-/arkivflöde används med helper_run=false. Inga kunddata, exporter, bilagor eller hemligheter sparas i repot.

---

**CRM101 – browserkorrigering före leverans**

Kandidaten `5da07a412dd65dcec9bf43bb7a6161f68caef8e9` klarade faktiskt alla fem obligatoriska slutkommandon och [exakt-head CI 38109472085](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38109472085). Native Chromium-browser stoppade därefter på verklig textklippning vid exakt dubbel textstorlek: Rapportmånad dolde året, två Kundvårdsfilter dolde delar av valtexten, kundkortens statusrad växte utanför mobilen och Resultats diagramförklaring klipptes vid 320 px. Ingen merge eller publicering skedde. De första två browserstoppen berodde på privat navigator respektive dekorationsmätning; verkliga text-/kontroll-/ancestor-klippkrav behålls. Samtliga tidigare kvitton och bilder finns kvar privat.

Korrigeringen gäller enbart lokalt avgränsad CSS i Resultat och Kundvård: månadens native textfält, filter, kundkort och diagramförklaring får utrymme/radbrytning och växande höjd. Typ, lagrat `YYYY-MM`-värde, fontstorlek, eventhandlers, kundurval och andra vyers CSS behålls. År och längre månadsbeteckning granskas även som faktiska native segment vid 320 px och dubbel text. Utforskande prov ersätter inte nästa frysta revisions fem slutkommandon, exakt-head CI eller full APP-/SOURCE-browser. Ny leverans redovisas med faktiskt huvud/source/live i PR och task. Chromium-prov är inte allmän tillgänglighets-, Firefox-/Safari- eller personalacceptans.

---

# Drift – CRM101 kundrisk-/Kundvårdskandidat

CRM100 är avslutad: [PR #168](https://github.com/ludros93-prog/MAgnussons-CRM/pull/168), kod `88b5149475d0185327ba2bc406829e687ceaeb55`, GitHub-main `0a9420dd7ddf6f25bc762ca256f0d83fe34280ef`, Sites-källa `333342a522cc21f80c88a871a4b5c276ea45b5f4`, **live v97**, terminal lyckad deploy. Färsk läsning bekräftar samma Site och begränsad custom-delning (revision 2). Föregående väntande kandidattexter nedan är historik.

Ingen lagring ändras: backend, API, schemas, SQL-migrationer, D1/R2, privata utkast, atomiska skrivningar, CAS, idempotens och hostingbindningar är bytebevarade. Ingen datamigration behövs. V97 är kompatibelt UI-återgångsmål för denna avgränsning; faktisk live-rollback eller full hostad återställning utförs inte som prov. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook.

Vid dokumentationsfrysningen är detta en separat CRM101-kandidat. Slutrevisionens fem obligatoriska checks, isolerad native APP-/SOURCE-browser, exakt-head CI, aktuell mergebas och faktisk merge/save/deploy redovisas efter körning i leverans-PR och task. Ingen kommande publicering påstås här.

Syntetiska prov bekräftar inga personliga konton, verkliga uppföljningar, integrationer eller personalacceptans. Codex-tasken `01a104c7-a5c5-7350-8577-a4f941138061` är oläst; tillgängligt read_thread avser Slack. Explicit brief och färsk main används. Inga konton, roller, kund-/orderposter, utskick, scheman eller agentinstruktioner ändras.

---

Historik före CRM101 – tidigare dokumentation bevarad byteoförändrad nedan.

# Drift – CRM100 kundregisterkandidat

Kandidaten `59df3c31f6a3cb0355d5f01ac9e5bbd661c8a488` klarade alla fem obligatoriska slutkommandon och [exakt-head CI 38105466081](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38105466081). Den isolerade APP-browsern godkände normalvyn vid 1290 px men stoppade vid exakt dubbel textstorlek: Kundregistrets ansvarigfilter klippte sin fulla etikett (clientWidth 483 / scrollWidth 528). Ingen merge eller publicering skedde. Lokala processer och portar stängdes, syntetiska D1/R2-data återställdes och käll-/byggbyte bevarades. Filtret får nu lokal radbrytning och automatisk höjd under enbart Kundregistrets toolbar; etikett, ansvarsurval, data och andra vyers CSS bevaras. Ny fryst revision kräver hela slutgrinden och APP-/SOURCE-browser igen; faktisk slutleverans redovisas i PR #168 och task.

CRM99 är verifierad och publicerad: [PR #167](https://github.com/ludros93-prog/MAgnussons-CRM/pull/167), kod `8cb713bd25267e6ebf4dee81a4a6200b5df068e9`, GitHub-main `58c59574038bb3bc3e54543459a092ee32194a67`, Sites-källa `e8acb9a30773ac9b92cc8f6b84dde6bb626735d5`, **live v96**. Färsk native avläsning visar terminal `succeeded`, samma begränsade custom-delning (revision 2) och miljörevision 1. Äldre väntande CRM99-text nedan är historik.

Endast klientens kundregisterurval och presentation ändras. Backend, API, schemas, SQL-migrationer, D1/R2, privata utkast, atomiska skrivningar, CAS, idempotens och hostingbindningar är oförändrade. Ingen datamigration behövs. V96 är kompatibelt UI-återgångsmål för denna avgränsning; faktisk live-rollback utförs inte som prov. Det tidigare crm82-formatgolvet gäller fortsatt. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook.

Koden och de riktade proven är klara vid dokumentationsfrysningen. Kandidatens fem obligatoriska slutkontroller, isolerad native APP-/SOURCE-browser, exakt-head CI, aktuell mergebas och faktisk merge/save/deploy redovisas efter körning i leverans-PR/task. Här påstås inga framtida utfall.

Inga konton, roller, kund-/orderposter, hemligheter, utskick, scheman eller agentinstruktioner ändras. Tekniska syntetiska prov är inga personliga inloggningar, verkliga uppföljningar, fungerande integrationer eller personalacceptans. Full hostad återställning och live-rollback är oprövade. Codex-referensen är oläst; tillgängligt read_thread avser Slack.

---

Historik före CRM100 – tidigare dokumentation bevarad nedan.

# Drift – CRM99 releaseförberedelse

Föregående leverans CRM98 är verifierad: PR #166, GitHub-main `b638c72593724fbbb842e9820b5c49ff85f570f7`, Sites-source `fe4f55209acb9703ecff8dc59ef6eade345cd9ac`, live **v95**. De 405 då spårade filerna har samma tree `9d3d061cd58ce9fefc8aee2af4a31b64a1cb332a` och byte. CRM99 är en separat kandidat; slutliga checks, CI, merge och publicering redovisas i dess PR och task efter faktisk verifiering.

Egen branch `feat/crm99-result-order-owner`, separat app-/sourcecheckout och ägarbunden byggreservation används. Färsk native metadata visade v95 och samma begränsade audience/policy; ingen annan öppen PR eller pågående publicering observerades vid öppningen. Source öppnades som egen detached clone och autentiserad fjärrläsning verifierade exakt source-main; ingen fjärrskrivning gjordes där. Ordinary credential används utan accepterat publish-on-push. Hemligheter stannar i minne/hidden PTY och sparas inte i kvitton.

Lokal dependency reuse är faktiska hardlinks från föregående verifierade checkout efter exakt jämförelse av `package.json`, `pnpm-lock.yaml`, `.npmrc` och packagefiler. Ingen installation kördes för detta och inga paket tillkommer; CI gör fortsatt locked install.

Produktdiffen är bara två läsande resultatfiler. Backend, API, serverroller, schemas, D1/R2, migrationer, atomiska skrivningar, CAS, idempotens, privat kommunikation och lagring är byteoförändrade mot v95. Ingen datamigration behövs. Den tidigare verifierade v95-versionen är rollbackkandidat vid en UI-regression; faktisk live rollback utförs inte som prov och hosted datarestore är kvar som separat drifthinder. Före publicering läses den aktuella Site-policyn/source/basen igen; dela inte bredare och ändra inga runtimevariabler/tunnelbindings.

Slutkandidatens faktiskt körda checks, native browser, sourcepush, arkiv, opaque saved version, deploy och policyreadback blir privata bytebundna kvitton samt slutlig PR/task. Här står inga påstådda framtida resultat.

---

Historik fore CRM99: tidigare dokumentation bevarad byteoforandrad nedan.

# Drift – crm97 avslutad live v94; crm98 Resultat-kandidat

Femte kandidaten `5e996b60bacf2faa04e85d4a1b82e1651e201a85` klarade alla fem slutkommandon (kvitto SHA-256 `18580632598862ed704638866555edc7b91929b8e443ff336a7fb0b14ed27cf3`) och [exakt-head CI 38099348916](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38099348916). Den isolerade appbrowsern klarade faktiskt samtliga 11 fall, tre bredder/sex normal- och dubbeltextlägen, native Offerter-jämförelse, klippningskontroller, 18 syntetiska D1-tabeller/två R2-objekts bevarande/återställning och cleanup utan skrivningar/externanrop (execution SHA-256 `2d1edff7ca9213c4ca5975cc90f8960fd294b45ec09e1b490a082a60115f1436`). Rootbildgranskningen upptäckte därefter överlappande X-axeltext i dubbeltextläget trots dessa PASS; textseparation hade inte ingått. Faktiska överlapp mättes i alla tre bredder (rootkvitto SHA-256 `051b419cb5e597ae16626f8d958af855de84bb8d48b086ae980efd1deda2402a`). Ingen merge/source/save/deploy skedde.

X-axeln får nu större avstånd mellan visade etiketter (`minTickGap` 8→40). De tolv datamånaderna, månadsbeloppstabellen, serier och navigation bevaras; teckenstorlekar krymps inte. Detta är vår layoutbuffert för uppmätt dubbeltext, ingen garanti för godtycklig förstoring. Läsande browserkontroll kompletteras med verkliga axelglyfers inbördes separation. Den nya kandidaten kräver hela slutgrinden, förstärkt app- och sourcebrowser samt exakt-head CI före merge/publicering. Main `da36abb1`, Sites-source `093af086` och live v94 gäller vid denna dokumentfrysning; faktisk slutleverans binds i PR #166 och taskresultat.

Färsk native metadata vid öppning visar live v94, source 093af08624f0278d2f0dfda504f1c938bc94b324 och terminal succeeded för deployment appgdep_6acac0f50d3c81919a02255162206283 på befintlig CRM-adress. Begränsad custom-policyrevision 2, miljörevision 1, samma auth-klient och noll Site-automations behålls. Ingen konkurrerande PR/körning eller publicering syntes.

Ordinarie native credential gav en läsande remote-kontroll. Source och färsk main-bas har samma träd b28326ece23c3e38db1b705dd3941d360c37e4ac och samtliga 404 spårade paths/modes/blobs/bytes. Jämförelsen gäller committed main-bas, inte den pågående fyrfilers produktändringen. Ingen beständig token eller accepterad privat auto-publicering används.

Officiell site-workflow.mjs hittades inte i faktiskt kontrollerade läsbara /opt och /workspace med redovisade undantag; /opt/containerd gav PermissionError. Ingen global frånvaro eller helperkörning påstås. Byteidentiska package/lock/.npmrc gav faktisk hårdlänksåteranvändning av föregående verifierade installation; ingen ny install påstås.

Kandidaten ändrar klientprojektion/diagnos och tester, inte backend, API, SQL, datamodell eller hostingbindning. V94 är kompatibelt UI-återgångsmål för denna avgränsning; återgång har inte utförts. Tidigare commercial_task-audit kräver fortsatt crm82-kompatibel läsare/skrivare, och v78 är inget säkert direkt rollbackmål. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook.

Crm97 är avslutad genom [PR #165](https://github.com/ludros93-prog/MAgnussons-CRM/pull/165): GitHub-main `da36abb16b71e023ceb9df135d6c4f993e8eee2b`, Sites-source `093af08624f0278d2f0dfda504f1c938bc94b324` och **live v94**, terminal lyckad deploy. Dess slutleveranskvittens SHA-256 är `ec9d2fe67bd8e3cecb224a0503046679c997683ce9a854152d5a0177bd673033`; tidigare pendingtexter nedan är bevarad historik.

Första kandidaten `9dd7490d3496b650e229203869c7192d2f4133d3` klarade fem obligatoriska slutkommandon och exakt-head CI [38095358280](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38095358280). Native browser hittade därefter ett faktiskt mobilfel: Identifierad-knappen hade scrollWidth 182/clientWidth 152 vid 390 px och exakt dubbel teckenstorlek. Etikett, antal och värde får nu radbrytas lokalt i pipelinepanelen. Andra kandidaten `e80f2ee1c7997c3d2bc4fcc7ac54f8220814f3a5` klarade också hela slutgrinden och [exakt-head CI 38096784829](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38096784829). Browsern godkände 1280/390 px inklusive exakt dubbel text, men hittade vid 320 px en för bred Öppna affärstavlan-knapp: 286,55 px mot 250,81 px innehåll, dokumentbredd 342 px. Den knappen får nu också lokal radbrytning och automatisk höjd. Denna revision krävde hela slutgrinden, browser och ny exakt-head CI. Faktiska slutbelägg och separata kandidat-/main-/live-revisioner binds i [PR #166](https://github.com/ludros93-prog/MAgnussons-CRM/pull/166) och taskresultat.

Syntetiska prov bekräftar inga personliga konton, verkliga uppföljningar, integrationer eller personalacceptans. Full hostad återställning och live-rollback är oprövade. Codex-referensen är oläst; explicit brief och färsk main används.

Tredje kandidaten `fd21313724e5376e205c585895ea87f2df23fb3a` klarade samtliga fem slutkommandon (kvitto SHA-256 `5a8dc4c474ca284157bb8694decaae30fe67a6704b9c308358a815a160fc43e0`) och [exakt-head CI 38097462958](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38097462958). Isolerad browser godkände hela 1280-/390-fallen, men dokumentet var fortfarande 342 px vid 320 px/dubbel text. Utökad läsande mätning av alla faktiskt renderade element fann arbetsdagsknappen utanför 320-pixelsvyn samt klippt trendflik, uppmärksamhetsrubrik och SVG-axeltext. Faktisk felsanalys SHA-256 `3e74eeab4b80cf0a77718cf545b7682868697de09ae4acd75b5401dd968f747e` bevaras privat; 172/172 synliga HTML-teckenstorlekar var exakt dubbla, 18 syntetiska D1-tabeller/två R2-objekt bevarades och återställdes, inga skrivningar/externanrop och ägda processer/portar stängdes. Detta är upptäckta layoutfel, inget fullständigt browser-PASS.

Den nya layoutkandidaten begränsar arbetsdagsknappens bredd även med mobilindraget, låter trendflikar/rubriker radbrytas och anpassar diagramhöjden till dess teckenstorlek. Recharts 3.8.0 mäter Y-axelns bredd med width="auto"; X-axeln får större utrymme under och efter sista etiketten. Serier, finansiella definitioner och månadsnavigation behåller befintligt beteende. Inga teckenstorlekar krymps för att undvika mätningen. Den nya revisionen kräver alla fem slutkommandon, full isolerad browser och gröna checks för exakt nytt head. Merge/source/deploy återstår vid dokumentfrysningen; faktisk slutleverans binds i PR #166 och taskresultat.

Fjärde kandidaten `34c767780867d9abf262fd26bd231fd24e4325e4` klarade åter samtliga fem slutkommandon (kvitto SHA-256 `872ef374379f2fac4e41226c50b99ef652b00b54805a805a48a36bfa239de1a4`) och [exakt-head CI 38098703327](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38098703327). Förstärkta oförändrade browserkrav hittade vid 1280 px/dubbel text en Y-tick `3 tn kr` med överkant 4,77 px utanför SVG. Övriga 24 läsbarhetskontroller i det fallet passerade, men hela provet stoppades före mobil-/rollfallen; inga fullständiga browser-PASS påstås. 172/172 HTML-teckenstorlekar var exakt dubbla. Data/återställning för 18 syntetiska D1-tabeller/två R2-objekt samt cleanup var PASS, utan skrivningar/externanrop. Felsanalys SHA-256 `4171dad74adf8fbc749df12094553a9148f47913e8cb795789b3de45881cdd3b` bevaras privat.

Diagrammets toppmarginal ökas nu 14→30 px för den faktiskt uppmätta glyfen; data, serier och navigation bevaras. Hela slutgrinden och samma förstärkta browserprov krävs igen för nytt head. Merge/source/deploy återstår vid denna dokumentfrysning; slutbeläggen binds separat i PR #166 och taskresultat.

---

Historik före crm98 – tidigare dokumentation bevarad byteoförändrad nedan.

# Drift – crm96 avslutad live v93; crm97 läsurvalskandidat

Crm96 är avslutad genom [PR #164](https://github.com/ludros93-prog/MAgnussons-CRM/pull/164): GitHub-main `c9f6c3dcc4e1bb1f23dce052834204ea33560a18`, Sites-source `e7eefa6b2641aa4f0ff2e007631f51d412a8e86e` och **live v93**. Dess slutleveranskvittens SHA-256 är `7b64e7633559aaca2fb0a2998bd597df914c1a2b88ce8d2e8c92300d2b63176b`; äldre pendingtexter nedan är bevarad historik.

Färsk native återläsning visar deployment `appgdep_6acab20c423c8191a9eccdc783dd6308`, terminal `succeeded`, live v93 på https://magnussons-crm.rosen123.chatgpt.site. Aktuell Site har begränsad custom-policyrevision 2, miljörevision 1, samma auth-klient och noll automations. Baslinjens source/main har samma träd `ea7bed7d0fe1712b29c79d5932ac41aab9cc6769` och 401 spårade filer; alla källbytes verifierades vid läsande öppning.

Crm97 ändrar enbart klientens läsprojektion och diagnos. Ingen backend, API, migration, lagring eller hostingbindning ändras. V93 är kompatibelt UI-återgångsmål för denna avgränsning, men ingen live-rollback har utförts. Efter tidigare commercial_task-audit krävs fortsatt crm82-kompatibel läsare/skrivare; v78 är inget säkert direkt rollbackmål. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook.

Ordinarie Site-credential användes via dold stdin för läsande öppning, utan beständig token. Den officiella helpern hittades inte i faktiskt sökta läsbara /opt och /workspace; ingen global frånvaro eller helperkörning påstås. Byteidentiska låsta beroendeindata medgav återanvändning av föregående verifierade installation via hårdlänkar. Ingen ny installation påstås; tunga installationer körs inte parallellt på den begränsade disken.

Crm97:s fem slutkommandon, isolerad browser, exakt-head CI, aktuell mergebas samt merge/source/deploy återstår vid denna dokumentfrysning. Faktiska slutbelägg och separata kandidat-/main-/live-revisioner binds därefter i leverans-PR och taskresultat.

Syntetiska kontroller bekräftar inga personliga konton, verkliga uppföljningar, integrationer eller personalacceptans. Full hostad återställning och live-rollback är oprövade. Codex-referensen är oläst.

---

Historik före crm97 – tidigare dokumentation bevarad byteoförändrad nedan.

# Drift – crm95 avslutad live v92; crm96 utkastkandidat

[PR #163](https://github.com/ludros93-prog/MAgnussons-CRM/pull/163) avslutar crm95. Testad kod `9b4d6f4ce9507907212fbab07b48fb6326f3df53`, GitHub-main `852c7bcdd5173450a79ae166c06f521bb1b1b0a0` och Sites-source `630422e5bd40f60e06016a53b0bc3dec81d0c237` har samma 400 spårade paths/moder/blobs och träd `584cc750406ab9348ac46709a6415127e511f678`. **Live v92** på https://magnussons-crm.rosen123.chatgpt.site, deployment `appgdep_6aca813bfd10819196f2b10cca2239c4`, terminal `succeeded`, faktisk `updated_at` `2026-10-10T18:17:54.943288+00:00`. Sparat arkiv `sha256:6cf2808843cb117c51ab3b0e28f7ea8a7489f99607f640936a0f5286bdb32bdb`, 6 051 840 byte/106 filer, verifierat mot native sparad version. Begränsad custom-policyrevision 2, miljörevision 1, auth-klient och noll automations bevarades. Slutleveranskvittot SHA-256 `b79f465b92385d9e828764db44031ae0af9e0ec34309364336fe949cfe797ca6` har 20 återlästa hashverifierade belägg. Tidigare crm95-pendingtexter nedan är historik.

Crm96 ändrar vald kundantecknings editorsammanhang, inte backend, API, lagring, SQL eller hostingbindning. Privat utkast och gemensam CRM-post skiljs fortsatt åt. Efter tidigare `commercial_task`-audit krävs **crm82-kompatibel läsare och skrivare**; v78 är inget säkert direkt rollbackmål. Föredra kompatibel framåträttning. Full hostad databas-/fil-/versions-/länkåterställning och live-rollback är oprövade. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook.

Initial installation och källöppning stoppade på full disk. Enbart genererade ignorerade beroenden i avslutad ägd crm95-checkout samt det egna ofullständiga installförsöket rensades; kod, historik och belägg bevarades. Ny låst crm96-installation lyckades offline med den bevarade dependencycachen. Ordinarie Site-credential användes utan beständig lagring för läsande källöppning; samtliga 400 källfiler matchade main-baslinjen. Den officiella Sites-helpern hittades inte i de kontrollerade läsbara rötterna; en rot gav PermissionError. Ingen global frånvaro eller körd helper påstås. Källöppning bevisar ingen ny paketering eller publicering.

Crm96:s fem slutkommandon, isolerade browserprov, exakt-head CI, aktuell mergebas och faktisk merge/source/deploy återstår. Kandidat, main och publicerad Site ska redovisas separat. Syntetiska prov är inga konto-, integrations- eller personalprov; ingen ny driftacceptans påstås. Codex-referensen är oläst.

---

Historik före crm96 – tidigare dokumentation bevarad byteoförändrad nedan.

# Drift – crm94 avslutad live v91; crm95 orderkandidat

[PR #162](https://github.com/ludros93-prog/MAgnussons-CRM/pull/162) avslutar crm94: GitHub-main `9fa58a341d8f8fc0c248eeddf261b6ff6ade7313`, Sites-source `33cb2514dd26586955d7d6f1f75d62519b191c23`, samma 398 paths/moder/blobs och träd `340e53554a722218f454042f38e6be8177c04bd4`. **Live v91**, deployment `appgdep_6aca7036ede4819182ba7d74c3870202`, terminal `succeeded`, faktisk `updated_at` `2026-10-10T17:05:16.580156+00:00`, på https://magnussons-crm.rosen123.chatgpt.site. Arkiv `sha256:17a74f291623d1b8c2aebfe818cd76aaee4ee28c661eb19659ea7f132e66dd60`, 6 041 600 byte/106 filer. Begränsad custom-policyrevision 2, miljörevision 1 och noll automations är bevarade. Äldre väntande crm94-noteringar är en fryst förpubliceringsbild som denna PR/taskkvittens avslutar.

Crm95 avgränsas till läsande orderurval. Backend/API/lagring, atomiska skrivningar, CAS, idempotens, SQL och hostingbindningar ska bevaras. Efter tidigare `commercial_task`-audit krävs fortsatt **crm82-kompatibel läsare och skrivare**; v78 är inget säkert direkt rollbackmål. Full hostad databas-/fil-/länkåterställning och live-rollback är oprövade. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook.

Färsk helpersökning fann inga filer i de faktiskt läsbara kontrollerade rötterna; `/root/.agents/skills` gav PermissionError. Ingen global frånvaro påstås. Root:s manuella läsande källöppning med ordinarie credential verifierade alla 398 filer mot main, utan helper. Det bevisar källöppning, inte crm95-paketering/publicering. Slutkontroller, merge/source/deploy binds efter frysning i leverans-PR/taskresultat. Syntetiska prov ger inga konto-, integrations-, kund- eller personalacceptanser.

---

Historik före crm95 – tidigare dokumentation bevarad byteoförändrad nedan.

# Drift – crm93 avslutad live v90; crm94 kandidat

[PR #161](https://github.com/ludros93-prog/MAgnussons-CRM/pull/161) avslutar crm93: kod `392fe681ecadf8b78b8a0248fee8a9f333b81924`, main `35fbf0b4086945c5f67e81753fcd56258f447b9a`, Sites-source `ee920137db1a6cca729cf914c43799ce07a8e09b`; 396 källfiler matchar träd `dedd9c6bad7c2023368301528187027021718d9a`. **Live v90**, version `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_73392e7dec1481919e414d9804c68af9`, deployment `appgdep_6aca61e4dfd081919fe4c497fded426c`, succeeded `2026-10-10T16:04:02.858165+00:00`, på https://magnussons-crm.rosen123.chatgpt.site. Arkiv `sha256:abe89f28057f598d94988751af8ffc66affc21204df82400e742e5319c1eef85`; 6 031 360 byte/106 filer. Begränsad custom-policyrevision 2 och miljörevision 1 bevarades.

Crm94 ändrar en läsprojektion; SQL/API/lagring, atomiska skrivningar, CAS och idempotens består. Crm82-kompatibel läsare/skrivare krävs efter tidigare audit; v78 är inget säkert direkt rollbackmål. Full hostad återställning/live-rollback är oprövade. Crm94:s slutprov/main/source/deploy återstår; slutkvittens knyts efter frysning i PR/taskresultat.

---

Historik före crm94 – tidigare dokumentation bevarad byteoförändrad nedan.

# Drift – föregående crm92 live v89; crm93 kandidat

Crm92 är avslutad via [PR #160](https://github.com/ludros93-prog/MAgnussons-CRM/pull/160): kod `0d93393a5af62bc1c67de33e94938dc6beef1442`, GitHub-main `b507044781e9876ab873e0dc270e466376b68756`, Sites-source `59223d156c6a7ab43deac5a818a76f1acb806167`. **Live v89**: version `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_3aef1b134bf881919fcc41b552398872`, deployment `appgdep_6aca5582b55c8191bcf541b4ba5bebfd`, `succeeded` vid `2026-10-10T15:11:09.808075+00:00`, på https://magnussons-crm.rosen123.chatgpt.site. Äldre väntande crm92-noteringar nedan är historik.

Arkiv `sha256:ccf71320af716a06751a7ba2c646ad4f1c724cad98b1241a488ee9edca619b45`, 6 031 360 byte/106 filer, matchar native återläsning och verifierad source. Full begränsad custom-policyrevision 2, samma URL och returnerad miljörevision 1 bevarades. Inga hemlighetsvärden lästes.

Crm93 inför ingen lagring, SQL, API, serverroll eller DB/BUCKET-ändring. Kundportfölj, privata utkast, atomiska skrivningar, CAS och idempotens består. Efter tidigare `commercial_task`-audit krävs crm82-kompatibel läsare och skrivare; v78 är inget säkert direkt rollbackmål. V89 delar backendkontraktet med denna läsprojektion, men faktisk live-rollback/full hostad databas-/fil-/länkåterställning är oprövade. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook.

Kandidatens slutkontroller, merge/source/deploy återstår enligt [STATUS](STATUS-2026-10-05.md) och [VALIDATION](VALIDATION.md). Slutlig leveranskvittens knyts i PR-body/taskresultat efter frysning; ingen crm93-publicering påstås här.

---

Historik före crm93 – tidigare dokumentation bevarad byteoförändrad nedan.

# Drift – crm92 och återupptagen v88-publicering

**Tidigare leverans är nu faktiskt live v88:** Sites-source `563a1b6ff087e77bc72dac828f75706f9a20d57f`, version `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_5c224870a7c481919022f13512f3988c`, deployment `appgdep_6aca4ace79d481919e2851f1603f2a9d`, terminal `succeeded` med faktisk `updated_at` `2026-10-10T14:25:27.929234+00:00`, på https://magnussons-crm.rosen123.chatgpt.site. Befintlig sparad version återanvändes utan ny uppladdning eller ny save. V88 avser crm91:s redan testade privata utkastfix, inte den här onboardingkandidaten.

V88:s tidigare arkivhinder är avstämt med reproducerbar hashkontroll: lokal rå tar-SHA-256 `5fd027a36304678dcc72eff30cc8fc66bd87bc61ee3b87b01a383d21f93f7174`; enbart regular-filernas PAX-rättigheter 0600→0644 och tillhörande checksummor ger exakt native `content_hash` `sha256:f26b22e36b56cf0c98d753d78192a7b2b8602c95a94aee09f80076815c5bd0af`. Två oberoende metoder och separat root-återkörning ger identiska bytes: 331 ändrade headerbytes, 106 oförändrade namn/nyttolaster/storlekar, 6 021 120 byte. Alla nyttolaster matchar verifierad byggd source; samtliga 390 spårade källfiler bytekontrollerades. Säker isolerad extraktion verifierades. Färsk native source/hash återlästes före deploy. Native arkivnedladdning har inte lyckats och någon generell backend-normalisering är inte dokumenterad; ingen sådan läsning eller generell regel påstås. Full custom-policy och returnerad miljömetadata är oförändrade efter deploy; hemlighetsvärden lästes inte.

Ingen ny lagrings- eller migrationsgräns införs. Föregående v88 använder samma befintliga läsare/skrivare. Efter tidigare `commercial_task`-audit gäller fortsatt crm82-kompatibel läsare och skrivare; v78 är inget säkert direkt rollbackmål. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook. Full hostad återställning och live-rollback är fortfarande oprövade.

Ingen befintlig backend, API, lagring, datamodell, SQL-migration, hostingbindning eller serverroll ändras. Den nya scope-modulen är en ren läsprojektion. Privata utkast, atomiska skrivningar, CAS, idempotens och arbetsflödets sparning är bevarade. Försäljning mot månads-/årsmål, marginal och nya prospects består; TB är inget huvudmått. Syntetiska prov är inga riktiga kontoinloggningar, personalacceptanser eller fungerande Fortnox-/Outlook-anslutningar. Inga riktiga kundorder används för skrivprov och inga kund-/personalmeddelanden skickas. AGENTS, MISSION, RUNBOOK, schema, prompt och aktivering bevaras. Codex-referensen `01a104c7-a5c5-7350-8577-a4f941138061` är oläst: inget anropbart Codex read_thread finns.

Denna kodförändring ligger i egen branch `feat/crm92-member-profile` från basen ovan. Den frysta slutrevisionens kontroller, faktisk merge, Sites-source och publicering redovisas separat i leverans-PR och taskkvittot. Main vid inventeringen är `378409a02a5790984e4b0691a6aaef86721ca4f6`, inga öppna PR:er och ingen aktiv deploy. Kod, GitHub-main och live är separata tillstånd.

---

Historik före crm92 – tidigare dokumentation bevarad byteoförändrad nedan.

# Drift – crm91 återupptagning utan lagringsändring

Inventerad bas är färsk main `da5071fd3a56008802b3b8adcc032b5f390a32dd`, utan öppna PR:er. Vid körningens inledning återlästes **live v87**, source `be802c0b5133e9a8f8ba62e85940543ee9f9afe6`, terminal `succeeded`. Det är ett startunderlag, inte en kvittens för den här ändringens publicering. Kod, exakt-head checks, GitHub-main och faktisk Sites-version har separata belägg i leverans-PR och taskkvittot.

Ingen lagring, datamodell, API, kontokoppling eller serverroll ändras. Privat ägare/arbetsyta, revision, CAS, request-ID och atomisk CRM-sparning/utkastavslut använder samma servervägar. CRM-sparning är fortsatt skild från privat utkast och kräver faktiskt sparbesked. Försäljning mot månads-/årsmål, marginal och nya prospects bevaras; TB är inget huvudmått.

Syntetiska prov är inga riktiga kontoinloggningar, sparade verkliga kunduppföljningar, personalacceptans eller fungerande Fortnox-/Outlook-anslutningar. Inga riktiga kundorder används för skrivprov och inga kund-/personalmeddelanden skickas. Full hostad återställning och live-rollback är fortsatt oprövade. Refererad Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst; tillgängligt read_thread gäller Slack.

Efter tidigare commercial_task-audit krävs fortsatt crm82-kompatibel läsare och skrivare. V78 är inget säkert direkt rollbackmål. AGENTS, MISSION, RUNBOOK, SQL-migrationer och hostingbindning bevaras. Samma Site och begränsad custom-delning används.

---

Historik före crm91 – tidigare dokumentation bevarad byteoförändrad nedan.

# Driftkvittens – crm90 läsprojektion utan lagringsändring

Testad kandidat `cdc032f7588e32b2ccd3a6e3754398f5f6fcd203`, träd `a859365e228eadd8a730aa566b1d12e78c1d6654`; [app-PR #156](https://github.com/ludros93-prog/MAgnussons-CRM/pull/156).

GitHub app-main `78a8518111eb5ff4aaf3bd159fad0cb84d5a8d97`. Sites-source `be802c0b5133e9a8f8ba62e85940543ee9f9afe6` har exakt samma testade träd och samtliga 389 spårade paths, modes och blobs; verkliga föräldrar är tidigare v86-source `c9c95beb8b5c34372192a959631866d587f07fda` och app-main. Live **v87** på [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), deployment `appgdep_6aca29f6a3d88191a13c46fdc2acc63d`: separat återläst `succeeded`, faktisk `updated_at` `2026-10-10T12:05:22.286862+00:00` och efterkontroll `2026-10-10T12:05:44+00:00`, med samma source/version/URL.

Den ursprungliga skyddslistan har 116 filer. `lib/sales-dashboard.ts` är ett uttryckligt undantag för ändrad läsprojektion; de övriga 115 skyddade backend-/API-/lagrings-/hosting-/konfigurationsfilerna och alla sex SQL-migrationer är byte-/mode-/blob-identiska mot färsk main `96936a26105d6434ea59fe6aecc56bb6e6232e4a` och föregående v86-source `c9c95beb8b5c34372192a959631866d587f07fda`. AGENTS, MISSION och RUNBOOK är oförändrade. Ingen lagring, datamodell, schema, API-, konto- eller rollskrivväg ändras. Fortsatt **crm82-kompatibel läsare och skrivare** krävs efter tidigare `commercial_task`-audit; gammal v78 är inget säkert direkt rollbackmål. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook. Full hostad databas-/fil-/länkåterställning och live-rollback är fortsatt oprövade. Kvitto `c3d6f0e82e877707a15264bd7ab8365f4c855a618fe5d5a170a9c6c05c21d822`.

Samma begränsade custom-delning revision 2 och returnerade miljömetadata revision 1 bevaras. Fullständiga returnerade metadata för policy, miljö, auth-klient, automationslista och URL är jämförda i verktygsminnet före och efter publicering. Faktiska hemlighetsbytes är inte lästa eller verifierade; ingen hash- eller bytejämförelse av hemligheter påstås. Ingen full hostad återställning eller live-rollback genomfördes.

Paketeringen stoppades först av faktiskt `ERR_PNPM_ENOSPC` i det temporära diskutrymmet. Endast körningens egna aktuella cache- och källresurser flyttades till större arbetsdisk; äldre och främmande resurser ändrades inte. Därefter passerade faktisk låst installation och bygge med exit 0, med samtliga 389 kandidatbytes bevarade och samma redan pushade källrevision. Ingen andra sourcepush gjordes. Åtgärdskvitto `edf440b2f9cbc58fd82fbbef1b7ef1158f902530324d4e184a27a36b0e1a235c`. Denna verifierade diskåterhämtning fastställer ingen orsak till det separata tidigare runtime-avbrottet.

Lokalt tarpaket har SHA-256 `8f1c2bdcd97c96794f79d73ddcd1a99f3ad0df26974ec91226e78206bb1f50ed`, 6 021 120 byte och 106 filer. Native save/get återgav samma serverarkivmetadata: SHA-256 `89cfc83e8c68b3986452b67e72823cca4fb2145f0caf5f74475147d4a88129d7`, 6 021 120 byte och 106 filer. Ett faktiskt `download_file`-försök för returnerat Sediment-ID nekades med `file could not be authorized or resolved`. Hostad arkivbyteidentitet är inte verifierad. Lokal tar och servermetadata har olika hash; orsaken är inte verifierad. Detta ändrar inte de separata käll-, versions- och deploybeläggen.

Gröna syntetiska domän-, komponent-, browser-, runtime- och CI-prov är inga verkliga kontoinloggningar, sparade riktiga kunduppföljningar, fungerande Fortnox-/Outlook-anslutningar, personalacceptans, fysisk telefon-/skärmläsaracceptans eller full WCAG-bedömning. Inga riktiga kundorder används för skrivprov. Konton, CRM-roller, webbplatsåtkomst, privata data och integrationer ändras inte; inga kund-/personalmeddelanden skickas i bygguppdraget.

Dokumentationen har en separat mergegrind med egna fem obligatoriska kontroller, aktuell bas och exakt-head PR-CI. Appleveransen ovan är verifierad före dokumentationsrevisionen; dess slutliga main-revision och egna kontrollbelägg redovisas i taskkvittensen. Dokumentationsändringarna kräver ingen extra appversion. AGENTS, MISSION, RUNBOOK, schema, prompt och aktivering ändras inte genom denna dokumentationsrevision.

---

Historik före crm90 – tidigare dokumentation bevarad byteoförändrad nedan.

# Driftkvittens – crm89 utan lagringsändring

Testad kandidat `737810806823fc095e294d5e473781b65fd59399`, träd `cdbb9b591cd14db116f7bdbea2d3e9e9059bcf9a`; [app-PR #154](https://github.com/ludros93-prog/MAgnussons-CRM/pull/154).

GitHub app-main `052c71b25ef28c0cae005b071abfd62d81a7ad26`. Sites-source `c9c95beb8b5c34372192a959631866d587f07fda` har exakt samma testade träd och samtliga 388 spårade paths, modes och blobs; verkliga föräldrar är tidigare v85-source `d708c9056fb1cfaa26bc9455e662d767e9f8fd79` och app-main. Live **v86** på [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), deployment `appgdep_6aca18c7a544819198bdcfef5de47177`: separat återläst `succeeded`, faktisk `updated_at` `2026-10-10T10:52:01.451138+00:00` och efterkontroll `2026-10-10T10:52:15Z`, med samma source/version/URL.

116 skyddade backend-/API-/lagrings-/hosting-/konfigurationsfiler och alla sex SQL-migrationer är byte-/mode-/blob-identiska mot färsk main `4ebce2973cbb63d4df7b0ee99c36843cee901c8b` och föregående v85-source `d708c9056fb1cfaa26bc9455e662d767e9f8fd79`. Ingen lagring, datamodell, schema, API-, konto- eller rollskrivväg ändras. Fortsatt **crm82-kompatibel läsare och skrivare** krävs efter tidigare `commercial_task`-audit; gammal v78 är inget säkert direkt rollbackmål. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook. Full hostad databas-/fil-/länkåterställning och live-rollback är fortsatt oprövade. Kvitto `166c334e9e4aaefe2f49446f4ed1912490615397a1c382b2b26f2ec87673a9a5`.

Samma begränsade custom-delning revision 2 och returnerade miljömetadata revision 1 bevaras. Fullständiga returnerade metadata för policy, miljö, auth-klient, automationslista och URL är jämförda i verktygsminnet före och efter publicering. Faktiska hemlighetsbytes är inte lästa eller verifierade; ingen hash- eller bytejämförelse av hemligheter påstås. Ingen full hostad återställning eller live-rollback genomfördes.

Lokalt tarpaket har SHA-256 `71b63be08b9a510caf12494bec22112f677f9885b34917bdafb6294a11941de5`, 6 010 880 byte och 106 filer. Native save/get återgav samma serverarkivmetadata: SHA-256 `e7d4ee1b9a6d1c88d4685403bb9a40b10be9ecfdb2fc610b658740c697b4a4f9`, 6 010 880 byte och 106 filer. Ett faktiskt `download_file`-försök för returnerat Sediment-ID nekades med `file could not be authorized or resolved`. Lokal tar och servermetadata har olika hash; orsaken är inte verifierad. Hostad arkivbyteidentitet är inte verifierad. Detta ändrar inte de separata käll-, versions- och deploybeläggen.

Gröna syntetiska komponent-, browser-, runtime- och CI-prov är inga verkliga kontoinloggningar, sparade riktiga kunduppföljningar, fungerande Fortnox-/Outlook-anslutningar, personalacceptans, fysisk telefon-/skärmläsaracceptans eller full WCAG-bedömning. Inga riktiga kundorder används för skrivprov. Konton, CRM-roller, webbplatsåtkomst, privata data och integrationer ändras inte; inga kund-/personalmeddelanden skickas i bygguppdraget.

Dokumentationen har en separat mergegrind med egna fem obligatoriska kontroller, aktuell bas och exakt-head PR-CI. Appleveransen ovan är verifierad före dokumentationsrevisionen; dess slutliga main-revision och egna kontrollbelägg redovisas i taskkvittensen. Dokumentationsändringarna kräver ingen extra appversion. AGENTS, MISSION, RUNBOOK, schema, prompt och aktivering ändras inte genom denna dokumentationsrevision.

---

Historik före crm89 – tidigare dokumentation bevarad byteoförändrad nedan.

# Driftkvittens – crm88 läsande personlig arbetsvy

Testad kandidat `0302f2ab81f39e1c0c91a371342fa337eb7df63b`, träd `d3007ef272991027c78e7567c7a176c043d64b95`; [app-PR #152](https://github.com/ludros93-prog/MAgnussons-CRM/pull/152).

GitHub app-main `efa8660c35c97ac0c0e965ccac475965218e257a`. Sites-source `d708c9056fb1cfaa26bc9455e662d767e9f8fd79` har exakt samma testade träd och samtliga 386 spårade paths, modes och blobs; verkliga föräldrar är tidigare source `04d75288119184fccda912f565452a733e2075fb` och app-main. Live **v85** på [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), deployment `appgdep_6ac9fed52f848191baf056f7da4d3432`: separat återläst `succeeded` med samma source/version/URL.

116 skyddade backend-/API-/lagrings-/hosting-/konfigurationsfiler och alla 6 SQL-migrationer är byte-/mode-/blob-identiska mot färsk main `627afafbe75cc1b00207f30927357feb5e6933e0` och faktiskt öppnad föregående source `04d75288119184fccda912f565452a733e2075fb`; kvitto `c0c1f0b031749e706860b1f3c1920128a75d6d9f1307578c0788f66dc242b2d9`. Ingen lagring eller schema ändras. Fortsatt **crm82-kompatibel läsare och skrivare** krävs efter `commercial_task`-audit; gammal v78 är inget säkert direkt rollbackmål.

Samma begränsade custom-delning revision 2 och returnerade miljömetadata revision 1 är jämförda via full kanonisk hash för policy, miljömetadata, auth-klient, automationslista och URL. Kvitto `7fab429295106bb55a75af1f7f49021fe453c4968c739affc60cffa30ef905df`. Hemligheter returneras maskerade; deras faktiska bytes är inte lästa eller jämförda.

Lokalt paket `1694fab78b911b1ac0828a84082551c666f45ba2b7498228888cbe7cc2036ea7`: 6113280 bytes/105 filer; byggt från exakt verifierad source. Faktiskt arkivnedladdningsförsök gav ”file could not be authorized or resolved”; ingen hostad arkivbyteidentitet är verifierad.

Full hostad databas-/fil-/länkåterställning och live-rollback genomfördes inte. Föredra kompatibel framåträttning; en äldre backend behöver separat verifierad full datakopia och bedömning av mellanliggande arbete. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook.

Dokumentationen har en separat mergegrind med egna fem obligatoriska kontroller, aktuell bas och exakt-head PR-CI. Appleveransen ovan är verifierad före dokumentationsrevisionen; dess slutliga main-revision och egna kontrollbelägg redovisas i taskkvittensen. Dokumentationsändringarna kräver ingen extra appversion.

---

Historik före crm88 – tidigare dokumentation bevarad byteoförändrad nedan.

# Driftkvittens – crm87 läsande kontoroster

Testad kandidat `0a0eb5206e1ee49b265cdc0f8dca31232e1dc89c`, träd `14e36826b46de77150bf92e1ef7a8ad78155c25a`; [app-PR #150](https://github.com/ludros93-prog/MAgnussons-CRM/pull/150).

App-main `dd83f258689e155f817cb83e1d5d44df1075e53e`. Sites-source `04d75288119184fccda912f565452a733e2075fb` har exakt samma testade träd och 386 tracked-filer, med föregående source `8a6bbbd98702e02fee3320a3a2539cd4f23e064f` och app-main som verkliga föräldrar. Live **v84** på [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site); deployment `appgdep_6ac9ec6717d4819189d3db667cc3168a` är separat återläst `succeeded` med samma version/source/URL.

116 skyddade backend-/API-/lagrings-/hosting-/konfigurationsfiler och samtliga 6 SQL-migrationer är byte-/mode-/blob-identiska mot färsk main `c6f76f7ff337c4bdea0be7c3445dbf50ec87ffbd` och faktiskt öppnad föregående v83-source `8a6bbbd98702e02fee3320a3a2539cd4f23e064f`; kvitto `3283dc1839317fe99d081c6e812ac995a37e75e58b45d48b936c5e99cc256b1f`. Ingen lagringsförändring: fortsatt crm82-kompatibel läsare **och** skrivare efter `commercial_task`-audit.

Samma begränsade custom-delning revision 2 och miljömetadata revision 1; full kanonisk jämförelse av returnerad accesspolicy, miljömetadata, auth-klient, automationslista och URL är lika. Kvitto `e55fe48fe1a53bc87e5de9f79b05175237fec13c24ac06c21a63c166dc0340eb`. Miljöhemligheter returneras maskerade (`is_secret=true`, `value=null`): deras verkliga bytes är inte lästa eller jämförda.

Lokalt paket `2549565b2219d0291f319e0910746c22de150d78302da6dda74860a726346d0d`: 6103040 bytes/105 filer. Sites-versionens returnerade arkivmetadata: `sha256:c3bad430e3fdb8346827d71b105312b40579be8c7c470714bf9171fecd9a2fca`, 6000640 bytes/105 filer. Nedladdningsförsöket gav: ”file could not be authorized or resolved”. Ingen hostad arkivbyteidentitet är verifierad.

Full hostad återställning eller live-rollback genomfördes inte. Äldre v78 är inget säkert direkt rollbackmål; kompatibel framåträttning och separat verifierad full datakopia krävs för äldre backend. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook. Dokumentationsrevisionen behöver egna obligatoriska checks och exakt-head CI; den ändrar ingen appversion.

---

Historik före crm87 – tidigare dokumentation bevarad byteoförändrad nedan.

# Driftkvittens – crm86 läsande diagnos utan ny lagring

**Testad kandidat** `39159ca284b8edf01f61d4ca30ab5acf2219f25c`, träd `413cbf97a024320b25c163b8290126536c5d4b1a`; [app-PR #147](https://github.com/ludros93-prog/MAgnussons-CRM/pull/147).

**App-main** `a6fa2fbdebb079d8b2764fe889ffa1a5cb84c250`. **Sites-source** `8a6bbbd98702e02fee3320a3a2539cd4f23e064f`, exakt testat träd 413cbf97a024320b25c163b8290126536c5d4b1a och samtliga 384 tracked-källfiler. Källbryggan bevarar två verkliga föräldrar: tidigare Sites-source 95d473e5ed8704651902ec7455afabbc3259b4b8 och verifierad app-main a6fa2fbdebb079d8b2764fe889ffa1a5cb84c250; inga extra appändringar. **Live v83** på [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), deployment `appgdep_6ac9d1842fcc8191acc33bc6b4c44bc8`: succeeded, därefter separat återläst via get_deployment_status och get_site_version med samma version/source/deployment och live-URL; privat leveranskvittots SHA-256 167c5d9b20373d0d1369e9e62434e209e728fd30d5e218ef187881c9871c898c.

Verifierad källa, push, sparning och publicering: ordinarie fast-forward-push utan force/automatisk privatpublicering, faktisk remote-SHA, återhämtat träd och båda föräldrar verifierade; pushkvitto 351e2d52b2df64c5b212db6e915521dbdd121f881770e9d610c9700d2b37c387. Färskt source-bygge exit 0 från samma 384 verifierade filer; 105 arkivfiler lästes byte-/hash-/storlekskontrollerat. Native save/get på appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_6fd1d32f0bf08191b32097d6a1016ffb och explicit deploy/readback succeeded på samma Site och URL. Stödhelper saknas faktiskt; repoets Sites/Vinext-bygge och tar/native verktyg användes. Delning, miljö, auth-klient, automationslista och live-URL: före/efter full kanonisk jämförelse av returnerad access_policy, miljömetadata, auth-klient, automationslista och live-URL. Alla dessa returnerade fält lika; begränsad custom-delning revision 2 och miljö revision 1. API:t returnerar en miljöpost som is_secret=true och value=null, så själva hemlighetsvärdet kunde inte läsas eller jämföras. Inga miljö-, delnings- eller automationsskrivningar gjordes i leveransen. Efterkvittots SHA-256 d0795c070ea634263127522dae263595cb32372a237a8f26f273e22bc0d16522. API-synlighetskvitto 6f876045cc114d2b85009488f3c7f0a67e6c1e4bd4958690a6d00c3b4d48d9bc. Kontometadata är inget personligt inloggningsprov.

Skyddade backend-, API-, lagrings-, migrations- och hostingkällor: 102 skyddade filer och sex migrationer byte-/mode-/blob-oförändrade mot föregående live v82; kvitto SHA-256 dbecb50214baf6a9c1d1a476e1fb8de0913b773f02a5203b71bd057469f2c3b3. Den avgränsade diagnosen läser befintligt State. Ingen ny auditvariant, datamodell, SQL-migration eller kontoskrivväg införs; serverroller, atomiska skrivningar, CAS och idempotens består.

Efter tidigare `commercial_task`-audit gäller fortsatt crm82-kompatibel läsare och skrivare. Källidentitet mot föregående publicerade v82-source `95d473e5ed8704651902ec7455afabbc3259b4b8`: 102 skyddade källfiler inklusive samtliga sex SQL-migrationer jämförda byte-/mode-/blob-identiskt mot den faktiskt öppnade föregående v82-source. Därmed samma reader/writer och lagringsformat; ingen ny migrering eller genomförd hostad restore påstås. Privat kvitto dbecb50214baf6a9c1d1a476e1fb8de0913b773f02a5203b71bd057469f2c3b3. Ingen full hostad återställning eller live-rollback utförs genom denna klientdiagnos. Äldre v78 är fortsatt inget säkert direkt rollbackmål; kompatibel framåträttning och separat verifierad full datakopia krävs för en äldre backend. Gemensam CRM-kopia ersätter inte konton, privata utkast eller Outlook.

Arkiv-/paketbelägg: lokalt tar SHA-256 7d13eef0936e1d6326251fd5f1f64024d5985724c1a70e007e7335302c3ca49c, 6092800 bytes/105 filer; samtliga tar-medlemmars bytes matchar färskt källbygge, hostingmanifest identiskt. Sites save/get returnerar samma metadata: sha256:2ac5b6e9975857f9f154402a646f8be28740b33e775b57c4ae539a68f32ce2c4, 5990400 bytes/105 filer. Serverarkivets hash/storlek skiljer sig från lokal tar. Faktiskt nedladdningsförsök för returnerat sediment-ID nekades: ”file could not be authorized or resolved”. Ingen hostad arkiv-byteidentitet eller förklaring till skillnaden påstås. Lokalvalidering 65a319edf36c12a932a685d60387903caf6944a2d6e58c447eeff95d908623c7; metadata-/hinderkvitto a52f5a008ec080e056d7b9414d3e94d4a509eee6941f9de8c8566414c090aa76. Arbetskod, GitHub-main och faktiskt publicerad Site är separata tillstånd. En efterföljande docsrevision har egna obligatoriska checks/exakt-head CI och kräver ingen extra appversion. Inga konton, roller, kundorder, integrationer, schema, prompt eller aktivering ändras genom leveransen.

---

Historik före crm86 – tidigare dokumentation bevarad byteoförändrad nedan.

# Driftkvittens – crm85 med oförändrat datakontrakt

**Testad kandidat** `ccf4abb855ace2ad488ae4bee7f005018557a325`, träd `764bb9f1bfecb33dd2e1f36cf9174d841a09e173`; [app-PR #145](https://github.com/ludros93-prog/MAgnussons-CRM/pull/145).

**App-main** `4628ab93564b3e0a693a26ea010d0825b74f4088`. **Sites-source** `95d473e5ed8704651902ec7455afabbc3259b4b8`, samma träd och 383 spårade paths, modes och blobs som testad kandidat/app-main. **Live v82** på [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), deployment `appgdep_6ac9b8d9ef988191b7cf9c0b774e6d59`: terminal `succeeded`, återläst `2026-10-10T04:03:07.225215+00:00`.

Sites-source är en verifierad tvåföräldrabrygga från faktiskt tidigare v81-source `451f1491587e3c97c8f15fc0cdb20a04429ebe1c` och app-main `4628ab93564b3e0a693a26ea010d0825b74f4088`. Faktisk vanlig fast-forward-push och fjärråterläsning verifierar exakt testat träd och 383 spårade paths, modes och blobs, utan extra appändringar, force-push eller automatisk privat publicering. Privata källproveniensens SHA256 är `20b86cd56332a8944d89c9a8819f4110ef089b4f09c465f43e59f558b8012cba`; push-/återläskvittots `db1e705247ee9266e33dfec9b1947ca99b2fc1523422f7ad4ccf3cc10f2dcf5e`.

Stödd Sites-helper saknades; befintlig spårad Sites/Vinext-byggintegration och lokalt native tarpaket användes. Sourcebygget passerade med faktisk exit 0 utan källändring. Jämförelse av testbygget och sourcebygget gav 78 råa lika filer och 27 skillnader i paths eller bytes. Efter uttrycklig normalisering enbart av identifierade genererade bygg-ID:n/chunkreferenser och namngivna prerender-/draftmode-/revalidationfält matchar samtliga 105 paketerade filer; inga godtyckliga UUID-/hashliteraler maskeras. Privat slutkvitto `generated-build-comparison-final.json` har SHA256 `06f25d8658fa3bb22eecf2c089e45f80188ae9aad44298c9661a93c97684aa0c`. Det första 103-filsresultatet med `pass: false` är bevarat separat. Normaliserad likhet är inget rått binäridentitetsbevis, inget nytt runtimeprov och ingen nedladdad hostad artefakt. Deploy `appgdep_6ac9b8d9ef988191b7cf9c0b774e6d59` återlästes terminal `succeeded`, med native `updated_at` `2026-10-10T04:02:42.805068+00:00`.

Fullständig kanonisk före-/efterjämförelse bevarar begränsad `custom`-delning (policyrevision 2), hela runtime-konfigurationen (revision 1), samma auth-klient, 0 automations och samma live-URL. Privat `hosting-postdeploy.json` har SHA256 `4f5aa6c0281ef4c20f5c2463963ffc6d54348741cb14d3cce35f65de86434d3d`. Metadata verifierar ingen personlig CRM-roll eller inloggning.

102 skyddade backend-/lagrings-/API-/migrations-/hosting-/byggberoendefiler är byteidentiska med faktiskt föregående v81-source `451f1491587e3c97c8f15fc0cdb20a04429ebe1c`, inklusive sex SQL-migrationer och hostingbindningen. Privat `protected-identity.json` har SHA256 `e8c6d7f4711484d072064f05886b5072d563ec9046d5ef02a86928b9b87b3657`. Ingen ny datamodell, auditvariant, SQL-migration eller API-väg införs. Klientens aktuella åtkomstläsning använder befintlig GET; den ändrar inte serverroller, atomiska skrivningar, CAS eller idempotens.

Efter tidigare `commercial_task`-audit krävs fortsatt crm82-kompatibel läsare och skrivare. Föregående v81 är datakompatibel enligt källidentiteten; live-rollback till den har inte provats. v78 är inget säkert direkt rollbackmål. Föredra kompatibel framåträttning; äldre backend kräver separat verifierad full kopia före nya auditer och bedömning av mellanliggande arbete. Gemensam CRM-backup ersätter inte konton, privata utkast eller Outlook. Full hostad databas-/fil-/versions-/länkåterställning och live-rollback är oprövade.

Det faktiskt inlämnade lokala tarpaketet omfattar 105 filer/6 082 560 byte och SHA256 `fdbac7a56edf08db4f522b1e6dd5c208e0751f325287ec895754ac228d26ed89`. Återläst metadata för sparad Sites-version 82 anger 105 filer/5 980 160 byte och `sha256:8877236eadfdf08987744ed0d0e82704e35c66b9763b5956efafc186d43a3ec2`. Faktisk `download_file` för det nya arkivets fil-ID svarade exakt `file could not be authorized or resolved`. Sparade arkivbytes och likhet med det lokala paketet är därför inte oberoende verifierade. Källrevision, lokal paketering, sparad källanknytning och terminal deploy är skilda belägg. Privat `saved-version-readback.json` har SHA256 `0a29dc39c413a1d9bd3ce2a73235284198039fa7c7bd07b4117e4b776dbf6558`.

Kod, GitHub-main och faktiskt publicerad Site redovisas separat. En efterföljande dokumentationsrevision kräver egna obligatoriska checks/exakt-head CI men ingen extra appversion. Metadata visar ingen personlig CRM-roll, inloggning, personalacceptans eller fungerande integration. Kontrollomfattning finns i [VALIDATION.md](VALIDATION.md).

---

Historik före crm85 – tidigare dokumentation bevarad byteoförändrad nedan.

# Driftkvittens – crm84 med bibehållet datakontrakt

**Testad kandidat** `d81b55c368ba539fab82bb960e32c470aee68626`, träd `e126a33040b8df7238ff07555410704e191894b4`; [app-PR #143](https://github.com/ludros93-prog/MAgnussons-CRM/pull/143).

**App-main** `55aca5200c3315b22cc13bb50dddafc7b5adbf59`. **Sites-source** `451f1491587e3c97c8f15fc0cdb20a04429ebe1c`, samma träd och samma 381 spårade paths, modes och blobs som testad kandidat/main. **Live v81** på [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), deploy `appgdep_6ac9a64a3684819196f41e4a3ac8f664`: `succeeded`, återläst `updated_at` `2026-10-10T02:43:32.921481+00:00`; efterkontroll `2026-10-10T02:44:00+00:00`.

Sites-source är en verifierad tvåföräldrabrygga från tidigare source `499d03c370af70053b0d9b9ac065a16c471ab0a5` och app-main `55aca5200c3315b22cc13bb50dddafc7b5adbf59`. Faktisk push/remoteåterläsning, lokalt källträd och sparad deployanknytning är separata kvittenser. Källproveniensens privata SHA256 är `8464cfe1b6d1dede7b5aa5fc0bb2e51f274fd3fefd5329b0bbee04da83eaa0b5`; deploykvittot `21ad3e37656e847f362095faa8bee491750afb439ea3fd3abde2cf7f59bc6765` och full policy-/runtimejämförelse `7a1835abc97b5b37be6f930442001b9e4cd4020445b83711d13e7948058960bf`.

Stödda Sites-hjälpskript saknades; befintlig spårad Vinext-/Sites-byggintegration, lokalt tarpaket och native push/save/deploy användes.

Fullständig före-/efterjämförelse bevarar begränsad `custom`-delning (policyrevision 2), auth-klient, 0 automations och hela runtime-konfigurationen (revision 1). Metadata verifierar ingen personlig CRM-roll eller inloggning.

De 102 skyddade backend-, lagrings-, API-, migrations-, hosting- och byggberoendefilerna har identiska paths, modes, blobs, SHA256 och bytes mot faktiskt föregående v80-source `499d03c370af70053b0d9b9ac065a16c471ab0a5`, inklusive sex SQL-migrationer och hostingbindningen. Ingen ny API/datamodell/auditvariant eller SQL-migration införs. Efter tidigare `commercial_task`-audit krävs fortsatt crm82-kompatibel läsare och skrivare. v80 är datakompatibelt enligt källidentiteten; v78 är inget säkert direkt rollbackmål. Full hostad återställning och live-rollback är oprövade. Privat 102-filsbevis SHA256 `cbfcf4d9fdc1f68482ff74d2e0b189fd157329150e6de65b5fa01a18587e52bb`. Gemensam CRM-backup ersätter inte konton, privata utkast eller Outlook. Äldre backend kräver separat verifierad full kopia före nya auditer och bedömning av mellanliggande arbete; kompatibel framåträttning är förstahandsvägen.

Arkivnedladdningen svarade exakt `file could not be authorized or resolved`. Arkivets bytes och binär identitet med lokalt bygge är därför inte oberoende verifierade; källrevision, sparad källanknytning och terminal deploy redovisas separat.

Kod, main och faktiskt publicerad version redovisas separat. En efterföljande docsrevision kräver egna obligatoriska checks/exakt-head CI men ingen extra appversion. Konto-/personal-/integration-/hostad-restoreacceptans härleds inte från dessa metadata; körda prover finns i [VALIDATION.md](VALIDATION.md).

---

Historik före crm84 – tidigare dokumentation bevarad byteoförändrad nedan.

# Driftkvittens – crm83 läsdialog med bibehållet lagringskontrakt

**Kodkandidat** `34662f18adba2fd4b45d1102560e289ff46289e6`, träd `cd9398cc623f514d4ceef58fde6251e4b6fc57ce`. **GitHub app-main** `9e6a61ecd2014f92ed73b3575b4bc2d293106ce3`, [app-PR #141](https://github.com/ludros93-prog/MAgnussons-CRM/pull/141). **Sites-source** `499d03c370af70053b0d9b9ac065a16c471ab0a5` har samma träd och samma 380 spårade paths, modes och blobs som testad kandidat och app-main. **Live v80** på [https://magnussons-crm.rosen123.chatgpt.site](https://magnussons-crm.rosen123.chatgpt.site), deployment `appgdep_6ac999399a288191a6f2608c334bd748`: terminal `succeeded`, återläst `updated_at` `2026-10-10T01:47:48.453025+00:00` och efterkontroll `2026-10-10T01:48:05.409227+00:00`. Fullständig jämförelse visar oförändrad begränsad delning, automationslista, auth-klient och runtimeinställningar (policyrevision 2, envrevision 1). Kod, main och publicerad version är separata kvittenser.

De 102 skyddade backend-, lagrings-, migrations- och hostingfilerna har samma paths, modes, blobs och byte som föregående publicerade v79-source `4f159b8f885e136827310445550bcd0352fdc6a6`. Ingen SQL-migration, datamodell, API, CAS eller idempotens ändras. Data är kompatibla med v79-koden. Efter en tidigare `commercial_task`-audit gäller fortsatt crm82-kompatibel läsare och skrivare; v78 är inget säkert direkt rollbackmål. Live-rollback eller full hostad återställning har inte prövats i crm83.

Sites-source byggdes lokalt från faktiskt pushad revision `499d03c370af70053b0d9b9ac065a16c471ab0a5`, med samma spårade källträd som testad kandidat. 105 artefaktfiler paketerades; första katalogstrukturen avvisades innan någon version sparades. Paketet med `.openai` i roten och `dist/server`/`dist/client` accepterades som v80. Lokal tar-SHA256 `987bc97673430a9c8ab4b9f08599c0180e3fb03e479f2208f045b33535bd22cb` skiljer från native sparad arkivhash `f366765aa7a976c171a7983d242d1a148e56ef7a94657528b53b07e21473668e`. Arkivnedladdningen stoppades med `file could not be authorized or resolved`; binär arkividentitet är därför inte oberoende verifierad. Byggen har olika genererade build-ID:n och ingen deterministisk artefaktidentitet påstås. Verifierad pushad källrevision, native sparad källanknytning och terminal lyckad deploy redovisas separat. Sites hjälpskript saknades; befintlig spårad byggintegration och native Git-/Sites-flöde användes.

Verkliga personkonton, interna CRM-roller/profiler och personalens arbetsmoment är inte godkända genom dessa syntetiska kontroller. Ingen verklig Fortnox-/Outlook-anslutning, full hostad återställning eller live-rollback är verifierad. Codex-taskreferensen är oläst eftersom dess read_thread saknas. En efterföljande docsrevision har egna kontroller och publicerar ingen ny appversion.

---

Historik före crm83 – tidigare dokumentation bevarad byteoförändrad nedan.

# Driftkvittens – crm82 uppgiftsaudit och kompatibel återställning

**Kodkandidat** `99c3a368bcaa9a408ac2c4b09963ec6e71ba56bf`, träd `25926d9e13ee143a3c163c2ddc880c752ab528be`. **GitHub app-main** `4852233600dd96095c6fbd1b96a86e6a9109d27d`, [app-PR #139](https://github.com/ludros93-prog/MAgnussons-CRM/pull/139). **Sites-source** `4f159b8f885e136827310445550bcd0352fdc6a6` har samma träd och samma 379 spårade path-/mode-/blobs som testad kandidat och app-main. **Live v79** på [https://magnussons-crm.rosen123.chatgpt.site](https://magnussons-crm.rosen123.chatgpt.site), deployment `appgdep_6ac9860286fc81919356866864dca410`: terminal `succeeded`, återläst `updated_at` `2026-10-10T00:28:57.345121+00:00`. Färsk efterkontroll `2026-10-10T00:29:13.114376+00:00`. Begränsad custom-delning, automationslista, auth-klient och runtimeinställningar jämfördes fullständigt före miljöns omstart. Verktygsminnet för de ursprungliga fullvärdena förlorades vid omstarten; originalets jämförelsekvitto finns kvar och policyrevision 2 samt envrevision 1 återlästes oförändrade. Publiceringsfasens fullständiga före-/efterjämförelse använder en ny native-baslinje från 10 oktober 00:17 UTC och dess privata kanoniska hashkvitto. Den färska efterkontrollen verifierar exakt samma fullvärden under publiceringsfasen, terminal deploy och samma live-URL; någon fullvärdesjämförelse över det förlorade verktygsminnet påstås inte. Kod, main och faktiskt publicerad Site är separata kvittenser. En efterföljande docsrevision behöver egen verifiering och ingen extra appversion.

Servern granskar befintlig profil-/föräldrakoppling, aktuell administratör och anslutet säljar-/administratörskonto före en atomisk skrivning med CAS och idempotens. Fryst uppgifts-/kund-/affärs-/order-/profilunderlag och målkontots revisionsunderlag är separata. Bara den valda uppgiftens profil-ID och nya audit skrivs, tillsammans med CRM-händelse och vanlig revisions-/kvittenshantering. Befintlig text, datum, öppen status, andra uppgifter, kund-/affärs-/orderansvar, tidigare resultat, ordermängder, godkännanden, tryck, lager och leveranser ligger kvar. Rå lagring patchas för den valda posten; ingen massmigrering eller uppgiftsupptäckt skapas genom förankringen.

Den nya strikta auditvarianten har `source: commercial_task`, `action: anchor`, tomt äldre registrerat profil-ID och samma från-/tillperson. Registrerat föräldraobjekt och granskat konto sparas som underlag vid den nya kopplingstidpunkten. Ingen tidigare kontoidentitet rekonstrueras från namnet. Efter första sådan skrivning krävs **crm82-kompatibel läsare och skrivare** för vanlig CRM-läsning/sparning samt JSON/NDJSON export, import och återställning. Kompatibilitetsgolvet avser kodens stöd för auditvarianten, inte ett påhittat Sites-versionsnummer. Backupformatet `magnussons-crm-1` består; inget automatiskt versionsgolv i manifestet påstås. SQL-migrationernas faktiska byte-/modejämförelse redovisas med slutbelägget. Alla sex SQL-migrationer och .openai/hosting.json jämfördes med exakt tidigare publicerad v78-source: samma paths, modes och blobs. Ingen SQL-migrering eller hostingbindning ändras. Ny auditvariant är en lagringsändring trots oförändrat backupformat.

Separat Node/SQLite-belägg granskar 63 slutliga källmoduler. Byggd faktisk gammal v78-Worker körde 10 HTTP-anrop: före nya auditen läsning/export 200, efter nya auditen läsning 503 och export/skrivning/import/JSON-/NDJSON-återställning 400 utan ändring i någon av 18 råtabeller eller R2. Byggd slutlig crm82-Worker körde sju HTTP-anrop med 200 för läsning/export/JSON-/NDJSON-återställning och bevarad audit efter senare legitim överlämning, uppgiftsavslut och medlemskoppling. Gammal native-input behåller sin verkliga tidigare revision; slutlig Worker och Node-modulmanifest är bundna till slutkandidatens faktiska byte. Full hostad återställning eller live-rollback prövades inte.

Exakt tidigare publicerad v78 med Sites-source `c91b3fd9725dd89401cdad7c3921e431b81a82c5` är inget säkert direkt kodrollback efter den nya uppgiftsauditen. Den gamla strikta läsaren avvisar den nya varianten; faktisk omfattning och HTTP-statusar anges i kompatibilitetskvittot. Föredra en framåtriktad rättning med kompatibel parser och skrivare. En äldre backend behöver separat verifierad full kopia från före första nya skrivningen och bedömning av mellanliggande arbete. Gemensam CRM-backup ersätter inte konton, privata utkast eller Outlook. Återlästa historiska konto-ID:n ger ingen ny åtkomst. Full hostad databas-/fil-/versions-/länkåterställning och live-rollback är fortsatt oprövade.

Faktiska källkvittot omfattar 379 spårade filer och exakt samma Git-träd mellan testad kandidat, app-main och pushad Sites-source. Lokal slutlig Worker index.js SHA256 är 6372dfab5ed4d9d600396bcf5cf29d4f82669c7cf9394d789443a45b58613fa2. Den lokala byggartefakten och eventuell fjärrbyggd Sites-artefakt är separata belägg; källidentitet är verifierad och byteidentitet med fjärrbyggt arkiv påstås bara om den faktiskt kontrollerats. Lokalt stödda site-workflow.mjs/build-site.mjs saknades vid den avgränsade hjälparsökningen, även efter miljöns omstart. Native källbyggnadsfallback användes för exakt pushad source. Efter faktisk lyckad v79-deploy återlästes ett nytt tararkiv med 105 filer och 5 959 680 byte, deklarerad hash sha256:d6e7cdd92e2b8300464074c4448ddfe6141304474274b30225cfa64c1fd497b4. Ett färskt nedladdningsförsök av just v79:s file_0000000031888230982ea7cb8ee74d2a gav exakt ”file could not be authorized or resolved”. Arkivets byte/hash och likhet med lokalt bygge är därför inte oberoende verifierade. Detta är ett verktygshinder för artefaktläsning; native källrevision och terminal succeeded-deploy är separat återlästa.

Fem obligatoriska kommandon passerade med faktisk exit 0 på ren, byteoförändrad kandidat `99c3a368bcaa9a408ac2c4b09963ec6e71ba56bf`, avslutat `2026-10-09T23:59:57.037172+00:00`: `node tests/outlook.mjs`, TypeScript utan incremental, produktionsbygge, byggd isolerad `node tests/runtime-smoke.mjs` och `git diff --check`. Kvitto SHA256 `669f185b55143f65d9c126201d0fbd3f96fbefbb146ac25c22c3cbb7b0219291`; alla fem loghashar återlästa. [Exakt-head CI 38006155241](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38006155241) återlästes completed/success för samma head med faktiska checks/jobs/steps. Slutprovet körde den byggda Cloudflare-Workern mot isolerad D1/R2: 185 HTTP-anrop och 24 SQL-racefall för uppgiftskopplingen. Den obligatoriska ordersviten omfattar 40→45, 50→48 med uttryckligt dokumenterat syntetiskt godkännande, kassation, delleverans och dubbelklick. Återställningsprovet använde tre syntetiska filer med totalt 13 500 000 byte, arkiv 18 011 808 byte och alla 18 råtabeller; full hostad återställning är inte verifierad.

Slutbrowser: 21 faktiska fall, 60 oförändrade native PNG och faktisk rootbildgranskning. 320/390/1280 px och faktiskt beräknad text i 1×/2× omfattar fulla namn, naturlig knappbrytning, minst 44 px, tangentbord/pekare och fokus tillbaka till faktisk öppnare eller inventeringens rubrik. Faktiska affärs- och orderuppgifter sparades i syntetisk lokal D1. Dubbelklick, faktiskt commit följt av förlorat HTTP-svar och exakt UI-återförsök, konflikter för uppgift/förälder/konto, rollförlust och avbrytande prövades. Alla 18 råtabeller och R2 återställdes exakt; källkod och byggfiler var byteoförändrade. Detta är lokala syntetiska runtime-/browserprov och granskade oförändrade browserbilder. Inget fysisk-telefonprov, skärmläsarprov, full WCAG-acceptans eller personalprov påstås. Två avslutade egna zombieprocesser återlästes som Z med FDSize=0; egna portar, browserresurser och isolerad lagring var avslutade/borttagna. Ingen främmande process eller PID 1 ändrades.

Gröna syntetiska domän-/SQL-prov, byggd lokal Worker/D1/R2, browserprov och CI är inga verkliga kontoinloggningar, kundgodkännanden, personalacceptans, fullständig WCAG-bedömning, fysisk telefon-/skärmläsaracceptans eller fungerande Fortnox-/Outlook-anslutning. Inga riktiga kundorder används för skrivprov. Huvudmått är försäljning mot månads-/årsmål, marginal och nya prospects; TB är inget huvudmått. Inga kund-/personalmeddelanden, konton, CRM-roller, webbplatsdelning, schema, prompt eller aktivering ändras genom bygguppdraget. Refererad Codex-task 01a104c7-a5c5-7350-8577-a4f941138061 är oläst: tillgängligt read_thread avser Slack, inte Codex. Den explicit dokumenterade briefen och färsk repo-main användes.

## Historik före crm82-leveranskvittot

# Driftkvittens – crm81 navigation med befintliga spar-/rollkontrakt

**Kodkandidat** `f544ae11dcdfce54209ea563ad9ad7ea86a8293d`, träd `2996b8d8aed023ce2084586134eb7384aecdbead`. **GitHub app-main** `ecb635d03355589fa02d57de758988db1f54000d` efter faktisk appmerge. **Sites-source** `c91b3fd9725dd89401cdad7c3921e431b81a82c5` har samma träd och samma 376 spårade path-/mode-/blobs som testad kandidat/app-main; faktisk vanlig fast-forward-push och fjärråterläsning är verifierade. **Live v78** på [https://magnussons-crm.rosen123.chatgpt.site](https://magnussons-crm.rosen123.chatgpt.site), deploy `appgdep_6ac971506d3c8191a59e036fb98107cf`: terminal `succeeded`, återläst `updated_at` `2026-10-09T23:00:49.339749+00:00`. Inget separat `finished_at` påstås. Färsk efterkontroll `2026-10-09T23:01:27.429Z` bevarar den fulla begränsade custom-policyn revision 2, authclient, 0 automations och hela runtime-konfigurationen revision 1/1 post. Metadata bevisar ingen personlig CRM-roll, kontoinloggning eller hostad dataåterställning. Kod, GitHub-main och publicerad Site redovisas separat. En följande docs-only-revision kräver egen verifiering men ingen extra appversion.

Inga nya permanenta fält, SQL-migrationer, backupformat eller spar-/rollkontrakt införs. De befintliga kanoniska schema-/skrivvägarna, serverrollerna, CAS och idempotensen återbrukas. Inventeringens härledda radunderlag används även i profilavslut och kundåteröppning; ett ändrat granskningsunderlag kan därför kräva vanlig ny granskning, utan datamigration. Sex SQL-migrationers bytes och modes är oförändrade. crm80/v77-kompatibel läsare och skrivare behövs fortfarande för redan registrerad orderförankringsaudit. Denna leverans inför inget senare lagringsgolv. V76 är fortsatt ingen säker direkt rollback efter sådan audit; föredra kompatibel framåträttning eller separat verifierad full kopia från före förankringen med bedömning av senare arbete. Ingen rollback eller full hostad databas-/fil-/versions-/länkåterställning utfördes.

Serverns återlästa arkivmetadata anger 5888000 byte/105 filer, `sha256:eab42ac785257ac9f4443b638c572966681b00edd3544841aaf0c3d9cd5acc0b`. Serverns nya arkiv kunde inte laddas ned: download_file returnerade faktiskt ”file could not be authorized or resolved” för denna versions återlästa fil-ID. Arkivets filbytes och deras likhet med lokalt bygge är därför inte oberoende verifierade. Exakt pushad source och terminal lyckad remote-build/deploy är verifierade separat. Stödda lokala Sites-packagerhelpers var inte tillgängliga enligt denna körnings dokumenterade sökning. Vanlig source-Git, exakt pushad källrevision och serverns remote-buildfallback användes; ingen lokal helperpaketering eller levererat lokalt originalarkiv påstås. Native source-Git, testat källträd och terminal serverbuild/deploy verifieras separat från arkivets byteinnehåll. Ingen ej utförd förhandsvisning eller hostad återställning påstås.

Fem obligatoriska kommandon passerade med faktisk exit 0 på ren och byteoförändrad kandidat `f544ae11dcdfce54209ea563ad9ad7ea86a8293d`, avslutat `2026-10-09T22:54:27.193168+00:00`: regression `node tests/outlook.mjs`, TypeScript utan incremental, produktionsbygge, därefter byggd isolerad `node tests/runtime-smoke.mjs` och `git diff --check`. Kontrollkvitto SHA256 `a7560ee165003dd803e8ed51f66ad410bb5deb122592ad19794b140c2a18102c`; alla fem loghashar återlästa. [Exakt-head CI 38000917948](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/38000917948) återlästes completed/success för samma head med faktiska lyckade checks/jobs/steps. Regressionerna inkluderar 40→45 med förnyat godkännande, 50→48 med uttryckligt dokumenterat syntetiskt godkännande, kassation, delleverans och dubbelklick. Nya inventeringsprov täcker en enda aktiv profil, osäkra ID:n, historik- och föräldravillkor samt oförändrat granskat underlag. Inget verkligt kundgodkännande skapades.

Slutbrowser: 15 faktiska fall, 41 oförändrade native PNG och faktisk rootbildgranskning. 320/390/1280 px med faktisk 1×/2× CSS-text, långa namn och minst 44 px kontroller; naturliga hela ord i alla tre kopplingsknappar. Tangentbord, pekarklick utan standardfokus och DOM-aktivering återgår till faktisk öppnare. Två faktiska isolerade kommersiella sparningar med dubbelklick och exakta återförsök gav ingen extra skrivning; indragen målkontobehörighet gav faktisk 409 utan CRM-skrivning. Fem icke-adminroller är underfall inom ett av de 15 fallen. Slutdata för alla 18 råtabeller och R2 matchar den privata baslinjen exakt; source och byggda bytes är oförändrade. Egna servrar, portar och stores avvecklades; avslutade zombies utan resurser bevaras utan PID1- eller främmande processåtgärd. Privata syntetiska fixtures på lokal byggd Worker; inget hostat personalprov, riktig kundorder, oberoende kontoinloggning eller full WCAG-/telefonacceptans. Tidigare privata harnessfel och diagnostik sparades separat och är inte slutkandidatens PASS-kvitto.

Gröna syntetiska regressioner, lokal native Worker/D1/R2, browserprov och CI är inga verkliga kontoinloggningar, personalacceptans, fullständig WCAG-bedömning, fysisk telefon-/skärmläsaracceptans eller fungerande Fortnox-/Outlook-anslutning. Inga riktiga kundorder användes för skrivprov. Huvudmått är försäljning mot månads-/årsmål, marginal och nya prospects; TB är inget huvudmått. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är fortsatt oläst eftersom relevant `read_thread` saknas; explicit brief och färsk main används. Inga kund-/personalmeddelanden, konton, CRM-roller, delning, schema, prompt eller aktivering ändrades genom bygguppdraget.

## Historik före crm81-leveranskvittot

# Driftkvittens – crm80 orderansvar och kompatibilitetsgräns

Kodkandidat `f89f8849aa3412b4793a5fd334fc30d7ddfddcba`, träd `f1d35ee2cf575796388d38afa176a3ac936ffc8a`. **GitHub app-main** `10afca0fe5a535025128215573dbcdaa16a79240` efter faktisk appmerge. **Sites-source** `a7fc36bba6bc5583b23c4b2571242947fdd5a5c1` har samma träd och byteidentiskt innehåll i samtliga 376 spårade filer som testad kandidat/app-main; bridgeföräldrarna är tidigare source `c14083ad5d62e525597d1c45e4dc407f47c36b2a` och app-main. Vanlig fast-forward-push och fjärråterläsning är verifierade. **Live v77** på [https://magnussons-crm.rosen123.chatgpt.site](https://magnussons-crm.rosen123.chatgpt.site), deploy `appgdep_6ac95e4555f08191981c364e765bbcce`: terminal `succeeded`, återläst `updated_at` 2026-10-09T21:39:47.289788+00:00; inget separat `finished_at` påstås. Färsk efterkontroll 2026-10-09T21:40:59.767Z bevarar full begränsad `custom`-policy revision 2, authclient, 0 automations och hela runtime-konfigurationen revision 1/1 post. Det verifierar ingen personlig CRM-roll eller inloggning. Källkod, GitHub-main och publicerad Site är separata kvittenser; docs-only kräver ingen extra appversion.

Sites serverarkivmetadata: 5877760 byte/105 filer, `sha256:984fb285fcf622d2da66f1c008b78037ccdb20d6b2aca70afb42debb6f5b8203`. Nedladdning av det nya v77-arkivets faktiska Sediment-ID försöktes i denna körning men verktyget svarade exakt ”file could not be authorized or resolved”. Serverns arkivmetadata är återläst; artefaktens byteinnehåll har därför inte inspekterats. Native source-Git, identiskt testat källträd och lyckad serverbuild/deploy har verifierats separat. Stödda lokala Sites-packagerhelpers hittades inte i läsbara sökvägar; `/opt/containerd` kunde inte läsas. Ingen helperpaketering eller lokalt arkiv vid original-save påstås. Vanlig native source-Git och serverns remote-buildfallback användes med exakt källrevision; faktisk save/deploy och efterkontroll återlästes. Inget separat produktions-D1/R2-innehåll eller hostad återställning verifierades av metadata.

Serverns adminroll och frysta aktör-/profil-/medlems-/kontotupler kontrolleras i samma atomiska write-token/CAS-gate som order, audit, händelse och mutationsledger. En ändrad administratör adopteras inte i samma retry. Det granskade order-/affärsunderlaget och ansvarsbasis är separat från en global revision; oberoende ändring kan återförsökas, relevant ändring kräver ny granskning. Neutrala befintliga uppgifter hämtas från verklig persistens så att projicerade kvittensuppgifter inte materialiseras som bieffekt. Ett godkänt konto-digest är ett läst granskningsunderlag, inte ett personligt inloggningsprov.

Långa ordertitlar kan radbrytas och orderkortets mobilkolumn kan krympa utan att sidans bredd växer eller text klipps. Orderarbetsytans flikar kan växa och radbrytas när textstorleken ökar; träffytan är minst 44 px. Rörelserubriken Varumottagning har en valfri naturlig ordbrytning när utrymmet kräver det. Formuläret skiljer koppling till samma person från verkligt ansvarsbyte. Befintlig person, läst konto, roll och begränsning syns före orsak/granskning. Rå orsak och fryst försök/request-ID finns kvar vid okänd kvittens; samma orörda försök kan återspelas efter återställd behörighet, medan ny avsikt kräver ny granskning. Samma kontos rollbyte bevarar öppet underlag men tillåter inte adminåtgärden utan aktuell adminroll; färsk projektion avgör full arbetsvy. Läsning av kontoanslutning bevisar ingen personlig inloggning. Namn och svenska handlingar används före tekniska ID:n; historiska snapshots skrivs inte om vid senare visningsnamn eller medlemslänk.

Ny strikt orderförankringsaudit lagras i befintlig order-JSON utan SQL-migration. Efter första nya orderförankringen krävs crm80-kompatibel läsare/skrivare för vanlig CRM-läsning/sparning och JSON/NDJSON export/import/återställning. Exakt tidigare publicerad v76/source c14083ad5d62e525597d1c45e4dc407f47c36b2a accepterade äldre underlag men avvisade den nya auditens hela arbetsyta i 7 faktiska isolerade prov: normalisering/domänskrivning/JSON-restore, GET 503, vanlig POST 400 och fullfil-JSON-/NDJSON-import. Nekade imports bevarade alla 18 råtabeller och R2; ny läsare/skrivare återläser förankringen. Kvitto old-v76-commercial-compat-final-5.json, SHA256 05355a681fecb606d15b037ecb05b8445c4b9b437d0008f35d0d4537ae023fd5. Backupformatet magnussons-crm-1 består och inget automatiskt versionsgolv i manifestet påstås. Gammal v76 är ingen direkt kodrollback efter nya data. Föredra en kompatibel framåträttning; äldre backend kräver separat verifierad full kopia från före förankringen och bedömning av mellanliggande ändringar. Full hostad databas-/fil-/versions-/länkåterställning och live-rollback är oprövade. Gemensam CRM-backup ersätter inte konton, privata utkast eller Outlook. Historiska konto-ID:n ger ingen ny åtkomst; restore rensar aktuella profillänkar utan att skriva om audit.

Fem obligatoriska kontroller passerade med faktisk exit 0 på ren och byteoförändrad kandidat f89f8849aa3412b4793a5fd334fc30d7ddfddcba: node tests/outlook.mjs, TypeScript utan incremental, corepack pnpm build, byggd isolerad node tests/runtime-smoke.mjs och git diff --check, avslutat 2026-10-09T21:34:06.911672+00:00. Kontrollkvitto checks-app-5/checks.json, SHA256 526288a55aea4e9a406ce8713a8afb229cf5b1f8462f89d2dd59bfa48718d680; alla fem loghashar återlästa. Det första appförsöket checks-app-1 på eb0a4c882ec2592dd22e6c3340758c7a63b3acb2 bevaras som misslyckat: native exit 1 vid felaktig jämförelse mellan restore-svar och härledd GET-uppgiftslista. Slutrevisionens prov kontrollerar rå återställning/export och synlig kvittens var för sig; det första kvittot och dess fyra faktiskt körda loggar har återlästs oförändrade, SHA256 d6d919a436269ac3712a283385761acc7b6c4d979b05846af6714d10964c5930. Neutral orderansvarskoppling: 40 Node-fall/17 faktiska SQL-races och byggd native Worker 174 HTTP-anrop/23 faktiska SQL-races, alla 18 råtabeller/R2/privatsentineler, neutral skrivning, aktör-/målkonto-CAS, dubbelklick/förlorad kvittens/exakt replay och JSON/fullfil-NDJSON-återläsning. Fyra syntetiska orderunderlag med fysiska mängder skapades genom domänens handlingar och bevarades vid kopplingen i byggd native Worker. Redan synlig kvittens bevarar sin tidigare tomma profil genom strikt orderbunden receiptProjection, även efter JSON/NDJSON-återläsning. En koppling före utskick skapar eller fryser ingen kvittens; faktisk senare domänutskickning och uttryckligt syntetiskt restgodkännande skapar den nya kvittensen med då känt stabilt profil-ID. Okända råfält, saknade äldre standardfält, indexkopplingar och duplicerade råa JSON-nycklar omfattas av konkreta bevarande-/avslagsprov. Ordinarie mängdregressioner omfattar 40→45, 50→48 med uttryckligt syntetiskt godkännande, kassation och delleverans; inget verkligt kundgodkännande påstås. [GitHub-CI 37993313670](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37993313670) och exakta kandidat-head checks/jobs/steps återlästes completed/success; kvitto ci-app-premerge.json, SHA256 f8328e9fd846e778ff8a2f21f0cb68805271de2f6afa9d1f717d93272198d5c8. Faktisk REST-återläsning 2026-10-09T21:33:34.558Z i ci-app-premerge.json, SHA256 f8328e9fd846e778ff8a2f21f0cb68805271de2f6afa9d1f717d93272198d5c8, binder job-ID/run till exakt kandidathead och samtliga lyckade steg. Ursprungskvittot och source-proveniensens hash ändrades inte. Appbelägg blir inte automatiskt ett prov av en senare dokumentationsrevision.

Föregående kandidat ce12af0e7a9fd37f613e8465173af9a31c2a61ab passerade faktiskt sina fem obligatoriska kontroller och CI, men native browser avslöjade 723 px horisontell överbredd vid 390 px med en giltig 200-teckens ordertitel. Oförändrad databas/R2 och återställd baseline är återlästa i bevarad diagnos browser/final-205252121833/report.json, SHA256 c69aa4842aa1b6e7f8c9041ad48e38ebc49408fa9519b3dfa607950d504e0aac; det tidigare failure-kvittot räknas aldrig som PASS. Kandidat 3 rättar orderkortens scoped min-width och titelradbrytning samt mobilkolumnens minmax(0,1fr), utan att klippa titeltext. Kandidat 3 passerade därefter sina fem kontroller/CI men en verklig browserkörning stannade efter 22 passerade fall på ytterligare 60 px överbredd vid 320 px och exakt 2× beräknad CSS-text; fasta flikhöjder och nowrap var den avlästa orsaken. Orörd DIAGNOSTIC browser/final-210830176257/report.json, SHA256 f515a5ae5f1353cf65002b5c3b1dde282ff6f0b07639a1d863b02dce29421b70, bevarar oförändrade rå18/R2 och återställd baseline. Kandidat 4 begränsar sina tre nya regler till orderarbetsytans flikar: rader kan radbrytas och växa i höjd, träffyta är minst 44 px och normal ordgräns används. Efter kandidat 4:s fem lyckade kontroller hittade nästa browserkörning en separat 13 px överbredd vid samma 320 px/exakta 2× CSS-text: det avlästa inline-ordet Varumottagning i två rörelseposter. Orörd DIAGNOSTIC browser/final-211936642637/report.json, SHA256 e779475000c87d621ef57543e0413fae29aac5b69e0b39330cce44196a56035b, bevarar rå18/R2 och reset; den delvis passerade 22-fallskörningen förblir FAIL. Kandidat 5 ändrar bara received-rörelsens visningsrubrik till en valfri naturlig ordbrytning mellan Varu och mottagning med wbr; uppgifter, mängdhandlingar och beräkningsfunktioner ändras inte. Det är ett CSS-textstorleksprov, ingen fullständig browserzoom- eller skärmläsaracceptans. Slutbrowser: 27 fall och 60 oförändrade native PNG, browser/verified-final.json SHA256 1fcad67e379fadbe2b3e3dde7cb17811b042c48aadaf2df411d51f5d2b26fdb0, rapport SHA256 f9b485474749e0b85c7e9419bbcfab56a60280caf8c5ce38eb03522bc9102542. Byggd native Worker, syntetiska autentiserade konton och isolerad D1/R2; rådata/slutbaseline och käll-/dist-/fixturbyte återlästa, 13 ägda launchers städade och 3 faktiska bildkontroller återlästa. Ägda levande processer avslutades, portar stängdes och egna datalager togs bort; i de bevarade launchkvittona redovisades 16 fångade gruppmedlemmar som avslutade, ej reapade Z-processer, med två faktiska Z/FDSize0-observationer var och utan PID1-/främmande processåtgärd. Ingen fullständig PID-frånvaro påstås. 27 faktiska isolerade browserfall mot exakt fryst byggd Worker och egna syntetiska D1/R2-data, med 60 oförändrade native PNG och 472 browser-/peer-HTTP-resultat; 183 kontrollanrop redovisas separat. Neutral koppling av äldre order till samma persons stabila profil, separata historiska affärsansvar, riktiga 401/403/409, D1-rollback, dubbelklick och exakt återspelning samt roll-, konto- och identitetsbyten har provats. Transportfel 401/403/503/nätverk efter sparning är uttryckligen simulerade efter faktisk native200, inte ett serverprov av sen behörighetsändring. Orderkö och dialog provades vid 320/390/1280 CSS-pixlar med ordinarie och exakt 2× beräknad CSS-text, naturlig ord- och flikradbrytning, full Varumottagning-etikett, minst 44 px mål samt native Arrow/Tab-fokus och synlig textareacaret. Root har faktiskt granskat bild36,49,46: läsbar hierarki, naturlig radbrytning och synlig fokuserad Historik. Skrollbara delvyer är inte fullsidbilder; innehållsgeometri redovisas separat. Detta är inget heltäckande WCAG-, OS-/browserzoom-, skärmläsar-, personalkonto-, kundacceptans- eller hosted driftsättningsprov. Alla 18 råtabeller och R2-bytes/metadata återställdes exakt, source/dist/fixtur förblev byte-identiska. Slutlaunchens 89 fångade egna PID återlästes frånvarande; två kvarstod som avslutade ej reapade Z med två Z/FDSize0-observationer var, utan levande resurser. Äldre försök och deras cleanupkvittor bevaras separat och summeras, ingen fullständig PID-frånvaro eller åtgärd mot PID1/främmande processer påstås.

Gröna isolerade prov är inga verkliga kontoinloggningar, rätt arbetsvy för varje medarbetare, observerad personalpilot, allmän driftsättningsacceptans eller fungerande Fortnox-/Outlook-anslutning. Inga riktiga kundorder användes för skrivprov. Namnbaserade alias i personliga/globala/operativa urval innebär att full UUID-migrering ännu inte är färdig. Huvudmåtten är fortsatt försäljning mot månads-/årsmål, marginal och nya prospects; TB är inget huvudmått. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant `read_thread` saknas; explicit brief/färsk main användes. Inga kund-/personalmeddelanden, konton, CRM-roller, delning, schema, prompt eller aktivering ändrades genom bygguppdraget.

## Historik före crm80-leveranskvittot

# Driftkvittens – crm79 affärsansvar och kompatibilitetsgräns

Kodkandidat `b0169465f942f740388109ff75bcef22d20e052a`, träd `3fdc5ccb8dfee29d707f0ff152fa354e114f0c37`. **GitHub app-main** `9b2be1237bb3d2df443ecb2af98a6d45af5d03d8` efter faktisk appmerge. **Sites-source** `c14083ad5d62e525597d1c45e4dc407f47c36b2a` har samma träd och byteidentiskt innehåll i samtliga 374 spårade filer som testad kandidat/app-main; bridgeföräldrarna är tidigare source `fda4169b54e9a01213f1560e7fc46fc6a07f2b9b` och app-main. Vanlig fast-forward-push och fjärråterläsning är verifierade. **Live v76** på [https://magnussons-crm.rosen123.chatgpt.site](https://magnussons-crm.rosen123.chatgpt.site), deploy `appgdep_6ac946035ce88191b359de679d40d341`: terminal `succeeded`, återläst `updated_at` 2026-10-09T19:57:47.878739+00:00; inget separat `finished_at` påstås. Färsk efterkontroll 2026-10-09T19:58:29.238Z bevarar full begränsad `custom`-policy revision 2, authclient, 0 automations och hela runtime-konfigurationen revision 1/1 post. Det verifierar ingen personlig CRM-roll eller inloggning. Källkod, GitHub-main och publicerad Site är separata kvittenser; docs-only kräver ingen extra appversion.

Sites serverarkivmetadata: 5847040 byte/105 filer, `sha256:5503793cf413988b8bd93802ce0b16f841da630afcebd7ebf74c718f9ff9566a`. Det nya serverarkivet kunde inte laddas ned för lokal innehållsinspektion: download_file svarade exakt `file could not be authorized or resolved`. Därför verifieras här source/version/deploy och serverns arkivmetadata, inte arkivets lokala bytes, hostingmanifest eller Worker-innehåll. Stödda lokala Sites-packagerhelpers hittades inte i läsbara sökvägar; `/opt/containerd` kunde inte läsas. Ingen helperpaketering eller lokalt arkiv vid original-save påstås. Vanlig native source-Git och serverns remote-buildfallback användes med exakt källrevision; faktisk save/deploy och efterkontroll återlästes. Inget separat produktions-D1/R2-innehåll eller hostad återställning verifierades av metadata.

Serverns adminroll och frysta aktör-/profil-/medlems-/kontotupler kontrolleras i samma atomiska write-token/CAS-gate som affär, audit, händelse och mutationsledger. En ändrad administratör adopteras inte i samma retry. Det granskade affärsunderlaget och ansvarsbasis är separat från en global revision; oberoende ändring kan återförsökas, relevant ändring kräver ny granskning. Neutrala befintliga uppgifter hämtas från verklig persistens så att projicerade kvittensuppgifter inte materialiseras som bieffekt. Ett godkänt konto-digest är ett läst granskningsunderlag, inte ett personligt inloggningsprov.

Formuläret skiljer koppling till samma person från verkligt ansvarsbyte. Befintlig person, läst konto, roll och begränsning syns före orsak/granskning. Rå orsak och fryst försök/request-ID finns kvar vid okänd kvittens; samma orörda försök kan återspelas efter återställd behörighet, medan ny avsikt kräver ny granskning. Samma kontos rollbyte bevarar öppet underlag men tillåter inte adminåtgärden utan aktuell adminroll; färsk projektion avgör full arbetsvy. Läsning av kontoanslutning bevisar ingen personlig inloggning. Namn och svenska handlingar används före tekniska ID:n; historiska snapshots skrivs inte om vid senare visningsnamn eller medlemslänk.

Ny strikt förankringsaudit lagras i befintlig affärs-JSON utan SQL-migration. Efter första nya kommersiella förankringen krävs crm79-kompatibel läsare/skrivare för vanlig CRM-läsning/sparning och JSON/NDJSON export/import/återställning. Exakt tidigare publicerad v75/source `fda4169b54e9a01213f1560e7fc46fc6a07f2b9b` accepterade äldre underlag men avvisade den nya auditens hela arbetsyta i sju faktiska isolerade prov: normalisering/domänskrivning/JSON-restore, GET 503, vanlig POST 400 och fullfil-JSON-/NDJSON-import. Nekade imports bevarade alla 18 råtabeller och R2; ny läsare/skrivare återläser förankringen. Kvitto `old-v75-commercial-compat.json`, SHA256 `7d1e9d6c4d1aad8dd04f671124e15d2845d27cdb90cc32212d7593cbb34d5387`. Backupformatet `magnussons-crm-1` består och inget automatiskt versionsgolv i manifestet påstås. Gammal v75 är ingen direkt kodrollback efter nya data. Föredra en kompatibel framåträttning; äldre backend kräver separat verifierad full kopia från före förankringen och bedömning av mellanliggande ändringar. Full hostad databas-/fil-/versions-/länkåterställning och live-rollback är oprövade. Gemensam CRM-backup ersätter inte konton, privata utkast eller Outlook. Historiska konto-ID:n ger ingen ny åtkomst; restore rensar aktuella profillänkar utan att skriva om audit.

Fem obligatoriska kontroller passerade med faktisk exit 0 på ren och byteoförändrad kandidat `b0169465f942f740388109ff75bcef22d20e052a`: `node tests/outlook.mjs`, TypeScript utan incremental, `corepack pnpm build`, byggd isolerad `node tests/runtime-smoke.mjs` och `git diff --check`, avslutat 2026-10-09T19:44:22.612518+00:00. Kontrollkvitto `checks-app-1/checks.json`, SHA256 `d65aa7311268400dfa013495ff4aea178415454bd9ebce16f761793a17cbaa9b`; alla fem loghashar återlästa. Ny kommersiell förankring: 26 Node-fall/16 faktiska SQL-races och byggd native Worker 107 HTTP-anrop/17 faktiska SQL-races, alla 18 råtabeller/R2/private-sentineler, neutral skrivning, aktör-/målkonto-CAS, dubbelklick/förlorad kvittens/exakt replay och JSON/fullfil-NDJSON-återläsning. Ordinarie mängdregressioner omfattar 40→45, 50→48 med uttryckligt syntetiskt godkännande, kassation och delleverans; inget verkligt kundgodkännande påstås. [GitHub-CI 37981823845](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37981823845) och exakta kandidat-head checks/jobs/steps återlästes `completed/success`; kvitto `ci-app-premerge.json`, SHA256 `98930be91a52d8285ce64a715db4ab04c23287ebe36944a33dc7746aaf975b7d`. Den normaliserade jobbraden saknade headfält; faktisk REST-återläsning 2026-10-09T19:58:49.630Z i `ci-app-job-head-readback.json`, SHA256 `0cf5735db167c3b1a2bf66ecb8fd71be2856ffd87f7ffc925e817941233541ff`, binder samma job-ID/run till exakt kandidathead och alla 13 lyckade steg. Ursprungskvittot och source-proveniensens hash ändrades inte. Dessa appbelägg blir inte automatiskt ett prov av en senare docsrevision.

Gröna isolerade prov är inga verkliga kontoinloggningar, rätt arbetsvy för varje medarbetare, observerad personalpilot, allmän driftsättningsacceptans eller fungerande Fortnox-/Outlook-anslutning. Inga riktiga kundorder användes för skrivprov. Namnbaserade alias i personliga/globala/operativa urval innebär att full UUID-migrering ännu inte är färdig. Huvudmåtten är fortsatt försäljning mot månads-/årsmål, marginal och nya prospects; TB är inget huvudmått. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant `read_thread` saknas; explicit brief/färsk main användes. Inga kund-/personalmeddelanden, konton, CRM-roller, delning, schema, prompt eller aktivering ändrades genom bygguppdraget.

## Historik före crm79-leveranskvittot

# Driftkvittens – crm78 kundansvarskoppling och versionsgräns i audit

Kodkandidat `6345041a48188ac2644d0361cdfbb73af3841968`, träd `ace179891991a1a39d5a6a213e8a743d849419fa`. **GitHub app-main** `782bbb085db330fdbe3a2652a663530ebb210a27`, app-PR https://github.com/ludros93-prog/MAgnussons-CRM/pull/131. **Sites-source** `fda4169b54e9a01213f1560e7fc46fc6a07f2b9b`: 371 spårade filer har byteidentisk källtext och exakt träd `ace179891991a1a39d5a6a213e8a743d849419fa` jämfört med testad kandidat och app-main; bridgeföräldrarna är tidigare source `7fcb9b08641502105e2ec91aa4a4752232e48b96` och app-main. Vanlig fast-forward push och fjärråterläsning lyckades (`site-source-push-readback.json`). Saved source/version/deploy återlästes. Sites serverarkivmetadata anger 5 795 840 byte/105 filer och `sha256:1b0820fa1dde144b69223c80560d90a79eda0e0bca1782823729f66aadc000c0`; lokal nerladdning nekades med `file could not be authorized or resolved`, så arkivets byte eller innehåll har inte oberoende inspekterats. **Publicerad version** v75, deploy `appgdep_6ac92a5b33b081918e58b03a67a637c9`: terminal `succeeded`, terminalstatusens `updated_at` 2026-10-09T17:57:39.665685+00:00; inget separat `finished_at`-fält exponeras på befintliga Magnussons CRM. Kod, main och publicerad Site är separata kvittenser. Begränsad delning: färsk återläsning 2026-10-09 17:57:51 UTC visar samma fullständiga `custom`-policy revision 2, samma authclient, 0 oförändrade automations och hela återlästa runtime-konfigurationsobjektet är exakt likt revision 1/1 post. Ingen konto-/CRM-roll eller driftdata verifierades genom denna metadata (`site-hosting-readback.json`).

Skrivningen kräver serverns adminroll, en för requesten fryst aktör med id/user/name/owner/role samt verklig aktiv entydig målmedlem med granskat konto-digest. Målmedlemmen och aktören kontrolleras i samma atomiska write-token/CAS-gate som kundhistorik, händelse och mutationsledger. En ändrad administratör får inte adopteras i samma retry. Befintliga uppgifter kopieras från verklig persistens så att projektionens härledda kvittensuppgift inte skrivs som sidoeffekt.

Oförändrat obekräftat försök kan ge replay efter återställd behörighet; ändrad payload med samma ID nekas. En ny begäran kan inte förankra en redan förankrad kund igen. UI:ts bevarade tidigare lokala underlag innebär ingen återställd full färsk kundvy och ingen retroaktiv återkallelse av redan skickade byte. Befintlig svarskontroll är fortsatt ingen request-lång atomisk ACL-snapshot och upptäcker inte alla ABA-förlopp.

Lagringen får en ny strikt variant i kundens ansvarshistorik utan D1-migration. Kandidaten läser äldre överföringshistorik. Efter första sparade förankringen avvisar äldre 36a/v74-backend hela arbetsytans normalisering, även vanlig CRM-läsning/skrivning och återställning. Äldre kod är därför ingen direkt rollback. Föredra en framåträttning med kompatibel läsare/skrivare; äldre backend kräver separat verifierad full kopia från före förankringen och kan förlora mellanliggande ändringar. Faktiskt isolerat kompatibilitetsbelägg: `anchor-oldcode-compatibility.json`: exakt äldre 36a:s 60 moduler staged i privat scratch, manifest SHA256 `182a1bf82f1e6f8d4e4ae88e180973de4d8f3d1cdc778026db3111d43b4fb90c`. Äldre normalizeState/applyAction/restoreState accepterar befintlig legacykedja men avvisar nya förankringsaudit med strikt schema; nuvarande läsare/skrivare och JSON-/fullfil-NDJSON-återställning passerar isolerat. Senare profilnamn-/medlemslänk ändrar inte historisk kontosnapshot och vanlig efterföljande överföring fungerar. Återställning rensar aktuella profillänkar, inte audit. Ingen D1-migration. Hostad återställning/live rollback: oprövade på den hostade arbetsytan; ingen riktig kund-/orderdata eller livebackup användes för skriv-/återställningsprov. Full pre-anchor-kopia måste säkras och verifieras separat innan äldre backend övervägs.

Slutkandidatens obligatoriska regressioner, TypeScript, bygge, isolerade runtime och diffkontroll: fem faktiska exit-0-kommandon på exakt head `6345041a48188ac2644d0361cdfbb73af3841968`, rent och oförändrat träd: `node tests/outlook.mjs`, TypeScript utan incremental, `corepack pnpm build`, `node tests/runtime-smoke.mjs`, `git diff --check`. `checks-app-1/checks.json` SHA256 `ffee8784d3b22941eabcb6bf2692728bc2fde4fc5091d632e14d0a8e5c84d637`, avslutat 2026-10-09T17:48:40.503109+00:00. Kundförankring: 16 Node-fall/16 faktiska framtvingade SQL-races och byggd native Worker 109 HTTP-anrop/17 faktiska SQL-races, inklusive neutral skrivning, kontroll av alla 18 råtabeller och oförändrade uppgifter/R2/privatdata, aktör/mål-CAS, dubbelklick, kvittensåterspelning och JSON/NDJSON/fullfil-återställning. Mängdregressioner 40→45, 50→48 med uttryckligt syntetiskt godkännande, kassation och delleverans passerade i ordinarie svit; inget verkligt kundgodkännande påstås. Exakt-head CI och aktuell bas: GitHub-run [37967884427](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37967884427), workflow och checkrun `113946733836`, återlästa `completed/success` på exakt kandidathead. Alla föreskrivna steg gröna; färsk bas `36a7dd7f2e1f003464319be23d20eccdb6c0f500` och PR-head verifierades omedelbart före appmerge. `ci-app-premerge.json` SHA256 `479340f2d0389cd3f4dc6e619ee1fe02cabd618ef1bd4f606cca6982f4a51be4`; främmande 187 worktrees och egen reservation verifierades oförändrade. Faktisk browserkontroll av rå text, dubbelklick, förlorad kvittens, konflikt, rollbyte inklusive avdelningsvy utan kund, fokus, tangentbord och 200 % CSS-text: PASS i `browser/final-174521004833/report.json`, SHA256 `b5d8e8182ddabceb3a2e517eb88274caab1b19e55b7d0564748d4ee2416c1de6`: 21 fall/44 oförändrade native PNG. Byggd native Worker, riktiga isolerade D1/SQLite- och R2-fixturer; äkta 401/403, rollback-503, CAS-409, verkligt rollbyte admin→print/reader och tillbaka med bevarat försök, blockerade mål, historik, dubbelklick. Transport-401/403/503/network efter äkta native 200-commit är uttryckliga simuleringar; sen serveråtkomstförlust provas separat i native runtime. 320×360, 390×844 och 1280×900, vanlig och exakt 200 % computed CSS-text, fokus/tangentbord/caret och minst 44 px mobilkontroller. Alla 18 råtabeller/R2 återlästes per fall och slutbaseline matchar. Käll-/dist-/fixturbyte oförändrade. Konto-/medlems-/arbetsytereset är källgranskad logik, inte ett explicit browserfall; inget OS-zoom-, fullständigt WCAG-, konto- eller personalprov. Den oberoende källgranskningen finns i `/tmp/crm78-evidence/review-app-final.json` och körde inga tester.

Gröna isolerade prov bevisar inte personliga inloggningar, rätt arbetsvy för varje medarbetare, personalpilot, kundacceptans eller riktiga Fortnox-/Outlook-kopplingar. Full återställning på den hostade arbetsytan och live rollback behöver eget verifierat belägg. Inga riktiga kundorder används för skrivprov.


Stödda Sites-helperfiler för lokal paketering hittades inte i läsbara sökvägar; vissa systemkataloger var inte läsbara. Inget helperbygge eller lokalt uppladdat arkiv påstås. Vanlig Sites-source Git fast-forward och Sites serverbyggda remote-buildfallback användes med verifierad källrevision; faktisk save/deploy och serverarkiv återläses i publiceringskvittot. Bindings och migrationer är oförändrade källbytes; inget separat driftinnehåll eller personlig kontoacceptans verifieras.

Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst: relevant `read_thread` saknas. Explicit brief och färsk main användes. Inga kund-/personalmeddelanden, kunddata, konton, åtkomständringar eller schema-/prompt-/aktiveringsändringar ingår.

## Historik före crm78-leveranskvittot

# Driftkvittens – crm77 svarskontroll med oförändrat dataformat

Kodkandidat `f22539e0e315a142954702e06d3f9b33ca238c47`, träd `4ce81511f0495400f56b17275193625810bfd23b`. **GitHub app-main** `e52b93542e27d3d75099a4f7e8b0b0a3e5d2471e`, [app-PR #129](https://github.com/ludros93-prog/MAgnussons-CRM/pull/129). **Sites-source** `7fcb9b08641502105e2ec91aa4a4752232e48b96`: samma träd 4ce81511f0495400f56b17275193625810bfd23b och exakt samma 367 spårade filbytes som slutkandidaten; 0 appändringar i tvåförälders källbrygga; vanlig fast-forward-push återläst. **Live v74**, deploy `appgdep_6ac913cb2f6481919ba7099c9bfea1ed`: succeeded 2026-10-09T16:22:44.733278+00:00, på [befintliga Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site). Kod, main och faktiskt publicerad Site är separata kvittenser; merge publicerar inte appen.

Skyddet omfattar 37 allmänna CRM-svarsvägar för GET, replay, konflikt, success och retry. Sist återlästa medlem i samma försök måste behålla `id`, `user_id`, `role` och `owner`; medlemskontrollen prövar även aktivt konto och user-koppling. Projektion och JSON-svar byggs synkront direkt efter kontrollen. Befintlig SQL-skrivauktorisering, CAS och reauth-/retry-policy består. Kontrollen är ingen atomisk ACL-läsning/projektion, upptäcker inte ABA-ändringar och fryser inte ACL för hela requesten. Redan returnerade byte och backup-/exportströmmar ligger utanför denna rättning.

Layoutändringen gäller bara uppföljningsdialogens textarea: höjden begränsas med viewport-anpassad min-/maxhöjd och vertikal scrollning. Den ändrar ingen råtext, request-nyckel, sparning, lagring eller återställning.

En skrivning kan redan vara atomiskt committad när svarskontrollen nekar kvittot. Klientens oförändrade avsikt behåller pending-ID även vid 401/403; råa formulär och privata utkast bevaras. Befintlig SQL-skrivauktorisering och mutationsledger ger fortsatt exakt replay.

Inga lagrings-, schema- eller migrationsändringar införs; tidigare formatkompatibilitet består. Privata årshjulsutkast ingår inte i den gemensamma CRM-exportströmmen. Befintliga privata utkast och okända arkiverade rådata på återställningsdestinationen bevaras; detta betyder inte att de exporteras eller återskapas ur den delade streamen. Oförändrad föregående v73 återinför den bekräftade åtkomstläckan. Föredra framåtriktad korrigering med denna svarskontroll och kompatibla läsare/skrivare. Full hostad återställning och live-rollback är oprövade.

Hostingens faktiska efterkontroll: Återläst 2026-10-09 16:24:23 UTC: samma projekt/URL, v74-source/deploy matchar. Custom access policy revision2 och fulla policyobjektet oförändrat, 0 automations oförändrade. Runtime-miljö revision1 med1 entry inklusive värden oförändrad i minnesjämförelse; inga hemligheter sparades. hosting.json:s DB/BUCKET-binding och migrationer är oförändrade källbytes, inte separat läst driftinnehåll. Anonym GET / och CRM/privata utkast gav401 utan bypass och utan skrivningar. Stödda lokala Sitespaketeringshelpern saknades; source push och Sites remote-buildfallback användes. Återläst serverbyggt tar-arkiv: sha256:dad50fcd7018bca28f8ee291d2864a21c31714c197033094b4dc05f2af5be982, 103 filer, 5724160 byte. Inget lokalt paketerat/uppladdat arkiv påstås. Publiceringskvitto SHA256 `e470711c40cefdd15e53f786ee6908b05f38fb893d03bcb675d9a4a125900512`.

Skrivprov använder syntetiska identiteter och isolerad lagring. Personlig inloggning/CRM-roll, observerad personalpilot, verkliga Fortnox-/Outlook-konton, full hostad backup/återställning och live-rollback är inte verifierade. Grön CI och browserprov bevisar ingen personalacceptans. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant `read_thread` saknas. Konton, roller, verkliga kund-/orderdata, mejl, scheman, prompter och aktivering ändras inte genom denna rättning.


## Historik före crm77-leveranskvittot

# Driftkvittens – crm76 historisk text med samma dataformat

Kodkandidat `87d282c200193ba22ad2f20d9e15f5d994d45777`, träd `bbc70214fd3ce5d0306092578a621af636919c52`. **GitHub app-main** `347cc26333605a5bd23f0327b33ce66ec245d7bf` efter [PR #127](https://github.com/ludros93-prog/MAgnussons-CRM/pull/127). **Sites-source** `fe6702c662ac599fed9ff57cecaba71d1b395b8a` motsvarar slutkandidatens 365 spårade filer. **Live v73**, deploy `appgdep_6ac8fb6c6f048191ad45188558594def`, status `succeeded` 2026-10-09T14:38:54.326227+00:00, på [befintliga Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site). Kod, GitHub-main och publicerad Site redovisas separat; merge publicerar inte appen.

Ändringen återanvänder befintliga `deal`-/`order`-handlingar, postbasis, CAS, autentiserad aktör och mutationskvittens. Inga nya SQL-tabeller, migrationer, ansvars-/utkastscheman eller konto-/rollrättigheter tillkommer. Normaliserad lagrad post ändras bara i det tillåtna textfältet och en särskild kommersiell rättningshändelse; pris, fakturafakta, leverans, fysisk produktion, kund och uppgifter bevaras.

Äldre privata formulär med ändringar utanför det tillåtna textfältet kan läsas och kopieras men kan inte lämnas in som en delvis bortkastad ändring. **Läs in aktuell version** är ett uttryckligt val. Hela tidigare formuläret, med egna värden, ursprungsunderlag och sparmetadata, bevaras då i läsande och kopierbart återhämtningsunderlag. Sparning använder hela formuläret; dolda ändringar projekteras inte bort. Omläsning gör inte ett äldre granskningsunderlag aktuellt automatiskt.

Detta inför ingen privat utkastimport eller driftåterställning. Gemensam CRM-kopia omfattar fortfarande inte konton, privata utkast eller Outlook. Tidigare krav på formatkompatibla läsare/skrivare och separata privata råkopior består, inklusive crm75:s årshjulsöverlämning. Föregående kod kan återföra det äldre textredigeringshindret; den får inte antas säkert hantera andra senare format enbart för att UI öppnas.

Hostingidentitet, begränsad åtkomst, bindings, miljö och automationer: Samma Site, URL, custom-delning/policy, inloggningsklient, miljörevision 1 och automationsinställningar är återlästa oförändrade. Konfigurerade bindings bevaras genom oförändrad hostingkonfiguration och utelämnad tunnel_bindings; produktionsdatabasens bindningsinnehåll har inte lästs separat. Anonyma GET till /, /api/crm?space=live och /api/crm/drafts?space=live avvisas med 401, 401, 401. Inga svarskroppar/kunddata, personliga inloggningar eller kundskrivningar lästes/provades.. Faktisk publiceringsväg och källa: Sites paketeringshjälp saknas i denna executor. Efter lokalt verifierat build och native runtime publicerades det oförändrade 365-filsträdet genom vanlig fast-forward till befintligt Sites-source; save använde exakt source-SHA och remote build fallback. Sites-versionens arkiv är sha256:e188839c20a093edd278d3f5a7bf8a2904ddee2cb25ccbbdaa8b04f1871c4da6 (103 filer, 5724160 byte), kopplat till samma source-SHA och lyckad deploy. Inget lokalt paketerings-/uppladdningsprov påstås.. Full hostad backup/återställning och live-rollback är fortsatt oprövade.

Alla skrivprov använder syntetiska identiteter och isolerad lagring. Personlig inloggning/CRM-roll, observerad personalpilot, verkliga Fortnox-/Outlook-konton och full hostad backup/återställning eller live-rollback är inte verifierade. Grön CI och browserprov bevisar ingen personalacceptans. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant `read_thread` saknas. Konton, roller, verkliga kund-/orderdata, utskick, schema, prompt och aktivering har inte ändrats genom denna leverans.

## Historik före crm76-leveranskvittot

# Driftkvittens – crm75 privat behovsöverlämning

Kodkandidat `64967f94c4fc1b4703682b1e2536774908249fad`, träd `843b011fff454229145e0a3f196f010657cf08a1`. **GitHub app-main** `8f4e3351a4407dce35ea54cbe4436921dc2cc6b9` efter [PR #125](https://github.com/ludros93-prog/MAgnussons-CRM/pull/125). **Sites-source** `7b4d84685a4c569adeaa72298bea3b87423f4657` har samma 361 spårade filer byte för byte. **Live v72**, deploy `succeeded` 2026-10-09T12:11:43.512594+00:00, [https://magnussons-crm.rosen123.chatgpt.site](https://magnussons-crm.rosen123.chatgpt.site). Appkod, GitHub-main och publicerad Site är separata kvittenser; merge är inte publicering.

Befintlig privat `form`-rad får det särskilda sammanhanget `yearwheel_responsibility_transfer` och ett strikt kuvert. Inga SQL-migrationer, nya tabeller eller ändrade delade behov-/uppgiftsscheman tillkommer. Kuvertet bevarar råtext, val och hela ursprungsunderlaget; den privata raden har en exakt kvitterad revision. Granskningsrätten sparas inte i kuvertet. Personlig råkopia bevarar även okända sammanhang utan normalisering. Gemensam CRM-backup omfattar inte privata utkast, konton eller Outlook. Lokal fullfilåterställning bevarar separata privata råposter; den är ingen hostad driftåterställning. Äldre oförändrad `d06bcd3`/live v71 saknar kompatibel editor/consumer för det nya privata sammanhanget och kan välja generisk form-fallback. Använd kompatibel framåträttning, eller behåll rå privata rader och en kompatibel kopieläsare med äldre överlämningsredigering spärrad. En återgång får inte låta äldre editor skriva bort nytt underlag. Tidigare delade ansvarshistorikers formatgränser består. Ingen automatisk import, återaktivering, allmän utkastrestore eller ny kundacceptans införs.

Förvara den egna råkopian privat utanför Git. Välj samma eget konto/arbetsyta vid lokal textåterhämtning och granska aktuell CRM-post innan vanlig sparning. Kopian skapar inte kontoanslutning, import eller ny kundacceptans.

Samma Site/URL, begränsad åtkomstpolicy revision 2, miljörevision 1, auth-klient, bindings och automationer är oförändrade enligt publiceringskvittot. Anonym HTTPS: /: HTTP401, /api/crm?space=live: HTTP401, /api/crm/drafts?space=live: HTTP401; utan authheaders/cookies, redirectföljning eller svarskroppar. Detta är anonym ingress, ingen personlig inloggning.

Föreskriven lokal helper/paketering är fortfarande otillgänglig; faktiskt native serverbygge används enligt publiceringsverktygets reservväg. Ingen egen packager eller ny Site.

Samtliga skrivprov använder syntetiska identiteter och data i isolerade testmiljöer. Personlig inloggning/CRM-roll, observerad personalpilot, full hostad backup/restore/live-rollback och verkliga Fortnox-/Outlook-konton eller andra integrationer är inte verifierade. Grön CI och browser bevisar ingen personalacceptans. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant `read_thread` saknas. Inga schema-/prompt-/aktiveringsändringar, mejl eller riktiga kund-/order-/kontoskrivningar ingår i körningen.

## Historik före crm75-leveranskvittot

# Driftgräns – privat behovsöverlämning

Lagringen använder befintlig privat form-rad/context yearwheel_responsibility_transfer; inga SQL-migrationer eller ändrade delade behov-/uppgiftsscheman. Rå utkastkopia bevarar nya context utan formatändring. Äldre d06/v71 saknar kompatibel editor/consumer och har en generisk form-fallback: använd inte dess redigering som säker återgång efter nya utkast. Behåll rå privata rader och kompatibel kopieläsare; korrigera framåt eller spärra äldre överlämningsredigering. Arkiverat utkast bevisar inte att CRM-inlämning lyckats. Automatisk import eller generell hostad restore införs inte.

Teknisk kandidat under verifiering. GitHub-main är vid start d06bcd3b10e100f6fc0afa7b2b9e848d7015cf7e; publicerad Site är fortfarande v71/source b13a6791f7390ca01643ec183ac4b4071b96a861. Ingen merge/deploy eller slutlig testkvittens påstås här. Personlig inloggning/CRM-roll, personalpilot, full hostad backup/restore och verkliga integrationer återstår. Codex-task 01a104c7-a5c5-7350-8577-a4f941138061 är oläst eftersom relevant read_thread saknas.

## Historik före crm75-kandidaten

# Driftkvittens – crm74 kopia och lokal textåterhämtning

Kodkandidat `1d2e559f803546c380f6ebb971a2c8090a7c71c6`, träd `d8bf3d78b4ef6980ad3ba1064bfa4134d8634bab`. App-main `10458af94ad84c1a2b51da56fd6d0724f7ae4ef4` efter [PR #123](https://github.com/ludros93-prog/MAgnussons-CRM/pull/123). Sites-source `b13a6791f7390ca01643ec183ac4b4071b96a861` har exakt samma 356 spårade filer. **Live v71**, deploy `succeeded` 2026-10-09T10:17:05.910541+00:00, [https://magnussons-crm.rosen123.chatgpt.site](https://magnussons-crm.rosen123.chatgpt.site).

Personlig **Kopia av mina utkast** är helt läsande: en enda SQL-snapshot av egna aktiva/arkiverade råposter, konto-/rollkontroll utan bootstrap och slutkontroll efter digest. Inga ändrade tabeller, utkastformat, konton, original-ID:n, revisioner eller request-ID:n. Gränser: 1000 poster, konservativ 8 MB SQL-budget, exakt 8 MB records-JSON och 32 MB lokal fil. Övergräns ger 413 utan delkopiering.

En sparad fil återhämtar text via lokal läsare; den är inte ett automatiskt restorepaket. Förvara den privat, välj samma konto/arbetsyta och kopiera behövd text till ett granskat arbetsmoment. Ingen automatisk återaktivering, kundacceptans, orderbokföring eller versionsreset. SHA-256 är korruptionskontroll av records, ingen signatur eller tillstånd att skriva. Saknade binärer/kundfiler/Outlook kan inte återställas ur denna fil.

Återgång av denna läsfunktion behöver ingen SQL-restore: behåll råutkasten och en formatkompatibel lokal läsare för befintliga kopior. Äldre app saknar den nya kopieingången. Tidigare crm71:s delade historikgolv och crm73:s privata årshjulsformat gäller fortsatt; återgång får inte släppa deras skydd. Full hostad backup/restore/live-rollback återstår. Föreskriven lokal helper saknas; verifierat native serverbygge är använd reservväg, ingen egen packager eller ny Site.

Detta är tekniska prov med syntetiska identiteter och data. Personlig inloggning/CRM-roll, observerad personalpilot, full hostad återställning och verkliga Fortnox-/Outlook-konton är inte verifierade. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant read_thread saknas.

## Historik före crm74-leveranskvittot

# Driftkomplettering – personlig råkopia och lokal textåterhämtning

`GET /api/crm/drafts/copy?space=demo|live` hämtar endast autentiserad användares egna rader, aktiva och arkiverade. Initial medlemsläsning och senare kontroller är helt läsande: ingen bootstrap, kontokoppling, CRM-version, ledger, CAS-revision eller R2-data skrivs. Originalmedlem måste fortsatt ha exakt aktiv flagga 1, ID, användar-ID, e-post, roll och ansvar. Rollförlust eller ändrad koppling innan svar ger avslag utan privata poster.

Format `magnussons-private-drafts-1` innehåller arbetsyta, opakt ägaranvändar-ID, exporttid och råposter med ursprungliga ID:n, typ, sammanhang, revision, request-ID, titel, arkivstatus, sparad tid och exakt `dataRaw`-sträng. Inga konto-/Outlook-/R2-tabeller läses. Inre kuvert normaliseras inte, även när de är ofärdiga, äldre, okända eller felaktiga. SHA-256 av `JSON.stringify(records)` och postantal upptäcker skadade utkastposter; detta är ingen signerad serveräkthet. Manifestets övriga metadata valideras separat.

Alla egna poster, postantal och budget tas i samma materialiserade SQL-läsning. Ingen paginerad blandning eller tyst LIMIT/trunkering. D1:s 2 MB-gräns för en sträng/rad undviks genom en rå radmängd, ingen stor JSON-aggregatcell. Högst 1 000 poster och konservativ SQL-budget 8 000 000 UTF-8-byte gäller: varje ursprunglig strängbyte räknas sex gånger, plus metadata/avskiljare. Den kan därför stoppa en fil som faktiskt är mindre än 8 MB. Överskridande ger HTTP413 utan partiell kopia. Exakt slutligt post-JSON kontrolleras också mot 8 000 000 byte; lokal filgräns är 32 000 000 byte. Behåll kopian privat utanför Git. Stora arkiv behöver en separat verifierad driftväg; användaren ska inte radera arbete för att få plats.

**Återhämtning:** hämta och behåll hela filen privat, välj den senare med samma eget konto och arbetsyta, kontrollera innehållet och kopiera nödvändig text. Läsaren laddar inte upp filen, återställer inga ID:n och gör ingen automatisk CRM-skrivning. Gamla kund-/profilkopplingar och fryst underlag kan vara inaktuella. Vid fortsatt verkligt arbete krävs ordinarie aktuell post, faktisk behörighet, granskning och vanligt sparbesked. Arkivflagga bevisar inte publicering. En kopia före ett avbrott bevarar text; den ersätter inte automatisk privat driftbackup eller full hostad återställning.

Ingen SQL-/lagringsmigration eller ändring av befintligt utkastformat införs. Återgång för själva kopieläsaren bevarar databasens utkast orörda och lämnar filen som läsbar JSON. Tidigare crm73-kuvert och crm71-delad historik kräver fortsatt kompatibel läsare/skrivare; äldre oförändrad v69-editor är inte en säker skrivande återgång. Gemensam CRM-backup förblir separat och omfattar inte privata utkast, konton eller Outlook.

## Historik före crm74-källändringen

# Driftkomplettering – crm73 och live v70

Kodkandidat `aa57965cd45dbec9eb42cc3679524c99b87ba7ae`; app-main `31c38d103062bf88520f2062d0d2c604e7b44cbf` efter [PR #121](https://github.com/ludros93-prog/MAgnussons-CRM/pull/121). Sites-source `f847d0192ba05478738fd1c6a2394958cbf42f4c`, träd `5702706f2fb784227054eb5e48dabf57593c6b79`, exakt samma 351 spårade filer som den frysta testkandidaten. **Live v70**, deploy `succeeded` 2026-10-09T08:02:11.980430+00:00, [https://magnussons-crm.rosen123.chatgpt.site](https://magnussons-crm.rosen123.chatgpt.site). Full återläst custom-policy revision 2, automationslista och miljörevision 1 är oförändrade. D1/R2-bindningar, samtliga sex SQL-migrationsfiler, låsta beroenden och CI är byteoförändrade. Ingen konto-, roll-, kund-, integrations- eller schemaåtgärd ingår.

Privat `form/year_need` använder befintlig `crm_drafts`, per användare/arbetsyta, exakt råformat och fryst originalkund/behov/profiler. Global max100-gräns för nya aktiva utkast finns i det atomiska SQL-villkoret även mellan olika utkasttyper. Befintlig bodygräns 1,5 miljoner tecken gäller. CRM-inlämning binds till exakt kvitterad privat revision och förbrukar utkastet atomiskt med behov, statusstyrd påminnelse, händelse och idempotenslogg. Arkiverat utkast ensamt är inte bevis på CRM-inlämning efter tappad kvittens.

**Backup/återgång:** delad CRM-backup innehåller inte privata utkast. Bevara råa privata aktiva/arkiverade kuvert utan att normalisera eller lägga dem i Git. Äldre v69 saknar editor/consumer för formatet; återgång kräver en kompatibel läsare/skrivare eller skrivskydd och en verifierad bevarande-/återöppningsväg. Välj inte äldre skrivande UI bara för att det laddar. Tidigare crm71-golv för delad produktionshistorik gäller fortsatt. Framåträttning som bevarar schema och privata format är den tillgängliga vägen; full hostad återställning/live-rollback är inte utförd.

Fem frysta kontroller, exakt-head/main-CI och isolerad native HTTP/D1-triggerrollback passerade. Lokal full restore bevarar 13,5 MB R2 och privata/Outlook-sentineler; [VALIDATION](VALIDATION.md) anger begränsningarna. Föreskriven lokal Sites-helper saknas fortsatt; dokumenterat native serverbygge gav lyckad deploy och byteverifierad källa utan lokal ersättningspackare.

Browser vid 320 px/text 2×, native tangentbord, personlig CRM-roll/inloggning och observerad personalpilot är inte verifierade här. Gröna tester är ingen personalacceptans eller fungerande Fortnox-/Outlook-anslutning. Full hostad återställning/live-rollback är oprövad.

## Historik före crm73-leveransen

# Magnussons CRM – drift efter publiceringsåterhämtning

## Samma Site med native serverbygge – 2026-10-09

Verifierad Publicerad GitHub-mainrevision `9cbcdbba` fördes till befintlig Sites-källgren genom vanlig fast-forward synk. Source `4cde45d4887efbd348d7193ba3aaf53809eb5070` bevarar både tidigare Site- och GitHub-historik; samtliga 345 spårade filer motsvarar verifierad main byte för byte. Samma Siteversion 69 och deploy `6ac87b2d`: succeeded, native uppdatering 2026-10-09 05:30:57.436424 UTC (terminalt återläst 05:34:06 UTC). Återläsning 2026-10-09 05:34:20.404 UTC: full returnerad begränsad åtkomstpolicy (custom, revision 2), miljö (revision 1, en post) och automationer oförändrade; bindings oförändrade. [VALIDATION](VALIDATION.md) binder exakta revisioner och kvitton.

Föreskriven sourcehelper kunde inte återställas med tillgänglig executor-/skill-/plugininfrastruktur. [Sites-instruktionen](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) anger normalt helperpaketering och att source-only behöver motsvarande arkiv. Native `save_site_version` anger det specifika undantaget “omit it only when local packaging cannot complete and remote build fallback is required”. Detta undantag användes efter faktisk källpush/återläsning; serverbygget hanterar källversionen. Ingen egen lokal packare, låtsashelper, force-push, credentialfil eller delningsändring ingår. Skillens generella formulering och verktygets specifika undantag dokumenteras öppet; allmän möjlighet att utelämna fungerande lokal paketering antas inte.

**Återgång:** publiceringens versionsnummer 69 är skilt från crm71-kodens formatstöd. Efter nya crm71-ansvars-/historikskrivningar krävs kompatibel läsare och skrivare. Oförändrad v68 ska inte antas säker för skrivande återgång; behåll kompatibel korrigering eller genomför faktiskt verifierad full återställning med plan för senare arbete. `magnussons-crm-1` och de sex SQL-migrationerna består. Full hostad återställning, privata driftbackuper och verklig personalpilot återstår; grön deploy bevisar inte dessa.

## Historik före publiceringsåterhämtningen 2026-10-09

# Magnussons CRM – order, tryck och lager

## crm72: läsflöde i Min dag och blockerad publicering

App-main `975ebc9619f01993c9d98046a2e7540e67496c97` via [PR #118](https://github.com/ludros93-prog/MAgnussons-CRM/pull/118) innehåller verifierad UI-kod `85ead27eae96f5a9343ee52e8b932955dcecdc24`. Min dag återanvänder befintligt `ownsProductionIssue` för aktuell egen hinderidentitet och öppnar befintlig produktionsvy. Inga nya fält, SQL-migrationer, behörigheter, privata scope eller skrivoperationer införs. Ny exakt user-/member-pair och befintlig äldre user-ID-regel bevaras; namn används inte för att härleda en ny identitet.

Återgång för just dessa fem UI-filer förändrar inte lagringsformatet. Tidigare crm71-skrivningar kräver däremot fortsatt crm71-kompatibel läsare/skrivare för registrerat hinderansvar och historik; äldre oförändrad serverkod är inte säker återgång efter sådana skrivningar. Backupformatet är `magnussons-crm-1`, de sex SQL-migrationerna består. Lokala restoreprov använder isolerat syntetiskt underlag. Full hostad produktionsåterställning, privat driftbackup och faktisk personalöverlämning kvarstår.

**Publiceringshinder:** [Sites-instruktionen](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) säger: “For hosted work, package with the source helper using remaining checks/builds as ordered argument arrays and an absolute `archivePath`.” Föreskriven `site-workflow.mjs` hittades inte i läsbara delar av /workspace, /tmp, /opt, /usr/local, /usr/share, /home, /mnt och /root; /opt/containerd och /root gav uttryckliga permission-denied. Två refererade skill-scriptresurser kunde inte läsas. Ingen total frånvaro i otillgängliga kataloger påstås. Aktuell Sites Linux-/plugin-/pnpm-helpermiljö är inte konfigurerad. Executor och native GitHub/Sites-läsning fungerar, men detta ersätter inte helpern.

Ingen egen arkivpaketering, ny sourcecredential, source-push via helper, Site-version, deploy, delnings- eller miljöändring gjordes. Läsning 2026-10-09 03:53:31 UTC bekräftade samma projekt `appgprj_6aa71b309d90819181a32a9af6e6baf2`, live v68/källa `cea57b7f66c5dce49f65e61cc74fc8f54a450d2e`, deploy `appgdep_6ac8032156cc8191b491fe39f44c6650` succeeded (senast uppdaterad 2026-10-08 20:56:03 UTC), custom begränsad policyrevision 2, miljörevision 1 och noll automationer. Full returnerad policy/miljö är exakt oförändrade mot start. Kund-/konto-/miljövärden lagras inte i det publika repot.

**Nästa driftsteg:** Återställ föreskriven helper, paketera verifierad kompatibel main enligt Sites-instruktionen, publicera till samma Site med begränsad delning och läs tillbaka exakt källrevision/lyckad deploy. Bekräfta därefter med riktiga avsedda användare att inloggning, egen dag och överlämning fungerar; gröna native testheaders är inget personalprov. Inga meddelanden skickades som del av bygguppdraget. Refererad Codex-task är oläst.

## Historik före crm72

# Magnussons CRM – order, tryck och lager

## Lämna över nästa steg i ett öppet hinder – crm71-kod

1. Öppna rätt arbetsyta och jobb som administratör. **Byt hinderansvar** finns på produktionskortet, i jobbdetaljerna och i **Inställningar → Konton & roller → Produktionsarbete per konto**. Kontrollera kund, jobb, orderreferens och arbetsreferens. För säljare finns produktionen via **Offerter & order → Tryck & leverans → Min produktion**.
2. Läs **Ansvarar för nästa steg**, **Rapporterat av** och **Registrerad rapporttid**. Den sparade rapportören och rapporttiden ligger kvar. Hindertexten i dialogen är aktuellt sparad text vid öppning, inte ett oföränderligt första rapportutkast.
3. Välj **Hinderansvarig efter ändringen** bland tillgängliga aktiva anslutna konton. Kontrollera roll och konto-ID vid lika namn. Ett namn eller ett historiskt ID är inget bevis på personens fungerande inloggning. Äldre okänd eller enbart namngiven rapportering bevaras. Första överlämningens historiska medlemskoppling lämnas tom när det äldre underlaget inte belägger någon sådan koppling.
4. Ange varför ansvaret ska ändras. Om texten är för lång visas **Orsaken är för lång. Korta texten.**; vid ogiltig text visas **Orsaken innehåller ogiltig text. Skriv om texten.** Läs **Granska ändringen**, mottagare och skäl. Jobb-/orderansvar och registrerade antal, tryck, kassation, leveranser och datum ligger kvar. Markera granskningen och välj **Spara nytt hinderansvar**. Invänta faktiskt kvitto; en överlämning gör inte hindret löst.
5. Vid fel finns skäl och val kvar i den öppna dialogen. Vid ändrat underlag: välj **Hämta aktuellt underlag**, kontrollera vad som hämtats och välj uttryckligen **Läs in nytt granskningsunderlag**. Skälet och fortfarande tillgängligt konto behålls; ett försvunnet konto kräver nytt val. Granska igen innan nästa skrivning.
6. Vid obekräftad sparning kan första försöket redan ha lyckats. Följ dialogens väg för samma oförändrade retry eller för hämtning/adoption/ny granskning. Stäng inte och skapa ett nytt försök för att kringgå ett osäkert resultat. Kopiera text innan omladdning; detta är ingen varaktig privat utkastlagring.
7. Efter sparning visar **Tidigare ändringar av hinderansvaret** från-/tillkonto, skäl, aktör, tid och ansvarsrevision. När hindret faktiskt löses använder aktuell ansvarig eller admin den befintliga lösningshandlingen; överlämningsaudit bevaras i lösningshistoriken. Ny rapportering börjar en ny aktuell ansvarscykel.
8. Om en kontoändring varit spärrad, hämta kontoändringens granskning på nytt. Andra jobb/hinder och oklara identiteter kan fortfarande spärra. CRM-konto, kommersiellt ansvar, privata utkast/mejl, externa konton och Sites-åtkomst hanteras separat.

**Mitt arbete** visar också dina aktuella öppna hinder på skickade jobb. **Ditt hinder** förklarar varför jobbet visas utan att ange något påhittat uppföljningsdatum. I arkiverat arbete ligger löst överlämningshistorik kvar.

Vägen gäller öppna hinder på lämnade, tryckta eller skickade jobb. Skickat jobbs historiska jobbansvar får ingen ny överlämning. Nya överlämnade öppna hinder måste lösas före avbrytning/återinlämning; äldre avbrutna öppna hinder behåller sin diagnosgräns. Inga namnmatchningar, kundacceptanser eller utskick införs.

Slutkod `92470f29c7b342760fc7d48c4f7369619f657da7`, app-main `6d3c5f53ea28078a2c177c078024b6151cba608b`; slutkontroller: PASS på ren och byteoförändrad slutkandidat: regression 75,22 s, TypeScript utan incremental 11,54 s, bygge 9,89 s, native Worker/D1/R2 205,12 s och diffkontroll 0 s; alla fem exit 0. Browser/design: PASS 18/18 på samma frysta slutkod: 13 native fall och fem separat märkta transportfall (tre mock409, en mock503, en faktisk native200 med tappad klientkvittens). Alla sex layouter vid 320/390/1280 px med normal/exakt dubblerad CSS-text, 54 verkliga skärmbilder och 28 journalförda browser/APIRequest-POST. Tre ingångar, aktuell ansvarigs redigering/lösning, personlig kö även på skickat främmande kommersiellt jobb, verklig HTTP409 mellan kompletta requests, rollavslag, dubbelklick och exakt återförsök passerade; ingen påtvingad directory-read-interleaving i browsern eller personalacceptans påstås. Kvitto `aad94f247250eef8790354c2739ef6850c907d19e1ad4cebce55aaf306580b96`. Publicering: Ej publicerad: [Sites-instruktionen](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) kräver “package with the source helper”; föreskriven helper saknas. Ingen egen paketering eller begäran om ny sourcecredential; ingen source-push via Sites-helpern, ny Site-version, deploy eller delnings-/miljöändring har gjorts. Samma begränsade Site ligger kvar på v68/källa `cea57b7f66c5dce49f65e61cc74fc8f54a450d2e`. Efter nya ansvarsfält krävs v71-kompatibel läsare/skrivare; format `magnussons-crm-1` och SQL-migrationer består. Kompatibilitet/återläsning: PASS: aktuell kandidat bevarar originalrapportör/tid, aktuell user-/member-koppling, löst och arkiverad audit, vanliga skrivningar med utelämnade äldre fält samt JSON och native NDJSON-återläsning. Alla sex SQL-migrationer är byteoförändrade. Oförändrad main020 tappade nya fält i 13 faktiska isolerade äldre skriv-/restoreoperationer; efter nya skrivningar krävs kompatibel läsare/skrivare. Kompatibel avser crm71-kodens formatstöd, oberoende av Sites versionsnummer. Full hostad återställning och verklig personalpilot är fortsatt oprövade; Codex-referensen är oläst.

## Historik före crm71-koden

# Magnussons CRM – order, tryck och lager

## Återhämta ändrad kontokatalog i inventeringen – crm70-kod

1. Öppna rätt arbetsyta och **Inställningar → Konton & roller → Produktionsarbete per konto**. Välj konto eller arbetskö och önskade ansvar-/sökfilter.
2. Om kontokatalogen ändras vid de kontrollerade läspunkterna får hämtningen ett läskonfliktfel. Inga tidigare arbetsrader visas; väljaren, ansvarsfiltret och söktexten behåller din avsikt.
3. Välj **Hämta aktuellt underlag**. Kontrollera det färska kontots namn, roll, aktivitet och konto-ID. Ett borttaget tidigare konto kräver nytt uttryckligt val; ett tomt filtrerat resultat innebär ingen färdig personalavveckling.
4. Använd befintlig granskningshandling för varje aktuell ansvarsdel. Jobbansvar, hinderansvar och kommersiellt ansvar flyttas inte av en läsning. Ny kontoändringsgranskning behövs fortfarande efter faktiskt hanterat arbete.
5. Om administratörsåtkomsten har återkallats kan katalogen inte lämnas ut. Återhämtning kräver rätt faktisk kontobehörighet; upprepade hämtningsklick ändrar ingen åtkomst.

Produktionsinventeringen jämför nu två ordningsoberoende läsningar av den registrerade kontokatalogen, inklusive medlems-ID, användarkoppling, namn, roll och aktivitet. Ändrad katalog ger 409 utan kontolista eller arbetsrader efter förnyad adminautentisering. Befintlig dubbelläsning av relevant produktionsunderlag består. Detta är en upptäckt ändring mellan kontrollerade läspunkter, ingen allmän databastransaktion, kontinuerlig uppdatering eller garanti mot ändringar efter slutkontrollen.

Kod `fe5ad1cf8b7eaa0772967aba670617c31ea1851c`, träd `07179bb5cd3e21b8390625fd7232014fdf563818`; GitHub app-main `ef476953f4ce50240450e6bd071e34542bd21433`. Fem obligatoriska slutkontroller är gröna på den frysta slutkandidaten: regressioner, icke-inkrementell TypeScript, bygge, isolerad runtime och diffkontroll. Kontrollkvitto SHA-256 `1f7d485e574f924c89dc443cf98b3d8570658a9b1c92b66dd5afdf6cff25cf87`; exakt-head CI [37859328931](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37859328931) har samtliga 13 steg completed/success. Browser: 11 (8 native HTTP/UI och 3 separat mockade409 UI/retry) godkända fall, 20 original sparade bilder, kvitto `b707bbd0c5b02cee4dfb8bce58d68568ae9063a896b65930ba7c49be2531c7f6`.

**Publicering blockerad:** den föreskrivna Sites-sourcehelpern `site-workflow.mjs` är fortfarande inte tillgänglig enligt denna körnings kontroll. Ingen ny Site-version har sparats eller publicerats i crm70. [Samma CRM-adress](https://magnussons-crm.rosen123.chatgpt.site) ligger kvar på **v68**, källa `cea57b7f66c5dce49f65e61cc74fc8f54a450d2e`. Github-main innehåller även v69:s inventeringsfix som ännu inte ligger live. Färsk efterkontroll av samma Site, full begränsad åtkomstpolicy och runtime-konfiguration redovisas i [VALIDATION](VALIDATION.md).

Ingen ändrad lagring, SQL-migration eller backupsemantik. `magnussons-crm-1` och v66-kompatibelt läsar-/skrivargolv efter äldre jobbansvarsrättning består. Jobb-/hinder-/kommersiellt ansvar, serverroller, skriv-CAS och idempotens bevaras. Kontrollerna är isolerade; verklig personalinloggning/pilot, full hostad återställning och riktiga integrationer är fortsatt oprövade. Codex-referensen är oläst.

**Nästa:** återfå den föreskrivna Sites-sourcehelpern, hämta färsk Site-källa och publicera exakt verifierad kandidat med bevarad identitet, miljö och begränsad delning. Därefter granskat hinderansvarsbyte och återstående oklara kopplingar enligt färsk inventering. Full personalöverlämning, chefsroll, privata backuper, personalpilot och faktiska integrationskonton kvarstår.

## Historik före crm70-koden

# Magnussons CRM – order, tryck och lager

## Hitta ett kvarstående hinder inför kontoändring – v69-kod

1. Öppna rätt arbetsyta och **Konton & roller → Produktionsarbete per konto**. Välj verkligt konto eller **Alla jobb och öppna hinder**.
2. Kontrollera kund, arbetsreferens och **Skickat · öppet hinder**. **Jobbansvar · historiskt** är bevarat sammanhang; **Öppet hinderansvar** är den aktuella ansvarsdelen. Konto-ID skiljer konton med samma namn.
3. Välj **Öppna jobbet**. Jobbets detaljvy öppnas direkt; välj befintlig **Lös kvarstående hinder** när din serverbehörighet tillåter det. Avslutat är en alternativ väg från produktionsvyn, ingen extra obligatorisk omväg.
4. Registrera lösning först när hindret verkligen är löst och invänta faktiskt sparbesked. Följ v68:s regler för fryst underlag, felretention och konflikt. Jobbet förblir skickat; historiska personer, mängder och leveranser ligger kvar.
5. Hämta aktuellt inventeringsunderlag och **Granska kontoändringen** igen. Tomt filtrerat urval eller ett löst hinder innebär ingen fullständig personalavveckling; andra arbetsytor/ansvarsdelar kan fortfarande spärra.

**Publicering blockerad:** Sites-instruktionen kräver `site-workflow.mjs` för källöppning och packning. En källskrivcredential har utfärdats, men hjälpskriptet är inte åtkomligt och inget sådant öppnings-/packningsflöde har kunnat köras. Ingen v69-version har sparats eller publicerats. [Samma CRM-adress](https://magnussons-crm.rosen123.chatgpt.site) ligger kvar på **v68**, källa `cea57b7f66c5dce49f65e61cc74fc8f54a450d2e`, med bevarad begränsad delning.

Kod `c78cd3af87e2290b104a1cf5e88456062f32526b`, app-main `0f72cef714b08cebed2f1c302f0779d529d1d7f3`; [VALIDATION](VALIDATION.md) anger exakt slutprov och kvarstående driftgränser. Ingen ändrad lagring, SQL-migration eller backupsemantik. `magnussons-crm-1` och v66-kompatibelt läsar-/skrivargolv efter äldre jobbansvarsrättning består. Granskat hinderansvarsbyte, övriga oklara identiteter/full personalöverlämning, chefsroll, privata backuper, faktisk personalpilot, full hostad återställning och riktiga integrationskonton kvarstår. Codex-referensen är oläst.

## Historik före v69-koden

# Magnussons CRM – order, tryck och lager

## Registrera lösning för kvarstående hinder på skickat jobb – v68

1. Öppna rätt arbetsyta. I produktionsboarden välj **Historik**; i **Tryck & leverans** välj **Avslutat** och öppna jobbet. Kontrollera kund, affär, order och arbetsreferens.
2. För ett skickat jobb med öppet hinder, välj **Lös kvarstående hinder**. Handlingen visas för registrerad rapportör eller administratör enligt befintlig behörighet. Läs **Hinder i det öppnade underlaget**, **Rapporterat av** och **Registrerad rapporttid**. Den sparade beskrivningen vid öppning är inte ett oföränderligt första rapportutkast.
3. Kontrollera det faktiska lösningsunderlaget. Skriv **Hur löstes hindret?** först när hindret verkligen är löst. Denna väg ändrar inte hinderbeskrivningen och erbjuder ingen ny rapportering eller produktionsregistrering.
4. Välj **Hindret är löst** och invänta faktiskt sparbesked. Lösningshistoriken bevarar registrerad hindertext, rapportör och rapporttid samt anger lösningsaktör/tid. Jobbet förblir skickat; mottagande och fakturering registreras separat. Säljaren får befintlig CRM-notis.
5. Vid fel finns lösningstexten kvar i det öppna formuläret. Vid konflikt: kopiera texten, stäng formuläret, läs in aktuellt jobb/hinder och öppna handlingen igen. Kontrollera det nya underlaget innan nästa försök. Ett obekräftat svar kan följa en redan genomförd sparning.
6. **Avbryt** eller stängning kasserar osparad lokal text. Kopiera före avbrytning/omladdning. Formuläret är inget varaktigt privat utkast; stängning återställer ingen serverhandling.
7. Om en kontoändring varit spärrad, hämta **Granska kontoändringen** igen efter faktisk lösning. Andra jobb, öppna hinder eller oklara kopplingar kan fortfarande spärra. Ett löst hinder eller tomt filtrerat urval innebär inte att kontoavvecklingen godkänns.

Aktiva lämnade/tryckta jobb behåller befintliga rapporterings-, beskrivnings- och lösningsflöden. Ett skickat jobb utan öppet hinder och ett avbrutet jobb får ingen ny sådan handling. Granskat byte av hinderansvar återstår; gissa inget konto från namn.

Ingen lagrings-/backupformatändring; v66-golvet efter äldre jobbansvarsrättning består. V67 är formatkompatibelt men döljer denna lösningsväg. [VALIDATION](VALIDATION.md) anger verifierad kod `1aa1e5df8b5fbce00d5a570ae935f2eac461edff`, app-main `36975b211b31d097039bb791fa3e0e35de96af5c` och publicerad källa `cea57b7f66c5dce49f65e61cc74fc8f54a450d2e`.

Personalkonton/pilot, privata backuper, full hostad återställning och riktiga integrationskonton återstår. Codex-referensen är oläst.

## Historik före v68

# Magnussons CRM – order, tryck och lager

## Rapportera, ändra beskrivning och lösa hinder – v67

1. Öppna rätt kund och produktionsjobb i rätt arbetsyta. Kontrollera affär, order och arbetsreferens före handlingen.
2. När inget hinder är öppet, välj **Rapportera hinder**, beskriv det faktiska hindret och spara. Denna rapportering registrerar rapportör och rapporttid.
3. För ett öppet hinder, välj **Hantera hinder**. Läs den registrerade rapportören, rapporttiden och ursprungliga beskrivningen. Saknade äldre uppgifter visas som saknade; ett namn bevisar ingen kontoidentitet.
4. För att förtydliga hindret, ändra beskrivningen och välj **Spara beskrivning**. Registrerad rapportör och rapporttid ligger kvar även när administratören redigerar. Ett beskrivningsbyte är ingen ansvarsöverlämning.
5. När hindret faktiskt är löst, ange hur det löstes i det separata lösningsfältet och välj **Hindret är löst**. Lösningshistoriken bevarar registrerad rapportör och rapporttid samt den sparade hinderbeskrivningen och anger vem som registrerade lösningen. Osparade beskrivningsändringar ingår inte i lösningen.
6. Vid fel finns din lokala text kvar i den öppna dialogen. Vid konflikt, läs aktuellt underlag innan ett nytt försök. Kopiera text före omladdning; formuläret är inget varaktigt privat utkast.
7. Om kontoändringen varit spärrad, hämta dess granskning igen efter att ansvaret faktiskt har hanterats. Beskrivningsredigering tömmer inget öppet hinderansvar.

Långa beskrivningar och lösningar rullas inuti respektive textfält med begränsad höjd. Hindertiteln och rubrikerna för registrerat underlag och lösning får radbrytas inom tillgänglig bredd. Övrigt jobbunderlag och handlingar följer sidans eller dialogens vertikala rullning. Fälthöjden gäller de fyra textfälten i hinderhanteringen; jobbdetaljernas breddanpassning gäller när hinderhanteringen är öppen. Hinderformulärens knappar har lokal minimihöjd 44 CSS-pixlar.

Med öppet hinderformulär staplas jobbdatum på smala skärmar och visas i tre kolumner på bredare skärmar. Långa knapptexter och varningar får radbrytas; innehållet finns kvar.

När ett av jobbdetaljernas två hindertextfält får fokus rullas vyn till fältet. Din text och fokus ligger kvar; ingen sparning sker genom rullningen.

En separat granskad överlämning av hinderansvar återstår; gissa inget konto från namn och använd inte textredigering för att flytta ansvar. Ingen lagring eller formatgräns ändras. V66-golvet efter äldre jobbansvarsrättning gäller fortsatt. Formatkompatibel återgång till v66 återför redigeringsfelet; använd kompatibel korrigerad kod. [VALIDATION](VALIDATION.md) anger faktiska slutprov och återställningsgränser.

## Historik före v67

# Magnussons CRM – order, tryck och lager

## Granska och rätta äldre jobbansvar – v66

1. Öppna rätt arbetsyta som administratör. I **Konton & roller → Produktionsarbete per konto** kan du välja **Ansvar som behöver granskas**. Ett aktuellt lämnat eller tryckt jobb som bara har ett äldre ansvarigt namn erbjuder **Rätta äldre jobbansvar**. Samma handling finns på jobbkortet.
2. Kontrollera kund, jobb, order- och arbetsreferens. Läs **Sparat äldre namn** och **Sparad tid i äldre underlag · inte verifierad**. Dessa uppgifter bevisar inte vem som tidigare hade ansvar eller när det började.
3. Läs **Orderansvar · ligger kvar** och **Jobbets registrerade underlag · ligger kvar**. Orderns säljare, mängder, tryck, kassation, leveranser, datum och hinderansvar följer sina befintliga registreringar.
4. Välj **Produktionsansvarig efter ändringen** bland verkliga aktiva anslutna CRM-konton. Kontrollera **Konto-ID** och roll, särskilt vid lika namn. Beskriv vilket faktiskt underlag du granskat och varför kontot ska få jobbansvaret nu. Namnet kopplas inte automatiskt till det valda kontot.
5. Läs **Granska rättningen** och markera granskningen. Välj **Registrera rättning**. Vänta på kvittot. Det valda kontots jobbansvar gäller från rättningen; äldre namn/tidsfält bevaras i historiken som ej verifierade. Ingen avisering eller kundkommunikation skickas.
6. Vid ändrat underlag, välj **Hämta aktuellt underlag**, sedan **Läs in nytt granskningsunderlag**. Orsaken finns kvar, men ett kontoval som inte längre är tillgängligt kan tömmas. Om jobbet fortfarande bara har äldre namn utan identitetskoppling, välj ett tillgängligt konto och granska rättningen igen. Om ansvar redan har förankrats, kontrollera det aktuellt registrerade kontot som visas; stäng dialogen och öppna jobbets vanliga ansvarsflöde för en annan ändring. Vid osäkert sparningsförsök kan samma oförändrade begäran återförsökas. Kopiera text före omladdning; dialogen är inget sparat privat utkast.
7. Om en kontoändring varit spärrad, hämta kontoändringens granskning igen efter att rätt ansvar hanterats. Rättningen flyttar inte andra jobb eller separata hinder. Kvarvarande ansvar och andra oklara kopplingar kan fortfarande spärra åtkomstminskningen.

Rättningen gäller bara namn utan användar-/medlemskoppling och utan tidigare ansvarshistorik på aktuella lämnade/tryckta jobb. Trasiga eller motsägande kopplingar, andra arbetsytor och hinderidentiteter behöver sina egna granskade vägar. Gissa ingen person från namnet. CRM-konto, kommersiellt ansvar, privata utkast/mejl, externa konton och Sites-åtkomst hanteras var för sig.

Efter registrerad rättningshistorik krävs **v66-kompatibel läsare och skrivare**, även vid export och återställning. Den nya `resolve_legacy`-raden bevarar äldre tidsfält som `legacyAssignedAt`, inte som ett verifierat datum. Backupformatet är fortsatt `magnussons-crm-1`; inga SQL-migrationer tillkommer. Använd kompatibel kod vid korrigering, eller en faktiskt verifierad full återställning med plan för senare arbete. Personalpilot och full hostad återställning återstår. Fem obligatoriska slutkontroller har passerat på samma oförändrade slutkandidat. [VALIDATION](VALIDATION.md) anger källrevision, kontroller och faktisk JSON/native NDJSON-återläsning; syntetiska prov verifierar ingen verklig inloggning eller personalacceptans.

## Historik före v66

# Magnussons CRM – order, tryck och lager

## Läs arbetet bakom en spärrad kontoändring – v65

1. Öppna **Konton & roller** som administratör. Välj **Ändra** vid rätt CRM-konto och kontrollera konto-ID och den ändring du vill göra.
2. När minskad produktionsåtkomst visar **Ändringen är spärrad**, läs summeringen per lagrad arbetsyta. Välj **Visa arbete som spärrar ändringen**.
3. Kontrollera arbetsyta, **Arbetsreferens**, **Order-ID**, **Produktionsstatus**, ansvarsdel och orsaksbesked. Ett jobb kan ha både **Jobbansvar** och **Öppet hinderansvar**; ett skickat jobb kan fortfarande ha ett hinder.
4. Läs **Visar X av Y ansvarsdelar**. Välj **Visa fler ansvarsdelar** tills du har läst hela underlaget. Varje hämtning visar upp till 20 nya ansvarsdelar från samma granskning.
5. Ta med rätt arbetsyta och jobbreferens till ansvarets befintliga arbetsflöde. Listan öppnar inte jobbet, växlar inte arbetsyta och flyttar inget ansvar. Granskad jobböverlämning gäller ett jobb i taget och flyttar inte automatiskt hinderansvar eller kommersiellt ansvar.
6. Vid en oklar äldre koppling: kontrollera verkligt underlag. Listan förklarar felet men rättar det inte. Välj ingen person enbart utifrån namnet; granskad rättning av dessa kopplingar återstår som separat arbetsflöde.
7. Vid hämtnings-/formatfel används inga tidigare detaljrader. Formulärvärdena finns kvar; välj **Hämta arbetsunderlaget igen**. Vid ändrat granskningsunderlag, välj **Hämta kontoändringens granskning igen** och börja detaljläsningen från första sidan.
8. Efter att ansvaret faktiskt har hanterats, hämta kontoändringens granskning igen. Först när den aktuella produktionskontrollen tillåter ändringen kan du granska och spara enligt kontoformulärets befintliga arbetsgång.

Den här listan är läsande och skickar inga meddelanden. Den visar registrerat produktionsansvar i lagrade arbetsytor och ger inget generellt klartecken för personalavveckling. Kommersiellt ansvar, privata utkast och mejl, externa konton och Sites-åtkomst behöver hanteras separat. [VALIDATION](VALIDATION.md) skiljer syntetiska tekniska prov från verklig personalinloggning och personalpilot.

## Historik före v65

# Magnussons CRM – order, tryck och lager

## Granska kontoändringen innan åtkomst minskas – v64

1. Öppna **Konton & roller** som administratör. Välj **Ändra** vid rätt registrerat CRM-konto och kontrollera namn, inloggningsadress och **Konto-ID**.
2. Välj ny **Roll och arbetsvy**, eller avmarkera **Kontot är aktivt**. När ändringen minskar befintlig produktionsåtkomst visas **Granska kontoändringen**.
3. Läs **Jobbansvar**, **Öppet hinderansvar** och **Kopplingar att granska** för varje lagrad arbetsyta. Ett skickat jobb kan fortfarande ha ett hinder. Kontrollens omfattning är större än det valda urvalet i **Produktionsarbete per konto**.
4. Vid **Ändringen är spärrad**: granska rätt underlag och lämna över varje ansvarsdel med dess befintliga arbetsflöde. Ett jobbbyte flyttar inte automatiskt hinderansvar eller kommersiellt ansvar. Gissa inte en person från ett äldre namn.
5. Använd **Hämta kontoändringens granskning igen** efter överlämningen. När den nya produktionskontrollen tillåter ändringen, markera **Jag har granskat kontoändringen och produktionskontrollen.** Välj **Inaktivera CRM-konto** eller **Spara CRM-konto**.
6. Vänta på sparningskvittot. Om sparningen är osäker, skicka inte samma ändring igen: välj **Läs kontots aktuella status**. Dina formulärvärden ligger kvar. Välj endast **Läs in aktuellt konto och ersätt formulärvärden** om du vill ersätta dem och granska en ny ändring.
7. Om kontot bekräftas som sparat men översikten inte kunde uppdateras, använd **Hämta aktuell kontolista** före nästa kontoändring. Detta är ett uppdateringsfel efter sparning, inte ett besked om att sparningen misslyckades.

Kontrollen gäller registrerat produktionsansvar i lagrade arbetsytor. Den flyttar inget arbete och skickar ingen inbjudan eller något meddelande. CRM-inaktivering ersätter inte hantering av kommersiellt ansvar, privata utkast och mejl, externa konton eller Sites-åtkomst. Dessa behöver hanteras separat före full personalavveckling.

Källkandidat `c56486d42ad289bdbf722b74faab5cb1fafe229e`, träd `84eb44e6918c32e334a102b0880bcaa0751d3d61`. Tidigare kandidatprov är historik och räknas inte som slutkandidatens prov. Se [VALIDATION](VALIDATION.md) för faktiska tekniska prov. Verkliga personalinloggningar och personalpilot återstår.

## Historik före v64

# Magnussons CRM – order, tryck och lager

## Inventera produktionsarbete inför överlämning – v63

1. Logga in som administratör och öppna **Konton & roller → Produktionsarbete per konto**. Kontrollera vilken arbetsyta inventeringen gäller.
2. Välj konto. Kontrollera namn, roll och **Konto-ID**, särskilt när konton har samma namn. Ett inaktiverat konto kan fortfarande ha registrerat arbete.
3. Läs **Jobbansvar** och **Öppet hinderansvar** var för sig. Sök efter kund, jobb eller hinder. Resultatraden skiljer filtrerade träffar från hela det valda arbetet; använd **Återställ filter** och **Visa fler produktionsjobb** vid behov.
4. Välj **Granska jobbansvar** för ett jobb vars ansvar du ska tilldela eller överlämna. Den befintliga dialogen kräver mottagare, skäl och granskning före sparning. Kommersiellt orderansvar och hinderansvar följer inte med automatiskt.
5. Välj **Öppna jobbet** för att granska ett hinder eller nästa produktionsmoment. Hindrets ansvar har ett eget arbetsflöde.
6. När CRM-underlaget ändrats eller ett fel visas, använd **Hämta aktuellt underlag** och granska igen. Tidigare jobb visas inte som aktuella under ett felaktigt eller ändrat underlag.

**Arbete utan ansvarig** visar saknat ansvar. **Ansvar som behöver granskas** visar äldre, saknade eller motsägande identitetskopplingar. Gissa ingen person från namnet; kontrollera rätt underlag innan överlämning.

Inventeringen omfattar aktuella jobb i vald arbetsyta. Den stänger inget konto och inventerar inte privata utkast, personlig mejl eller Sites-åtkomst. Ett tomt urval är inget klartecken för personalavveckling. Kontokopplingar bevisar inte personens aktuella inloggning. Se [VALIDATION](VALIDATION.md) för tekniska prov och kvarvarande införandegränser.

## Historik före v63

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
# Driftkontrakt för privata behovsutkast – crm73

`form/year_need` lagras i befintliga `crm_drafts`, per användare och arbetsyta. Ingen SQL-migration, delad Need-schemaändring eller ändrat backupformat införs. Råa ofärdiga tal är strängar; numerisk och övrig verksamhetsvalidering sker vid uttrycklig CRM-sparning. Utkastet binder samma kund och behov, fullständigt ursprungligt behov samt fryst kund-/profilunderlag. Automatisk omläsning ändrar inte detta underlag.

CRM-inlämning kontrollerar exakt privat revision, råa värden och aktuell basis även vid nytt behov och vid varje CAS-återförsök. Den befintliga transaktionen sparar behov, påminnelse, händelse och mutationskvitto samt arkiverar utkastet tillsammans. Ett identiskt återförsök efter förlorad kvittens använder samma begäran; arkiverat utkast ensamt bevisar ingen CRM-publicering. Gränsen på 100 aktiva privata utkast kontrolleras i samma INSERT som aktörsbehörigheten, även mellan olika utkasttyper. Den befintliga privata storleksgränsen på 1,5 miljoner tecken kvarstår; felbehållning/lokal reservkopia är ingen serversparning.

Privata utkast ingår fortfarande inte i gemensam `magnussons-crm-1`-backup. Efter att nya behovsutkast sparats krävs kompatibel editor och server för återupptagning/inlämning. Tidigare live v69 saknar detta stöd: återställning av äldre kod kräver först en kontrollerad bevarande-/lässtrategi för privata rader och får inte användas som verifierad skrivande återgång. Befintligt crm71-golv för ansvarsfälten består. Borttagen kund eller borttaget behov får inte omvandlas till ett nytt behov; det privata underlaget bevaras för läsning/kopiering.
