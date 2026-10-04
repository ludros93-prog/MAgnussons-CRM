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
