# Återkommande arbete för CRM-superbyggaren

## Datakompatibilitet vid kundåteröppning – v56

V56 använder befintliga fält för kundstatus/ansvar, kundansvarshistorik, uppgift och händelse. Ingen ny tabell, SQL-migration eller höjning av minsta kompatibla skrivare över v55. Behåll v55:s profilavslutshistorik/validering vid återgång; oförändrad v54 är fortsatt osäker efter nya v55-data.

Verifiera den sista kandidatens återöppningskontrakt, exakt återförsök/CAS, relevanta ändringar i visat granskningsunderlag och bevarad historisk attribution. Vid återgång till v55-kompatibel app ska nya task-/event-/kundansvarsposter bevaras i JSON/NDJSON-backup och isolerad faktisk återläsning. Kontrollera verklig formatkompatibilitet i [VALIDATION](../VALIDATION.md); lokal syntetisk återställning ersätter inte hostingåterställning.

En kundåteröppning ändrar inte konto, sidåtkomst, privat kommunikation eller ansvar i andra arbetsytor. Gör inga skrivprov på riktiga kundorder. Körbokens befintliga mandat, arbetssätt och dataregel för v55 gäller fortsatt.


## Dataregel efter v55:s profilavslutshistorik

Efter att `retirementHistory` sparats krävs **v55-kompatibel skrivare** för aktuell CRM-data. Äldre oförändrad v54 normaliserar bort den additiva profilhistoriken; dess gamla schema kan därför inte användas som säker skrivande återgång. Detta är en kompatibilitetsregel, inget påstående om att Sites automatiskt spärrar äldre deployer.

Vid korrigering/återgång, behåll v55:s profilfält, historikvalidering och spärr mot ny tilldelning/återöppning. Kontrollera kandidatens parser, API, JSON/NDJSON-backup och isolerad faktisk återläsning med syntetiska filer innan publicering. Återpublicera ingen äldre skrivare enbart för att dess UI laddar. En äldre app kräver faktisk full databas-/fil-/versions-/länkåterställning från före ändringen och en plan för arbete som tillkommit därefter.

Gemensam CRM-backup omfattar inte konton, privata utkast eller Outlook. Profilernas aktuella medlemslänkar töms vid befintlig återställning och måste återkopplas uttryckligen; historiska aktörsfält ger ingen åtkomst. Lokal syntetisk återställning är ingen utförd hostingåterställning. [VALIDATION](../VALIDATION.md) anger den senaste faktiskt prövade kompatibiliteten och provens miljö.

Följ [MISSION.md](MISSION.md), aktuell [AGENTS.md](../AGENTS.md) och [BACKLOG.md](BACKLOG.md). Körboken beskriver hur en schemalagd eller direkt startad körning förbättrar den befintliga produkten. En körning kan fortsätta en tidigare leverans, men ska utgå från färsk källa och dagens kontroller.

## 1. Fastställ källa, åtkomst och pågående arbete

Läs senaste status/verifiering och instruktionerna för dagens berörda område. Kontrollera arbetskatalog, branch, osparade ändringar och remotes innan något ändras. I den aktuella arbetsmiljön ligger repot i `/workspace/MAgnussons-CRM`; sök den behöriga checkouten om en senare körning börjar i en annan miljö.

```sh
git status --short --branch
git remote -v
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
git log -5 --oneline origin/main
```

Läs öppna PR:er och deras senaste head/checks via tillgängligt GitHub-verktyg eller CLI. Läs befintlig Sites-metadata vid app-/driftarbete: projektidentitet, åtkomstläge, publicerad revision, senaste deploy och eventuella pågående publiceringar. Den refererade Codex-tasken ska läsas med `read_thread` om verktyget finns; saknas det, använd explicit brief/repo och markera referensen oläst.

Vid miljöarbete: följ tillgänglig cloud-environment-skill för nätverk/credentials. Vid faktisk Site-publicering: läs Sites-skill och använd befintlig Site-bindning. Dokumentinstruktioner ersätter inte dagens verktygsresultat.

## 2. Respektera andra körningar

En timvis start får inte skapa två samtidiga mutationer av samma leverans. Kontrollera pågående agentarbete, lokala ändringar, öppna agent-PR:er och aktiv publicering. På samma arbetsvärd används en atomisk lokal körningsreservation utanför Git, med körnings-ID, starttid och ägd branch; håll den under körningen och släpp bara den egna reservationen. Om en reservation finns, kontrollera faktiskt pågående arbete före övertagande. Ta inte bort en annan körnings reservation eller branch enbart för att den ser gammal ut.

Lokala reservationer skyddar bara samma värd. Kontrollera därför fjärrgrenar/PR:er även från en ny miljö. Fortsätt en verifierat avslutad tidigare körnings öppna leverans, hjälp med läsning/granskning eller välj en oberoende uppgift. Om ägarskap inte kan avgöras, gör read-only kontroll och dokumentera vänteläget för nästa körning. Publicera aldrig samtidigt till samma Site.

Bevara andra agenters och användarens filer. Undvik `reset --hard`, `clean`, oavsiktlig stash, force-push och omskrivning av delad historik. Använd en separat branch/worktree när arbetsytan innehåller främmande ändringar. Dela upp ägandet per fil/domän om flera agenter används och samla deras resultat före slutkontroll.

## 3. Välj och avgränsa en leverans

Välj högsta genomförbara prioritet enligt [BACKLOG.md](BACKLOG.md). Beskriv problemet med ett verkligt arbetsmoment, dagens beteende och önskat beteende. Koppla relevant T01–T26 och ange vilken sorts belägg som krävs. Bekräfta ett misstänkt gammalt fel med kod/test först.

Utgå från `origin/main` i en egen branch. En pågående PR fortsätts med samma branch och aktuell bas; bygg inte en konkurrerande ändring utan att först kontrollera den öppna leveransen. Kontrollera nya main-ändringar före slutrevision och inför merge.

```sh
git switch -c feat/crm-tydlig-leverans origin/main
```

Använd ett namn som beskriver dagens faktiska problem. Förändra bara relevant produktlogik och nödvändiga stödytor. En liten komplett del av ett stort migreringsarbete är en giltig leverans; ett otestat halvt flöde ska inte aktiveras som fungerande.

## 4. Bygg och verifiera beteendet

Läs berörda domänregler, API, migreringar och tester. Behåll servervalidering, rättigheter, postbasis/CAS, atomiska skrivningar, request-ID:n och filåtkomst. Lägg meningsfull regression för ändrade mängder, revisioner, roller, identiteter och samtidighet. Testet ska visa det verkliga fel- eller gränsfallet; sänk inte förväntningen bara för grönt resultat.

För saknad anslutning: bygg adapter och kontraktprov, visa anslutningsstatus ärligt och bevara fungerande manuellt/importerat flöde. För okänd affärsregel: gör skillnaden synlig och konfigurerbar, bevara verifierat nuläge och dokumentera kvarvarande underlag. Skicka inga kundmeddelanden eller verkliga fakturor som en bieffekt av ett tekniskt prov. Använd isolerad lagring och fiktiva data för regression, runtime och browserprov.

Projektets miljö är Node 24 och pnpm 11.25.0. Gör ren installation om beroendena saknas eller underlaget har ändrats. Läs den aktuella CI-konfigurationen eftersom den kan innehålla fler obligatoriska kontroller.

```sh
pnpm install --frozen-lockfile --prod=false
node tests/outlook.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
pnpm build
node tests/runtime-smoke.mjs
git diff --check
```

`tests/runtime-smoke.mjs` körs efter fungerande produktionsbygge. Den provar HTTP-handlers i lokal workerd med isolerad D1/R2, inte live-kunddatabasen. `tests/outlook.mjs` inkluderar CRM/v12/v13 och kontrollerade R2/Graph-svar; det är inget riktigt Microsoft-konto.

Följ repo-/CI-kraven för slutrevisionen. Kontrollera UI i browser, mobilstorlek och med tangentbord när verktygen medger det. Saknas dessa verktyg, dokumentera begränsningen och kör relevanta kod-, typ- och runtimekontroller; påstå inget browser- eller personalprov. Om en kritisk handling inte alls kan verifieras, avgränsa den delen av publiceringen. Lagrings-/migrations-/backupändringar kräver isolerat återställnings- eller runtimeprov. Extern adapter behöver timeout, återförsök, frånkoppling och negativa behörighetsprov. Repetera eller utöka tester när en ändring, ett fel eller konkret osäkerhet motiverar det. Ändra inte produktkod bara för en historisk byggvarning utan belagt problem.

## 5. Spara och slå samman självständigt

Granska den slutliga diffen, alla nya filer och testresultaten. Kontrollera att kod/dokumentation inte innehåller driftdata, bilagor, exporter eller hemligheter. Uppdatera relevant status och verifiering med exakta gränser. Beskriv vad en användare kan göra nu, vad som prövats och vad som fortfarande kräver riktig anslutning eller observation.

Stagea avsedda filer uttryckligt i delad arbetsyta. Commit och push till arbetsbranch. Skapa eller uppdatera PR med konkreta problemet, slutbeteendet och relevant verifiering. Använd en strukturerad PR-body eller fil för flerradig text. Vänta på checks för exakt senaste PR-head och kontrollera eventuell ändrad main. Om ny kod tillkommit genom konfliktlösning ska berörda kontroller köras på den nya slutrevisionen.

När nödvändiga checks är gröna, diffen är begriplig och inget faktiskt hinder återstår: slå samman inom Ludwigs mandat utan en ny godkännandefråga. Bevara plattformens branchregler; skapa inte en teknisk kringväg om merge är blockerad. Hämta sedan färsk `origin/main` och verifiera vilken revision/träd som faktiskt hamnade där. En PR eller lyckad push är inte en merge.

Ludwigs senaste körningsinstruktion kräver gröna checks för exakt head före merge, även vid en extern Actions-störning. Lokala kontroller förbereder och verifierar kandidaten men ersätter inte detta krav. Dokumentera incident och faktiskt checkutfall, skilj runnerfel från körda kodfel, och fortsätt oberoende arbete medan merge/publicering väntar. Kör om samma revision när ett bekräftat infrastrukturfel är över; ändra inte kod eller CI bara för att få en ny körning. En misslyckad eller ännu köad kontroll får inte rundas.

Dokumentationsändringar behöver ingen app-publicering när de inte ändrar produktinnehållet. De behöver ändå läsbara länkar, giltigt underlag, ren diff och repoets obligatoriska kontroller.

## 6. Publicera när leveransen är verifierad

För en appändring: använd Sites-flödet för samma projekt och en dokumenterad källrevision. Läs aktuella Sites-instruktioner innan verktygsanropen. Skapa konkret byggbar leverans, förhandsgranska vid behov, kontrollera autentisering och behåll avsedd begränsad delning. Verifiera att D1-/R2-bindningar, migrationer och driftkonfiguration motsvarar ändringen.

Före en migrering eller ändring som påverkar data: prova migrering och återställningsväg isolerat, kontrollera faktiskt tillgänglig backup och bevara redan registrerade kundunderlag. Återgång till äldre kod får inte skriva bort nya fält eller filkopplingar. Vid otillräckligt underlag kan kodleveransen stå på main medan publiceringen är blockerad med konkret skäl; fortsätt oberoende arbete.

Publicera utan rutinfråga när rätt hostingåtkomst, kontroller och datahantering är verifierade. Kontrollera verkligt deployresultat, Site-identitet/revision och begränsad delning efteråt. Prova startsida, avsedd autentisering och det berörda arbetsmomentet på lämplig isolerad/testyta. Undvik att skapa riktiga kundorder för en smokecheck.

Om publicering misslyckas, kontrollera vilken version som faktiskt är aktiv innan återförsök. En förlorad verktygsrespons betyder okänt deployutfall, inte säkert misslyckande. Kontrollera aktuellt tillstånd och återkör först när dubbel deploy eller fel revision undviks. Återställ säker föregående version endast när dess datakompatibilitet är verifierad.

## 7. Stanna bara den hindrade delen

| Faktiskt hinder | Åtgärd |
| --- | --- |
| Regression, typfel, byggfel eller misslyckat obligatoriskt check | Reproducera, rätta och verifiera slutrevisionen. Ingen merge/publicering med obehandlat kravfel. |
| Reproducerad åtkomstläcka eller felaktig mängd/dataförlust | Prioritera avgränsad fix med negativt/regressionsprov. Skydda befintliga data och avstå bredare publicering tills felet är löst. |
| Saknad token, konto, behörighet eller verktyg | Förbered adapter/konfiguration/tester, dokumentera exakt otillgänglig del och fortsätt nästa oberoende förbättring. Påstå aldrig anslutning. |
| Saknad budget-/marginal-/policydefinition | Bevara verifierat nuläge, bygg tydlig inställning och märk öppet underlag. Räkna inte okänd kostnad som noll eller skriv påhittat beslut. |
| Oklar filägare, samtidig körning eller ändrad main | Kontrollera pågående arbete och hämta färsk källa. Granska/fortsätt befintlig PR eller använd oberoende worktree. Skriv inte över andra. |
| Okänd live-data-/backup-/migrationsväg | Genomför isolerade prov och säkra kodleveransen. Markera den riskfyllda deploydelen blockerad tills faktiskt tekniskt underlag finns. |
| Plattformens branchregel eller automatisk granskning stoppar handling | Följ regeln, använd tillåten säker väg när den finns och rapportera exakt blockerad handling/skäl. Begär inte generell auktorisering på nytt. |

Ett hinder är en verifierad begränsning för en bestämd handling. Inför inga generella approval gates, checklists som ersätter arbete eller hypotetiska stopp. Kundens verkliga godkännande för order/korrigerat antal och CRM-användarens avsedda utskickshandling är fortsatt affärsdata som agenten inte uppfinner.

## 8. Lämna ett användbart slutläge för nästa körning

Uppdatera backlog när leveransen faktiskt ändrar prioritet/status. Lämna relevant testresultat i verifiering och en status som skiljer följande tillstånd:

| Tillstånd | Vad rapporten ska ange |
| --- | --- |
| Kod/arbetsbranch | Branch, head, ändrat beteende, kontroller och öppen PR. |
| GitHub-main | Verifierad merge-revision/träd och checks för slutrevisionen. |
| Live/Sites | Verkligt publicerad revision/version, deployutfall och efterkontroll; annars orsak till ej publicerat. |
| Databas/filer/integration | Vad som faktiskt migrerats/återställts/anslutits, vilken miljö och vad som återstår. |
| Användbarhet | Browserprov respektive observerat personalprov med tydlig gräns mellan dem. |

Kort körningsrapport på svenska: ”Förbättrat … Verifierat … Main … Live … Hindrat … Nästa …”. Sätt inga nya datum eller ändra tom dokumentation bara för att skapa en rapport. Släpp den egna körningsreservationen efter avslutat arbete och bevara nästa steg i repo/PR så att en ny miljö kan fortsätta. Schemalagda framtida körningar bedöms från verkliga automationresultat, inte från att körboken beskriver dem.
