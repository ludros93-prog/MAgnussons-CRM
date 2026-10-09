# Principer använda i crm77:s CRM-svarskontroll och uppföljningslayout

Färsk officiell åtkomstresearch finns privat i `/tmp/crm77-evidence/response-auth-research-readback.json`. [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) gav HTTP200 den 9 oktober 2026 kl. 15:30:00.905376 UTC med **Deny by Default** och **Validate the Permissions on Every Request**. [Salesforce Record-Level Security](https://trailhead.salesforce.com/content/learn/modules/data_security/data_security_records) gav HTTP200; korrigerad fullsidextraktion kl. 15:30:33.659032 UTC belägger **Record access determines which individual records users can view and edit**. Källorna stödjer åtkomstprinciper. Magnussons exakta identitetsjämförelse, svarskvittens och runtimeutfall kommer från egen kod och faktiska prov. Ett separat försök mot Salesforce GraphQL-sidan gav 404 och används inte som innehållsbelägg.

Den tidigare prioriteringsläsningen i `/tmp/crm77-evidence/priority-readback.json` gav färska HTTP200 för Lime Users and Groups, Lime Actions, Saleshub Funktioner och Salesforce Activities kl. 15:26:55 UTC. Limes stabila identiteter och sammanlänkade person-/loginmodeller samt Saleshubs samlade kundkontext stödjer den uppskjutna B01-avgränsningen; inga integrations- eller Activities-innehållslöften förs över till åtkomsträttningen.

Färsk officiell W3C-återläsning finns i `/tmp/crm77-evidence/followup-viewport-official-research.json`: [Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) gav HTTP200 den 9 oktober 2026 kl. 16:03:47.097367 UTC med textens **up to 200 percent without loss of content or functionality**. [Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) gav HTTP200 kl. 16:03:47.306064 UTC med rekommendationen om en synlig stängningsknapp i dialogens tabbordning. Dessa principer motiverar liten viewport, exakt 200 % CSS-text och synlig kontroll/fokus; browserrapporten avgör Magnussons faktiska utfall. Källorna bevisar inte full tillgänglighet eller personalacceptans.

Skyddet omfattar 37 allmänna CRM-svarsvägar för GET, replay, konflikt, success och retry. Sist återlästa medlem i samma försök måste behålla `id`, `user_id`, `role` och `owner`; medlemskontrollen prövar även aktivt konto och user-koppling. Projektion och JSON-svar byggs synkront direkt efter kontrollen. Befintlig SQL-skrivauktorisering, CAS och reauth-/retry-policy består. Kontrollen är ingen atomisk ACL-läsning/projektion, upptäcker inte ABA-ändringar och fryser inte ACL för hela requesten. Redan returnerade byte och backup-/exportströmmar ligger utanför denna rättning.

B01:s uttryckliga förankring av äldre kundansvar hos samma ansvariga person sköts upp när den bekräftade åtkomstläckan upptäcktes och kvarstår. Även kommersiell förankring, oklara identiteter och full personalöverlämning återstår. B02:s separata chefsroll, B04:s privata driftbackuper/full hostad återställning, B05:s övriga överlämnings- och specialutkast samt B07:s verkliga konto- och personalpilot är öppna. Konkreta åtkomst-, dataförlust- och orderfel går först. Färsk källgranskning avgränsar luckan: ny kund och kundåteröppning kan redan sätta profil-ID, även till samma profil vid återöppning, men återöppning ändrar status och skapar en aktivitet. En befintlig öppen kund med tomt ownerProfileId saknar neutral, uttryckligt granskad förankring till samma person; vanlig redigering bevarar det tomma ID:t och Byt kundansvar utesluter/avvisar samma profil. Nästa avgränsning är kundpostens ID och en särskild audit/händelse, utan statusbyte, ny uppgift eller kontoåterkoppling. Befintliga äldre auditkedjor måste bevaras och ny auditsemantik kräver format-/restorekompatibilitetsprov. Ny förankring behöver separat verifierad target-user-koppling och atomisk member/user/owner/role/active-kontroll; dagens generella profilkontroll är inget bevis för en ansluten person. Inga konton skapas eller kopplas om genom förankringen.

[VALIDATION](../VALIDATION.md) redovisar faktisk baslinje, fokusprov och slutkontroller. Ingen leverantörskälla bevisar Magnussons integration, hostingåterställning eller personalacceptans. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är fortsatt oläst eftersom relevant `read_thread` saknas.

Färsk [W3C Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) gav HTTP200 den 9 oktober 2026 kl. 16:14:11 UTC: minst 24×24 CSS-pixlar. Webbläsarprovet behöll telefonens 44×44-krav och kontrollerade datorns faktiska kontrollstorlekar separat; detta är ingen full WCAG-acceptans.


## Historik före crm77-leveranskvittot

# Principer använda i crm76:s avgränsade historiska texträttning

Färsk officiell återläsning 2026-10-09 13:31:47 UTC är sparad privat i `/tmp/crm76-evidence/research-readback.json`: HTTP 200 med sidtext för Lime, Salesforce och två W3C-sidor. Källorna ger design-/åtkomstprinciper; Magnussons postjämförelse, CAS, behörigheter och testutfall kommer från egen kod och faktisk verifiering.

| Lästa officiella källor | Konkret tillämpning |
| --- | --- |
| [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): **Use verbs in imperative mood**, läst 13:31:47.481050 UTC | Ett relevant textfält och tydliga **Spara förlustorsak**/**Spara anteckning**; samma kund-/postkontext. |
| [Salesforce record security](https://trailhead.salesforce.com/content/learn/modules/data_security/data_security_records): **Record access determines which individual records users can view and edit**, läst 13:31:47.824551 UTC | Separera tillåtna handlingar från synliga uppgifter. Magnussons befintliga serverroller består; ledningsrollen eller åtkomsten antas inte vara löst. |
| [W3C modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): **When a dialog opens, focus moves to an element inside the dialog**, läst 13:31:47.407786 UTC | Tydlig öppningskontext, synlig tangentbordsnavigation och kontrollerad fokusretur/omläsning. |
| [W3C resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html): **up to 200 percent without loss of content or functionality**, läst 13:31:47.467929 UTC | Browserprov vid 2× text och små skärmar för textfält, återhämtningsunderlag och sparhandling. |

Färskt försök mot [Saleshub AI:s funktioner](https://saleshubai.se/funktioner) gav HTTP 403 den 9 oktober 2026 kl. 13:30:47.356951 UTC, dokumenterat i `/tmp/crm76-evidence/research-raw.json`. Den sidan är inte färskt innehållsverifierad i crm76. Tidigare läst Saleshub-underlag om samlat kundsammanhang bevaras som historisk inspiration, utan ett nytt verifieringspåstående eller integrationslöfte.

Äldre privata formulär med ändringar utanför det tillåtna textfältet kan läsas och kopieras men kan inte lämnas in som en delvis bortkastad ändring. **Läs in aktuell version** är ett uttryckligt val. Hela tidigare formuläret, med egna värden, ursprungsunderlag och sparmetadata, bevaras då i läsande och kopierbart återhämtningsunderlag. Sparning använder hela formuläret; dolda ändringar projekteras inte bort. Omläsning gör inte ett äldre granskningsunderlag aktuellt automatiskt.

Domän, runtime och design bedöms från slutkandidat `87d282c200193ba22ad2f20d9e15f5d994d45777`: PASS på slutkandidaten: 4 domänrättningar med stabilt respektive äldre tomt UUID och 97 schema-giltiga fält-, livscykel- och identitetsavslag; oförändrad postgraf, audit och KPI:er, äldre JSON, fullständig nollfaktura, tömd orderanteckning och exakt ingen-ändring. De autentiserade API-proven innehåller 4 motsvarande HTTP-rättningar med en händelse, revision och ledgerpost vardera; dubbla anrop, exakt/lost-ACK-replay, ändrad request-body, gammal post-CAS, oberoende kundändring, serverroller, sen aktörsåterkallelse och verklig SQL-rollback. Positiva privata, kalender-, konto-, fil- och R2-sentinels samt KPI:er bevaras. Hela regressionen via node tests/outlook.mjs avslutas med 117 PASS-rader; dessa är loggrader, inte 117 unika testfall. Befintlig order-/produktionsregression omfattar bland annat granskad 40→45-orderrevision, kundgodkänd 50→48-brist, kassation, delleverans och bevarad fysisk/kommersiell historik. Slutligt browserprov på samma källa och bygge: 23/23 PASS i verklig Chromium mot samma frysta slutbygge och ägd syntetisk D1/R2: 4 återhämtningsfall för affär/order med äldre breda kända+okända eller enbart okända råfält; 12 layout-/tangentbordsfall vid 320×360, 390×844 och 1280×900 med normal text respektive uppmätt exakt 200 % CSS-text på varje nod; 4 faktiska 200-sparningar/dubbelklick med exakt replay, 2 faktiska post-CAS-409 och 1 faktisk D1-triggerorsakad 503/rollback med samma request-ID och lyckad native retry. Dialogerna visar ett redigerbart textfält, full historisk kund-/ansvars-/orderkontext och synliga fokuserade Stäng-/sparhandlingar. Äldre råa formulär kopieras exakt med native clipboard, kräver uttrycklig omläsning och behåller hela tidigare underlaget läsbart/kopierbart; endast det nya utkastet arkiveras efter verklig 200. Rapporten innehåller 51 oförändrade skärmbilder. CSS-textförstoring och browserfokus är provade; OS-zoom, hjälpmedel och personalacceptans är inte verifierade. Rapport SHA256 `122566d89ee14de4ee566a6ce1c0c8a48b0122d7348846d6ae0ffc31bda8a187`. Varje browserfall jämför alla 18 råa SQL-tabeller och R2:s byte/metadata, bevarar positiva andra privata/Outlook-sentinels och återställer sin syntetiska baslinje exakt. Slutjämförelsen har inga ändrade tabeller och samma databas-hash före/efter, 7ce0401af3df7b1fdd28ba1ee3872a02ff3a829a93ab05d85a951d493d37a420. Källa och dist är byteidentiska före/efter. Inga pageErrors eller externa förfrågningar registreras; konsolens tre HTTP-fel är de två avsiktliga 409-svaren och det avsiktliga 503-svaret. Ägda browser-/serverprocesser och portar är stängda och ägd lagring borttagen; inga främmande processer stoppades. Syntetiska autentiseringsheaders används, utan personlig inloggning eller verkliga kund-/kontoändringar.

[VALIDATION](../VALIDATION.md) skiljer syntetiska prov, publicering och verklig personalanvändning. Ingen leverantörskälla bevisar Magnussons anslutning eller personalacceptans. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är fortsatt oläst. Mandat, scheman, prompter och aktivering ändras inte.

## Historik före crm76-leveranskvittot

# Principerna använda i crm75:s verifierade behovsöverlämning

Saleshub AI:s kundsammanhang, Limes konkreta handlingsverb och Salesforces möjlighet att pausa arbete vid rätt post har omsatts i privata överlämningsutkast och återupptagning från Min dag. W3C:s dialogfokus har tillämpats på inledande läsning, synlig tangentbordsnavigation och logisk retur. Officiella kortcitat, URL:er och faktisk åtkomsttid finns bevarade i den tidigare kandidattexten nedan; leverantörernas egna delningsmodeller är inte Magnussons privata behörighetskontrakt.

Cloudflare D1 beskriver batch som SQL-transaktioner. Magnussons använder sin befintliga atomiska commit; verkligt isolerat native triggerfel provar rollback efter behov, valda uppgifter, händelse och privat arkiv. Exakt råbody, privat revision, aktör/målmedlem och CAS är egna verifierade kontrakt, inte en slutsats enbart från leverantörscitat. Autentiserade verkliga handlers med SQLite-adapter: 42 avslag, 19 injicerade SQL-racer, 1 privat CAS-prov, 2 dubbelklickspar och 1 förlorad commitkvittens med exakt replay. Privat/CRM-/aktör-/målmedlems-CAS, rollbyte och blandad kapacitetsgräns provas. Alla 18 råtabeller och R2 jämförs. Injektionerna använder samma SQLite-anslutning; de bevisar inte konkurrens mellan oberoende driftanslutningar.

Browser: 14 huvudfall och 2 kompletterande visuella felprov PASS. Sex layouter vid 320, 390 och 1280 px med normal/2× text, tangentbordsfokus och 44 px tryckytor. Exakt privat råtext och återupptagning, faktisk privat 409, CRM-jämförelse och uttryckligt underlagsval, faktisk D1 503 med lokal återläsning och återhämtning, säljarroll med läsning/kopiering och server 403, borttaget behov med bevarat underlag och server 409, dubbelklick med en commit samt tappat faktiskt 200-kvitto och exakt återförsök med spärrad redan öppnad arkivbekräftelse. Alla 18 tabeller/R2 återställda, 361 spårade filer/103 distfiler oförändrade, eget testlager och preview borttagna. 27 unika PNG verifierade; en tidigare överlagrad rollförlustbild saknas och är separat dokumenterad, originalrapporten bevarad. Browserkvitto `02d25221d2fa1902067e493f1becb39a42bacb6c20a604ef923ef4018ec11e5f`; sammanfattningens SHA256 `06908a56a8f8b14a2f732ae30a43eae4dfae02e4d716b8a0c765c094b8c03ec7`.

Samtliga skrivprov använder syntetiska identiteter och data i isolerade testmiljöer. Personlig inloggning/CRM-roll, observerad personalpilot, full hostad backup/restore/live-rollback och verkliga Fortnox-/Outlook-konton eller andra integrationer är inte verifierade. Grön CI och browser bevisar ingen personalacceptans. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant `read_thread` saknas. Inga schema-/prompt-/aktiveringsändringar, mejl eller riktiga kund-/order-/kontoskrivningar ingår i körningen.

## Historik före crm75-leveranskvittot

# Källor och tillämpning – crm75 privat behovsöverlämning

Officiella texter återlästa 2026-10-09 omkring 11:31–11:32 UTC; extraherad verktygstext sparad privat i /tmp/crm75-evidence/research-raw.json. Saleshub AI:s kundsammanhang, Lime konkreta verb och Salesforce pausat arbete knutet till rätt post tillämpas; leverantörernas egna delningsmodeller är inte Magnussons privata behörighetskontrakt. W3C:s dialogfokus styr tangentbordsprov. Cloudflare D1 beskriver batch som SQL-transaktioner; befintlig atomisk commit används och måste provas med faktisk rollback, inte bara dokumentcitat.


| Officiell källa | Kort verifierat citat och tillämpning |
| --- | --- |
| [Saleshub AI](https://saleshubai.se/funktioner) | ”Kundkort med kontakter, filer, mail, samtal och nästa aktivitet”; behåll kund/arbetsmoment vid återupptagning. |
| [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | ”Use verbs in imperative mood”; Spara utkast & stäng, Granska utkastversioner och Granska aktuellt behovsansvar. |
| [Salesforce Pause](https://help.salesforce.com/s/articleView?id=platform.flow_pause.htm&language=en_US&type=5) | ”give them the option to pause it for later”; ofärdigt arbete med kvarvarande postkoppling. |
| [D1 Database batch](https://developers.cloudflare.com/d1/worker-api/d1-database/) | ”Batched statements are SQL transactions”; befintlig batch förbrukar utkast tillsammans med CRM, verkligt nativeprov återstår för kandidaten. |
| [W3C Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | ”When a dialog opens, focus moves to an element inside the dialog”; synlig inledande läsning/fokus och logisk retur. |


CAS, exact raw-body comparison, adminrätt, kvitterad privat revision och idempotens är Magnussons egna kontrakt. Research bevisar inga faktiska konton, integrationer eller personalacceptans. Ingen saknad säljarprofil eller affärsdefinition antas.

Teknisk kandidat under verifiering. GitHub-main är vid start d06bcd3b10e100f6fc0afa7b2b9e848d7015cf7e; publicerad Site är fortfarande v71/source b13a6791f7390ca01643ec183ac4b4071b96a861. Ingen merge/deploy eller slutlig testkvittens påstås här. Personlig inloggning/CRM-roll, personalpilot, full hostad backup/restore och verkliga integrationer återstår. Codex-task 01a104c7-a5c5-7350-8577-a4f941138061 är oläst eftersom relevant read_thread saknas.

## Historik före crm75-kandidaten

# Principerna använda i crm74:s verifierade design

Saleshubs kundkontext, Limes konkreta handlingar/rollstyrda synlighet och Salesforces skillnad mellan export och full återställning har omsatts i en personlig textläsare med tydliga handlingar. Vanlig text ligger före tekniska uppgifter; faktiskt mobil-/tangentbordsprov styrde feedback- och fokusändringarna. Officiella källor med exakta korta citat och åtkomsttid finns bevarade direkt nedan.

D1:s officiella 2 MB-cellgräns styrde mot radmängd i stället för stor JSON-aggregation. En enda SQL-snapshot och skyddade konservativa gränser är provade lokalt; D1-sessioner utges inte för allmän transaktionssnapshot. 28 huvudfall PASS (21 utan browsermetodoverride, 7 kontrollerade fel/timing) samt 1 extra kontrollerat clipboardavslag PASS. Sex layouter 320/390/1280 px med normal/2× text, native tangentbordsfokus, lokal råtextläsning/kopiering och fokusretur; 21 PNG. Vid 320 px/2× syns första manuella kopieringsinstruktionen direkt och hela långa felbeskedet efter lokal scroll. Alla 356 spårade filer och 103 distfiler bevarade; inga CRM-skrivningar eller externa requests; egen preview avslutad och eget testlager borttaget. Detta är tekniska prov med syntetiska identiteter och data. Personlig inloggning/CRM-roll, observerad personalpilot, full hostad återställning och verkliga Fortnox-/Outlook-konton är inte verifierade. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant read_thread saknas.

## Historik före crm74-leveranskvittot

# Källor och tillämpning – crm74 personlig utkastkopia

Nio officiella URL:er återlästa 2026-10-09 09:25:35–09:25:36 UTC. Exakt extraherad verktygstext och kortcitat är verifierade; inga HTTP-statusar eller kompletta HTML-svar antas. Receipt `/tmp/crm74-research/receipt.json`, SHA256 `8e1d91f043d8cf7fcc2f42d87f09330148ecbce5bdce140190e9eef47a357a56`; findings `1da54c67279548eaa44d66042d38baa886f8e3a38d50e8880b450d63d2e0918f`.

| Officiell källa | Verifierad princip och avgränsad tillämpning |
| --- | --- |
| [Saleshub AI](https://saleshubai.se/funktioner): ”Kundkort med kontakter, filer, mail, samtal och nästa aktivitet” | Behåll befintligt utkast-/kundsammanhang; hittas från det privata arbetet i Min dag. |
| [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): ”Use verbs in imperative mood” | Hämta kopia, öppna kopia och kopiera text har konkreta svenska etiketter. |
| [Lime Object Access](https://platform.docs.lime-crm.com/en/latest/configuration/object-access/): ”restrict access to a specific object” | Servern skyddar varje eget användar-/arbetsytescope, även för admin. Limes egna rättighetsmodell ersätter inte Magnussons privata kontrakt. |
| [Salesforce Export](https://trailhead.salesforce.com/content/learn/modules/lex_implementation_data_management/lex_implementation_data_export): ”The data is exported as a set of comma-separated values (CSV) files.” | Export är en kopia, inte samma sak som import eller full återställning. Salesforce CSV/editioner/scheman används inte här. |
| [D1 Prepared Statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/): ”Binds a parameter to the prepared statement.” | Privatscope binds; ingen interpolation av identitet. |
| [D1 Sessions](https://developers.cloudflare.com/d1/worker-api/d1-database/): ”sequential consistency among queries” | Sekventiell konsistens bevisar ingen fryst flerfrågesnapshot. Alla egna poster och budget tas i samma SQL-läsning. |
| [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/): ”Maximum string, `BLOB` or table row size” | Officiell tabell anger 2 000 000 byte. Ingen stor JSON-aggregatcell; konservativ skyddad radmängd och avslag vid övergräns. |
| [SQLite JSON](https://www.sqlite.org/json1.html): ”returns a JSON array comprised of all X values in the aggregation.” | Råtext och JSON-värde skiljs åt. Den valda implementationen aggregerar inte utkastdata till en SQL-JSON-cell. |
| [SQLite ordering](https://www.sqlite.org/lang_aggfunc.html): ”that clause determines the order” | Exporten har explicit `updated_at DESC,id ASC`; innehållets ordning och kontrollsumma är reproducerbara. |

Publicvendorbeskrivningar bevisar inte privata CAS-rättigheter, verkliga konton, automatisk backup, hostad återställning eller personalacceptans. Kontrollsumma över råposter är integritet, inte signatur. Inga nya integrations-/kommersiella definitioner införs.

## Historik före crm74-källändringen

# Källor och tillämpning – crm73 privata årshjulsutkast

Officiella offentliga texter återlästa 2026-10-09 07:28 UTC. Käll-/läsreceipt `ad944628d8378eaab329fa0d90be374d0c7286a4b8c6a44490136ad64afbbfd7`; findings `d3dacb6be82859eca3344c3569f6277f3e5bcc920f183619bb7aafab62cd03eb`. Inga HTTP-statuskoder antas när läsverktyget bara gav extraherad text.

| Källa | Verifierad text och tillämpning |
| --- | --- |
| [Saleshub AI funktioner](https://saleshubai.se/funktioner) | “Kundkort med kontakter, filer, mail, samtal och nästa aktivitet”; samma kundsammanhang och nästa handling |
| [Lime actions design](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | “Use verbs in imperative mood”, “both icon and label”; få konkreta svenska handlingar med synliga etiketter |
| [Salesforce pause flow](https://help.salesforce.com/s/articleView?id=platform.flow_pause.htm&language=en_US&type=5) | “give them the option to pause it for later”; ofärdigt arbete kopplas till rätt post och återupptas |
| [Salesforce Classic case email drafts](https://help.salesforce.com/s/articleView?id=sf.case_interaction_draft_emails.htm&language=en_US&type=5) | “without having to send them immediately”, “Drafts aren't auto-saved.”; skilj utkast från inlämning, inget belägg för autosave eller exklusiva privata rättigheter |
| [Lime process visualization](https://www.lime-technologies.com/en/products/lime-crm/features/process-visualization/) | “Each step can have a date to clarify the timeframe.”; begripligt nästa steg och datum |

Magnussons privata användar-/arbetsytegränser, råfält, fryst basis, CAS, exakt revision och atomisk consume är egna kontrakt. Salesforce-privatdelning/Classic case-rättigheter motsvarar inte dessa. saleshub.ai är en annan B2B-dataplattform; den svenska designkällan är saleshubai.se. Lime 2025.1-läsningen gav Internal Error utan status och görs inte till nytt belägg.

Statisk designgranskning `739682ffcc4ef6aa806b0bd3e42b5969e46256d1b3614f2116484060836f76de` rättade datumskydd, bounded textfält, höjdfallback, fokusskydd och kundval. Nio Reactfall är komponentprov med adapters. Browsergeometri/personlig inloggning/personalacceptans är oprövade. [VALIDATION](../VALIDATION.md) binder verklig SQL/native HTTP-replay/rollback till app-main `31c38d103062bf88520f2062d0d2c604e7b44cbf` och live v70/source `f847d0192ba05478738fd1c6a2394958cbf42f4c`.

Sites reservväg är det faktiskt tillgängliga native `save_site_version`-kontraktet: “Include the archive whenever it can be packaged locally; omit it only when local packaging cannot complete and remote build fallback is required.” [Sites-instruktionen](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) anger normal sourcehelper/matchande arkiv. Helpern kunde inte hittas/läsas lokalt; ingen egen alternativ packare skapades. Byteverifierad source pushades först, därefter sparades version 70 och native serverbygge gav lyckad deploy 2026-10-09T08:02:11.980430+00:00. Reservvillkoret är inte ett generellt undantag från fungerande lokal paketering.

## Historik före crm73-leveransen

# Källor och tillämpade principer – publiceringsväg, 2026-10-09

Publiceringsåterhämtningen använde native `save_site_version`-verktygets faktiskt tillgängliga kontrakt: “Include the archive whenever it can be packaged locally; omit it only when local packaging cannot complete and remote build fallback is required.” Samma Sites-källgren hade först pushats och återlästs till verifierad source `4cde45d4`/main `9cbc` med 345 byteidentiska spårade filer. Ingen tredjepartspackare eller genererad helper användes.

[Sites-instruktionen](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) anger normalt sourcehelper och “source-only versions still need their matching archive”. Den generella formuleringen och det specifika native reservvillkoret är en dokumenterad skillnad mellan instruktionerna. Reservvägen gav lyckad publicering (`succeeded`); den återställer inte det saknade lokala pluginpaketet och tillåter inte godtyckligt utelämnande av fungerande lokal paketering.

Tidigare verifierade designprinciper från Saleshub AI, Lime, Salesforce och W3C ändrades inte och ingen ny produktdesignresearch görs anspråk på. Lyckad publicering, källa och driftpolicy redovisas separat i [VALIDATION](../VALIDATION.md); verklig personalinloggning/pilot, full hostad återställning och faktiska anslutningar återstår.

## Historik före publiceringsåterhämtningen 2026-10-09

# Källor och tillämpade principer – egna produktionshinder i Min dag, crm72-kod

Sju officiella URL:er omkontrollerades med faktisk returnerad artikeltext 2026-10-09 03:23:54–03:24:04 UTC. Åtta små exakta citat verifierades mot sparad verktygstext. Researchkvitto SHA-256 `dee21b274edf3a978e0d795050eb5dc71953e530ee046c975b6626dc5a16cde0`. Verktyget rapporterade inga HTTP-statusar eller kompletta HTML-svar; hasharna binder de faktiskt returnerade verktygstexterna och citaten.

| Officiell källa och kortcitat | Belagd princip och Magnussons tillämpning |
| --- | --- |
| [Saleshub AI Funktioner](https://saleshubai.se/funktioner): “Kundkort med kontakter, filer, mail, samtal och nästa aktivitet” | Kund/jobbsammanhang och nästa handling hör ihop. Den personliga hinderkön visar befintligt jobb, kundreferens och en konkret öppningsväg; offentlig funktionsbeskrivning är inget integrations-/API-bevis. |
| [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): “Use verbs in imperative mood” | Få relevanta handlingar med begripliga verb. **Öppna jobbet** går till det befintliga jobbets arbetsvy; inga nya administrativa handlingar eller statusändringar följer av listan. |
| [Salesforce Activities](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1): “know which task is the highest priority right now” | Personligt öppet arbete behöver vara synligt tillsammans med sitt sammanhang. Salesforces egna antal, aktivitetsmodell och prioritering fastställer inte Magnussons hindervillkor eller köordning. |
| [Salesforce Record-Level Security](https://trailhead.salesforce.com/content/learn/modules/data_security/data_security_records): “Record access determines which individual records users can view and edit” | Personligt urval och postbehörighet är skilda saker. Listan använder redan tillåtet CRM-underlag och ger ingen ny rätt, kontoåtkomst eller privat insyn. |
| [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): “reflow when narrowed to a width equivalent to 320 CSS pixels.” | Långa kund-/jobbnamn, ansvar och status ska kunna radbrytas i smal vy utan dold information. Lokala viewportprov är inte genomförd 400-procents browserzoom eller full WCAG-granskning. |
| [W3C Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html): “up to 200 percent without loss of content or functionality.” | Prova full läsbar text och nåbara handlingar vid exakt dubblerad beräknad CSS-text. Faktiska layout-/tangentbordsprov redovisas separat; dokumentation innebär ingen certifiering. |
| [W3C Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html): “Ensure when an item gets keyboard focus, it is at least partially visible.” | En fokuserad öppningsknapp måste vara synlig. Full kontrollbox och projektets 44-px-mål är egna starkare lokala designkrav, inte generella AA-minimigränser. |

Magnussons egna läsurval använder befintlig exakt användar-/medlemskoppling för aktuell hinderansvarig och befintliga öppna hinder på inskickat, tryckt eller skickat jobb. Eget hinder kan visas även utan säljarprofil och när orderns kommersiella ansvar tillhör någon annan. Rapportör, jobbansvar, kommersiellt ansvar och aktuell hinderansvarig behåller sina skilda betydelser. Personligt/teamresultat, orderns befintliga hinderöversikt och privata användar-/arbetsyteutkast flyttas inte genom detta läsflöde. Direkt jobböppning, köordning, datumetiketter och kvarvarande serverroller/CAS/idempotens är Magnussons egna kontrakt; ingen lagrings-, server- eller godkännanderegel ska ändras av denna presentation.

Detta är offentlig designresearch, ingen autentiserad leverantörsvy, fungerande anslutning, riktig personal-/kundacceptans, skärmläsar-/telefonkontroll eller full WCAG-bedömning. Försäljning mot månads-/årsmål, marginal och nya prospects består som huvudmått. Refererad Codex-task är oläst. Faktisk slutkod, tester, main och publicerad Site redovisas separat i [VALIDATION](../VALIDATION.md).

Slutlig tillämpning är verifierad på källkod `85ead27eae96f5a9343ee52e8b932955dcecdc24`: 14 native browserfall och två extra historikprov passerade. 320/390/1280 CSS-px normal/text 2× samt faktisk wheel/Tab visade hela texter och nåbar nästa handling. Det befintliga jobbets mobilradbrytning och synliga tangentbordsretur rättades efter observerade äldre fel. GitHub-main innehåller förbättringen via PR118; live är fortsatt v68 och separat verifierad publicering återstår.

## Historik före crm72-koden

# Källor och tillämpade principer – granskat hinderansvar, crm71-kod

Sju exakta kortcitat verifierades 2026-10-09T00:21:48.549004Z mot faktiskt returnerad offentlig officiell verktygstext. Researchkvitto SHA-256 `3261aed016c40c37206ed939b7a29fa03cf4001a25f6a2308569be08801e71cb`. Inga kompletta HTML/HTTP-statusar, autentiserade leverantörsvyer eller fungerande integrationer påstås.

| Officiell källa och kortcitat | Belagd princip och Magnussons tillämpning |
| --- | --- |
| [Saleshub AI Funktioner](https://saleshubai.se/funktioner): “Projektboard med uppgifter, flera ansvariga och statusrader” | Arbetsmoment, ansvarig och status hör samman. Aktuell hinderansvarig, rapportör och jobbstatus görs begripliga i samma kund-/jobbsammanhang; offentlig funktionsbeskrivning är inget tekniskt API-/synkbevis. |
| [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): “Use verbs in imperative mood” | Konkreta handlingar och relevans för posten: **Byt hinderansvar**, **Spara nytt hinderansvar**, **Hämta aktuellt underlag** och **Läs in nytt granskningsunderlag** skiljer val, skrivning och granskning. |
| [Salesforce Record-Level Security](https://trailhead.salesforce.com/content/learn/modules/data_security/data_security_records): “Record access determines which individual records users can view and edit” | Läsa en post, redigera den och lämna över ansvar följer serverrättigheter; inventeringen skapar ingen behörighet. |
| [Salesforce Transfer Records](https://help.salesforce.com/s/articleView?id=sf.data_about_transfer.htm&language=en_US&type=5): “The new owner has at least the Read permission on the object.” | Den faktiskt lästa artikeln beskriver särskilda villkor för utförare och mottagare. Magnussons mottagare behöver aktiv anslutning och befintlig rätt att hantera hinder; ansvarsbyte ger ingen ny inloggning eller privat insyn. |
| [W3C Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html): “Let assistive technology notify users about status changes that don't take focus.” | Spar-/fel-/laddningsbesked behöver begriplig programbestämbar status utan obeställd fokusflytt; faktisk skärmläsaruppläsning kräver eget prov. |
| [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): “Make lines of text reflow within the viewport.” | Långa namn, hindertexter och granskningsbesked radbryts i smal vy. CSS-text2× och lokalt mobilprov är begränsade belägg, ingen allmän WCAG-garanti. |
| [W3C Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): “When a dialog opens, focus moves to an element inside the dialog.” | Dialogens tangentbords-/fokusväg behöver verklig browserkontroll, inklusive hämtning/adoption, fel, stängningsval och logisk återgång. |

Exakta konto-ID:n, separationen rapportör/aktuell ansvarig, schema/kedjekontroll, CAS/request-ID, SQL-spärr och uttrycklig adoption är Magnussons egna kontrakt. Leverantörsprinciperna fastställer inte affärsregler, kundacceptans, personalkonton eller en integration. Nya ansvarstexters gränser, högst 4 000 UTF-16-kodenheter och 4 000 UTF-8-byte utan NUL, samt datetime `at` med högst 4 000 kodenheter, är också Magnussons egna kontrakt. Äldre originalrapportörstext har oförändrat format. Ett nytt datafält behöver faktisk läsar-/skrivar-/backupkompatibilitet; offentlig designresearch ersätter inte dessa prov.

Första gissade Lime-URL:n gav verktygsfel och är inte källa. Interna referens-ID-avvikelser följdes av öppning av de fullständiga canonical URL:erna och exakt citatjämförelse. Salesforce Transfer Records gav i denna körning faktisk artikeltext; tidigare klientskal utgör ingen källa till dessa nya artikelpåståenden.

Kod-/browser-/kompatibilitetsresultat: PASS på ren och byteoförändrad slutkandidat: regression 75,22 s, TypeScript utan incremental 11,54 s, bygge 9,89 s, native Worker/D1/R2 205,12 s och diffkontroll 0 s; alla fem exit 0, PASS 18/18 på samma frysta slutkod: 13 native fall och fem separat märkta transportfall (tre mock409, en mock503, en faktisk native200 med tappad klientkvittens). Alla sex layouter vid 320/390/1280 px med normal/exakt dubblerad CSS-text, 54 verkliga skärmbilder och 28 journalförda browser/APIRequest-POST. Tre ingångar, aktuell ansvarigs redigering/lösning, personlig kö även på skickat främmande kommersiellt jobb, verklig HTTP409 mellan kompletta requests, rollavslag, dubbelklick och exakt återförsök passerade; ingen påtvingad directory-read-interleaving i browsern eller personalacceptans påstås. Kvitto `aad94f247250eef8790354c2739ef6850c907d19e1ad4cebce55aaf306580b96`, PASS: aktuell kandidat bevarar originalrapportör/tid, aktuell user-/member-koppling, löst och arkiverad audit, vanliga skrivningar med utelämnade äldre fält samt JSON och native NDJSON-återläsning. Alla sex SQL-migrationer är byteoförändrade. Oförändrad main020 tappade nya fält i 13 faktiska isolerade äldre skriv-/restoreoperationer; efter nya skrivningar krävs kompatibel läsare/skrivare. Kompatibel avser crm71-kodens formatstöd, oberoende av Sites versionsnummer. Full personalpilot, privata backuper, hostad återställning, chefsroll och riktiga integrationskonton kvarstår. Codex-referensen är oläst. Sites-helperhinder redovisas i [VALIDATION](../VALIDATION.md); inga alternativa hosting-, utskicks- eller schema-/promptändringar följer av denna research.

## SQL-gränser: officiell källa och observerad runtime

Cloudflares renderade D1-/Durable Objects-sidor och deras kontrollerade markdownrepresentationer gav faktiskt HTTP 403 (`error code: 1010`) vid den färska läsningen. Den officiella [Cloudflare-källfilen för D1 limits](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/d1/platform/limits.mdx) och [SQL-limits för Durable Objects](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/durable-objects/platform/limits.mdx) kunde däremot läsas via HTTPS med HTTP 200. De bevarade filbyten och tidsstämplarna är underlaget; detta är inte ett påstående om att den renderade sidan lästes.

| Faktiskt läst officiell tabell | D1 | SQLite-backed Durable Objects |
| --- | --- | --- |
| `Maximum SQL statement length` | `100,000 bytes (100 KB)` | `100 KB` |
| `Maximum bound parameters per query` | `100` | `100` |
| ``Maximum characters (bytes) in a `LIKE` or `GLOB` pattern`` | `50 bytes` | `50 bytes` |

De lästa gränstabellerna listar ingen gräns för uttrycksdjup. `maximum depth 100` är ett faktiskt observerat fel i byggd isolerad D1-runtime i checks-app-4, inte ett uppfunnet Cloudflare-citat. Den efterföljande native-probens `LIKE or GLOB pattern too complex` och den dokumenterade 50-bytegränsen ledde till att datetime-GLOB-mönstret kortades; UUID-kontrollen hade redan korta mönster. Den oberoende granskningens datumfall `2026-01-01T1-:2-Z` visade varför global borttagning av avskiljare följt av SQLite-CAST inte räckte som strikt validering. Rättningen kontrollerar exakta numeriska datum-/klockdelar, separat sekund-/bråkdelssyntax och befintliga kalendergränser. Balanserade uttryck och separata underfrågor behåller kontospärren i samma atomiska skrivning. De faktiskt körda riktade SQL-/native D1-proven och deras källbindning redovisas i [VALIDATION](../VALIDATION.md), separat från fulla slutkontroller.

[SQLite Limits](https://www.sqlite.org/limits.html) lästes som faktisk HTTP 200/HTML och anger generella standardvärden: “The current implementation has a default value of 1000.” i avsnittet om uttrycksdjup och “The default value of this limit is 50000.” i avsnittet om LIKE/GLOB. Båda gränserna kan sänkas vid körning. SQLite-standardvärdena ersätter därför inte D1:s dokumenterade eller observerade gränser.

Färskt researchkvitto SHA-256 `aaacd78cbc29dfccf7b03abf31964aec2fc9ff50c9720ca8518ca49f501aa1d4` binder de officiella källbyten, exakta tabellraderna, HTTP-resultaten och tidigare sju citatens oförändrade råbevis. Riktade D1-prober är isolerade syntetiska prov; de är inte full native HTTP-runtime, hostad databas, verkliga konton eller personalacceptans.

## Historik före crm71-koden

# Källor och tillämpade principer – kontokatalog i produktionsinventering, crm70-kod

Sju exakta kortcitat verifierades 2026-10-08 mot faktiskt returnerad offentlig officiell webverktygstext. Evidens SHA-256 `f1264ae5ef4aebbaf55fc0d9ea99105e091d0e1bb53e4d79baaf2d88bc1029fb`. Ingen komplett HTML/HTTP-status, autentiserad leverantörsvy eller ansluten integration påstås.

| Officiell källa | Belagd princip och Magnussons tillämpning |
| --- | --- |
| [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | Handlingsverb och relevant sammanhang: **Hämta aktuellt underlag** hjälper användaren tillbaka efter läskonflikt. Ingen automatisk ansvarsändring. |
| [Saleshub Funktioner](https://saleshubai.se/funktioner) | Uppgifter, ansvariga och statusrader hör till samma arbetsmoment. Aktuellt lästa konto-/jobbfakta gör urvalet begripligt; sidan är offentlig funktionsbeskrivning, inget tekniskt API-/synkbevis. |
| [Salesforce Record-Level Security](https://trailhead.salesforce.com/content/learn/modules/data_security/data_security_records) | Läsning och redigering har egna rättigheter. Förnyad adminautentisering föregår katalogsvaret; en inventering ger ingen ny behörighet eller kontoändring. |
| [W3C Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [ARIA19](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19.html) och [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22.html) | Programbestämbara fel/statusbesked utan obeställt fokusbyte. Befintligt alert-/statussammanhang och urval bevaras; faktisk skärmläsaruppläsning är inte prövad. |
| [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Radbrytbar smal vy. Lokal browserverifiering och CSS-textförstoring är begränsade prov, ingen allmän WCAG-garanti. |

Två kanoniska katalogläsningar, vilka fält som jämförs, 409-gränsen och serverprotokollet är Magnussons egna kontrakt. Källorna belägger varken en allmän databassnapshot, kontinuerlig aktualitet, ändringar efter sista kontrollen eller produktens verkliga personal-/kontoacceptans. Granskat hinderansvarsbyte, oklara identiteter/full personalöverlämning, chefsroll, privata backuper, faktisk personalpilot, full hostad återställning och riktiga integrationskonton kvarstår. Codex-referensen är oläst.

Sites-sourcehelperhinder och skillnad mellan kod/main/live redovisas i [VALIDATION](../VALIDATION.md). Ingen ny hostingväg, ny delning, kundutskick eller ändring av scheman/prompt/aktivering följer av denna research.

## Historik före crm70-koden

# Källor och tillämpade principer – inventeringsfix för v69-kod

Fem exakta kortcitat verifierades mot faktiskt returnerade officiella webverktygstexter 2026-10-08 22:20:36 UTC. Evidens SHA-256 `973ab1c0afc2c0e1d8b69a2073037f5c7fa8d202060b9cbf2a3286634e9b7002`; ingen komplett HTML/HTTP-status eller autentiserad leverantörsvy påstås.

| Officiell källa | Belagd princip och Magnussons tillämpning |
| --- | --- |
| [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | Konkreta verb och kontextrelevanta handlingar. **Öppna jobbet** öppnar direkt rätt detaljvy; historiskt jobb får ingen irrelevant ansvarsändring. |
| [Saleshub Funktioner](https://saleshubai.se/funktioner) | Uppgifter, ansvariga och statusrader i samma sammanhang. **Skickat · öppet hinder** gör två olika tillstånd begripliga tillsammans med kund-/jobbreferens. |
| [Salesforce Record-Level Security](https://trailhead.salesforce.com/content/learn/modules/data_security/data_security_records) | Postläsning och redigering har egna rättigheter. Läsande inventering ger ingen ny historisk arbetsfördelning eller behörighet. |
| [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) och [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22.html) | Radbrytbara kort i smal vy och begripliga statusmeddelanden. Befintlig resultaträkning/statusregion bevaras; slutbrowserbelägg finns i [VALIDATION](../VALIDATION.md). |

Magnussons konto-ID, läsbasis, kontoändringsspärr, roller och CAS/idempotens är egna kontrakt. Ingen integrations-, konto-, personal- eller full WCAG-acceptans följer av offentlig research. Granskat hinderansvarsbyte, övriga oklara identiteter/full personalöverlämning, chefsroll, privata backuper, faktisk personalpilot, full hostad återställning och riktiga integrationskonton kvarstår. Codex-referensen är oläst.

Sites-SKILL.md kräver sourcehelpern `site-workflow.mjs` för källöppning och packning; den är inte åtkomligt hittad. Två script-resourceförsök misslyckades. Filsökningen hade inga åtkomliga träffar men kunde inte läsa två systemkataloger. Troubleshooting ger ingen alternativ paketeringsväg; ingen helperkörning eller v69-publicering påstås.

## Historik före v69-koden

# Källor och tillämpade principer – v68

## Begriplig lösning av befintligt hinder på skickat jobb

Färsk officiell sidtext hämtades 2026-10-08 20:27 UTC. Sex exakta kortcitat och källhashar verifierades; evidens SHA-256 `9d115c531308488c447dfcd69a4a2f7eba2c7b300b5387cf03fa987d65dcbb11`. Tillämpningen är Magnussons egen avgränsning och ändrar inga leverantörskopplingar.

| Officiell källa och faktiskt läst citat | Tillämpning |
| --- | --- |
| [Salesforce Record-Level Security](https://trailhead.salesforce.com/content/learn/modules/data_security/data_security_records): “Record access determines which individual records users can view and edit in each object they have access to.” | Historikens synlighet innebär ingen ny generell redigeringsrätt. Behåll serverroller och rapportör/adminvillkor. |
| [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): `Use verbs in imperative form such as “Add” or “Upvote”`; `"Assign me" should only show if I'm not already assigned ans "Close ticket" shold only show if ticket is open.` (artikelns stavning). | **Lös kvarstående hinder** är konkret och visas i det relevanta sammanhanget: ett befintligt öppet hinder. Skickat jobb får endast lösningsvägen. |
| [Lime Change Log](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/changelog/): “what changed, who did it, and when, with the value both before and after each change.” (sidtextens radbrytningar normaliserade här). | Bevara registrerad rapportör/tid och sparad hindertext i befintlig lösningshistorik; registrera faktisk lösningsaktör/tid. Ingen Lime-retention kopieras. |
| [Saleshub funktioner](https://saleshubai.se/funktioner): “Kundkort med kontakter, filer, mail, samtal och nästa aktivitet”; “Projektboard med uppgifter, flera ansvariga och statusrader”. | Visa kund/jobbreferens, registrerat hinder och konkret nästa handling. Jobbets skickade status är skild från det öppna hindret. |

Salesforce Task Fields gav HTTP 200 med endast 62 tecken laddnings-/CSS-felskal; försökt Trailhead case-queues-adress gav 404. Dessa är inte artikelbevis och används inte. Lime users/groups och relation-picker återhämtades med riktig sidtext för den ursprungligt planerade handoverdelen men behövs inte för denna smalare tillämpning. Saleshub-sidan är en offentlig funktionsbeskrivning, ingen teknisk integrationsgaranti.

Ingen autentiserad leverantörsprodukt eller riktig personal-/kunddata provades i forskningen. Granskat hinderansvarsbyte, oklara identiteter, riktiga personalkonton/pilot, integrationsnycklar och full hostad återställning kvarstår. Codex-referensen är oläst; tillgängligt `read_thread` avser Slack.

För kod `1aa1e5df8b5fbce00d5a570ae935f2eac461edff` redovisar [VALIDATION](../VALIDATION.md) fem slutkontroller, CI 37840496296 med 13 steg och 36 nativefall/66 bilder. Isolerade browserprov innebär ingen personalacceptans, skärmläsar-/browserzoomkontroll eller full WCAG-bedömning. Lagringsformat och v66-golv består; försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten.

## Historik före v68

# Källor och tillämpade principer – v67

## Begriplig hinderredigering med bevarad originalrapportering

Sju officiella sidtexter hämtades 2026-10-08 och varje kortcitat kontrollerades mot sparad HTML/text. Evidens SHA-256 `663927b40b19672f419850a68a813b01bddf4b39791c30b2bd19d13d0b2fb658`.

| Källa | Verifierad princip och Magnussons tillämpning |
| --- | --- |
| [Salesforce Record-Level Security](https://trailhead.salesforce.com/content/learn/modules/data_security/data_security_records) | Poståtkomst styr vilka poster användaren får läsa/redigera. Redigeringsrätt hålls skild från registrerat hinderansvar; en administratörs textändring flyttar inget ansvar. |
| [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | Konkreta imperativverb i rätt sammanhang. Rapportera, ändra beskrivning och registrera lösningen får skilda instruktioner/handlingar. |
| [Lime Change Log](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/changelog/) | Vad som ändrades, vem och när är skilda uppgifter. Originalrapportör/tid bevaras; redigeraren registreras i Magnussons befintliga händelse. |
| [Saleshub funktioner](https://saleshubai.se/funktioner) | Uppgifter, ansvariga och statusrader i projektsammanhang. Hindret och originalrapporteringen visas vid kund-/jobbkontexten. |
| [W3C Labels](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) och [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Begripliga inmatningsinstruktioner, fokus i dialogen och läsbart innehåll vid smal viewport. Lokal granskning riktas mot de berörda formulären. |

Salesforce Help för Task Fields/Field History, SLDS modals och developer audit-fields returnerade bara klientskal. Deras artikeltext är inte färskt verifierad; en först försökt Trailhead custom-fields-URL gav 404 och används inte. Ingen autentiserad leverantörsprodukt provades. Leverantörernas identitets-, historik- och retentionregler kopieras inte. Magnussons roller, CAS, idempotens och kontospärr är egna kontrakt.

Hinderformulärens knappar har minimihöjd 44 CSS-pixlar som lokalt designmål enligt den avsedda utformningen. Ett uppmätt 38-pixlarsfall motiverade en avgränsad lokal rättning; det fastställer inget generellt WCAG-underkännande eller någon full tillgänglighetsacceptans.

Reflow-principen tillämpas även på jobbdetaljernas datum, knappar och varningar med öppet hinderformulär: mobilstapling och lokal radbrytning bevarar innehållet. Ett faktiskt Workspace-fynd vid CSS-text 200 procent styr denna avgränsning; ingen global font-/CSS-ändring eller dold information används som lösning.

Ett ytterligare faktiskt nativeprov på desktop visade ett delvis klippt fokuserat lösningsfält. Jobbdetaljernas två hindertextfält får lokal rullning vid fokus utan att fokus flyttas eller värden/sparregler ändras. Detta är en egen avgränsad produktanpassning, ingen leverantörskopiering eller full tillgänglighetsacceptans.

Full isolerad native Chromium/Worker-matris: 22 av 22 fall passerade. Tolv layoutfall omfattade Board och Workspace på 320×568, 390×844 och 1280×900 med normal respektive exakt CSS-text 200 procent. Alla 48 native tangentbordsfokuserade kontroller var fullt synliga; hinderformulärens inre knappar nådde det lokala målet 44 CSS-pixlar. Fyra textfält behöll caret, åäö och intern rullning utan horisontell klippning. Root granskade sex faktiska bilder och oberoende granskare fem; 36 bildhashar kontrollerades. CSS-textförstoring är inget prov av browserzoom, skärmläsare eller full WCAG; [VALIDATION](../VALIDATION.md) anger faktisk omfattning. Lokala prov innebär ingen full WCAG-bedömning, personalacceptans eller integration. Codex-referensen är oläst; dokumenterad brief/färsk main användes. Huvudmåtten är försäljning mot månads-/årsmål, marginal och nya prospects.

## Historik före v67

# Källor och tillämpade principer – v66

## Tydligt jobbansvar och intuitiv granskning

Färsk officiell dokumentation kontrollerades under crm66. [Salesforce Deactivate Users](https://help.salesforce.com/s/articleView?id=sf.how_to_deactivate_users.htm&language=en_US&type=5) skiljer inaktivt konto från bevarade poster. [Lime Users and groups](https://platform.docs.lime-crm.com/en/latest/configuration/users-and-groups/) stöder separata användar-/gruppidentiteter. Tillämpning: ett äldre namn fastställer ingen person; rättningen kräver uttryckligt valt aktivt anslutet CRM-konto och eget underlag, bevarar kommersiellt ansvar och hindrens egna identiteter och kringgår ingen kontoändringsspärr.

[Lime relation pickers](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/relation-pickers/) och [action design guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) ger principer för begripliga relationsval och konkreta handlingar. [Saleshub AI:s funktioner](https://saleshubai.se/funktioner) beskriver samlat arbetsunderlag och uppföljning. Tillämpning: **Rätta äldre jobbansvar**, tomt förvalt konto, synlig roll/Konto-ID vid lika namn, kund-/jobbkontext, äldre underlag skilt från aktuellt registrerat ansvar och granskning före registrering. Återinläst redan rättad post visar det verkliga aktuella kontot och hänvisar till vanlig ansvarsändring. Detta beskriver tillämpade produktprinciper, inga leverantörskopplingar eller utförd användaracceptans.

Officiell Cloudflare D1-dokumentation om [batch](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) och [result objects](https://developers.cloudflare.com/d1/worker-api/return-object/), samt [SQLite UPDATE](https://www.sqlite.org/lang_update.html), kontrollerades: SQL-fel i batch kan rulla tillbaka, men UPDATE med noll ändrade rader är inget SQL-fel. Tillämpning: befintlig gemensam CAS/write-token och guards behålls för alla framgångsskrivningar; ny rättning förblir atomisk och idempotent. SQLmigrations- och lagringsbytes är oförändrade.

[W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) och [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) användes vid dialoggranskningen. Faktiska native Chromium-prov täcker mobilbredder, text 2×, tangentbord, fokus och klickyta; 37 godkända native browserfall på exakt slutrevision, med 35 oförändrade originalbilder och separat manuell bildgranskning. Detta är inte en full WCAG-granskning eller ett skärmläsar-/fysiskt telefon-/personalprov.

Källinsamlingens kvitto SHA-256 `bc4a324ad44c01232165378815f2984f534f76161dfcf719bad3b8f9c0869c96`, tillämpade fynd `e51e44ab0b1e559a3359a5ac3d2279af6e09548cdb6a798d7eef393468419fec`. För verifierad datagräns hänvisas till [VALIDATION](../VALIDATION.md): v66-golv efter rättningshistorik, faktisk lokal full JSON/native NDJSON-restore; full hostad återgång återstår.

Codex-referensen `01a104c7-a5c5-7350-8577-a4f941138061` är oläst. Tillgänglig `read_thread` avser Slack, inte Codex; dokumenterad brief/färsk main användes. Veckokollen TB-import tillhör annat uppdrag och importerades inte i Magnussons. Försäljning mot månads-/årsmål, marginal och nya prospects förblir huvudmått.

## Historik före v66

# CRM-källor för Magnussons byggagent

## Officiella principer för konkret kontoändringsdiagnos – v65

Faktiska officiella sidtexter och fokuserade sök-/open-/find-svar lästes. Klockan efter webbläsningen var **2026-10-08 14:25:33 UTC**. Kvitto `/workspace/scratch/crm65/research/receipt.json`, SHA-256 `238fc7e0d580784afc5529cfe953da1e202ac7b1e2f46696e7d88bef0468dc68`, verifierar sju korta citat och URL:er mot sparade faktiskt returnerade verktygstexter.

| Källa | Belagd princip | Magnussons tillämpning och gräns |
| --- | --- | --- |
| [Saleshub Funktioner](https://saleshubai.se/funktioner) | Uppgifter, ansvariga och statusrader i samma projektsammanhang. | Ansvarsdel, status och jobbreferens visas tillsammans. Offentlig produktbeskrivning, inte ett verifierat identitetskontrakt. |
| [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | Få kontextrelevanta handlingar och imperativverb. | **Visa arbete som spärrar ändringen** och **Visa fler ansvarsdelar** har synliga svenska etiketter. |
| [Salesforce Task Fields](https://help.salesforce.com/s/articleView?id=sf.task_fields.htm&language=en_US&type=5) | Uppgiftens ägare skiljs från den relaterade posten. | Jobbansvar och hinderansvar hålls skilda från orderns kommersiella ansvar. |
| [Salesforce Deactivate Users](https://help.salesforce.com/s/articleView?id=sf.how_to_deactivate_users.htm&language=en_US&type=5) | Kontoavstängning och överföring av postansvar är separata tillstånd. | Diagnosen ändrar varken kontoåtkomst eller ansvar. Leverantörens policy kopieras inte. |
| [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Icke undantaget innehåll behöver flöda om vid motsvarande 320 CSS-pixlar. | Staplade rader och radbrutna ID:n/texter. Lokala viewportprov är ingen full WCAG-bedömning. |
| [W3C Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | Större tryckytor, med 44×44 CSS-pixlar som Enhanced/AAA-riktning. | Lokalt stora knappar och etiketttryckytor; inga fulla AA-/AAA-garantier. |
| [W3C ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22.html) | Status/resultat kan meddelas utan att fokus flyttas till meddelandet. | Lässtatus och resultaträkning använder begriplig text och statusregion; inget faktiskt skärmläsarprov påstås. |

Salesforce returnerade faktisk artikeltext tillsammans med CSS-feltext. Lime direktöppning gav verktygsrapporterad 429; ett officiellt indexresultat returnerade den relevanta saktext som faktiskt lästes. Webverktyget gav inga individuella anropstider eller fullständiga HTTP-svar; kvittot sparar den returnerade texten och påstår ingen komplett HTML-hämtning.

Magnussons exakta orsaksregler, serverroller, samtliga lagrade arbetsytor, granskningskontext, sidgränser och skydd mot sena svar är egna kontrakt. Inga autentiserade leverantörsvyer, fungerande integrationer, personalacceptans eller full WCAG-bedömning ingick i researchen. [VALIDATION](../VALIDATION.md) redovisar produktkandidatens faktiska prov. Codex-referensen är oläst.

## Historik före v65

# CRM-källor för Magnussons byggagent

## Officiella principer inför granskad kontoändring – v64

Faktiska officiella sidtexter och fokuserade utdrag lästes. Klockan efter webbläsningen var **2026-10-08 12:29:19 UTC**. Kvitto `/workspace/scratch/crm64/research/receipt.json`, SHA-256 `0fd33dabbd66a5c74b19170e42dea6cccd84c50cdd40db50c0ff045ecd998179`, verifierar sju korta citat mot verkligt returnerad text eller ny direkt hämtad Lime-HTML.

| Källa | Belagd princip | Magnussons tillämpning och gräns |
| --- | --- | --- |
| [Salesforce Deactivate Users](https://help.salesforce.com/s/articleView?id=sf.how_to_deactivate_users.htm&language=en_US&type=5) | Avstängning bevarar historik och flyttar inte ägda poster. | Separata besked för kontoåtkomst och ansvar; Salesforce-regler kopieras inte. |
| [Salesforce Considerations for Deactivating Users](https://help.salesforce.com/s/articleView?id=sf.users_deactivate_considerations.htm&language=en_US&type=5) | Historiska användare och filer kan finnas kvar. | Privat livscykel och filåtkomst kräver egna arbetsflöden och prov. |
| [Salesforce Changing a Record’s Owner](https://help.salesforce.com/s/articleView?id=sf.account_owner_transfer.htm&language=en_US&type=5) | Överföring beror på objekt och status; avslutade aktiviteter följer inte automatiskt. | Inaktivering och ansvarsöverföring förblir skilda handlingar hos Magnussons. |
| [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | ”Use verbs in imperative mood”; få relevanta framträdande handlingar. | Svenska granska-/läs-/spara-verb och separat, avgränsad granskning. |
| [Saleshub Funktioner](https://saleshubai.se/funktioner) | ”Projektboard med uppgifter, flera ansvariga och statusrader”. | Visa ansvar och status i samma arbetssammanhang; inget tekniskt inaktiveringskontrakt verifierat. |
| [Cloudflare D1 Database](https://developers.cloudflare.com/d1/worker-api/d1-database/) | Ett statement-fel i en batch avbryter eller återställer sekvensen. | Batch är tekniskt stöd, inte ett eget bevis på affärsregler eller CAS. |
| [SQLite UPDATE](https://www.sqlite.org/lang_update.html) | En villkorad UPDATE med noll matchande rader är inte ett SQL-fel. | Kontroll av ändrade rader och villkorade efterföljande skrivningar behöver egna prov. |

Salesforce artikeltext kom tillsammans med CSS-feltext. Lime weböppningar gav Internal Error/429; det officiella indexutdraget och en ny offentlig direkt HTML-hämtning gav relevant innehåll. Den hämtade HTML:n parsades med Python-standardbiblioteket efter att `bs4` saknades. Webverktyget gav inga HTTP-statusar eller individuella anropstider; någon specifik status för Lime-hämtningen sparades inte och påstås inte.

Stabila kontoidentiteter, vilka produktionsrättigheter som utlöser granskning, alla lagrade arbetsytor, svenska formulärtexter, samtidighetskontroll och hantering av osäker kvittens är Magnussons egna produkt-/serverkontrakt. Ingen autentiserad leverantörsvy, fungerande integration, SSO-/Sites-avveckling, personalacceptans eller full WCAG-bedömning ingick i researchen. Slutkandidatens egna prov redovisas i [VALIDATION](../VALIDATION.md). Codex-referensen är oläst.

## Historik före v64

# CRM-källor för Magnussons byggagent

## Officiella designprinciper för produktionsinventering – v63

Faktiska `search_service_web_run` sök-, open- och find-svar lästes. Klockan efter läsningen var 2026-10-08 10:31:27 UTC; enskilda webbanrop hade inga egna tidsstämplar. Scratchkvittot har SHA-256 `3dc045879e2d6aef155b287660406f9a39ff0e3476e246321ae2603d953ceef3` och bevarar faktiskt returnerad text, inte påstått komplett HTML eller HTTP-statusar.

| Officiell källa | Belagd princip | Magnussons tillämpning |
| --- | --- | --- |
| [Saleshub Funktioner](https://saleshubai.se/funktioner) | ”Projektboard med uppgifter, flera ansvariga och statusrader” | Jobb, ansvar och status i gemensamt sammanhang. |
| [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | ”Use verbs in imperative mood”; synliga etiketter stödjer direkt förståelse. | Svenska **Granska jobbansvar** och **Öppna jobbet**. |
| [Salesforce Task Fields](https://help.salesforce.com/s/articleView?id=sf.task_fields.htm&language=en_US&type=5) | Assigned To anger uppgiftens ägare; Related To anger relaterad post. | Separata jobb-, hinder- och kommersiella ansvar. |
| [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Icke undantaget innehåll ska flöda om vid motsvarande 320 CSS-pixlar. | Staplade kort och radbrutna namn, ID:n och knappar. |
| [W3C ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22.html) | Status och resultaträkning kan meddelas utan fokusflytt. | Begriplig lässtatus och antal tillsammans med tangentbordsflöde. |

Detta är offentlig inspiration och teknisk vägledning. Magnussons serverroller, identitetsupplösning, inaktuellt underlag och ansvarsflytt är egna kontrakt med egna prov. Ingen autentiserad leverantörsvy, fungerande integration, personalacceptans, full WCAG-bedömning eller världsranking har verifierats. Codex-referensen är oläst.

## Historik före v63

# CRM-källor för Magnussons byggagent

## Färska officiella källor för produktionsansvar – v62

Läst med faktiska `search_service_web_run` sök-, open-, click- och find-svar 2026-10-08 08:20:42 UTC. Exakt returnerad text sparades i scratch; kvittots SHA-256 är `6b1ee21a9f5cd545351cdbde3a8f4e32cac9e8ad686ef06d23501f07bc2d0db4`. Inga HTTP-statusar eller autentiserade leverantörsvyer har påståtts.

| Officiell källa | Kort faktiskt citat | Tillämpning hos Magnussons och gräns |
| --- | --- | --- |
| [Saleshub AI, Funktioner](https://saleshubai.se/funktioner) | “Projektboard med uppgifter, flera ansvariga och statusrader” | Ansvar visas vid jobbet. Produktbeskrivning, ingen provad kontobehörighet. |
| [Lime, Notifications – Assign](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/notifications/) | “Instead of mentioning someone in a note, you assign them directly in a designated field.” | Ett eget ansvarsfält. Magnussons ansvarsflytt skickar inga mejl eller notiser. |
| [Lime, Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | “Use verbs in imperative mood” | Konkreta svenska handlingar: tilldela, byt, granska och spara. |
| [Salesforce, Activities: Assignment Restrictions](https://help.salesforce.com/s/articleView?id=000385157&language=en_US&type=1) | “The Assigned To field designates a single owner for the activity.” | Jobbets och orderns ansvar skiljs åt. Faktisk artikeltext kom tillsammans med CSS-feltext; Salesforces regler är inte Magnussons policy. |
| [W3C, Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | “When a dialog closes, focus returns to the element that invoked the dialog” | Modal fokusordning och återgång. Vägledning, inget eget skärmläsarprov. |
| [W3C, Understanding Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | “reflow when narrowed to a width equivalent to 320 CSS pixels.” | En kolumn på små skärmar. Lokala viewport/CSS-prov är ingen full WCAG-bedömning. |
| [W3C, Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | “Make custom targets at least 44 by 44 pixels.” | Lokalt 44×44-mål för nya tryckytor. Enhanced är nivå AAA; ingen full AA-/AAA-garanti. |

Salesforces sida om Account Owner gav vid direkt öppning ingen faktisk artikeltext och räknas inte som öppnad sakartikel. Svenska texter, granskningskrav, konto-ID, rättigheter, audit och CAS/idempotens är Magnussons egna implementationer. Källorna bevisar inga fungerande integrationer eller garantier om produktens rangordning.

## Historik före v62

# CRM-källor för Magnussons byggagent

## Separat ansvar för aktivitet och förberedelser – offentlig research 2026-10-08

Fem officiella CRM-sidor lästes mellan 07:15:54 och 07:15:55 UTC och tre W3C-sidor 07:16:09 UTC. Webverktyget returnerade text och verifierbara kortcitat men ingen HTTP-status. Kvittot `fresh-official-source-evidence.json` har SHA-256 `04ba877848523f4f835734ea969d430c510071f094e8c0c4cf4c1c46c038934c`.

| Källa | Verifierat kortcitat | Användbar princip och gräns |
|---|---|---|
| [Saleshub AI – Funktioner](https://saleshubai.se/funktioner) | ”Projektboard med uppgifter, flera ansvariga och statusrader” | Synligt ansvar och status i sammanhängande arbete. Offentlig produktbeskrivning, inte bevis på exakt implementation eller kontoanslutning. |
| [Lime – Actions design guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | ”Use verbs in imperative mood” | Begripliga kontextrelevanta handlingar med svenska verb. Sällan använda adminhandlingar får lägre visuell tyngd. |
| [Lime – Notifications / Assign](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/notifications/) | ”you assign them directly in a designated field” | Ansvar ges i en särskild medarbetarkoppling. Att meddela någon betyder inte samma sak som att ge ansvar. Ingen avisering ansluts här. |
| [Salesforce – Task Fields](https://help.salesforce.com/s/articleView?id=sf.task_fields.htm&language=en_US&type=5) | ”Indicates the assigned owner of a task.” | Assigned To anger uppgiftens ansvar; Related To anger relaterad post. Sammanhanget behöver inte ha samma ansvar. |
| [Salesforce – Assign Tasks and Events](https://help.salesforce.com/s/articleView?id=Can-I-assign-tasks-or-events-to-other-users&language=en_US&type=1) | ”The Assigned To field designates a single owner for the activity.” | En aktivitet har eget ansvar och kan tilldelas aktiv användare. Sidans returnerade publiceringsdatum var Jun 14, 2026. Magnussons exakta rättigheter och UUID/CAS-regler är lokala val. |
| [W3C – Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | ”320 CSS pixels” | Icke undantaget formulärinnehåll ska kunna flöda om. Lokala 320-/CSS 2×-prov är inte full WCAG- eller verklig zoomgranskning. |
| [W3C – Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | ”44 by 44” | Enhanced/AAA-riktning med undantag. Lokalt 44×44-krav är inget bevis på full AA/AAA-efterlevnad. |
| [W3C – Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | ”When a dialog closes, focus returns to the element that invoked the dialog” | Dialogsekvens och meningsfull fokusåtergång. Extra dirty-/busy-/granskningsskydd är lokala produktregler. |

Den konkreta tillämpningen är två tydliga nivåer: aktivitetens eget ansvar och varje förberedelses eget ansvar. Parentdialogen anger vad som ligger kvar, visar fryst underlag och kräver tomt initialt mottagarval, orsak och explicit granskning. Stabila profil-ID:n, oföränderlig historik, serverroller, CAS, idempotens och hantering av äldre privata utkast är Magnussons implementationer och separata testkontrakt.

Oberoende browsergranskning läste nio av de 23 faktiska slutbilderna. Root läste dessutom tre slutbilder för smal normal vy, smal CSS 2×-text och bred separat aktivitets-/förberedelsevy. Tydliga svenska rubriker och handlingar, radbrutna knappar och synligt fokus kontrollerades. Rootbelägg: `root-visual.json`; full WCAG-, skärmläsar-, fysisk telefon- eller personalacceptans har inte provats.

Åtkomstgränser: ingen autentiserad leverantörsvy, riktig Magnussons-integration, personalacceptans, fysisk telefon, skärmläsare eller full WCAG-granskning. V60-bilder som användes vid förberedande designgranskning är inte v61-browserbevis. Codex-task 01a104c7-a5c5-7350-8577-a4f941138061 är oläst: tillgängliga verktyg saknade Codex read_thread. Den uttryckliga briefen och färska repo-underlaget användes.

## Historik före v61

# CRM-källor för Magnussons byggagent

## v60: individuellt förberedelseansvar och begriplig aktivitet

Fem officiella sidtexter lästes 2026-10-08, med fokuserad textkontroll 05:29:58–05:29:59 UTC. `/workspace/scratch/crm60/research/fresh-official-source-evidence.json`, SHA-256 `3f34d6d4f6d5b0408048866fe491e79d081ee7552964864314d167a1d0fea17f`, verifierar fem korta citat i faktiskt returnerad text; verktyget gav ingen separat HTTP-status.

[Salesforce Task Fields](https://help.salesforce.com/s/articleView?id=sf.task_fields.htm&language=en_US&type=5) och [Assign Tasks and Events](https://help.salesforce.com/s/articleView?id=Can-I-assign-tasks-or-events-to-other-users&language=en_US&type=1) skiljer aktivitetens ägare från relaterad post och beskriver enskilt ansvar. [Lime handlingsdesign](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) stödjer konkreta verb/kontextnära handlingar; [Lime Notifications](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/notifications/) skiljer direkt ansvarstilldelning från information/prenumeration. [Saleshub funktioner](https://saleshubai.se/funktioner) beskriver projektuppgifter med ansvar och status i gemensamt sammanhang.

Magnussons enskilda radhistorik, adminregel, stabila UUID:n, fryst granskning, CAS/idempotens och 44 px är lokala produktval som kräver egna prov. Källorna bevisar ingen notifiering, integration, leverantörsprestanda, WCAG eller personalacceptans. Codex-referensen är oläst; brief/repo används.

## Historik före v60

## v59: kontextnära ansvar och tydlig granskning

Sex officiella sidtexter lästes 2026-10-08 03:19:36 UTC; `/workspace/scratch/crm59/research/official-sources.json`, SHA-256 `0c528660567afaea6df00c03c93b69b224a361d57786e0c2c295812d035e9d7c`.

[Salesforce ägaröverföring](https://help.salesforce.com/s/articleView?id=xcloud.account_owner_transfer.htm&language=en_US&type=5) skiljer omfattning; [Lime handlingsdesign](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) konkreta verb; [Lime handlingsvillkor](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/custom-visibility-of-actions/) kontextvillkor; [Saleshub funktioner](https://saleshubai.se/funktioner) samlat kundunderlag. W3C:s felprevention/statusmeddelanden lästes också enligt kvittot.

Magnussons server-/ansvars-/leveransregler är lokala. Första misslyckade Lime-försöket räknas inte. Research bevisar ingen integration, personalacceptans eller WCAG. Codex-referensen är oläst; brief/repo används.

## Historik före v59

## v58: roll, laddning och privat livscykel

Sex officiella sidtexter lästes 2026-10-08 01:26:47 UTC; `/workspace/scratch/crm58/research/official-sources.json`, SHA-256 `8f6264bf6ed450f9b6a3bf2899c998d3cacbe3fcecca5355a91a053941e18889`.

[Salesforce startsidor](https://help.salesforce.com/s/articleView?id=xcloud.admin_home_lex_app_assign.htm&language=en_US&type=5) stödjer rollanpassning; [Lime synliga handlingar](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/custom-visibility-of-actions/) kontextvillkor; [Saleshub funktioner](https://saleshubai.se/funktioner) gemensamt kundsammanhang. [Salesforce Data Privacy](https://help.salesforce.com/s/articleView?id=sales.activity_capture_data_privacy.htm&language=en_US&type=5) skiljer personlig kommunikation/delning; [React useEffect](https://react.dev/reference/react/useEffect) städning/sena svar; [W3C statusmeddelanden](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) begriplig status utan fokusstöld.

Lokala beslut, inga anslutnings-/säkerhetsgarantier. Misslyckad Lime Actions/SLDS-läsning och obekräftad Saleshub-rollsnutt räknas inte. React ersätter inte serverkontroller; W3C innebär inget hjälpmedelsprov. [VALIDATION](../VALIDATION.md) anger bevis. Codex-referensen oläst; explicit brief/repo används.

## Historik före v58

## v57: aktivitetens ansvar är skilt från kundrelationen

Fem officiella sidor lästes direkt och deras relevanta innehåll verifierades 2026-10-07, kvitterat i `/workspace/scratch/crm57/research/official-sources.json` vid `2026-10-07T23:29:02Z`, SHA-256 `0b280e57b853ca3b30b313b7c17095bddf9350ab9e723036b0f4904922ec83cf`. Källorna ger principer för produkt/design; ingen autentiserad leverantörsprodukt, deras API/anslutning eller interaktiv skärmbild granskades. Verktygets direkta textläsning visar inget separat HTTP-200-kvitto.

| Officiell källa | Verifierad princip och lokal användning | Gräns |
| --- | --- | --- |
| [Salesforce: Task Fields](https://help.salesforce.com/s/articleView?id=sf.task_fields.htm&language=en_US&type=5) | Assigned To är skilt från Name/Related To. Dialogen visar uppgiftsansvar och kvarvarande kundrelationsansvar separat. | Fält-/versionsbeskrivningen är ingen Magnussons roll- eller överföringspolicy. |
| [Salesforce: Considerations for Using Tasks](https://help.salesforce.com/s/articleView?id=sales.task_considerations.htm&language=en_US&type=5) | Beskriver begränsningar i ansvar/uppgifter; den specifika köregeln illustrerar att relaterad post och uppgiftsansvar inte alltid flyttas tillsammans. | Ett första sidfel lästes om med verkligt innehåll. Salesforce-köregeln generaliseras inte till våra kundprofiler eller notifieringar. |
| [Lime: Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | Kontextnära verb och begränsat antal framträdande handlingar. Följ upp förblir vanlig handling, Byt uppgiftsansvar administrativ sidohandling. | Svenska knappar, granskning och sparregler är egna produktbeslut. |
| [Lime: Notifications](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/notifications/) | Assign gäller ansvar, Mention information och Follow prenumeration. Ansvarsbyte och meddelande hålls begripliga var för sig. | Ingen Limeanslutning, bakgrundsnotifiering, personal-/kundavisering eller prenumeration byggs här. |
| [Saleshub: Funktioner](https://saleshubai.se/funktioner) | Samlat kundkort, aktiviteter och ansvar stödjer granskning i samma arbetsflöde. | Marknadsbeskrivning, ingen verifiering av deras internlogik/API eller prestanda. |

`design-notes.md` i samma scratchkatalog skiljer dessa belagda principer från våra lokala val: svenska aktivitetstyper, två ansvarstexter, läsande aktuellt plan-/prospektunderlag, fullt profil-ID, fryst granskning, avgränsad scroll och avsedd 44-px-kontrollhöjd. Den faktiska sista browser-/bildgranskningen anges i [VALIDATION](../VALIDATION.md), inte som en garanti hämtad från leverantörerna. Serverroller, CAS/idempotens, stabila UUID:n och oförändrad historisk attribution följer Magnussons kontrakt.

V57:s minsta kompatibla läsare/skrivare är en slutsats från verklig äldre kod och det nya historikkontraktet, inte från någon leverantörs dokumentation. Inga kundkontaktdata, konton, marginalkostnader, kvalificeringar eller fungerande integrationer härleds från inspirationen. Codex-referensen är oläst eftersom relevant `read_thread` saknas; explicit brief/repo används.

## Historik före v57


## Granskad kundåteröppning – officiella källor för v56

Fem officiella källor lästes genom offentlig sökning, direkt URL-öppning och fokuserad textläsning. Samlat lästidskvitto: **2026-10-07T22:20:41Z**; ingen separat tidsstämpel för varje artikel påstås. Kvitto `/workspace/scratch/crm56/research/official-sources.json`, SHA256 `1db376fd9c3472e5f23129507a53b8b81ea2112d25e05e08d27d05471d9844a2`.

[Salesforce följder av ägarbyte](https://help.salesforce.com/s/articleView?id=sf.account_owner_transfer.htm&language=en_US&type=5) skiljer kontoägaren från olika följder för relaterade öppna och avslutade poster. Första xcloud-läsningen gav endast CSS Error; den länkade sf-URL:en gav artikeltext. [Salesforce Account History](https://help.salesforce.com/s/articleView?id=sf.account_history.htm&language=en_US&type=5) beskriver tid, ändring och aktör för fält med aktiverad spårning, med särskilda editions-/Classic-/behörighetsgränser. Vår atomiska kundåteröppning använder egna serverregler; automatiska Salesforce-överföringar av relaterade poster kopieras inte.

[Lime Variants](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/variants/) varnar för kortlayouter som ändras under redigering. [Lime Boolean Labels](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/readonly-boolean/) stödjer tydliga, kontextbundna textetiketter för det tillstånd som visas. Vår dialog behåller strukturen och skiljer kundrelation, resultatprofil och åtkomst; en aktiv profil bevisar ingen aktiv kundrelation eller kontoåtkomst.

[Saleshub AI Funktioner](https://saleshubai.se/funktioner) beskriver samlat kundkort, relaterat arbete och nästa aktivitet. Vi återanvänder därför samma kund-ID/kort och visar en tydligt användarplanerad ny uppföljning. Det är offentlig produktbeskrivning, ingen teknisk återöppningsspecifikation eller bekräftad Magnussonsanslutning.

Källorna fastställer inte Magnussons målstatus, kundacceptans, verkliga kontakt eller överföringspolicy. Inga interaktiva/autentiserade leverantörsgränssnitt, fysisk telefon, skärmläsare eller personalprov ingår i researchen. Svenska etiketter, 44 px, scroll, fokus och atomisk skrivning är lokala val. [VALIDATION](../VALIDATION.md) anger vår faktiska verifiering; `/workspace/scratch/crm56/research/design-notes.md` är separat läst designunderlag. Inga helsidehashar eller leverantörsprestanda påstås.

## Historik före v56


## Profilavslut – officiella källor för v55

Sju officiella källor lästes direkt och med fokuserade textöppningar. Klockobservationerna låg mellan **2026-10-07 21:23:00 och 21:23:56 UTC**; första sökningen/läsningen skedde före första observationen och individuella anropsstarter registrerades inte. Kvitto `/workspace/scratch/crm55/research/official-sources.json`, SHA256 `d114b2a5365308ee6094f71cc185bd6e1b7d9d96ccc9e5f23877e3bbef75afd0`.

[Salesforce Deactivate Users](https://help.salesforce.com/s/articleView?id=sf.how_to_deactivate_users.htm&language=en_US&type=5) och [Considerations for Deactivating Users](https://help.salesforce.com/s/articleView?id=sf.users_deactivate_considerations.htm&language=en_US&type=5) skiljer åtkomst från ägarskap och bevarad historik/filer. [Salesforce Admins artikel från 2015](https://admin.salesforce.com/blog/2015/users-may-come-go-records-must-live) visar samma skillnad mellan kontoavstängning, överföring och processansvar; aktuell Help-text ovan ger det aktuella stödet. Magnussons fullständiga avslutsregel bestäms av dess eget serverkontrakt, inte Salesforces regler.

[Lime Security FAQ](https://platform.docs.lime-crm.com/en/latest/configuration/sso-federation-security-faq/) och [User Provisioning](https://platform.docs.lime-crm.com/en/latest/configuration/scim_provisioning/) beskriver separata externa/CRM-identiteter och bevarade inaktiva användare vid konfigurerad provisioning. [Lime Boolean Labels](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/readonly-boolean/) stödjer tydliga textetiketter för vilket tillstånd som visas. Sidans första direktöppning gav Internal Error; senare direktöppningar gav artikeln. Vår tillämpning är separata besked för **Resultatprofil**, **CRM-konto** och **Sidåtkomst**, utan gissad kontoaktivitet eller namnkoppling till produktions-ID.

[Saleshub AI Funktioner](https://saleshubai.se/funktioner) beskriver samlat kund-/arbetsunderlag och nästa aktivitet. Profilens kvarvarande arbete hålls därför kopplat till befintliga kundkort och granskningsflöden. Källan är produktbeskrivning, inte en teknisk garanti för avveckling eller automatiska överföringar.

HTTP-status och helsidehashar fanns inte i läsverktygets svar. Inga autentiserade leverantörskonton, SSO-/SCIM-anslutningar eller externa åtkomständringar prövades. Svenska etiketter, 44 px, dialogrullning och fokus är våra lokala designval. Källorna fastställer inga Magnussonsanställningsregler, anslutningar, garantier eller världsranking. Läsunderlag: `/workspace/scratch/crm55/research/design-notes.md`; faktisk lokal verifiering anges separat i [VALIDATION](../VALIDATION.md).

## Historik före v55

## Admininventering – officiell källkontroll för v54, 2026-10-07

Efter sista webbuppföljningen lästes klockan **20:23:11 UTC**. [Saleshub AI Funktioner](https://saleshubai.se/funktioner) lästes direkt: gemensamt kundsammanhang och nästa aktivitet. [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) gav först 429 men därefter direkt fulltext och aktuella handlingsavsnitt: relevanta handlingar i rätt sammanhang, konkreta verb. Vår tillämpning är separat admininventering med tydliga **Granska**-handlingar till befintligt kund-/arbetsunderlag.

[Salesforce Changing a Record’s Owner](https://help.salesforce.com/s/articleView?id=sf.account_owner_transfer.htm&language=en_US&type=5) lästes direkt och skiljer överföring av öppet och avslutat arbete. [Salesforce List Views](https://trailhead.salesforce.com/content/learn/modules/lightning-experience-for-salesforce-classic-users/work-with-list-views) lästes direkt med aktuella filter-/radbrytningsavsnitt. V54 visar ansvarsdelar och tydligt urval; Magnussons egna serverroller, uttryckliga uppgiftsval, CAS, atomiska skrivningar och idempotens består. Salesforces automatiska överföringsregler kopieras inte.

[W3C Modal APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) lästes direkt och stödjer logisk fokusåtergång när öppnaren försvinner. Vårt val är inventeringsrubriken i samma identitet/vy. [Lime Notifications](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/notifications/) stöds endast av färskt officiellt indexutdrag efter direktöppning med 429; ingen lyckad ny fulltextläsning påstås. Individuellt ansvar är där en egen relation, vilket inspirerar vår tydliga skillnad mellan säljprofil, eventets namnansvar och produktionens användar-ID.

Sex källor, varav fem direktlästa och en enbart officiellt indexutdrag. Kvitto `/workspace/scratch/crm54/research/official-sources.json`, SHA256 `6673e7c12dfac9582b7c408034866d83d851ca463dcdc20b05c701f662d1b209`. Korta exakta utdrag har egna hashar; det är inga helsidehashar. Lyckade läsningar rapporterade ingen HTTP-status, och individuella anropsstarter registrerades inte. Minst 44 px, kortlayout, två rader i väljaren och vår fokusalgoritm är lokala designval. Källorna verifierar inga Magnussonsanslutningar, lagringsgarantier, personalresultat, certifiering eller världsranking. [VALIDATION](../VALIDATION.md) anger våra faktiska prov.

## Historik före v54

## Årshjulsansvar – källkontroll för v53, 2026-10-07

Efter sista officiella webböppningen lästes klockan **18:26:03 UTC**. [Saleshub AI Funktioner](https://saleshubai.se/funktioner) lästes direkt och beskriver gemensamt kund-/modulsammanhang och projektuppgifter med ansvar; det är offentlig produktbeskrivning utan överförings-/behörighetskontrakt. [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) lästes direkt initialt och stödjer relevanta handlingar, konkreta verb och fullständiga namn; efterföljande öppningar gav 429. [Lime Notifications](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/notifications/) stöder skillnaden mellan information och ansvar endast genom färskt officiellt indexutdrag i denna körning; första direktöppningen gav metadata och senare 429. Ingen lyckad ny fulltextläsning eller extern notisleverans påstås för den sidan.

[Salesforce Changing a Record’s Owner](https://help.salesforce.com/s/articleView?id=sf.account_owner_transfer.htm&language=en_US&type=5) gav direkt läst objekttabell om olika överföring för öppet/avslutat arbete. [updateRecord](https://developer.salesforce.com/docs/platform/lwc/guide/reference-update-record.html) lästes direkt och beskriver konfliktkontroll med `ifUnmodifiedSince`. Magnussons uttryckliga uppgiftsval, tvåvägshistorik, frysta underlag, SQL-CAS och replay är egna kontrakt; leverantörens automatregler eller rättigheter kopieras inte.

[W3C Modal APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) lästes direkt och stödjer aktiv fokusgräns, stängning och logisk återgång. [W3C Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) lästes direkt och stödjer status utan onödigt fokusbyte, relevant för separat B07-laddningsarbete. [SLDS Builder](https://www.lightningdesignsystem.com/2e1ef8501/v/61481/p/204931-builder/b/168ca5) gav officiellt indexerat avsnitt om pågående handling/status, medan direktöppningen gav noll textrader. Ingen lyckad Builder-fulltextläsning eller global laddningsfix påstås.

Kvitto `/workspace/scratch/crm53/research/official-sources.json`, SHA256 `24b49e5dfca7a7225f30830f0e299e13ee454dcfb62671892556b7dea738d8a6`. Hashar avser korta exakta utdrag, inte hela sidor. Lyckade öppningar rapporterade ingen HTTP-status; individuella exakta anropsstarter registrerades inte. Minst 44 px, full profilidentitet intill tvåradig kontroll och vår fokusalgoritm är lokala designval. Källorna verifierar inga Magnussonsanslutningar, privata lagringsgarantier, personalresultat eller världsranking. [VALIDATION](../VALIDATION.md) anger våra faktiska prov.

### Historik: v52 – Kundärendeansvar – källkontroll för v52, 2026-10-07

Officiella sidor lästes 16:29:55 UTC. [Saleshub AI Funktioner](https://saleshubai.se/funktioner) beskriver gemensamma moduldata och ”Projektboard med uppgifter, flera ansvariga och statusrader”; detta är offentlig produktbeskrivning utan dokumenterat överförings-/behörighetskontrakt. [Lime Notifications](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/notifications/) beskriver individuella ansvarsfält för To-do, Deal och Ticket; följande/omnämnande tilldelar inte ansvar. [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) stödjer synliga kontextuella handlingsverb och fullständiga tillgängliga namn.

[Salesforce Changing a Record’s Owner](https://help.salesforce.com/s/articleView?id=sf.account_owner_transfer.htm&language=en_US&type=5) dokumenterar att den utgående ägarens öppna aktiviteter överförs automatiskt, medan avslutade aktiviteter ligger kvar; andra användares möjligheter har separata val. [Assigning Tasks and Events](https://help.salesforce.com/s/articleView?id=000385157&language=en_US&type=1) beskriver aktivitetens eget Assigned To-ansvar. Magnussons väljer uttryckligt valda tillåtna ärendeuppgifter och egna serverrättigheter; Salesforce-reglerna kopieras inte.

[W3C Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) stödjer logisk fokusstart, begränsat Tab-fokus, synlig stängning och återgång till öppnare eller logisk fortsättningsplats. [WCAG H102](https://www.w3.org/WAI/WCAG22/Techniques/html/H102) är en tillräcklig teknik för native modal dialog, inget krav på just den implementationen. Våra 44 px, två rader med full identitet intill och rullbara textfält är lokala designval, ingen WCAG-certifiering.

Kvitto `/workspace/scratch/crm52/research/official-sources.json`, SHA256 `7579e8b0493eff7a063024b6b91c78cdd40b6be6bf8a7b2065b6da2674afec2f`. Kvittot skiljer två rapporterade ordagranna utdrag från sammanfattade principer; webverktygets HTTP-status och fulltext-hashar är inte tillgängliga. Salesforce `sf`-varianten gav den lästa tabellen; `xcloud`-varianten gav endast laddningsskal. Källorna verifierar inga Magnussonsanslutningar, privata lagringsgarantier eller personalresultat. [VALIDATION](../VALIDATION.md) anger våra faktiska prov.

### Historik: v51 – Onboardingansvar – källkontroll för v51, 2026-10-07

Officiella sidtexter lästes 14:41:48 UTC; webverktyget rapporterade inte HTTP-status. [Saleshub AI](https://saleshubai.se/funktioner) beskriver gemensamt kundsammanhang och nästa aktivitet. [Lime Actions](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) stödjer relevanta posthandlingar med imperativa verb. [Salesforce Transfer Records](https://help.salesforce.com/s/articleView?id=sf.data_about_transfer.htm&language=en_US&type=5) beskriver uttrycklig objektspecifik ägaröverföring och dess behörighetskrav. Magnussons egna serverregler, valda uppgifter och frysta granskningsbasis är vår implementation; leverantörernas rättigheter kopieras inte.

[W3C Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) och [Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) stödjer logisk fokusstart, användbar smal vy och förstorad text. 44 px är vårt starkare lokala mål; AA anger 24 px med undantag. Tvåraders vald profil med full identitet intill och begränsat rullbart textfält är egna lösningar på faktiskt uppmätta mobilproblem.

Kvitto `/workspace/scratch/crm51/design/onboarding-official-sources.json`, SHA256 `b0347ee0c9578f5338f74776075edd331b45faa312a1400b42c586705a0a1422`. Källorna verifierar inga Magnussonsanslutningar, personalresultat, full WCAG eller världsranking. [VALIDATION](../VALIDATION.md) anger faktisk kod, releasebevis och provgränser.

## Kundval på korta skärmar – källkontroll för v50

Åtta officiella sidor lästes 2026-10-07 13:27:48 UTC utan rapporterad HTTP-status. [Saleshub](https://saleshubai.se/funktioner) stöder kundsammanhang, [Lime](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) synliga handlingsverb och [Salesforce](https://trailhead.salesforce.com/content/learn/modules/lightning-experience-for-salesforce-classic-users/work-with-list-views) radbrytning/listfilter. W3C:s reflow/fokus/målstorlek, APG och Radix Dialog finns med officiella URL:er i kvittot. 44 px och hel knappbox är våra starkare lokala mål. Dependencyversioner lästes från låsfil, inte installerad runtime. Kvitto `/workspace/scratch/crm50/audit/official-sources.json`, SHA256 `d695590ae14d0bb266859c775a9d8a42622be72847a9863775f025cecc4ad740`. Källorna verifierar inga Magnussonsanslutningar eller personalresultat; vår implementation och provgräns finns i [VALIDATION](../VALIDATION.md).

## Arbetsytefokus – källkontroll för v49, 2026-10-07

Officiella källor lästes 11:23:46 UTC; React följdes upp 11:41:52. Webbverktyget ger ingen HTTP-status. [Radix Select](https://www.radix-ui.com/primitives/docs/components/select) anger onCloseAutoFocus/Esc-retur; installerad Select 2.3.7/FocusScope 1.1.16 granskades separat från sidans Select 2.3.8. [W3C Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) stöder logisk reservplats och aktiv modals fokusgräns; arbetsyteväljaren kallas inte modal. [Salesforce Global Focus](https://www.lightningdesignsystem.com/2e1ef8501/p/92a50f-global-focus) nåddes via officiellt sökindex, direct open gav 0 textrader. [React useEffect](https://react.dev/reference/react/useEffect) beskriver nätverkssvar i annan ordning än de skickats. [Saleshub AI](https://saleshubai.se/funktioner) och [Lime Activities](https://platform.docs.lime-crm.com/en/v2.936.11/configuration/webclient/activities/) stöder kund-/aktivitetssammanhang, inte vår fokusalgoritm. Övriga fem källor lästes direkt. W3C:s [Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) och [Focus Not Obscured Minimum](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) lästes 12:07:16 UTC, utan rapporterad HTTP-status. Auto-höjd/radbrytning är vår tillämpning. Hela yttre fokusramen inom viewport är ett starkare lokalt krav än SC 2.4.11:s minimum, ingen WCAG-certifiering. Komplementkvitto `/workspace/scratch/crm49/audit/official-sources-css-release.json`, SHA256 `54b09023ac98349de28797410b186b4a67cdbbb90099118f74eefefa6ed7845f`. Kvitto `/workspace/scratch/crm49/audit/research-release.json`, SHA256 `0488094e9e0d2de9c772e7136a1048c035491d42ce0d7a797dc8a78a417035e5`.

Fokusavsikt/sammanhangsskydd är vår tillämpning. Källorna verifierar inga konton/integrationer, personalresultat eller full WCAG. [VALIDATION](../VALIDATION.md) anger faktiska prov/gränser.

## Kundkortets fokusåtergång – källkontroll för v48, 2026-10-07

Officiella källor kontrollerades 2026-10-07 09:25:25 UTC via webverktyget, som inte rapporterade HTTP-status. [W3C Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) säger ”When a dialog closes, focus returns to the element that invoked the dialog”, med logisk reservplats när öppnaren saknas. [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) dokumenterar `onCloseAutoFocus`. [Salesforce Global Focus](https://www.lightningdesignsystem.com/2e1ef8501/p/92a50f-global-focus) stöder återgång till öppnaren via officiellt sökindex; direct open gav 0 textrader. [Saleshub AI](https://saleshubai.se/funktioner) beskriver ”Kundkort med kontakter, filer, mail, samtal och nästa aktivitet”. [Lime Activities](https://platform.docs.lime-crm.com/en/v2.936.11/configuration/webclient/activities/) beskriver postkopplad aktivitetstidslinje. Övriga fyra sidor lästes direkt. Installerade Radix-versioner kontrollerades separat. Kvitto `/workspace/scratch/crm48/audit/official-sources.json`, SHA256 `69574e507fd3dddfe9914594e9a6fccb4995b31c6697683a7be1a9d497cdd35b`.

Principerna stöder rätt kundsammanhang och logisk fokusåtergång. Identitets-/vyskydd, reservrubrik och stängningsspärrar är vår egen implementation med prov i VALIDATION. Arbetsytebytets fokuslucka kvarstår. Källorna verifierar inga verkliga anslutningar, personalresultat eller full WCAG-efterlevnad.

## Responsivt kundregister – källkontroll för v47, 2026-10-07

Fem officiella källor lästes 08:18:07–08:18:08 UTC genom den ärvda proxyn med bevarad TLS-/CA-kontroll; samtliga gav HTTP 200. Tio korta utdrag har verifierade HTML-/texthashar och exakta tecken-, UTF-8-byte- och radpositioner. Dokumentationsagenten jämförde sparade original och samtliga utdrag. Kvitto `/workspace/scratch/crm47/research/receipt.json`, SHA256 `b7bf2a08d9a15607742d8ec62fbb96f5664b7f2f7499cd1bf7b06ea02ea54a0f`; sammanställning `/workspace/scratch/crm47/research/findings.md`, SHA256 `c0cc8a60de6058b5ee5937c3159f36c4a165fd17e3084811a6984d05c77df84e`.

| Källa | Verifierad princip | Magnussons tillämpning och gräns |
| --- | --- | --- |
| [Salesforce – Work with List Views](https://trailhead.salesforce.com/content/learn/modules/lightning-experience-for-salesforce-classic-users/work-with-list-views) | Listfält kan radbrytas; aktivitetsvarningar har faktiskt underlag. | Full kundtext och verklig öppet-arbete-information med bevarat urval. Salesforces exempel med 30 dagar är ingen beslutad Magnussonsregel. |
| [Lime – Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) | Handlingsverb, tydligt sammanhang samt etikett/ikon förklarar vad som händer. | Synlig **Öppna kundkort** för samma kund-ID. Serverbehörighet och skrivkontrakt kräver våra egna prov. |
| [Saleshub AI – Funktioner](https://saleshubai.se/funktioner) | Kundkortets kontakter, filer, kommunikation och nästa aktivitet hänger ihop. | Kundregistret leder till befintligt kundkort; inga parallella kunddata eller automatiskt delade privata mejl. Produktbeskrivningen verifierar inga Magnussonsanslutningar. |
| [W3C – Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Information och funktion ska bevaras vid smal vy; normalt 320 CSS px för vertikalt innehåll, med tvådimensionella undantag. | Staplade självständiga kundrader med full text. Begränsade browsermått är ingen full WCAG-, zoom-, telefon- eller hjälpmedelsbedömning. |
| [W3C – Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | AA anger 24×24 CSS px med fem undantag och avståndsregler. | Minst 44 px höjd är vårt starkare användbarhetsmål för kundregistrets handlingar, inte en påstådd generell AA-gräns. |

Nästa öppna uppgift/planerade CRM-möte, uppgift före tidsatt möte samma dag, separat avstämning och strikt uttrycklig ansvarskoppling är våra egna läspresentationsval. Leverantörsdokumentationen validerar inte deras implementation, verklig datakvalitet, privat lagring, personalacceptans eller en garanti om världens bästa CRM. Källkod, lokala kontroller, main och live kvitteras i [VALIDATION](../VALIDATION.md).

Grundkällorna kontrollerades 2026-10-05; senare granskningar dateras i sina avsnitt. Källorna är officiella produktbeskrivningar eller dokumentation. De bevisar inte att Magnussons har dessa anslutningar, att leverantörernas drift har testats eller att ett visst arbetssätt ger en uppmätt tidsvinst. Kraven nedan är vår tillämpning för Magnussons.

Projektets OPERATIONS hänvisar sedan tidigare till svenska Saleshub AI. Vi använder den produkten som dokumenterad inspirationskälla. Den refererade Codex-tråden kunde inte läsas i denna session eftersom `read_thread` saknas; trådens innehåll har inte antagits.

## Arbetsyta, kundkort och nästa steg

| Leverantör | Vad källan beskriver | Tillämpning för Magnussons |
| --- | --- | --- |
| [Saleshub AI – funktioner](https://saleshubai.se/funktioner) | Kundkort, kontakter, filer, korrespondens och nästa aktivitet; pipeline samt offert/order/fakturaunderlag. | Ett kundkort genom hela relationen, stabila kopplingar och återanvändning av accepterade uppgifter. |
| [Salesforce – aktiviteter](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1) | Dagens uppgifter och möten, planerat/utfört arbete i tidslinjen och affärer utan planerad aktivitet. | Min dag visar nästa handling och varför den behövs. Öppna affärer utan nästa steg blir synliga. |
| [Lime – To-do](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/todo-features/) | Avsluta, senarelägg, återuppta, anteckna och skapa nästa uppgift med samma kopplingar. | Följ upp samlar anteckning, resultat, avslut och nästa steg i samma handling. Atomisk sparning och omförsöksskydd verifieras i vår egen kod. |

## Offert, order och roller

[Salesforce – flera offerter](https://trailhead.salesforce.com/content/learn/projects/manage-products-prices-quotes-orders/create-multiple-quotes) dokumenterar flera offerter per affär och en synkad offert åt gången. Magnussons behöver en uttryckligt accepterad version och ett bevarat underlag med pris, antal, villkor och korrektur. Att kopiera tidigare underlag till återköp kopierar inte ett kundgodkännande.

[Salesforce – användaråtkomst](https://trailhead.salesforce.com/content/learn/modules/lex_implementation_user_setup_mgmt/lex_implementation_user_setup_mgmt_configure_user_access-hoc) beskriver separata objekt-, fält- och postbehörigheter. Magnussons server ska ge produktionen arbetsunderlag utan ekonomi eller privata säljaruppgifter. En knapp som döljs i webbläsaren är inte en serverbehörighet.

Ingen av de granskade källorna verifierar våra särskilda tryck-/lagerfall: ändring 40→45, accepterad kortleverans 50→48, kassation, flera tryckmoment, flera leverantörer eller ändring efter produktionsstart. De kommer från Magnussons krav och kräver egna acceptansprov.

## Fortnox, kundvård och Outlook

[Lime – Fortnox](https://www.lime-technologies.com/sv/produkter/lime-crm/integrationer/fortnox/) beskriver bokförda fakturor och fakturarader samt jämförelser mellan perioder på företagskortet. För Magnussons blir utvecklad försäljning och senaste faktiska kontakt två separata signaler. En minskning ger en kontaktanledning att undersöka.

[Lime – teknisk ordermappning](https://lime-limepkg-erp-connector.readthedocs-hosted.com/en/latest/erpsystems/fortnox/howitworks/order/) anger kundnummer som integrationsnyckel och återföring av Fortnox ordernummer. Fakturaskapande är ett särskilt connectorval. Vår koppling behöver externa ID:n, synkstatus, felhantering och idempotenta omförsök. När fakturaunderlag får skapas avgörs av Magnussons leveransregler.

[Lime – mejl och kalender](https://www.lime-technologies.com/sv/produkter/lime-crm/funktioner/email-calendar-integration/) beskriver användarvald mejlsparning och Outlook-händelser som kan bli uppgifter. Funktioner för desktopklienten bevisar inte motsvarande webbflöde. För Magnussons ska relevanta meddelanden aktivt kopplas till kund/affär och privat korrespondens skyddas.

[Saleshub AI – integrationer](https://saleshubai.se/integrationer) beskriver Fortnox och Microsoft 365. Detta är leverantörens beskrivning; inga konton eller tekniska avvikelseprov hos leverantören har testats här.

## Hur agenten använder källorna

Först kontrollera vad vårt CRM redan gör. Bygg sedan det arbetsmoment som ger konkret nytta för Magnussons och verifiera beteendet. Lägg inte till leverantörernas alla moduler. Förnya berörda källor när en integration eller funktion faktiskt ska ändras, och skilj leverantörens egenskap från vårt krav, vår implementation och bekräftad drift.

## Återuppta privat kundarbete, B05a

Officiella källor öppnades och kontrollerades 2026-10-05 när kundplan, bearbetning och onboarding fick privata utkast. [Salesforce – pausade flöden](https://help.salesforce.com/s/articleView?id=platform.flow_pause.htm&language=en_US&type=5) beskriver koppling till en bestämd post och styrd åtkomst till återupptagning. [Salesforce – skärmflöden](https://help.salesforce.com/s/articleView?id=platform.automate_flow_build_screen_flows_configuring_screens.htm&language=en_US&type=5) rekommenderar identifierbara etiketter och tydliga instruktioner om var arbetet återupptas. Vår tillämpning binder utkast till kund, flöde, inloggad användare och arbetsyta, med återupptagning i Min dag och kundflödet.

[Lime – 2025.1](https://platform.docs.lime-crm.com/en/latest/on-premise/releases/2025.1/release-notes/) dokumenterar varningar när användaren lämnar Work Order-protokoll eller Resource Planner med osparade ändringar. Det belägger inte generell privat autosparning. [Saleshub AI – funktioner](https://saleshubai.se/funktioner) beskriver ett sammanhängande kundkort och nästa aktivitet, men inget utkast-/samtidighetskontrakt. Magnussons privata autosparning, revisionskonflikter och atomiska inlämning verifieras i vår egen kod och isolerade prov. Återupptagen text får inte registreras som en ny faktisk kundkontakt.

## Design för Magnussons kundarbete

Ludwig lyfte design som huvudkrav 2026-10-05. [Saleshub AI](https://saleshubai.se/) visar en offentlig pipeline-demo med tydlig hierarki för namn, värde och ansvar. Den är en marknadsföringsdemo, inte en provad inloggad produkt. [Saleshub – funktioner](https://saleshubai.se/funktioner) beskriver sammanhanget mellan kundkort, kontakt och nästa aktivitet. Vår tillämpning är grupperad information, tydlig nästa handling och konsekventa kort med Magnussons befintliga uttryck.

[Lime CRM – Split View](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/split-view/) visar och beskriver kunduppgifter tillsammans med en aktivitetstidslinje. Dokumentationsbilden skiljer innehåll, typ och datum visuellt. [Lime Go – historiknoteringar](https://www.lime-technologies.com/sv/produkter/lime-go/funktioner/historiknoteringar-och-dokumentlagring/) beskriver filtrerbar historik och kopplade dokument. Vårt kundkort behåller nästa steg, kontaktplan och order i kundens sammanhang och gör tidslinjen lättare att skanna. Interna anteckningar benämns separat från faktisk kundkontakt.

Källorna öppnades på nytt den 5 oktober. Lime Go:s illustrativa hjältebilder används inte som belägg för ett faktiskt produktgränssnitt. Layout, mobila tryckytor, tangentbordsfokus och visuella statusar provas i vår egen byggda app. [DESIGN.md](../DESIGN.md) samlar riktningen. Inget personalprov, uppmätt tidsvinst, färdig integration eller världsranking har antagits från leverantörernas marknadsföring.

## Global mobilnavigation och arbetsyteväljare

Officiella källor kontrollerades 2026-10-05 inför det dokumenterade 320 px-fyndet där bannern kan täcka arbetsyteväljarens tryckyta:

- [Salesforce – mobilnavigation](https://trailhead.salesforce.com/content/learn/modules/salesforce1_mobile_app/salesforce1_mobile_app_navigation) dokumenterar App Launcher för appbyte, synligt aktiv app och prioritering av fyra viktiga mobilvägar. Detta gäller Salesforce-appen. Vår tillämpning är ett tydligt aktivt sammanhang och lättåtkomliga dagliga vägar; antalet fyra är ingen regel för Magnussons.
- [Lime – design av handlingar](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) skiljer kontextuella handlingar från navigation och grupper av val, rekommenderar få relevanta handlingar och normalt ikon tillsammans med begriplig text. Vår arbetsyteväljare behåller sin etikett och befintliga funktion. Saleshubs funktionssida och Lime Split View ovan belägger sammanhängande kundarbete, ingen särskild global mobilmeny.
- [W3C – Reflow, WCAG 1.4.10 AA](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) kräver omflöde vid 320 CSS px utan förlorad information eller funktion och utan tvådimensionell scroll, med undantag för innehåll som behöver sådan layout. Vår tillämpning låter headern växa och namn radbrytas i stället för att överlappa bannern.
- [W3C – Focus Not Obscured, WCAG 2.4.11 AA](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) gäller tangentbordsfokus och förbjuder att komponenten helt döljs av eget innehåll. Ett fungerande tangentbordsprov bevisar inte fungerande pointerklick.
- [W3C – Target Size Minimum, WCAG 2.5.8 AA](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) anger normalt 24×24 CSS px med undantag och avståndsregel; överlapp mellan olika mål räknas inte som fri tryckyta. Projektets 44×44 px är ett starkare designmål motsvarande [Target Size Enhanced, AAA](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), ingen allmän AA-gräns.
- [W3C – Disclosure Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) visar vanlig navigationsknapp med öppet/stängt tillstånd, Tab, Enter/Space och Escape med återfört fokus. Exemplet är vägledning; det motiverar inte automatiskt nya roller för en befintlig kommandoväljare och bevisar inte mobil- eller hjälpmedelsstöd i vår app.

Den avgränsade layoutfixen och dess pointer-, tangentbords- och förstoringsprov är våra implementationsval. Diagnostiska prov, slutligt byggt prov och publicerad version redovisas separat; leverantörernas gränssnitt har inte provats med Magnussons konton.

## Företagsidentitet i första prospektförbättringen

[SCB – variabelbeskrivning för Företagsregistret](https://www.scb.se/vara-tjanster/bestall-data-och-statistik/foretagsregistret/variabelbeskrivning/) kontrollerades 2026-10-05. För juridiska personer är PeOrgNr prefixet `16` följt av det tioställiga organisationsnumret. Därför kan just dessa format få samma företagsnyckel. Godtyckliga tolvsiffriga nummer, momsnummer och arbetsställets CFAR-ID ska inte klippas till ett organisationsnummer. Utan säkert organisationsnummer krävs samma datakälla och dess företags-ID för säker återimport; namn/ort kan endast motivera att tvetydigt underlag behöver kompletteras.

## Granskad överföring av kundansvar

Följande officiella källor kontrollerades på nytt 2026-10-05 inför B01b1:

- [Salesforce – Mass Transfer Records](https://help.salesforce.com/s/articleView?id=platform.admin_transfer.htm&language=en_US&type=5) skiljer tidigare ägares öppna aktiviteter från andra ägares och avslutade affärer. Överföring av kundansvar behöver därför ett uttryckligt urval; all historik är inte samma sak som öppet arbete.
- [Salesforce – användaråtkomst](https://trailhead.salesforce.com/content/learn/modules/data_security/data_security_org) beskriver inaktivering som stopp för inloggning med bevarad användare och data för fortsatt hantering. För Magnussons ska en avgången persons historiska resultat finnas kvar.
- [Lime – Users and groups](https://platform.docs.lime-crm.com/en/latest/configuration/users-and-groups/) skiljer inloggningsanvändare från coworker och anger oföränderliga Object ID:n för referenser när namn ändras. [Relation pickers](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/relation-pickers/) visar uttryckligt urval av aktiva coworkers i ansvarsfält.
- [Lime – Notifications](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/notifications/) skiljer tilldelning från mention/follow och beskriver risken med för många tilldelningsnotiser. CRM-notis betyder inte automatiskt mejl eller mobil push.
- [Saleshub AI – funktioner](https://saleshubai.se/funktioner) beskriver kundkort, nästa aktivitet och projektansvar. Källan verifierar ingen särskild transfer-, CAS- eller historikpolicy.

Vår avgränsade tillämpning är administratörens granskade kundöverlämning till en stabil målprofil med valda öppna fristående aktiviteter, serverägd spårbarhet och sammanhållen skrivning. Affärer, order, möten och skyddade specialflöden har eget ansvar och flyttas inte genom detta första flöde. Historiska fakturor, kvalificeringar och mål bevaras. Full operativ ID-migrering och en komplett personalöverlämning kräver nästa del; inga leverantörskällor eller kodtester gör dessa delar färdiga.

## Slutprov: svensk kalenderdag för avsändning

Vid lokal körning efter svensk midnatt upptäcktes att `latestDispatch` använde UTC-delen av en tidsstämpel medan dagens gräns använder Europe/Stockholm. [MDN:s Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat), läst 5 oktober UTC, dokumenterar uttrycklig locale och timeZone; detta används för samma svenska kalenderdag. Direkta försändelsers uttryckliga date-only-datum ska behållas. Källan fastställer formatering, inte kundens mottagande eller Magnussons affärsdefinitioner.

Samma dokumenterade datumprincip återanvänds i nästa kandidat för kundgodkänd antalminskning och accept av ändringsförslag: inlämnings-/förslagstidpunkten jämförs som Europe/Stockholm-dag med kundens uttryckliga godkännandedatum. Gemensam datumhelper ändrar inte lagrade tidsstämplar, mängder eller godkännanden; ett ogiltigt icke-tomt underlag avvisas. Tekniska testresultat kvitteras separat.

## Återkallelse vid separata skrivvägar, 2026-10-06

Följande officiella källor öppnades och kontrollerades 6 oktober inför backupåterställning, filskrivning och privata utkast:

- [Cloudflare D1 – batch](https://developers.cloudflare.com/d1/worker-api/d1-database/) beskriver sekventiella SQL-transaktioner som rullas tillbaka vid SQL-fel. [D1:s returvärden](https://developers.cloudflare.com/d1/worker-api/return-object/) skiljer `success` från antalet ändrade rader, `meta.changes`. Vår tillämpning behöver därför uttryckliga medlems-/skrivvillkor för varje sidoeffekt; ett villkor som inte matchar får inte lämna efterföljande ovillkorliga skrivningar möjliga. SQL-gate, CAS och våra behörighetsregler kräver egna regressioner.
- [Cloudflare R2 – konsistens](https://developers.cloudflare.com/r2/reference/consistency/) och [Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) beskriver stark konsistens för direkt upload/read/list/delete. D1:s SQL-transaktion omfattar inte R2-operationerna i vår återställningsföljd. Nya objekt behöver egna nycklar, städning efter bekräftat avslag och bevarande när commitutfallet inte kan fastställas. Källan anger även cacheundantag vid cachad domän och eventual consistency för lagringsbehörigheter; detta ska inte blandas ihop med CRM:s medlemsvillkor i D1.
- [Salesforce – serverbehörighet](https://developer.salesforce.com/docs/platform/lwc/guide/apex-security.html) skiljer postdelning från objekt-/fältbehörigheter och rekommenderar uttryckliga säkerhetslägen över API-versioner. Salesforce beskriver olika standardläge före respektive från API 67; generell äldre text om system mode ska därför inte återanvändas utan versionskontroll. För Magnussons innebär principen kontroll på servern av både aktör, handling och tillåtet underlag, inte tillit till en dold knapp.
- [Lime – Object Access](https://platform.docs.lime-crm.com/en/latest/configuration/object-access/) skiljer typbehörighet från läs-/ändra-/radera-rätt per objekt. Kopplade dokument och historik kan kräva uttrycklig vidareföring av rättigheter när relation eller ansvar ändras. Det motiverar våra egna kund-/order-/fil- och privata användar-/arbetsytegränser; källan verifierar ingen återkallelserace eller transaktionsimplementation hos Magnussons.

Kandidatens avgränsning är separata backup-POST för JSON/NDJSON samt fil- och draftskrivning med aktuell serverbehörighet vid SQL-commit och före berörda läs-/replay-/konfliktsvar. Egna prov ska återkalla medlemskap mellan auth och skrivning, jämföra fullständigt före/efter-underlag och bevara filer vid förlorad eller okänd commitkvittens. Redan skickade bytes kan inte återkallas. Separat backup-GET/strömexport, Outlook, medlemsadministration och faktisk hosting ingår inte i denna granskning. Implementation, slutkontroller och publicering kvitteras separat; källorna bevisar ingen gemensam D1+R2-transaktion.

## Aktuell adminidentitet vid backup-GET och strömexport, 2026-10-06

Officiella källor kontrollerades 6 oktober inför den separata GET-export som v21 uttryckligen inte omfattade:

- [Cloudflare – Streams](https://developers.cloudflare.com/workers/runtime-apis/streams/) dokumenterar att status och headers kan skickas före strömkroppen. Återkallelse efter exportstart måste därför kunna ge avbruten kropp med redan skickad status 200; en senare 403-status kan inte lovas.
- [Cloudflare workerd – strömmar](https://github.com/cloudflare/workerd/blob/main/docs/streams.md) beskriver köer, pull och backpressure, men också att producenten kan köa data trots trycksignalen. [WHATWG Streams](https://streams.spec.whatwg.org/) anger att en väntande läsbegäran eller positiv önskad köstorlek utlöser pull. Vårt val `highWaterMark: 0` i en pull-driven JS-ström undviker förhandsköning utan läsbehov. Det stoppar inte alla runtime-/nätverksbuffertar och ersätter ingen behörighetskontroll.
- [Cloudflare R2 – Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) tillhandahåller filkroppen som `ReadableStream`; [DefaultReader](https://developers.cloudflare.com/workers/runtime-apis/streams/readablestreamdefaultreader/) dokumenterar cancel mot den underliggande källan och låst läsare. Vår tillämpning avbryter aktiv filläsare vid fel eller avbruten export och hämtar inga följande filer. Att bara avsluta iteratorn är ingen garanti att en pågående filläsning stoppas direkt.
- [Cloudflare – Request.signal](https://developers.cloudflare.com/workers/runtime-apis/request/) kräver kompatibilitetsflaggan `enable_request_signal` för inkommande klientavbrott. Flaggan ändras inte i kandidaten; faktisk Sites-disconnect är inte bevisad av ett syntetiskt AbortController-/cancel-prov.
- [Salesforce – serverbehörighet](https://developer.salesforce.com/docs/platform/lwc/guide/apex-security.html) och [Lime – Object Access](https://platform.docs.lime-crm.com/en/latest/configuration/object-access/) skiljer resurs-/poståtkomst från andra behörigheter. Källorna motiverar uttrycklig serverkontroll av aktör och exportresurs; de föreskriver inte vår exakta återkallelse- eller strömpolicy.

Kandidatens avsedda kontrakt binder HTTP-exporten till den ursprungliga serverlästa medlemsraden och dess aktiva adminroll, användar-ID och identitets-/ansvarsuppgifter. Kontrollpunkter efter asynkrona läsningar och före JSON-svar, NDJSON-utlämning, slutpost och privata felsvar ska stoppa fortsatt utlämning vid ändrad rätt. Pågående kontroll får inte återskapa en raderad medlem eller återbinda ett borttaget konto. Avbrott lämnar ingen giltig slutpost; format, hashar, snapshotkontroller och begränsad buffring ska bevaras. Exporten raderar inga filer eller kunduppgifter.

ActualSQLite/API-prov och full regression passerar för återkallelse under R2-läsning, före filutlämning/slutpost och sista stateawait samt klientcancel, nekade privata felsvar, legitima exporthashar och oförändrat lagrat underlag. Slutregressionen kompletterar med sju återkallelser före första headerläsningen: inga headerbytes eller R2-läsningar lämnas. Befintligt fullständigt strömåterställnings-/EOF-prov är fortsatt grönt. Redan utlämnade bytes kan inte återkallas; medlemskontroll och HTTP-utlämning är ingen gemensam atomisk transaktion. Exakt bygge/runtime/browser, CI, merge och publicering kvitteras separat. Inga riktiga konton, personalprov, live-skrivningar eller hostingåterställning antas genom källgranskningen.

[Cloudflare – D1 limits](https://developers.cloudflare.com/d1/platform/limits/) anger 1 000 frågor per Worker-invocation på Paid och 50 på Free (kontrollerat 6 oktober). Kandidatgranskningen tog därför bort medlemsfrågor per godtycklig R2-chunk: varje begränsad fil hålls privat till slutkontroll, medan lokal cancellation kontrolleras per chunk. Cirka fyra medlemsfrågor per fil kräver fortsatt volymprov; formatets 2 000-filgräns är ingen verifierad hostingkapacitet. Sites faktiska budget och eventuell export över flera requests återstår att lösa med driftbelägg.

### HTTP-completion vid avbruten producent

Första kandidatens lokala actual-workerd-HTTP-prov stoppade efter två filer och saknade slutpost, men browsern kallade partialfilen färdig. Detta är ett separat completionfel från den lilla kopia som redan producerats före återkallelsen. Ingen merge eller publicering gjordes av den kandidaten.

[Cloudflare Response](https://developers.cloudflare.com/workers/runtime-apis/response/#set-the-content-length-header) anger att manuellt Content-Length ignoreras för vanlig ström: känd längd måste komma från kroppskällan. [FixedLengthStream](https://developers.cloudflare.com/workers/runtime-apis/streams/transformstream/#fixedlengthstream) kräver exakt antal bytes och felar vid under-/överflöde; underflödet kan upptäckas på lässidan. [RFC 9112 §6.3](https://www.rfc-editor.org/rfc/rfc9112.html#section-6.3) kräver att för få bytes till giltig Content-Length behandlas som ofullständigt svar.

Den reviderade kandidaten beräknar exakt UTF-8-/base64-/hash-/slutpostslängd från validerad metadata utan förläsning av filer och använder direkt FixedLengthStream.readable som HTTP-body. Pipe/backpressure kan buffra redan godkända poster; källans köstorlek noll är ingen garanti för hela HTTP-pipelinen. Nodens testmodell ska verifiera byteantal inklusive Unicode/escaping och tom filsamling; verklig workerd, proxy och native download måste separat verifiera bibehållen deklarerad längd, normal framgång och faktisk partial-failure. Sites transport och fysisk användning påstås inte verifierade av lokal HTTP.

Installerad Vinexts `server/fetch-handler.js` dokumenterar custom-Worker med delegation till `handler.fetch(request,env,ctx)`. Granskning av `shims/unified-request-context.js` och genererad kandidat visar att `closeAfterResponseWithBody` ersätter API-kroppen med vanlig TransformStream; inner-FLS ger därför ingen deklarerad HTTP-längd. En sista FLS efter handler.fetch behåller Vinexts cleanup och ger Worker-runtime känd kroppslängd. Detta är verifierad frameworkimplementation för repoets låsta version, ingen generell garanti för senare versioner. Faktisk HTTP och native download ska provas på slutbygget. Fullbuffrad-response-undantaget används inte för filströmmen.

## Synlig sparstatus i privata mobilflöden, 2026-10-06

Följande officiella källor kontrollerades 6 oktober för långa formulär i kundplan, bearbetning och onboarding:

- [Lime – design av handlingar](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) rekommenderar få relevanta handlingar som nås utan scroll, verb i knapptexter och tillgänglig betydelse för ikoner. Vår tillämpning visar relevant återförsök vid sparfel och behåller tydliga befintliga konfliktval.
- [Salesforce – toastmeddelanden](https://developer.salesforce.com/docs/platform/lwc/guide/use-toast.html) skiljer framgång, fel, varning och information. Dess toastcontainer visar normalt högst tre meddelanden; fler väntar tills ett meddelande stängs. Detta belägger ingen permanent synlig utkaststatus och är ingen regel om tre meddelanden för Magnussons.
- [Saleshub AI – funktioner](https://saleshubai.se/funktioner) beskriver kundkort och nästa aktivitet. Leverantörsbeskrivningen verifierar inget autosparnings-, utkast- eller samtidighetskontrakt; vår sparstatus måste följa vårt faktiska sparresultat.
- [W3C – Status Messages, WCAG 4.1.3 AA](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) kräver att visade statusmeddelanden kan förmedlas programmatiskt utan att få fokus. [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22) beskriver `role="status"` med implicit artig annonsering och rekommenderar explicit `aria-atomic="true"` när hela meddelandet ska läsas. Regionen ska finnas före statusuppdateringen. Vanlig autosparning ska inte upprepade gånger avbryta användaren med assertive-varningar.
- [W3C – Focus Not Obscured, WCAG 2.4.11 AA](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) förbjuder att eget innehåll helt döljer en tangentbordsfokuserad kontroll. Sticky-header/footer är uttryckliga riskexempel; delvis skymning tillåts på AA. Helt fria fält och knappar är vårt starkare designmål.

Den valda tillämpningen är en bestående synlig statusyta medan formuläret rullas, med skillnad mellan väntande ändring, sparning, serverkvitterat privat utkast, fel och konflikt. Privat utkast betyder inte publicerade kunduppgifter. Statusen använder `role="status"`, explicit `aria-live="polite"` och `aria-atomic="true"`; handlingsknappar ligger som syskon utanför annonseringsregionen. Fokus ska stanna i redigeringen. Sticky-synlighet, 44 px-knappmål och scrollpadding anpassad till uppmätt statushöjd är våra implementationsval, inte krav från 4.1.3 eller 2.4.11.

Byggda browserprov ska kontrollera status och fria kontroller vid 320/390 px, lång fel-/konflikttext, rullning och textförstoring. Provresultat och publicering kvitteras separat; källorna eller ARIA-attributen bevisar ingen generell WCAG-acceptans, fysisk telefon eller personalprov.

## Relevanta handlingar i Kundvårds läsvy, 2026-10-06

Följande officiella källor öppnades 6 oktober inför den avgränsade visningen av Återköp och Merförsäljning:

- [Lime – design av handlingar](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) rekommenderar få kontextuellt relevanta handlingar och att handlingar som inte är aktuella hålls undan. Det är en princip för begriplighet, inte en serverbehörighet.
- [Lime – Object Access](https://platform.docs.lime-crm.com/en/latest/configuration/object-access/) skiljer typbehörighet från rätt att läsa, ändra eller radera ett visst objekt. Läsrätt innebär inte automatiskt ändringsrätt.
- [Salesforce – behörighetsstyrda Dynamic Actions](https://admin.salesforce.com/blog/2021/selectively-show-components-to-users-using-custom-permissions) visar synlighetsfilter med Custom Permissions och rekommenderar att dölja åtgärder användaren inte kan utföra. Artikeln är från 2021; äldre uppgifter om funktionslanseringar används inte.
- [Salesforce – serverbehörighet](https://developer.salesforce.com/docs/platform/lwc/guide/apex-security.html) skiljer CRUD-/fältbehörigheter från postdelning. Att visa eller dölja en komponent ersätter inte kontrollerna på servern.
- [Saleshub AI – funktioner](https://saleshubai.se/funktioner) beskriver kundkort med nästa aktivitet. Sidan verifierar ingen särskild roll- eller behörighetsmodell för kundvård.

Magnussons-tillämpningen begränsar just Kundvård-listans två affärsskapande knappar med befintlig `canEdit` för admin/seller. Reader behåller listans läsinnehåll och antal öppna affärer; serverrättigheter ändras inte. UI-visningen ska minska meningslösa klick och ersätter ingen API-kontroll. Prov och publicering kvitteras separat; ingen generell rollgranskning eller personalacceptans följer av källorna.

## Generella formulär på mobilen, 2026-10-06

Officiella källor öppnades på nytt inför rättningen av det generella affärsformulärets reproducerade breddfel:

- [MDN – fieldset](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/fieldset) dokumenterar standardens `min-inline-size: min-content` och att disabled låser barnkontroller. Vår befintliga nollminbredd och disabled-semantik behålls; den implicita gridkolumnen behöver dessutom kunna krympa.
- [MDN – minmax](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/minmax) dokumenterar `minmax(0, 1fr)` och hur auto-minimum beror på barnens storlek. Långa kundnamn och valtext ska radbrytas inom kolumnen, inte döljas för att maskera överbredd.
- [Salesforce – objektspecifika mobilhandlingar](https://trailhead.salesforce.com/content/learn/modules/salesforce1_mobile_app/salesforce1_mobile_app_actions_objectspecific) behåller handlingens koppling till aktuell kontakt och ordnar formulärfält i en kolumn. Magnussons behåller kundsammanhang, fält och obligatoriska uppgifter med en mobilkolumn.
- [W3C – Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) beskriver 320 CSS px utan förlorad information/funktion eller tvådimensionell scroll, med angivna undantag. Vertikal scroll och flyttade kontroller är tillåtna. Dokumentets demonstration med 200 procent text är uttryckligen inget konformitetsprov.

Limes redan dokumenterade riktlinjer för relevanta handlingar och begriplig verbtext öppnades också på nytt. Saleshubs funktionssida svarade HTTP 403 i detta försök; dess tidigare daterade inspiration behålls utan nytt verifieringsanspråk.

Tillämpningen avgränsas till generella editorer med bevarade roller, disabled-semantik, privata utkast och sparflöden. Browserprov ska mäta lång text, kort viewport, textförstoring och helt nåbara footerknappar. Källorna bevisar ingen generell WCAG-acceptans, fysisk telefon eller personalanvändbarhet.

- [MDN – field-sizing](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/field-sizing), kontrollerad 6 oktober 2026, HTTP 200: content låter textarea växa med texten och gör rows/cols verkningslösa; fixed återför vanlig kontrollstorlek. Magnussons avgränsar detta till generella formulär för befintliga rader och intern scroll. Uppmätt höjd, bevarad text och faktiskt fokus verifieras i slutbygget. MDN:s Baseline2026 gäller senaste versioner sedan juni; äldre browserstöd och fysisk telefon är inte verifierade här.

- [MDN scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView), [scroll-padding](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-padding) och [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), kontrollerade 6 oktober 2026, HTTP 200: padding definierar containerns synregion, block:nearest minimerar förflyttningen och RAF är ett engångsanrop före nästa repaint. Magnussons fokusjustering är ett avgränsat implementationsval för ett fortfarande anslutet/fokuserat generellt textfält. Källorna garanterar inte fri caret eller helt synlig textarea bakom sticky innehåll; faktisk kortviewport/förstoring kräver slutprov.

- Fokusdiagnostiken på765af94 visade att nearest med fast scrollpadding inte reserverade hela den verkligt radbrutna footerhöjden. Slutkandidatens avgränsade UI-hjälp mäter därför aktuell synlig yta och rullar bara dialogen med residualdelta för ett fortfarande aktivt generellt input/textarea/combobox-fält. Ingen generell webbläsargaranti följer av dokumentationen.

- [MDN Element.scrollBy](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollBy), kontrollerad 6 oktober 2026, HTTP 200: top anger relativ vertikal förflyttning i pixlar och instant ger omedelbar scroll. Magnussons helper använder uppmätta kontroll-, viewport- och footerkanter i den generella dialogen. Tolv px marginal och guards för fortsatt anslutet/aktivt fält är våra implementationsval; dokumentationen är inget Chrome-/produktionsbevis. Slutbyggets faktiska utfall och begränsningar finns i VALIDATION.

## Generella utkast: laddningsfel och återförsök, kontrollerat 6 oktober 2026

[Salesforce – Toast Notifications](https://developer.salesforce.com/docs/platform/lwc/guide/use-toast.html) skiljer framgång, fel, varning och information och beskriver att toastcontainerns gräns kan hålla fler meddelanden dolda. [Lime – 2025.1 release notes](https://platform.docs.lime-crm.com/en/latest/on-premise/releases/2025.1/release-notes/) dokumenterar varning vid osparade ändringar i Protocol/Resource Planner. Båda officiella sidorna öppnades med HTTP 200. Magnussons-tillämpningen är ett användbart besked och återförsök i arbetsdialogen samt tydlig skillnad mellan öppna uppgifter, privat utkast och gemensam CRM-sparning. Leverantörskällorna verifierar inga egna autosparningskontrakt eller kontoanslutningar.

[W3C – Status Messages 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), HTTP 200, beskriver hur väntan, förlopp och felstatus ska kunna förmedlas utan fokusbyte. V26 visar det redan befintliga laddnings-/fel-/retryflödet före current-record och håller fokuserade statusknappar fria; semantisk hjälpmedelsannonsering återstår och ingen WCAG-/skärmläsargaranti lämnas. [Error Identification 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), också HTTP 200, gäller upptäckta inmatningsfel och används inte som direkt krav för nätverksfelet vid utkastladdning.

Saleshub öppnades inte på nytt efter den tidigare dokumenterade 403-begränsningen. Ingen ny Saleshub-funktion antas. Bevarad text, två retryklick/en pågående GET, request-ID och lyckad privat autosave/återupptagning verifieras i Magnussons egna isolerade slutprov i VALIDATION.

## Bestående generella formulärstatusar, 6 oktober 2026

Följande officiella källor öppnades denna dag och gav HTTP 200:

- [W3C ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22): role=status har implicit polite live-region; explicit aria-atomic=true rekommenderas och regionen ska finnas före uppdateringen. Magnussons behåller en textregion även i clean-formulär; inga återförsöksknappar eller tidsstämpel ingår.
- [W3C Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) och [Alert Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) uppmärksammar alltför pratiga besked och täta avbrott. Vår opt-in-region uppdaterar text utan fokusflytt och ändrar inga andra befintliga status-/toastkanaler. Samlad privat/CRM-status kräver en senare avgränsning.
- [Salesforce Toast Notifications](https://developer.salesforce.com/docs/platform/lwc/guide/use-toast.html) skiljer beskedstyper och beskriver toastköer. [Limes handlingsriktlinjer](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) rekommenderar få relevanta handlingar och begripliga etiketter. Vi behåller rätt privat retry/versionval utanför textregionen och tydlig benämning Sparat som privat utkast. Detta är ingen bekräftelse av gemensam CRM-sparning.

Faktisk DOM-nodpersistens, fokus/markering, clean-layout, privat autosave, CAS409 och oförändrade shared-data är verifierade i våra egna slutprov (VALIDATION). DOM-semantik bevisar inte skärmläsaruppläsning, initialmountannonsering, personalanvändbarhet eller allmän WCAG-acceptans. Saleshub öppnades inte på nytt efter tidigare dokumenterad 403; inga nya Saleshub-fakta eller konto-/integrationsanspråk görs.

## Kundkontakt efter leverans, kontrollerat 6 oktober 2026

De befintliga officiella källorna [Salesforce – aktiviteter](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1) och [Lime – To-do](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/todo-features/) öppnades igen med HTTP 200 kl. 10:26:14 UTC. Salesforce beskriver planerat/utfört kundarbete och nästa aktiviteter; Lime beskriver anteckning, avslut/senareläggning och nästa uppgift med bibehållna kopplingar.

Magnussons tillämpning är ett avgränsat kontaktflöde för uppgiften efter mottagen leverans. Atomisk anteckning/resultat/uppgift/nästa steg, faktisk kontakt skild från inget svar/internt arbete och oförändrade order-/faktura-/mottagningsgränser är våra egna krav och verifieras i egna syntetiska prov. Leverantörssidorna bevisar inga egna transaktionskontrakt eller uppmätta förbättringar. Saleshub omkontrollerades inte efter tidigare 403; Codex-referensen är fortsatt oläst.

## Generella formulärs sparbesked, kontrollerat 6 oktober 2026

Sex befintliga officiella källor omkontrollerades HTTP 200 kl. 11:19:19–11:19:42 UTC. Publika hämtningar och exakta textbelägg finns utanför Git i `scratch/form-status-research-20261006T111920Z/official-evidence.json` och `supplement.json`:

- [Salesforce – aktiviteter](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1) och [Lime – To-do](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/todo-features/) beskriver sammanhängande kundarbete och uppföljning. De bevisar inte Magnussons transaktionskontrakt.
- [Salesforce – toast](https://developer.salesforce.com/docs/platform/lwc/guide/use-toast.html) skiljer information, framgång, varning och fel samt beskriver köhantering. [Lime – handlingar](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) rekommenderar få relevanta handlingar med tydliga verb. Magnussons använder kvarstående formulärbesked och Visa besked/Granska; privat framgång är inget belägg för CRM-commit.
- [W3C – statusmeddelanden](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) beskriver viktig feedback utan fokusflytt och varnar för alltför pratiga meddelanden. [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22) anger en befintlig statusregion före uppdatering och rekommenderar explicit aria-atomic=true. Magnussons sammanfattning ligger därför i en bestående polite/atomic textregion; tider och knappar ligger utanför. Explicit detaljhandling får flytta fokus.

Fullständiga besked, skillnaden privat/CRM/stängning, oförändrade återförsökskontrakt och uppmätt footer-/fokusutrymme är Magnussons egna tillämpningar. V29:s 23/23 slutbrowserfall och faktisk publicering kvitteras i VALIDATION. DOM-semantik är inget skärmläsar-, personal- eller WCAG-godkännande. Saleshub omkontrollerades inte efter tidigare 403 och Codex-referensen är fortsatt oläst.

## Ofullständigt uppföljningsarbete och större text, kontrollerat 6 oktober 2026

[Salesforce – aktiviteter](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1) och [Lime – To-do](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/todo-features/) omkontrollerades direkt med HTTP 200 och oförändrade slut-URL:er kl. **13:24:33–13:24:34 UTC**. Salesforce skriver: ”Activities are the events and tasks that your sales reps manage in Salesforce” och beskriver uppgiftens ämne, förfallodatum och Save. Lime beskriver att senareläggning uppdaterar StartDate/Duedate, att nästa todo kan ha förifyllda kopplingar och att Quick Note lägger till en History note. Källorna stödjer datum, nästa uppgift och anteckning som olika delar av arbetet. De bevisar ingen leverantörsgaranti om tom anteckning, privata utkast eller Magnussons flush-/CAS-kontrakt.

[W3C – Resize Text, SC 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) omkontrollerades direkt med HTTP 200 och oförändrad slut-URL kl. **13:44:46 UTC**: ”Except for captions and images of text, text can be resized without assistive technology up to 200 percent without loss of content or functionality.” Sidan beskriver F69 när text, bilder eller kontroller blir ”clipped, truncated or obscured”. Det motiverar att Följ upp-formulärets text och spara-/stänghandlingar ryms och nås vid fördubblad text.

Magnussons egna tillämpningar är att bevara samma ofullständiga privata uppföljning även utan anteckning och att begränsa formulärets min-content-bredd med radbrytning, utan dold text eller mindre typsnitt. Egna isolerade browserprov är inget fullständigt WCAG-godkännande, native zoom-, skärmläsar- eller personalprov. Saleshub hämtades inte på nytt efter tidigare 403; Codex-referensen är fortfarande oläst. Exakta releasebelägg och provgränser hålls i [VALIDATION](../VALIDATION.md).

## Artikelredigering under sparning, kontrollerat 6 oktober 2026

Officiella källor hämtades med HTTP 200 i denna körnings research; äldre 403-historik står kvar:

- [Salesforce – Edit a Record](https://developer.salesforce.com/docs/platform/lwc/guide/data-edit-record.html) och [updateRecord](https://developer.salesforce.com/docs/platform/lwc/guide/reference-update-record.html), kl. 14:17:47–14:17:48 UTC: separata submit/success/error/load-händelser, visningsbara formulärfel och uttrycklig Cancel/reset; ifUnmodifiedSince kan kontrollera samtidig ändring. Detta garanterar inte privata utkast eller fältbevarande i vår egen klient.
- [Lime – 2025.1](https://platform.docs.lime-crm.com/en/latest/on-premise/releases/2025.1/release-notes/), kl. 14:16:43–14:16:44 UTC: varning om osparade ändringar gäller Protocol/Resource Planner, ingen generell artikel-/autosparningsgaranti.
- [W3C – Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), kl. 14:17:47–14:17:48 UTC: vänt-/fel-/resultatbesked kan förmedlas programmatiskt utan fokusflytt; ingen viss placering, automatisk stängning eller WCAG-certifiering följer därav.
- [Saleshub – Funktioner](https://saleshubai.se/funktioner), kl. 14:17:47–14:17:48 UTC, **HTTP 200**: översikt över gemensamma data och offert/order. Inga dokumenterade garantier om formulärbevarande, pending-stängning, sparstatus eller samtidighet. Detta nya offentliga belägg ersätter inte de äldre hämtningarnas faktiska 403.

Magnussons lokala lås, bevarad editor/originalbasis, oförändrat CAS/request-ID och neutralt obekräftatbesked är egna tillämpningar, verifierade i 13 isolerade corefall. Separata idle dirty-close-/toastgränser och Sites failed Unauthorized kvitteras i [VALIDATION](../VALIDATION.md); ingen leverantörskälla förklarar backendfelets orsak. Codex-referensen är fortfarande oläst.

## Följ upp-status och native fokuskontroll, kontrollerat 6 oktober 2026

Sju officiella URL:er omkontrollerades **HTTP 200 kl. 15:33:00–15:33:01 UTC**:

- [Salesforce Edit a Record](https://developer.salesforce.com/docs/platform/lwc/guide/data-edit-record.html): submit/success/error, event.detail.message och fieldErrors. [updateRecord](https://developer.salesforce.com/docs/platform/lwc/guide/reference-update-record.html): ifUnmodifiedSince för samtidig ändring. Detta är inget löfte om vår privata flush/idempotens.
- [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): relevanta upptäckbara handlingar med tydliga verb; ingen egen utkast-/lagringsgaranti.
- [W3C Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) och [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22): redan närvarande polite/atomic status kan ge besked utan fokusflytt. [Focus Not Obscured Minimum](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) kräver på AA-nivå att kontrollen inte är helt skymd; Magnussons mål om hel synlig knappbox är strängare och provas separat.
- [Saleshub Funktioner](https://saleshubai.se/funktioner): samlat kund-/nästaaktivitets-/modulflöde, ingen verifierad garanti för privat utkast eller pending-stängning. Äldre 403-/200-belägg ändras inte av denna hämtning.

Magnussons egna tillämpningar är kvarstående privat/CRM/stängningsbesked, exakta tillgängliga serverfel, explicit detaljfokus och lokal scroll av samma native fokuserade kontroll. **22/22 isolerade slutfall** belägger avgränsningen, ingen skärmläsar-/telefon-/WCAG-certifiering. Källorna förklarar varken v31 Unauthorized eller skillnaden mellan lokal råtarhash och native archive_storage-hash; dessa tekniska gränser och faktisk v32-publicering kvitteras i [VALIDATION](../VALIDATION.md). Codex-tasken är fortsatt oläst.

## Intuitiv design: arbetsmoment och begriplighet

Efter Ludwigs förtydligande 6 oktober öppnades [Saleshub – Funktioner](https://saleshubai.se/funktioner) och [Salesforce – Activities](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1) på nytt via webbverktyget. Saleshub beskriver gemensamma moduldata och kundkort med nästa aktivitet. Salesforce beskriver dagens uppgifter/möten, prioriterad aktivitet och planerat/utfört arbete i tidslinjen. Vår tillämpning är sammanhang, arbetsordning och en synlig nästa handling; källorna bevisar ingen användbarhet eller personalacceptans hos Magnussons.

Webbverktygets nya öppning av [Lime – Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) gav HTTP 429. Principen om få relevanta handlingar med tydliga verb bygger därför fortsatt på den separat daterade HTTP 200-kontrollen kl. 15:33 ovan; ingen ny läsning eller ny Lime-funktion påstås.

[DESIGN](../DESIGN.md#begriplighet-i-det-befintliga-användarprovet) preciserar befintliga T26/B07 med frågor om kund/sammanhang, nästa handling och privat kontra gemensam sparning. Mobilkundlistans läsbarhet och fokusmål efter arbetsytebyte är egna, ännu inte implementerade acceptanskrav. De är inte leverantörsgarantier, nya sparregler eller ett genomfört personalprov.

## Artikelpanelens lokala kassering, kontrollerat 6 oktober 2026

[Salesforce Edit a Record](https://developer.salesforce.com/docs/platform/lwc/guide/data-edit-record.html) och [Saleshub Funktioner](https://saleshubai.se/funktioner) returnerade HTML 17:25:04 UTC. Salesforce skiljer submit/success/error/reset; Saleshub beskriver sammanhängande moduldata. Ingen garanterar vår kassering eller privata utkast.

[Radix AlertDialog](https://www.radix-ui.com/primitives/docs/components/alert-dialog), HTML 17:25:14, beskriver Esc, fokusfälla och Trigger-återgång. [Upstream källkod](https://raw.githubusercontent.com/radix-ui/primitives/main/packages/react/alert-dialog/src/alert-dialog.tsx), text 17:24:22, visar Cancel-fokus/utanförspärr; det ersätter inte kontroll av installerad version. [W3C modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) och [kasseringsexempel](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/examples/alertdialog/) returnerade HTML 17:25:14: minst destruktivt initialval, No/Escape utan kassering. Exemplen är ingen WCAG-certifiering.

[Lime 2025.1](https://platform.docs.lime-crm.com/en/latest/on-premise/releases/2025.1/release-notes/) gav live 429 17:24:20. Endast officiellt indexerat utdrag belägger varning i Protocol/Resource Planner; ingen lyckad ny livehämtning, artikelgaranti eller verifierad warningonunsavedProtocol-nyckel.

Magnussons lokala stängningsval, varning om obekräftad sparning och fokusåtergång är egna tillämpningar. Produktprov och publicering finns i [VALIDATION](../VALIDATION.md); Codex-tasken är oläst.

## Leveransgranskning och intuitiva handlingar – kontrollerat 2026-10-06

- [Salesforce updateRecord](https://developer.salesforce.com/docs/platform/lwc/guide/reference-update-record.html): HTTP200, slut-URL oförändrad kl. 19:21:09.570556 UTC. `clientOptions.ifUnmodifiedSince` använder LastModifiedDate för att upptäcka ändring före update. Magnussons använder egen relevant receipt-projektion och SQL-CAS, kontrollerad efter varje omläsning; exakt replay ligger före konflikt. Salesforce-dokumentationen bevisar inte vår implementation eller drift.
- [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): HTTP200, slut-URL oförändrad kl. 19:21:26.254337 UTC. Få relevanta handlingar, verb samt synlig text/ikon. Tillämpning: Granska aktuell leverans, uttrycklig jämförelse och Använd detta underlag och behåll min text; användaren ser vad som sparas och vad som bara granskas.
- [Saleshub AI funktioner](https://saleshubai.se/funktioner): HTTP200, slut-URL oförändrad kl. 19:21:26.428634 UTC. Beskriver kundkort med nästa aktivitet och gemensamma moduldata för affär, projekt och faktura. Tillämpning: samma underlag visar aktuellt besked, avsändning och kontrolluppgifter utan dubbelregistrering. Marknadsbeskrivning är inget integrationsprov.

Browserbelägget för v34 är 8 syntetiska fall; inga påståenden om uppmätt personalnytta, egna leverantörsintegrationer eller världens bästa CRM görs genom källorna.

## Privat sparning och intuitiva leveranshandlingar – kontrollerat 2026-10-06

Officiella sidor öppnades med tillgängligt webbverktyg omkring 20:28 UTC i denna körning:

- [Salesforce Edit a Record](https://developer.salesforce.com/docs/platform/lwc/guide/data-edit-record.html) skiljer submit, success och error samt synliga formulär-/serverbesked. Magnussons tillämpning skiljer privat sparstatus från explicit CRM-inlämning och dess kvittens.
- [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) beskriver relevanta handlingar, konkreta verb och beskrivande etiketter. Tillämpning: välj ett bestämt utkast, spara privat och stäng, granska leverans eller registrera faktisk händelse.
- [Saleshub AI Funktioner](https://saleshubai.se/funktioner) beskriver kundsammanhang, nästa aktivitet och gemensamma moduldata. Tillämpning: återupptagning av samma order med dess ursprungliga underlag, utan ny order eller dubbelregistrering.

Sidinnehållet lästes; ingen ny HTTP-status eller leverantörsgaranti antas. Privat receipt-kuvert, SQL-CAS, atomisk arkivering, identitetsisolering och exakt lost-ack-replay är Magnussons egen implementation och provas separat i [VALIDATION](../VALIDATION.md). Leverantörskällorna bevisar ingen fungerande anslutning, personalacceptans eller världens bästa CRM. Codex-referensen är fortsatt oläst.

## Innehåll före utkastval – officiella källor kontrollerade 2026-10-06

Forskningsunderlaget `/workspace/scratch/next36-design-research/official-evidence.json` dokumenterar hämtningar omkring **21:22 UTC** med status 200 och läst innehåll för följande offentliga källor:

- [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): relevanta handlingar, begränsat antal samtidiga val, imperativa verb och meningsfull färg. Tillämpning: en konkret öppningshandling och en separat innehållsvisning per utkast.
- [Salesforce Work with List Views](https://trailhead.salesforce.com/content/learn/modules/lightning-experience-for-salesforce-classic-users/work-with-list-views): välj relevanta detaljer och använd Wrap text när delar av fält annars döljs. [Edit a Record](https://developer.salesforce.com/docs/platform/lwc/guide/data-edit-record.html) skiljer visning/redigering och lyckad sparhändelse. Tillämpning: jämför läsbart innehåll före öppning och håll privat sparkvittens skild från neutral ändringstid.
- [Saleshub AI Funktioner](https://saleshubai.se/funktioner): kundkortets sammanhang/nästa aktivitet och gemensamma moduldata. Tillämpning: fortsätt rätt befintligt orderutkast utan ny order eller dubbelregistrering.
- [W3C Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) beskriver 200 procent utan innehålls-/funktionsförlust. [Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) beskriver att tangentbordsfokus inte får vara helt dolt av eget innehåll. Specifika browserprov redovisas i VALIDATION; 44 px och full kontrollsynlighet är Magnussons egna starkare design-/provmål, ingen full WCAG-certifiering.

SLDS Data Tables gav 200 och officiell slut-URL men bara ett JS-skal med sidtitel; inga Data Table-råd beläggs från den hämtningen. Salesforce Cancel/reset är inte ett krav på att kassera Magnussons privata utkast vid stängning.

Receipt-kort, native details med fem fullfält, stabil ID-referens, neutral **Ändrat**-tid och explicit valt utkast är Magnussons egen presentation. `updatedAt` kan ändras lokalt; endast befintlig DraftStatus anger bekräftad serversparning. Leverantörskällorna bevisar inga privata lagringsgarantier, fungerande Magnussons-anslutningar, personalacceptans eller världsranking. Inga autentiserade live-UI-, verkliga personal-/konto-/integrations-/telefon-/skärmläsar- eller hostingåterställningsprov ingår. Codex-tasken `01a104c7-a5c5-7350-8577-a4f941138061` är oläst eftersom relevant read_thread saknas; brief/repo används. Scheman, prompter och aktivering är oförändrade.

## Privat artikelarbete – officiella källor kontrollerade 2026-10-06

Sju officiella offentliga källor hämtades omkring **22:16 UTC** med status 200 och läst text enligt `/workspace/scratch/article37-design/official-evidence.json`:

- [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) beskriver relevanta handlingar, imperativa verb och meningsfull färg. Tillämpning: tydliga handlingar för privat stängning, registerändring, granskning och kassering.
- [Salesforce Edit a Record](https://developer.salesforce.com/docs/platform/lwc/guide/data-edit-record.html) skiljer Save, Cancel, lyckad sparning och fel som nät-/fältfel. [Update a Record](https://developer.salesforce.com/docs/platform/lwc/guide/reference-update-record.html) beskriver konfliktkontroll med ifUnmodifiedSince. Tillämpning: privat sparkvittens skiljs från CRM-kvittens och ursprungligt artikelunderlag ändras endast genom uttrycklig granskning. Salesforce Cancel/reset fastställer inte att Magnussons privata utkast ska kasseras vid stängning.
- [Saleshub AI Funktioner](https://saleshubai.se/funktioner) beskriver sammanhängande moduldata och kundkortets nästa aktivitet. Tillämpning: fortsätt samma artikelarbete utan dubbelregistrering; leverantörens beskrivning bevisar ingen ansluten produktkälla.
- [W3C Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) beskriver status som kan presenteras av hjälpmedel utan fokusflytt. [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) beskriver bevarad information/funktion vid 320 CSS px. [Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) beskriver fokus som inte helt döljs av eget innehåll. Verifiering av de specificerade browserfallen är inte full WCAG-certifiering eller faktisk skärmläsaranvändning.

Magnussons egen lösning använder form/article-kuvert, beständig privat ursprungsbasis, strikt serverroll, identisk seller-arkivering, naturlig nyckelspärr för ny artikel, atomisk consume och identiskt ledger-replay. Dessa kontrakt följer inte automatiskt av leverantörernas funktionssidor och kräver våra egna prov i [VALIDATION](../VALIDATION.md). Källorna ger inga privata lagringsgarantier, faktisk Magnussons-anslutning, personalacceptans eller världsranking. Codex-tasken är fortsatt oläst.

## Rollbyte och artikelåterhämtning – v38

Fem officiella källor hämtades med HTTP 200 och elva kontrollerade utdrag 2026-10-06. Evidens: `/workspace/scratch/article38-research/official-evidence.json`, SHA256 `a6d5282863a00c3d368af16cc0bfd884b38e17b424a69aa1c4c91317a10a2dfb`.

- [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): konkreta verb och relevanta handlingar. Egen tillämpning: läsning/jämförelse före separat, mindre framträdande arkivering.
- [Salesforce updateRecord](https://developer.salesforce.com/docs/platform/lwc/guide/reference-update-record.html): ifUnmodifiedSince och uttrycklig uppdateringskvittens. Egen tillämpning: bevara revision/CAS och skilj GET från sparning; ingen Salesforce-anslutning.
- [Saleshub AI Funktioner](https://saleshubai.se/funktioner): sammanhängande kontext och nästa aktivitet. Egen tillämpning: fortsätt samma privata artikelarbete från Min dag med bevarad identitet; sidan belägger inget särskilt rollbyteskontrakt.
- [W3C Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) och [Focus Not Obscured Minimum](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html): tydlig status utan bakgrundsfokusflytt och nåbara kritiska val. Avgränsade Chromiumprov är ingen fysisk telefon-/skärmläsarverifiering eller tillgänglighetscertifiering.

Strikt kuvertgranskning, versionsbunden bekräftelse, återläst lokal reservkopia och saved-only-arkivering är Magnussons egen implementation; [VALIDATION](../VALIDATION.md) anger faktiska prov. Leverantörskällorna bevisar inga privata lagringsgarantier, riktiga anslutningar, personalacceptans eller världsranking. Codex-tasken är fortfarande oläst.

## Privata företagsaktiviteter – v39

Fem officiella källor hämtades med HTTP 200, med tolv kontrollerade utdrag 2026-10-07 00:21:32–00:21:33 UTC. Evidens: `/workspace/scratch/event39-research/official-evidence.json`, SHA256 `50db5a73e81740056aeeae193d196305b750167e6ab93315578bf1db260d2159`.

- [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): relevanta handlingar och konkreta verb; arkivering är mindre framträdande. Egen tillämpning: privata utkast, kalenderpublicering och borttagning har olika handlingar.
- [Lime 2025.1 release notes](https://platform.docs.lime-crm.com/en/latest/on-premise/releases/2025.1/release-notes/): varning när Protocol/Resource Planner lämnas med osparade ändringar. Egen tillämpning: invänta privat sparning före stängning; detta är inget belägg för Limes privata autosparningsmodell.
- [Salesforce updateRecord](https://developer.salesforce.com/docs/platform/lwc/guide/reference-update-record.html): `ifUnmodifiedSince` för konfliktkontroll och en uppdateringskvittens. Egen tillämpning: fryst ursprungsbasis, exakt privat revision och explicit konfliktval. Ingen Salesforce-anslutning införs.
- [Saleshub AI Funktioner](https://saleshubai.se/funktioner): kundkontext/nästa aktivitet och projektboard med uppgifter, flera ansvariga och statusrader. Egen tillämpning: samma privata aktivitetsarbete från Min dag och kalender, med förberedelser och ansvar.
- [W3C Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html): begriplig spar-/felstatus utan fokusflytt vid bakgrundsändring. Faktiska tangentbords-/layoutprov är avgränsade Chromiumprov, ingen fysisk telefon-/skärmläsarcertifiering.

Strikt rått privat kuvert, fullständig versionsjämförelse, markerat val, atomisk kalenderpublicering och exakt CRM-ledgerreplay är Magnussons egen implementation. Leverantörskällorna bevisar inga privata lagringsgarantier, fungerande kundanslutningar, personalacceptans eller världsranking. [VALIDATION](../VALIDATION.md) anger provgränser. Codex-referensen är fortfarande oläst.

## Mobilmeny och fokus – v40, 2026-10-07

9 officiella källor hämtades med HTTP 200 och 24 kontrollerade utdrag; evidenskvitto upprättat `2026-10-07T01:20:49.352918+00:00`: `/workspace/scratch/nav40-research/official-evidence.json`, SHA256 `16fcde8f172f0f1bcee6b2ec32d2419263e9198a47962aa3e49e55da74d69f49`.

- [Lime – Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): relevanta verb och ikon tillsammans med begriplig text. Egen tillämpning: synlig svensk Meny/Stäng och tydliga arbetsområden.
- [Saleshub AI – funktioner](https://saleshubai.se/funktioner): sammanhängande kundkontext och nästa aktivitet. Navigationen bevarar befintliga arbetsflöden; sidan belägger inget meny-/fokuskontrakt.
- [Salesforce – mobilnavigation](https://trailhead.salesforce.com/content/learn/modules/salesforce1_mobile_app/salesforce1_mobile_app_navigation) och [button-menu](https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-button-menu.html): nåbara viktiga vägar, tydligt namn och öppet/stängt tillstånd. En ny bottenmeny, fyrgräns eller menu-roll kopieras inte till Magnussons.
- [W3C – modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [Disclosure Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) och [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog): synlig stängning, native Tab-ring, Escape och meningsfull fokusåtergång. Befintlig externa SidebarTrigger är ingen automatisk SheetTrigger; faktisk återgång provas i vår app.
- [W3C – Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) och [Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html): små viewporter behöver hanterbar fixed/sticky-navigation och synligt fokus. Hela knappboxen synlig är vårt starkare avgränsade provmål, ingen allmän WCAG-certifiering.

Fullpanelsrullning i mobilmodalen och i sidmenyn på breda, korta skärmar, fokusreservmål, `preventScroll`, modalgenvägsvakt och stängning vid breddbyte är Magnussons egna implementationsval. Leverantörskällor ersätter inte våra runtimeprov och verifierar inga kundanslutningar, fysiska telefoner, skärmläsare eller personalacceptans. Codex-referensen är fortsatt oläst.

## Öppet affärs-/orderansvar – v41, 2026-10-07

4 läsbara officiella källor med HTTP 200 och 13 kontrollerade textutdrag; evidens `/workspace/scratch/crm41/research-evidence.json`, SHA256 `c9758aafcbf408c60c023e2cd6d8b16aa3b3e8d5e6a9e36bb222c001d8ba4b62`, upprättad `2026-10-07T02:27:59.149743+00:00`.

- [Salesforce Trailhead — Help Your Reps Use Activities](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1): Visa öppna uppgifter i affärens/orderkundens sammanhang. Vid granskad ansvarsflytt ska obligatoriska öppna åtaganden följa det överförda arbetet så att nästa steg fortfarande har ansvarig. Skilj öppet arbete från tidigare aktivitet. Källan beskriver Salesforce-aktiviteter, inte Magnussons transfer-, audit-, roll-, transaktions- eller idempotenskontrakt. De egna obligatoriska uppgiftskategorierna är vår domänregel, inte kopierade Salesforce-krav.
- [Lime CRM platform documentation — Users and Groups](https://platform.docs.lime-crm.com/en/latest/configuration/users-and-groups/): Använd stabilt profil-ID för nytt eller explicit överfört affärs-/orderansvar; skilj inloggningsmedlem från säljprofil. Visa begripligt namn men bevara ID och namnsnapshot i ansvarshistoriken. Gissa inte omappad äldre ägare. Limes Object ID och coworker är Limes egna modeller. De belägger en identitetsprincip, inte att Magnussons har Lime-anslutning, samma backup-ID-beteende eller full genomförd ID-migrering.
- [Lime CRM platform documentation — Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): Visa Byt affärsansvar/Byt orderansvar bara när handlingen är relevant och administratören får utföra den. Använd svensk verbtext och läsbara uppgifter, obligatoriskt respektive valfritt urval samt tydlig granskning före sparning. Riktlinjerna belägger upptäckbarhet och begriplighet, inte serverbehörighet, just en modal, Magnussons personalacceptans eller WCAG-godkännande.
- [Saleshub AI — Funktioner](https://saleshubai.se/funktioner): Behåll kund, affär/order och tillhörande öppna uppgifter tillsammans i överlämningens underlag, med nästa aktivitet och tydligt ansvar. Återanvänd befintliga kopplingar utan ny affär/order eller dubbelregistrering. Leverantörens offentliga funktionsbeskrivning är marknadsföringsmaterial. Den verifierar inget transfer-, CAS-, historik-, privat- eller integrationskontrakt och säger inte att olika ekonomiska/resultatmässiga ansvar ska flyttas tillsammans.

- Otillräckligt källförsök [salesforce-transfer](https://help.salesforce.com/s/articleView?id=platform.admin_transfer.htm&language=en_US&type=5), HTTP 200: HTTP 200 is a JavaScript/loading/error shell, not readable article content. No fresh claim about Salesforce Mass Transfer behavior is supported by this retrieval. Existing separately dated repository evidence is not rewritten.

Stabila profil-ID:n, obligatoriska affärs-/orderuppgifter, granskad överföring, serverägd historia, postbasis/CAS, atomiska skrivningar och exakt replay är Magnussons egna domänkontrakt. Den nya dokumentationen beskriver en levererad avgränsad B01b2-del, inte full personalöverlämning, anslutning till leverantörerna eller egen verifiering av deras interna system. Äldre daterade källutfall och v40:s navigationsevidens bevaras som historik. Codex-referensen är oläst.

## Stabilt kundansvar – v42, 2026-10-07

4 läsbara officiella källor med HTTP 200 och 13 kontrollerade textutdrag; evidens `/workspace/scratch/crm42/research-evidence.json`, SHA256 `8aef796dd9161413360da3cf43cbf77356df8b0fc3322fa44bf7e43f7bb40158`, upprättad `2026-10-07T03:21:17.495789+00:00`.

- [Salesforce Trailhead — Help Your Reps Use Activities](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1): Visa kundens öppna uppgifter och genomförda aktivitet i samma kundsammanhang. Vid granskad överföring av kundansvar ska administratören tydligt se vilket öppet arbete som erbjuds att följa med och vilka uppgifter som har en annan ansvarig. Skilj framtida åtaganden från tidigare aktivitet. Källan beskriver Salesforce-aktiviteter, inte regler för kundansvarsöverföring eller Magnussons egna obligatoriska uppgifter. Urval, profil-ID, ansvarshistorik, behörighet, CAS, atomiska skrivningar och idempotens måste definieras och verifieras i Magnussons kod. Den belägger ingen automatisk flytt av historiskt kommersiellt resultat.
- [Lime CRM platform documentation — Users and Groups](https://platform.docs.lime-crm.com/en/latest/configuration/users-and-groups/): Knyt nytt eller uttryckligt överfört kundansvar till ett stabilt profil-ID. Visa det begripliga namnet och behåll identitet samt namnsnapshot i ansvarshistoriken. Bevara skillnaden mellan inloggningsmedlem och kommersiell profil; gissa inte omappat äldre kundansvar. Limes Object ID, användare/grupper och coworker är Limes egna modeller. Dokumentationen belägger principen om stabila identiteter, inte att Magnussons är anslutet till Lime eller att hela personalöverlämningen och äldre ID-migreringen redan fungerar. Den fastställer inte vår backup- eller återställningsmodell.
- [Lime CRM platform documentation — Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): Visa en relevant svensk handling som Byt kundansvar för behörig administratör vid kundkortet. Använd konkret verbtext med begriplig etikett. Granskningsunderlaget ska tydliggöra tidigare och ny ansvarig samt urval av öppna uppgifter innan användaren sparar. Riktlinjerna belägger relevanta handlingar, imperativa verb och begriplig ikon/text. De kräver inte just en modal, vårt exakta uppgiftsurval eller våra roller. Faktisk upptäckbarhet, mobil användning, tangentbord och serverbehörighet måste provas i Magnussons; inga personalprov eller tillgänglighetscertifikat följer från källan.
- [Saleshub AI — Funktioner](https://saleshubai.se/funktioner): Behåll kundkort, kontakter och nästa aktivitet tillsammans i överlämningsunderlaget. Återanvänd kundens befintliga kopplingar så att överföringen inte skapar en ny kund, affär eller order. Visa öppet arbete och ansvar i kundens sammanhang. Offentlig leverantörsbeskrivning och marknadsföringsmaterial, inte en provad inloggad produkt. Den verifierar inget kundansvars-, transfer-, audit-, CAS-, privat- eller integrationskontrakt. Kundansvar, öppet arbete och historisk försäljningsattribution är våra separata domänval; inga prestanda- eller världsrankningspåståenden stöds.

- Otillräckligt källförsök [salesforce-transfer](https://help.salesforce.com/s/articleView?id=platform.admin_transfer.htm&language=en_US&type=5), HTTP 200: HTTP 200 is a JavaScript/loading/error shell rather than readable Mass Transfer article content. This retrieval supports no fresh claim about Salesforce customer transfer rules. Previously dated repository evidence is not rewritten.

Kundens stabila profil-ID, explicit valt öppet arbete, granskad överföring, serverägd historia och kontrollerad slutägare, postbasis/CAS, atomiska skrivningar och exakt replay är Magnussons egna domänkontrakt. Den nya dokumentationen beskriver en levererad avgränsad B01b2-del, inte full personalöverlämning, anslutning till leverantörerna eller egen verifiering av deras interna system. Äldre daterade källutfall och v41:s kommersiella ansvarsevidens bevaras som historik. Codex-referensen är oläst.

### Separat Select-evidens och lokal designlösning

Efter CRM-källorna ovan lästes separat 1 officiell Radix-källa med HTTP 200 och 5 kontrollerade utdrag. Originalets CRM-källor och hash är oförändrade. Tilläggskvitto `/workspace/scratch/crm42/radix-official-evidence.json`, SHA256 `d45276dd15a38c61f06d47d2abf3f723b7c7767b0ae97a950ff1c543d4e6f1c9`, upprättat `2026-10-07T03:44:06.234127+00:00`.

- [Select – Radix Primitives](https://www.radix-ui.com/primitives/docs/components/select), läst `2026-10-07T03:42:44.163838+00:00`: Använd ett kontrollerat value/onValueChange och eget tillgängligt innehåll i Select.Value. För v42 är stil på en egen barnspan och på Trigger en lokal designlösning i linje med dokumentationens varning att inte styla Value självt. Full läsbar etikett och faktisk 200%-layout måste verifieras i Magnussons browserprov. Dokumentationen är aktuell men inte versionslåst. Den visar ingen särskild Magnussons-layout och intygar inte våra CSS-regler, valgranskning, 200%-utfall, fokus, skärmläsarbeteende eller tillgänglighetscertifiering. Det exakta propbeteendet nedan observeras separat i installerad 2.3.7-källkod.

Separat lästes installerad `@radix-ui/react-select@2.3.7`, modul-SHA256 `5956a0d1d0c2793d908b751361cdc7a1f9786e07c9a0f2d1ead07747357a0df9` och lockfil-SHA256 `89dcf13994f9f97e62a63ac011591005afe4096309f4488ec0b99f7593a9294c`. SelectValue i denna installerade version destrukturerar className och style separat från valueProps. Den renderar Primitive.span med valueProps, en intern style {pointerEvents: "none"} och valt placeholder/children. De inkommande className/style forwardas därmed inte av denna implementation. Det är en observation av den installerade källkoden, inte en allmän uppgift om alla Radix-versioner. Modulens ItemText-portal kräver också att Value saknar eget child-innehåll. Den slutliga lokala lösningen lägger därför text i en egen DOM-span inne i Value och stilar den spanen och Trigger; fullständig vald etikett ligger kvar under väljaren med aria-describedby samt i popup/granskning. Aktuell Radix-dokumentation är inte versionslåst. Den lästa dependencieskällan förklarar just installerad version; dessa läsningar är inga Magnussons-layout-/browser-/skärmläsarprov. [VALIDATION](../VALIDATION.md) redovisar de separata faktiska slutbrowserproven och stoppade kandidaterna. Ingen WCAG-certifiering påstås.

## Stabilt uppgiftsansvar – v43, 2026-10-07

Fyra läsbara officiella HTTP200-källor och 14 verifierade textutdrag, lästa 04:22:57 UTC. Evidens `/workspace/scratch/crm43/research/research-evidence.json`, SHA256 `69a7232208933406d6c0eeeffe2e46421c69656a4940ccf727804218fc5d3fa6`, upprättad `2026-10-07T04:24:07.737121+00:00`. Källutdrag/hash behålls oförändrade. Kvittots initiala egna tillämpningsförslag om en separat uppgiftsansvarshandling är forskningsförslag, inte levererad funktion; rätt avgränsning finns i `research-findings.md`, SHA256 `1dddca4d7b3ffd2bc9cc8189afd00849d3884f4bd30aa70b6debf5edc19b159f`.

- [Salesforce Activities](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1) beskriver egna öppna uppgifter, prioriterad aktivitet och kund-/affärssammanhang. Egen tillämpning: samma uppgift/kontext i Min dag; källan verifierar inte vårt ansvarsbyte, audit, CAS eller historiskt resultat.
- [Lime Users and Groups](https://platform.docs.lime-crm.com/en/latest/configuration/users-and-groups/) beskriver oföränderliga referenser trots ändrade namn samt skilda user/coworker-modeller. Egen tillämpning: stabil säljarprofil för uppgiftsansvar med begripligt namn; ingen gissad gammal person eller påstådd full migration.
- [Lime To-do](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/todo-features/) beskriver Mark as done, Postpone, Resume och Add next todo med återanvända kopplingar. Egen tillämpning: ansvar i befintligt formulär ändrar inte samtidigt avslut/datum/nästa uppgift. Källan beskriver inget ansvarbytesflöde och motiverar ingen påstådd ny dialog/handling/audit.
- [Saleshub AI Funktioner](https://saleshubai.se/funktioner) beskriver kundkort, nästa aktivitet och kopplade moduldata. Egen tillämpning: återanvänd befintlig uppgift och skilj uppgiftsansvar från kommersiellt ansvar. Marknadsbeskrivningen bevisar inga anslutningar, privata lagringsgarantier eller personalresultat.

Serverval/källkopiering, bevarade äldre tomma ID:n, befintliga överföringars atomiska stämpling, UUID-filter, task-/receiptbasis och backup är Magnussons egna kontrakt och verifieras i VALIDATION. En ny separat uppgiftsöverlämning, full personalavveckling eller allmän WCAG-acceptans är inte levererad. Leverantörskällorna bevisar inga egna integrations-/transaktionsinternals; refererad Codex-task är fortsatt oläst.

## Granskad uppgiftsöverlämning – v44, 2026-10-07

Åtta läsbara officiella HTTP200-källor och 22 kontrollerade ordagranna utdrag lästes 05:21:56–05:21:57 UTC. Evidens `/workspace/scratch/crm44/research/research-evidence.json`, SHA256 `3e3227f96f4c27e7c0502c8f2bdaec59248b61c6174bf89fb8956081e64fd823`, upprättad `2026-10-07T05:24:08.189557+00:00`. HTML/text/utdrag/hashar behålls som forskningsunderlag utanför Git.

- [Salesforce Activities](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1): egna öppna uppgifter, kommande åtaganden och historik i kund-/kontakt-/affärssammanhang. Egen tillämpning: samma uppgift/kund före och efter byte av uppgiftsansvar. Källan anger inga transfer-, admin-, audit-, CAS- eller historiska resultatregler.
- [Lime Users and Groups](https://platform.docs.lime-crm.com/en/latest/configuration/users-and-groups/): user/coworker är olika modeller; users/groups har oföränderliga Object ID:n trots ändrat namn. Egen tillämpning: profil-UUID och namn-/ansvarssnapshots har skilda uppgifter. Detta belägger ingen Magnussons-restoremodell eller full äldre migrering.
- [Lime To-do](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/todo-features/): avslut, senareläggning, återöppning och nästa uppgift är olika avsikter. Egen tillämpning: ansvarsbyte ändrar inte samtidigt datum, avslut eller kundkontakt. Lime Resume är återöppnad aktivitet, ingen privat utkastmodell.
- [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/): få relevanta handlingar, konkreta verb och synlig text; modaler passar inte varje handling. Egen tillämpning: Följ upp för vardagsarbete och särskild mindre framträdande administrativ ansvarshandling. Granskningsdialog är vårt eget val.
- [Lime Relation Pickers](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/relation-pickers/): ansvar är en postrelation; ett exempel föreslår aktiva coworkers för dealansvar. Egen tillämpning: välj uttryckligen aktiv granskad målprofil med fullständig etikett. Roster-/nollförvals-/serverregler kommer från våra domänkrav.
- [Saleshub AI Funktioner](https://saleshubai.se/funktioner): sammanhängande moduldata, kundkort/nästa aktivitet och projektuppgifter/ansvar. Egen tillämpning: bevara kopplingar utan ny kund/affär/order; uppgiftsansvar skiljs från historiskt kommersiellt ansvar. Offentlig marknadsbeskrivning, ingen inloggad produkt-/integrations-/privat-/transaktionsverifiering.
- [W3C Dialog Modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): synlig stängning, native Tab/Shift+Tab och logisk fokusåtergång. Busy/dirty/identityskydd och faktisk Magnussons-layout är egna provkrav.
- [W3C Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html): textförstoring till 200 procent utan innehålls-/funktionsförlust; klippning/trunkering/dolda kontroller är vanliga fel. Egen tillämpning: prova nya dialogen med faktiskt fördubblad beräknad text, långa namn/orsaker och kort mobilvy; redovisa tidigare öppna B07-fynd separat.

Salesforce [Mass Transfer-försöket](https://help.salesforce.com/s/articleView?id=platform.admin_transfer.htm&language=en_US&type=5) gav HTTP200 med endast Loading/CSS Error/Refresh, ingen läsbar artikel. Inga nya transferpåståenden stöds; tidigare daterad research behålls.

Tillåtna uppgifter, målprofil, administratörsroll, explicit förankring, serverhistoria/parentreferens, fryst basis, CAS, atomiska skrivningar, idempotens, privata utkast och restore är Magnussons egna kontrakt och behöver faktiska slutprov i [VALIDATION](../VALIDATION.md). Källorna ger ingen WCAG-/personalacceptans, världsranking eller bevis på riktiga anslutningar. Refererad Codex-task är oläst.

## Stabilt mötesansvar med granskad överlämning – v45, 2026-10-07

Sex läsbara officiella HTTP200-källor och 16 kontrollerade ordagranna utdrag lästes 06:26:11.411765–06:26:12.494140 UTC. Evidens `/workspace/scratch/crm45/research/research-evidence.json`, SHA256 `25699137b9ec0a0780104634beea28b55b3f37380cae00d713653dffb4b3e05f`, upprättad `2026-10-07T06:27:39.586796+00:00`. Findings SHA256 `1fc63f1ef835be53b615ec3bdcdc188c5dc8bf5cab5295d8ddfe91a5c4215c6c`. Dokumentationsagenten har kontrollerat alla 16 utdrag mot sparad synlig text och deras hash; HTML/text/evidens förvaras utanför Git.

- [Salesforce Activities](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1) beskriver kommande möten, öppna uppgifter och tidigare aktivitet i gemensamt kund-/kontakt-/affärssammanhang. Egen tillämpning: samma CRM-möte och kundkoppling före/efter ansvarshandling, rätt personligt planerat arbete. Källan definierar inga admin-/UUID-/transfer-/audit-/CAS-/privat-/historiska resultatregler.
- [Salesforce Change Events for Tasks and Events](https://developer.salesforce.com/docs/platform/change-data-capture/guide/cdc-standard-objects-task-event.html) beskriver en separat child Event för inbjuden Salesforce-användare med den inbjudnes user-ID som OwnerId. Egen tillämpning: skilj CRM-mötesansvar från extern kalender, organisatör och deltagare. Att vår överlämning inte skriver Outlook, skickar inbjudan eller flyttar befintliga Tasks är vårt domänval. Salesforce-CDC verifierar inget Microsoft-beteende eller anslutning hos Magnussons.
- [Lime Users and Groups](https://platform.docs.lime-crm.com/en/latest/configuration/users-and-groups/) skiljer user från coworker och beskriver oföränderliga Object ID:n för users/groups trots namnändring. Egen tillämpning: stabil granskad säljarprofil-UUID, begripligt aktuellt namn och historiska snapshots. Källan belägger inte alla coworkerreferenser, vårt profilschema eller restoremodell; äldre okända personer gissas inte.
- [Lime Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) rekommenderar relevanta handlingar, konkreta verb och få framträdande val; modaler passar inte varje aktivitet. Egen tillämpning: behåll primär möteshandling och låt Byt/Förankra mötesansvar vara en relevant sekundär adminhandling. Granskningsdialog, tomt målval, orsak/review och serverroll är våra krav, inga leverantörsgarantier eller personalprov.
- [Saleshub AI Funktioner](https://saleshubai.se/funktioner) beskriver gemensamma moduldata, kundkort med nästa aktivitet och projektuppgifter/ansvar/status. Egen tillämpning: bevara kundsammanhang och skilj mötesansvar från kund-/kommersiellt ansvar. Den lästa offentliga marknadssidan beskriver inget specifikt kalenderägarskifte och verifierar inga privata, integrations- eller transaktionsinternals.
- [W3C Dialog Modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) beskriver fokus i dialog, Tab/Shift+Tab, normalt Escape, synlig stängning och logisk fokusåtergång. Egen tillämpning: prova kort mobilvy, långa val/orsak och egna busy-/dirty-/identityvakter. APG är inget WCAG-certifikat; textförstoring, faktisk CSS-layout, fysisk telefon, skärmläsare och personal kräver egna prov.

Ett separat [Salesforce Event object-försök](https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_event.htm) gav HTTP200 men tom synlig body/JavaScript-skal. Artikeln är oläst och stöder inga generella Event.OwnerId-/transferregler. Den läsbara CDC-källans avgränsade deltagarpåstående står för sig. V44:s separat daterade Resize Text-evidens behålls; ingen ny sådan läsning påstås bland dessa sex källor.

Planned-only admin, aktiv granskad målprofil, explicit äldre förankring, strikt payload, serverägd kedja, fryst basis/CAS, atomiska skrivningar, idempotens, privat avsikt och JSON/NDJSON-restore är Magnussons egna kontrakt med prov i [VALIDATION](../VALIDATION.md). Varken research eller tekniska prov är full personalavveckling, fungerande externa anslutningar, WCAG-/personalacceptans eller världsranking. Codex-tasken `01a104c7-a5c5-7350-8577-a4f941138061` är oläst; explicit brief och repo används.

## Läsbar status och nästa handling i Min dag – v46, 2026-10-07

Sex läsbara officiella HTTP200-källor med 16 verifierade ordagranna utdrag lästes 2026-10-07 07:19:33–07:19:34 UTC: Salesforce listvyer/aktiviteter, Lime Actions Design Guidelines, Saleshub AI Funktioner och W3C Resize Text/Reflow. Underlag `/workspace/scratch/crm46/research/research-evidence.json`, SHA256 `1c579f4edbd81ea1a74b99df4e8c04733c12a7857b3a6e59d89c00659106ab89`. Dokumentationsagenten kontrollerade sparad text/HTML och samtliga utdrags hash/offset. Källorna stöder läsbar text och tydliga handlingar men verifierar inte vår implementation, privat lagring, personalacceptans eller full WCAG-efterlevnad.

- [Salesforce – Work with List Views](https://trailhead.salesforce.com/content/learn/modules/lightning-experience-for-salesforce-classic-users/work-with-list-views) beskriver: ”It’s easy to wrap text in list view columns.” Vår tillämpning är radbrytning av viktiga statusmeddelanden inom sin yta. Det inför ingen ny Salesforce-listvy eller anslutning.
- [Salesforce – aktiviteter](https://trailhead.salesforce.com/content/learn/modules/sales_admin_maximize_productivity/sales_admin_maximize_productivity_unit_1) säger att användaren ska ”know which task is the highest priority right now”. Vår tillämpning bevarar Min dags kundsammanhang, ordning och nästa handling när etiketten ändras. Leverantörens antal uppgifter blir ingen ny Magnussonsregel.
- [Lime – Actions Design Guidelines](https://platform.docs.lime-crm.com/en/latest/configuration/webclient/actions/actions-design-guidelines/) rekommenderar i normalfallet ”both icon and label”. Vår tillämpning behåller svenska verb, synliga etiketter och befintliga relevanta handlingar. Textförstoring ska inte lösas genom att dölja ord eller tillföra fler knappar.
- [Saleshub AI – funktioner](https://saleshubai.se/funktioner) beskriver ”Kundkort med kontakter, filer, mail, samtal och nästa aktivitet”. Vår tillämpning bevarar samma kund, arbete och privata utkast vid designrättningen. Produktbeskrivningen verifierar ingen liveintegration eller privat-/transaktionskontrakt i Magnussons.
- [W3C – Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) anger ”up to 200 percent without loss of content or functionality.” Källan beskriver också mellansteg och klippning/trunkering/dolt innehåll som möjliga fel. Vår avgränsade kontroll mäter faktiskt förstorad beräknad text i de berörda ytorna; den är ingen helsidig zoom- eller WCAG-certifiering.
- [W3C – Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) anger ”without requiring scrolling in two dimensions” för bland annat 320 CSS px. Vår tillämpning provar smala ytor, långa ord och textens verkliga gränser mot klippande föräldrar; dokumentets scrollbredd ensam räcker inte. Kriteriets undantag och alternativ för full text består. En 320 px-viewport är inget genomfört 400-procents helsidigt zoomprov.

Implementation, faktisk textskala, geometri, privata status-/tangentbordsprov, main och deploy redovisas separat i [VALIDATION](../VALIDATION.md). Källorna är designunderlag, inga belägg för att personalen klarar arbetsflödet eller för att CRM:et är bäst i världen. Tidigare daterad research ovan behålls.
