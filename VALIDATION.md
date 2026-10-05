# Verifiering av byggagent och kontaktspärr 2026-10-05

Bas: GitHub-main `37437fbd793a94a6a209a92cc814728a2c464faf`, med samma källträd som publicerad Sites v16 `5fed2c64dad162a8a29f58d7042c57440d0a3977`. Ändringen ligger på `feat/crm-builder-agent`; PR-head identifierar den slutliga kandidaten.

- `node tests/outlook.mjs`: godkänd för slutliga runtimefiler. Nya `tests/prospect-suppression.mjs` körs från CRM-harness och täcker spärrad konvertering, återimport/källbyte, 10-/12-siffrig företagsmatchning, bevarat kundansvar, ignorerad injicerad historik, null/saknad identitet, tvetydig återimport, äldre dubbletter, spårbar återöppning, roller, oföränderligt underlag, idempotens och riktiga CAS-konflikter. Aktiv spärr bevaras efter strömmad export/återställning och stoppar fortfarande konvertering efter ny import. Listvyns beslutsindex jämförs mot detaljhistoriken.
- Befintliga CRM/v12/v13-, order-, utkast-, åtkomst- och Outlook-prov passerar. Under verifieringen rättades en oavsiktlig ändring av lagrat orgnummerformat; gamla testförväntningar ändrades inte. De nya testfixturerna isolerades från grundsvitens kunder och återställningen jämför fullständigt innehåll per ID utan att anta databasordning.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: godkänd efter sista UI-ändringen.
- `pnpm build`: godkänd. Befintlig varning om stora klientpaket kvarstår. Lokalt Node 24.19.0 och pnpm 11.19.0; CI använder repoets 11.25.0.
- `node tests/runtime-smoke.mjs`: godkänd med byggd Worker, lokal workerd och diskbaserad isolerad D1/R2. 13 500 000 byte filer exporteras/återställs i ett paket på 18 010 644 byte, med verifierade hashar, korrektur-/arbetsfotolänkar, idempotent återförsök och oförändrad källa. Anonyma CRM-anrop avvisas och startsidan renderas.
- `git diff --check` och relativa agentdokumentlänkar: godkända. Oberoende kod-/källgranskning gav inga kvarvarande blockerande fynd i slutdiffen.
- Automationen **Magnussons CRM-byggagent** bekräftades skapad och aktiverad för en körning per timme. Detta bevisar schemat; framtida utförda körningar är ännu inte verifierade.

Inget nytt browser-, telefon- eller personalprov har genomförts här. Riktiga Fortnox-/Microsoft-/AI-konton, faktisk hostingåterställning och den refererade Codex-tråden är inte verifierade. Spärren gäller Företagsökning och dess serverkonvertering, inte en ny generell utskickspolicy. Ingen SQL-migrering, ny anslutning, kontoinbjudan eller utökad delning införs. Main/live-kvittens kompletteras i [agent/LOG.md](agent/LOG.md).

# Verifiering 2026-10-04

Utgångspunkt: `main` på `1f3e7bf1235a60e53e7dd0710191cc1376709d2b`.
Ändringarna utvecklades på `fix/pilot-backup-and-access`; PR-huvudets commit
identifierar den samlade koden. [STATUS-2026-10-04.md](STATUS-2026-10-04.md)
skiljer byggt/testat från kvarvarande konto-, hosting- och användarprov.

- Node.js `v24.19.0`. Den här miljöns effektiva pnpm var `11.19.0`; projektets CI använder fortsatt `11.25.0`.
- `pnpm install --frozen-lockfile --prod=false`: ren installation godkänd, låsfilen oförändrad.
- `node tests/outlook.mjs`: godkänd både på utgångspunkten och efter ändringarna, inklusive v12/v13 och de fyra nya regressionstestgrupperna.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: godkänd.
- `pnpm build`: godkänt portabelt Vinext/Vite-produktionsbygge. Bygget rapporterar stora klientpaket och begränsad statisk klassificering av startsidan; detta är inte ett prestanda- eller renderingstest.
- `git diff --check`: godkänd.

Nya verifierade scenarier:

- Direktleverans kan inte förbigå mängd-/leveransunderlag genom vanlig orderredigering. Delvis och fullständigt skickat, kundmottagande, historiska leveranser, fil-/radkopplingar, överantal och återförsök provas.
- Öppet hinder hindrar mängdminskning från att avsluta ordern. Tom hindertext avvisas; en explicit lösning kräver orsak/rätt aktör och bevarar spårbar historik samt skydd mot gammalt underlag.
- Strömmad export/återställning med mer än **15 MB binära testfiler** och paket över 16 MB bevarar korrektur, foton och arbetsversionsreferenser. Trunkering, fel hash/slutmarkör, saknad fil, ändrat exportunderlag, R2-fel, CAS-konflikt, förlorat/osäkert commitsvar, samtidiga återförsök och rollspärrar provas. Backpressure och avbruten läsare får inte läsa hela filsamlingen. Äldre JSON-prov är fortsatt godkända.
- Kundplan, bearbetning, onboarding och företagsevent skyddas även efter konflikt/refresh och vid faktisk injicerad databas-CAS. Olika poster kan sparas samtidigt; gammalt checklistaklick får inte skriva över kollegan.
- Samtidiga nya/befintliga kontokopplingar får inte dela aktiv säljarprofil. Korsvis adminändring lämnar minst en aktiv administratör. Fakturans ansvarigsnapshot bevarar månads-/årsutfall och marginal vid orderansvarsbyte, rensas inte av klientpayload och döljs för produktion.

SQLite kör riktiga migreringar och API-skrivningar. R2 och Graph är kontrollerade
ersättningar. Inga riktiga kundexporter, konton eller hemligheter användes, inga
nya användare bjöds in och ingen Site-publicering gjordes av denna kodändring.
Riktig återställning i hostingen, autentiseringsgräns, integrationer, mobil och
personalens användbarhet är fortfarande inte verifierade.

## Körprov inför publicering 2026-10-04

Den befintliga Sites-källan har hämtats på revision
`e5e99b6503681cebf4870a976e31a7e600299bae`. Skillnaden mot GitHub-baslinjen
är dokumentation/CI och borttagen typkontrollcache, utan skillnader i produktkod.
Samma Site-identitet, begränsade delning, DB-/BUCKET-bindingar och migrationer bevaras.

`tests/runtime-smoke.mjs` kör den byggda Worker-koden i Cloudflare **workerd**
med isolerad, diskbaserad lokal D1 och R2 via de riktiga HTTP-handlers som ska
publiceras. Provet är godkänt: startsidan renderas, anonymt CRM-anrop ger 401,
kund/order/korrekturgodkännande/produktion sparas och tre filer om totalt
**13 500 000 byte** laddas upp, exporteras och återställs. Backupen är över
18 MB. Alla återlästa filers SHA-256, korrekturlänk, skissversion, arbetsfoto-
och arbetsversionslänkar, idempotent återförsök och oförändrad källarbetsyta
kontrolleras. Här används inga ersättningar för D1/R2-metoderna.

Kör efter `node tests/outlook.mjs` och `pnpm build`:
`node tests/runtime-smoke.mjs`. CI kör nu även bygge och detta prov.

Detta är ett verkligt körprov med **lokal emulering**, inte återställning i
den publicerade Sites-databasen. Hostingens identitetsgräns, riktiga konton,
Fortnox/Outlook och personalens användbarhet behöver fortfarande provas.
Öppna äldre CRM-flikar måste laddas om efter publicering. Återgång till v13
efter nya skrivningar kräver en datamedveten rutin: äldre schema bevarar inte
de nya leverans-/hinderfälten vid senare orderskrivning.

## Historisk verifiering 2026-09-17

- GitHub-baseline `3504f82d6f5ecce24f01c39963091eb612e9d76f` har verifierat samma Git-träd som ursprungsrevision `e5e99b6503681cebf4870a976e31a7e600299bae` (alla 200 spårade filer och filrättigheter).
- Node.js v24.19.0.
- `node tests/outlook.mjs`: godkänd, inklusive CRM-, v12- och v13-scenarier.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: godkänd.
- Den första lokala kontrollen kördes i en förberedd kopia utan next-env.d.ts eller .next, med befintliga installerade beroenden från källprojektet.
- Därefter godkändes [GitHub Actions körning 35219668126](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/35219668126), jobb `105196419107`, för PR #1 och dess head-revision `740e993fdabde3aa050034f006d1d09ebb14e689`. Ren installation med `pnpm install --frozen-lockfile --prod=false`, CRM-/Outlook-regressionerna och TypeScript slutfördes med resultat `success` på Node 24.
- Applikationskod och databasmigreringar är oförändrade. Ingen publicering har gjorts.
- [PR #1](https://github.com/ludros93-prog/MAgnussons-CRM/pull/1) är sammanslagen till `main` som `bf2296e4d3fc99f2ef892b675efbcda4faceeb10`. CI, PR-mall och arbetsinstruktioner finns därmed i huvudbranchen. Kontrollera varje senare revisions egna kontroller.

## Vad resultatet visar

Den rena GitHub-körningen visar att de låsta beroendena kunde installeras och att den isolerade regressionstestsviten och typkontrollen gick igenom. Microsoft Graph och R2 ersätts med kontrollerade testimplementationer; SQLite använder riktiga migreringar och API-skrivningar.

Resultatet verifierar inte produktionshostingens åtkomst eller återställning, riktiga Outlook-/Fortnox-konton, rendering, mobilinstallation eller användbarhet för Magnussons personal. Se [CLAUDE_REVIEW.md](CLAUDE_REVIEW.md) för gränser och källhänvisningar för en ny v13-granskning.

## Visuell resultatöversikt 2026-10-04

Utgångspunkt: GitHub-main `5afd4ce45ed21e27167dc291a2e6b5962607324e` och
publicerad Sites-källa `39c84f63efe3966dbef6462bd85d598b9ff8cb62`, med samma
Git-träd `bb3ed3c40ab36ae5f412c216245aad000ef16b31`. Ändringen ligger på
`feat/visual-results-dashboard`; PR-huvudets revision identifierar resultatet.

- CRM-/Outlook-regressionerna, TypeScript, produktionsbygge och lokal workerd/D1/R2-kontroll är godkända. Byggvarningen om stora klientpaket kvarstår.
- Nya KPI-prov täcker årets tolv månader, person/team/period, saknade och uttryckligen noll mål, ackumulerade mål och bevarat fakturaansvar vid senare orderansvarsbyte. Teamrader använder samma beräkning som personvyn.
- Chromium/Playwright med det byggda gränssnittet och en isolerad lokal workerd kontrollerade 1440, 768, 390 och 320 px utan horisontell sidöverströmning eller JavaScript-fel. Månadsval, ackumulerad graf med motsvarande sammanfattning, fakturaunderlag för månad/år, egen/team-växel, valbara placeringar och Min dag provades. Skärmbilder av dator- och mobilvyn granskades.
- Webbläsarprovet använde fiktiva kunder/fakturor och en simulerad administratör. Det verifierar layout och navigering, inte riktig inloggning, personalens användbarhet eller en ansluten integration.
- Inga nya beroenden, migreringar, anslutningar, kontoinbjudningar eller ändrade åtkomstregler. Publicering ska ske till samma Site och bevara dess begränsade delning.

## Min dag som tydlig arbetsstart 2026-10-04

Utgångspunkt: GitHub-main `2d43f6148af11896d0e7601006197fa385fc6af3` och
publicerad Sites-källa `96a4f5301d61e1677e23531f489a9cff5448f8b8`, med samma
Git-träd `832fcc1ffe15007318468a77199a9761affde5d9`. Ändringen ligger på
`feat/clear-my-day`; PR-huvudets revision identifierar resultatet.

- CRM-/Outlook-sviten, TypeScript och produktionsbygge passerar. Lokal workerd/D1/R2-kontroll passerar med 13,5 MB filer och verifierade backup-/filreferenser. Byggvarningen om stora klientpaket kvarstår.
- Chromium/Playwright med byggd app och isolerad lokal workerd/D1/R2 provade 1440, 768, 390 och 320 px samt 200 procent textstorlek vid 390 px utan horisontell sidöverströmning eller JavaScript-fel. Dator- och mobilskärmbilder granskades.
- Nästa-handling-knappen öppnar gemensam uppföljning. En privat anteckning stängdes, laddades om och återupptogs med bevarad text. Sparstatus för utkast är synlig på mobil. Ett kontrollerat utkastläsfel och återförsök provades.
- Statuskort flyttar tangentbordsfokus. Resultatkortet öppnar aktuell månad även efter ett tidigare historiskt månadsval, med rätt egen/team-vy.
- Simulerad admin utan säljarprofil visar inga personliga nollsiffror och öppnar teamets dag uttryckligen. Säljare har egen scope. Läsare ser leveransunderlag utan bekräftelse-/sparknappar. Leveransuppföljning kan vara nästa handling och kön finns kvar.
- Browserproven använde endast fiktiva data, lokala privata utkast och simulerade inloggningar. Ingen riktig hostinginloggning, integration eller personalens användbarhet verifierades; inga riktiga konton eller kunddata ändrades.
- Inga beroenden, migrationer eller serverregler ändrades. Samma Site och begränsade delning ska bevaras vid publicering.

## Stabil resultatidentitet, B01a, 2026-10-05

Utgångspunkt: main `f5c2557ad942593f42d8786bab2b4ff4bedb18cf`, publicerad Sites v17 med samma källträd. Leveransbranch `feat/stable-seller-results`, [PR #7](https://github.com/ludros93-prog/MAgnussons-CRM/pull/7).

- Hela `node tests/outlook.mjs` passerar, inklusive tidigare CRM/order/produktion/åtkomst/backup/kontaktspärr och nya `tests/seller-profiles.mjs`. Node 24.19.0; låsta befintliga beroenden, inga nya paket eller SQL-migreringar.
- Nya regressioner kör verklig SQLite/API: historiska namn/mål utanför dagens ansvar, uttrycklig migration, autentiserat medlems-ID skilt från inloggnings-ID, oförändrat resultat vid namnbyte, samma visningsnamn, inaktiv säljare, nytt konto på tidigare namn, saknade snapshots, serverägd attribution och audithistorik, förfalskade fält/roller, initierings-/profilkonflikter och rolländring mellan preflight och SQL-commit.
- Streamad återställning behåller resultatprofil, mål och attribution men rensar aktuella kontolänkar; före-/efter-resultat och oförändrat källunderlag verifieras. Det är isolerad lagring, ingen återläsning av Magnussons live-data.
- Chromium/Playwright kör det byggda gränssnittet på 1440 och 390 px med syntetiska API-svar. Sex scenarier provar tomma kontolänkar, uttrycklig initiering/tangentbord, gamla inaktiva länkar vid namnbyte, relänkningens orsak/granskning, bevarad inmatning vid 500/409/refresh, identiska namn och nekad personlig resultatvy utan medlemskoppling. Inga JavaScript-, asset- eller externa anropsfel observerades; ingen horisontell överströmning. Skärmbilder granskades.
- Webbläsarprov använder kontrollerade svar; serverprov använder verkliga lokala handlers och SQLite med kontrollerad R2/Graph. Dessa belägger olika delar. Ingen riktig kontomappning, personalobservation, Fortnox-/Outlook-anslutning eller hostingåterställning genomfördes.
- Ett modulberoende upptäcktes av Node-regressionen och rättades med separat `crm-errors.ts`; samma RuleError återexporteras och gamla testförväntningar behålls. Initial kontokoppling har en första serverägd auditpost, och namnbyte/retry verifierar att hela historiken bevaras.
- Slutrevisionens TypeScript, produktionsbygge och lokala workerd/D1/R2-prov passerar. Runtimeprovet omfattar 13,5 MB binära filer, 18 010 827 bytes komplett strömkopia, verifierade fil-/korrektur-/fotolänkar, hashkontroll, idempotent återförsök, oförändrad källa och nekat anonymt anrop. Samtliga sex browser-scenarier kördes om och passerade på detta slutbygge.
- Main-/publiceringskvittens anges i PR #7. GitHub Actions följs upp separat när den pågående externa driftstörningen medger körning; grön lokal verifiering påstås inte vara grön GitHub Actions.

## Granskat kundansvarsbyte, B01b1, 2026-10-05

Utgångspunkt: main `2aac0477e1a66bcd584a8030d23ea68b1a1af194`, live Sites v18 med samma källträd. Branch `feat/customer-responsibility-transfer`, [PR #8](https://github.com/ludros93-prog/MAgnussons-CRM/pull/8).

- Hela `node tests/outlook.mjs` passerar, inklusive tidigare orderfall 40→45, 50→48 med godkännande, kassation, delleverans, utkast, åtkomst och nya `tests/customer-responsibility.mjs`. Node 24.19.0, befintliga låsta beroenden, inga nya paket eller SQL-migreringar.
- Nya SQLite/API-prov täcker stabila profilval, uttryckligt aktivitetsurval, andra kunders/ansvarigas och avslutade/kopplade/specialuppgifter, identiska visningsnamn, omappat äldre ansvar, initieringskrav, vanlig skrivnings-/importbypass, skyddad serveraudit och referenser samt bevarade faktura-/prospectresultat, mål och gamla affärer/order/möten.
- Verkligt injicerad databas-CAS provar oberoende ändring respektive ändrad granskningskontext och samma föråldrade återförsök. Kvarvarande affärs-/orderdatum och ändrad fakturastatus utan stegbyte ingår i basis. Målmedlemmens rolländring mellan preflight och commit ger ingen CRM-sidoeffekt, jämfört med fullständig sparad förebild. Request-ID/innehållsfingeravtryck ger en auditpost, inte dubbletter.
- Nytt återköp och nytillkommen leveransuppföljning får kundens aktuella ansvariga; tidigare orderansvar, fakturauppgift och existerande historisk uppföljning behålls. Strömkopia/återställning bevarar överföringar, uppgiftskopplingar och resultat, rensar aktuella kontolänkar och avvisar brutna/korsade auditreferenser.
- Det tidigare resultatprofiltestets direkta kundansvarsbyte sker nu via samma granskade överföring. Förfalskad kvalificeringshistorik och historiska ID-/beloppsförväntningar är bevarade; nya negativa prover avvisar den gamla skrivvägens ownerbyte efter initiering. Inga gamla resultatförväntningar har sänkts.
- Slutkandidatens TypeScript, produktionsbygge med pnpm **11.25.0** och lokala workerd/D1/R2-prov passerar. Runtimeprovet omfattar 13 500 000 bytes binära filer, 18 010 856 bytes strömkopia, verifierade filhashar/korrektur-/arbetsfotolänkar, idempotens, oförändrad källa, renderad startsida och nekad anonym åtkomst. Runtimeprov körs efter regressionsharness och bygge; en första start före kompilerad testharness saknade `work/core.mjs`, därefter passerade den avsedda sekvensen. Detta är isolerad lokal lagring, inte live-återställning.
- Oberoende read-only API-/datagranskning hittade inga kvarvarande blockerande produktfynd inom denna avgränsning. Operativa ansvarsetiketter och full personalöverlämning återstår. V18/äldre kod får inte användas som skrivande rollback efter nya ansvarshistoriker; se OPERATIONS.
- GitHub-main/PR #7-kontroller slutade med runner-tilldelningsfel utan körda steg; ingen kod-/CI-fix är belagd. Nästa merge/publicering väntar på gröna checks för exakt PR-head. Lokal verifiering påstås inte vara grön remote CI.

- Chromium/Playwright mot det frysta byggda gränssnittet passerar sex scenarier på 1440 och 390 px: tomma initialval, tangentbordsval, exakt valbara uppgifter, återställd granskning vid ändringar, 500/409/refresh med bevarad text och val, explicit borttagning av val som blivit ogiltiga, inaktiv målprofil samt adminbehörig ingång. Nytt ansvar och bevarad historik syns i kundkortet; vanligt kundformulär visar ansvar som läsbart fält. Alla elva layoutmätningar saknar horisontell överströmning; inga JavaScript-, asset- eller externa anropsfel. Mobil- och datorskärmbilder granskade.
- Browser-API använder enbart syntetiska `example.com`-svar. Rapporten verifierar UI, inte verklig hostinginloggning eller skrivning på Magnussons data. Worker-entrypointens SHA-256 är `24a75b9c396b206b0beb63122f7bd11e5bcdd8ca9f872be0aa2ed0c595168a51`. En initial för snäv testselector rättades i scratch; ingen produktkod ändrades för att få browserproven gröna.

Inga riktiga kunder, konton, utskick, integrationer, automationsinställningar eller delningsregler ändras av dessa prov. Exakt sparad head, remote checks och senare main/live redovisas i PR #8.

## Privata kundflöden, B05a, 2026-10-05

Utgångspunkt: main `2aac0477e1a66bcd584a8030d23ea68b1a1af194`, publicerad Sites v18 från `8b777864ff47922e364a3f6173026593f6628559`, samma träd `441809408e0b5884df77933de622af8dc514cb66`. Kandidatbranch `feat/private-customer-workflow-drafts` i [PR #9](https://github.com/ludros93-prog/MAgnussons-CRM/pull/9) utvecklades ursprungligen oberoende av det då väntande kundansvarsbytet i PR #8. Verifierat kodträd `284091a950637e2b99c2cf1ffa4ad5ae1ab0a4c2`, kodkandidat `692d6ee1ae81cfebe66ec79755ab934aa0ed0085`; senare kvittensändring gäller endast Markdown. Ingen SQL-migrering, ändrad kontoanslutning eller nytt beroende.

- Hela `node tests/outlook.mjs` och TypeScript med `--noEmit --incremental false` passerar på Node 24.19.0. Produktionsbygget passerar med repoets pnpm 11.25.0. Befintliga orderprov omfattar 40→45, dokumenterat godkänd 50→48, kassation, delleverans och idempotenta återförsök. Microsoft Graph/R2 ersätts i denna regressionssvit; SQLite och API-handlers är verkliga.
- Nya `tests/customer-workflow-drafts.mjs` provar ofullständig privat autosparning utan CRM-version/kundkontakt/aktivitet, användar-/arbetsyte-/rollisolering, rätt kund/flöde, exakt originalbasis och sparade värden, två enheter, samma kund/oberoende kunder, verklig SQL-CAS och rolländring, atomisk arkivering, förlorat svar och sena skrivningar till arkiverat utkast. Återupptaget kryss blir ingen kontakt idag; gammalt eller saknat kontaktdatum avvisas. Onboardingavslut och affärsskapande förblir uttryckliga handlingar.
- Slutbyggets `node tests/runtime-smoke.mjs` passerar med riktig workerd och diskbaserad lokal D1/R2 via byggda HTTP-handlers. Tre binära filer om 13 500 000 byte exporteras/återställs med en komplett strömkopia om 18 010 827 byte, verifierade hashar och korrektur-/foto-/versionslänkar, oförändrad källa och nekad anonym åtkomst. Tillägget provar privata ofullständiga kundutkast, atomisk CRM-publicering/arkivering, samma mutationsresultat vid förlorat svar och nekad sen autosparning. Detta är lokal emulering, ingen hostingåterställning.
- Oberoende slutgranskning av API/UI hittade inga blockerande fynd. Under arbetet rättades ett kvarvarande föräldraformulär vid konto-/rollbyte, ärlig status för saknad serverversion och en för bred konfliktknapp på mobilen. Äldre utkastbeteenden behåller samma regressionskrav; inget prov kräver riktiga kundskrivningar.
- Chromium/Playwright på det kalla slutbygget passerar 15 scenarier och 19 skärmbilds-/layoutmätningar på 1440/390 px. Autosparning, omladdning och exakt återupptagning från Min dag provas för alla tre flöden. Lokal workerd/D1 används för faktisk sparning, två browserkontexters 409-konflikt, CRM-publicering/arkivering och förlorat lyckat svar med samma request-ID utan dubbel historik. Nätfel bevarar text; aktuellt kundunderlag måste granskas uttryckligen; tangentbord fungerar; en annan testidentitet saknar utkast och läsare får 403. Inga JavaScript-, asset- eller externa anropsfel och ingen horisontell sid-/dialogöverströmning observerades. Skärmbilder granskades. Mobilens konfliktgranskning mäter 366 px klientbredd och 366 px scrollbredd.
- Konto-/rollbyte medan ett vanligt privat formulär är öppet styrs med två kontrollerade 409-state-svar, eftersom appens normala polling pausas under dialogen. Provet visar att aktuellt formulär stängs och privat text rensas vid en mottagen identitets-/rolländring; det verifierar inte riktig Sites-inloggning eller detekteringstid vid plattformens kontobyte. Övriga ovanstående utkast-/CRM-skrivningar går via byggda HTTP-handlers och verklig lokal D1. Artefaktindex SHA-256: `f8d7226a8d71ddca8f8f82dc8b9665ecb8bd3a5ddbcdac32ed8ba0ac05a78c32`; byggträdets SHA-256: `24022391df423226bf03bc561abe73cf9ddc64379bebf498f39461dd556e08c8`. Fiktiva testdata och bilder förvaras utanför repot.
- Konton, fysisk telefon, personalens användbarhet, Fortnox/Outlook och återställning i Sites är inte verifierade genom dessa prov. [agent/USABILITY.md](agent/USABILITY.md) är ett framtida observationsprotokoll, inga genomförda personalresultat. Källa, main och live kvitteras separat i kandidatens PR. Merge kräver gröna GitHub-checks för exakt head enligt senaste körinstruktion, även under den bekräftade Actions-störningen.

## 2026-10-05 – PR #8 sammanslagen, integration i PR #9

PR #8, exakt head `609fad2ffee738c7da0b87efa1d618f5ff018f88`, har passerat hela GitHub-CI i körning `37370939213`, försök 2, jobb `111988825268`, och är sammanslagen till main `7b0fb896be530c3f19c84aa392e1015ac2147158`. Tidigare runnerfel ovan avser historiska försök. Verifierad live-bas är fortfarande Sites v18; en publicering av B01b1 har inte verifierats här.

PR #9 integrerar färsk main genom vanlig lokal merge utan commit. Kundansvarsbyte och privata kundflöden bevaras tillsammans. Tidigare separata testbelägg gäller respektive kandidat; den integrerade kandidatens slutkontroller, remote checks, merge och publicering kvitteras separat när de faktiskt utförts. Inga riktiga konton, kundöverlämningar eller utskick genomförs av integrationen.

Integrationskontroll: hela `node tests/outlook.mjs` passerar med exit 0, inklusive både kundansvarsöverföring och privata kundutkast. TypeScript `node node_modules/typescript/bin/tsc --noEmit --incremental false` passerar med exit 0 på Node 24.19.0. `git diff --cached --check` är ren och inga olösta mergekonflikter kvarstår. Dessa prov gäller arbetskopians kombinerade kod med HEAD `dcaaf79ed3d4a0cc31c3ac2dda204d1aa4cf7014` och MERGE_HEAD `7b0fb896be530c3f19c84aa392e1015ac2147158`, ännu utan mergecommit. Integrerat produktionsbygge med pnpm 11.25.0 och workerd/D1/R2-runtimeprov passerar: 13 500 000 bytes filer, 18 010 856 bytes komplett strömkopia, hash-/filreferenser, oförändrad källa, idempotens, privat utkast och atomisk CRM-publicering/arkivering samt nekad sen autosparning. Browserprov och GitHub-kontroller för sparad slutrevision kvitteras separat.

- Integrerat kallt Chromium-prov passerar samma 15 scenarier och 19 layout-/skärmbildskontroller på 1440/390 px mot verklig lokal byggd Worker/D1/R2. B01b1 och B05a fungerar tillsammans; samma fel-/konflikt-/privatåtkomstkrav behålls. Inga JS-, asset-, externa anrops- eller överbreddsfel. Artefaktindex SHA-256 `ad6f4a1fce9330ff0060e54b28fdcd616fd4bdecf5540ea56ffe29078f06399b`; dist-träd SHA-256 `76718396173d570c30961d7fd928010795312df4ee2b12ee9a315b473b4ff97d`. Endast fiktiva data/lokala authheaders, inga verkliga Sites-konton eller kundskrivningar.

## D01 – kundkort och svensk avsändningsdag, slutkontroll 2026-10-05

Verifierad integrationsbas: main `6a58c2e2f85b5f83dd1002a6aedd1f8f33ad6bba`, träd `557e2c7cad89998e01ca4ebca5897fbeed658505`, med PR #8 och #9 sammanslagna efter gröna GitHub-kontroller för respektive exakt head. D01 ligger i `feat/customer-overview-design`; nedanstående resultat gäller slutbygge 4 av den lokala integrerade kandidaten. Verifierad live-bas är fortfarande Sites v18 från `8b777864ff47922e364a3f6173026593f6628559`, custom-delning, policyrevision 2 och en extern besökare. D01 har ännu ingen kvitterad merge eller publicering.

- Hela `node tests/outlook.mjs` och TypeScript med `--noEmit --incremental false` passerar på Node 24.19.0. Produktionsbygget med pnpm **11.25.0** passerar. Tidigare mängd-, order-, ansvars-, roll-, CAS-, återställnings- och utkastkrav behålls; gamla testförväntningar har inte sänkts.
- Ett faktiskt datumfel upptäcktes vid svensk midnatt: produktionsavsändningens UTC-prefix kunde ange gårdagen medan CRM använder dagens svenska datum. `latestDispatch` använder nu uttryckligen `Europe/Stockholm` för tidsstämplar; direkta leveransers redan registrerade datum behålls. Ogiltig äldre tidsstämpel ger ett begripligt regelfel. Vinter-/sommargränser, senaste avsändning samt både `receipt_confirm` och vanlig orderskrivning provas. För tidigt kundmottagande ger 400 utan ändrad CRM-version, order eller aktiviteter. Detta rättar avsändnings-/mottagandekontrollen; övriga tidszonsjämförelser återstår enligt BACKLOG.
- Slutbyggets lokala workerd/D1/R2-prov passerar via byggda HTTP-handlers: tre binära filer, **13 500 000 byte**, komplett strömkopia **18 010 856 byte**, verifierade hashar och korrektur-/arbetsfotolänkar, oförändrad källa, idempotens, nekad anonym åtkomst, privat kundutkast, atomisk CRM-publicering/arkivering och nekad sen autosparning. Det är isolerad lokal lagring, ingen hostingåterställning.
- Kallt Chromium/Playwright-prov på slutbygge 4 passerar **16 scenarier och 36 layout-/skärmbildskontroller** för kundkortet på 1440, 768, 390 och 320 px. Sektioner, tangentbordsfokus, primär/sekundär aktivitet, exakt orderöppning, tom kund, datumgrupperad historik, interna anteckningar, långa värden och läsarens tillåtna navigation provas. B01b1-dialogen behåller tomma initialval; öppning/stängning orsakar ingen kundöverföring. Lokal byggd Worker/D1 använder enbart fiktiva data. Outlooks visningsprov använder separata syntetiska GET-svar.
- Vid 200 procent kontrollerad textförstoring på 390 px ryms ord, sektionsknappar och ansvarsöverföringens text/ikon inom sina ytor. Provet fördubblar textstorlek och radhöjd; det är inte browserns sidzoom. Korta mobiltexter har kvar fullständiga ARIA-namn. Inga JavaScript-, asset- eller externa anropsfel observerades. Normalbilderna har 0 px dialogöverbredd. Vid kontrollerad textförstoring mäter dialogen 366 px klientbredd och 367 px scrollbredd, inom provets 1 px tolerans; dokumentet är 390 px och ingen text eller ikon klipps.
- Före/efter mot sparat B01a-bygge mäter första handlingen på normal 390 px till **666–710 px** och normal 320 px till **794–838 px**, inom 844 px viewport. Extra långa värden på 390 px ger **786–830 px**. Vid extra långa värden på 320 px ligger handlingen på **974–1018 px** och nås med vertikal scroll; den påstås inte synas direkt i detta fall. Slutbygget ersätter tidigare kandidater där huvudknappen låg för långt ned eller ansvarsöverföringens text klipptes vid förstoring.
- **Kvarvarande begränsning:** den globala topbars Arbetsyta-trigger kan vid 320 px täckas av arbetsytebannern och blockera pointerklick. Tangentbord användes för profilinitieringshinten i detta prov. Fyndet är dokumenterat i BACKLOG och ligger utanför kundkortets CSS. De 16/36 kontrollerna belägger kundkortet, inte hela appens mobilanvändning. Fysisk telefon, Magnussons personal, verklig Sites-inloggning, Microsoft/Fortnox/AI och hostingåterställning har inte verifierats.
- Artefakter finns utanför Git i `/workspace/scratch/customer-design-browser/final-build4-evidence/report.json` och `position-comparison.json`, tillsammans med de 36 skärmbilderna. Browserprovet skickar inga gemensamma CRM-affärsändringar och inga Outlook-POST; callbackproven använder verkliga privata draft-POST. Browserrapport SHA-256: `f8d2f24569bbb7a9a9c44233b8fc7aa7902f4923513389cbb9af7ec092aedede`. Slutworker SHA-256: `a21572ed83ec066750d579d61ca056b678063165606c9a8eb612823990bbd358`. Byggträd SHA-256: `e82ea5c9d61e80d90969b7cf8b4e83cf3e7bee7912d8dcf858808a7d7c9bf045`.

Lokala kontroller förbereder kandidaten. Exakt sparad head, obligatoriska GitHub-checks, faktisk merge och eventuell senare Sites-publicering kvitteras separat i leveransens PR när utfallen finns. Inga verkliga kunddata, konton, utskick, externa anslutningar eller delningsregler ändras av proven.
