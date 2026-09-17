# Underlag för oberoende granskning av Magnussons CRM v13

Kontrolldatum: 2026-09-17. Produktkoden kontrollerades på GitHub-revision `bf2296e4d3fc99f2ef892b675efbcda4faceeb10`, som utgår från publicerad Sites-revision `e5e99b6503681cebf4870a976e31a7e600299bae`. Dokumentationsrättningen som lägger till denna fil ändrar ingen applikationskod eller testförväntan.

Den tidigare externa granskningen avsåg v11. Tabellen nedan beskriver vad som nu finns i koden och vilka befintliga tester som kontrollerar beteendet. Den ersätter inte granskarens egen bedömning eller ett användartest.

## Fynd från v11 att kontrollera på nytt

| Fråga | Implementation i v13 | Befintlig verifiering och gräns |
| --- | --- | --- |
| Kan 48 av 50 avslutas? | `order_shortfall` i `lib/crm-operations.ts` registrerar kundgodkänd minskning med orsak, godkännare, datum och avtalat värde. `lib/production-quantities.ts` beräknar återstående antal mot det ändrade målet. Kassation är separata rörelser och minskar inte automatiskt kundens beställning. | `tests/v12.mjs`, scenariot `48 av 50`, kontrollerar skickad status, faktisk tidigare leveransdag, en faktureringsuppgift, fakturaregistrering och kundmottagande. Kassationsscenarier kontrollerar ersättningsvaror. Helt nollställd order får inte bli en falsk leverans. |
| Kan accepterad order ändras före tryck? | `lib/order-revisions.ts` har `canAmendOrder` och ett separat förslag/godkännandeflöde på samma order. Tidigare accepterad version gäller tills ny accept registreras. Ny accept återställer korrektur- och leverantörsbekräftelse. | `tests/v12.mjs`, scenariot `40 blir 45`, kontrollerar antal, värde, bibehållet vinstdatum, revisionshistorik och spärrar. Ändringen kräver utkast/avbruten arbetsorder utan registrerat fysiskt arbete, antaljustering, leverans eller faktura. Detta är ingen generell ändringsrätt under pågående produktion. |
| Ger en kollegas ändring av annan kund fortfarande samma konflikt? | `app/api/crm/route.ts` prövar post-, uppföljnings-, order- och produktionsunderlag mot aktuell data. Kommandon i den uttryckliga listan `safe` får försöka igen efter en databas-CAS-konflikt. Övriga kommandon behåller global versionskontroll. | `tests/v12.mjs` kontrollerar två kunder från samma gamla vy, konflikt på samma kund, framtvingad CAS-konflikt, idempotens och att upprepade GET inte höjer CRM-versionen. Detta är inte ett belastningsprov med ett helt säljteam. |

CRM-GET gör en läsprojektion i stället för att spara saknade mottagningsuppgifter. Autentiseringen kan fortfarande skapa/binda en medlemsrad vid första inloggningen; påståendet om GET gäller CRM-arbetsytans data/version, inte en garanti att ingen databasrad någonsin skrivs vid ett GET-anrop.

## Admin-adresser och publik källkod

`lib/crm-auth.ts` innehåller inga hårdkodade e-postadresser. `initial()` läser runtime-inställningen `CRM_BOOTSTRAP_ADMINS`; saknat värde ger en tom lista. Befintlig medlemsrad kontrolleras före bootstrap. Ett känt e-postnamn ger inte i sig administratörsåtkomst.

Riktiga personadresser förekommer däremot i `tests/crm.mjs` som identiteter i den isolerade testmiljön och i `components/team-accounts.tsx` som formulärexempel. Att förneka all förekomst av dessa adresser i repot vore fel. Testkonfigurationen är inte driftkonfiguration. Äldre commits behåller innehållet även om ett senare commit byter adresserna.

Header-skyddet i den faktiska hostingen måste fortfarande verifieras separat. Att bootstrap ligger i runtime-konfiguration bevisar inte att en okänd hosting skyddar identitetsheadrarna.

## Installation och testresultat

[PR #1](https://github.com/ludros93-prog/MAgnussons-CRM/pull/1) har en godkänd [GitHub Actions-körning](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/35219668126): ren installation av låsta beroenden, `node tests/outlook.mjs` och TypeScript på Node 24. Tidigare formulering i VALIDATION.md om att ren installation inte körts är nu rättad.

`tests/outlook.mjs` laddar CRM-sviten, som inkluderar v12 och v13. Testernas ersättningar för Microsoft Graph/R2 är avsiktliga; resultaten får inte beskrivas som verifierade riktiga Microsoft-konton eller verklig återställning hos driftleverantören.

## Så läses koden

Om GitHubs mappvyer inte går att läsa automatiskt kan en bifogad TXT-ögonblicksbild användas. Kontrollera angiven Git-revision, filförteckning, uttryckliga utelämnanden och markörer för hela filer. GitHub förblir källan för fortsatt utveckling; TXT-filen är granskningsunderlag för en bestämd revision.

Med en klon kan granskaren läsa repot direkt och köra testerna. Följ AGENTS.md, arbeta på branch och lämna eventuella ändringar som PR.

Prioritera `lib/`, `app/api/`, `app/page.tsx`, domänkomponenterna och samtliga `tests/`. Läs även databasmigreringar, rollfiltrering, filhantering, återställning, sparade utkast och försäljningsberäkningar. Rapportera vilka filer/scenarier som faktiskt granskats och skilj kodfynd från risker och produktförslag.

## Kvar att bedöma

- Om de nya flödena har andra fel, särskilt vid samtidighet, avbrutna svar, orderavvikelser och byte av arbetsversion.
- Om säljare och produktion klarar sina uppgifter utan handledning, inklusive faktisk mobilinstallation och fotoval.
- Faktisk hosting, återställning, dataägarskap och ansvar för support.
- Riktiga Outlook-/Fortnox-/webbshopskopplingar. Dessa har inte blivit aktiva genom GitHub-överföringen.

Granskaren ska pröva rättningarna själv och rapportera nya eller kvarvarande fel. Att de gamla scenarierna nu har godkända tester är inte ett godkännande för skarp drift.
