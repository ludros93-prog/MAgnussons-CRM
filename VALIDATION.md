# Bestående status för privata formulärutkast – v27, 2026-10-06

## Beteende och avgränsning

Generella privata formulärutkast har en bestående textregion med role=status, aria-live=polite och aria-atomic=true. Laddning, väntande, sparning, fel och konflikt uppdateras utan fokusflytt. Tidsstämpel och återförsöks-/versionsknappar ligger utanför regionen. Ett rent formulär har en tom visuellt dold region, utan extra layoutavstånd eller falskt Sparat. Övriga DraftStatus-konsumenter behåller tidigare DOM och beteende.

Ändringen är opt-in endast från FormDraftStatus. Provider, effekter, register/flush/consume, identitets-/arbetsytegräns, serverroller, CAS, request-ID, atomisk publicering, API, lagring, filer, backup, beroenden och hostingmanifest är oförändrade. Ingen migration krävs. V26 är datakompatibel återgång men återför avsaknad av generella hjälpmedelsstatusar; ingen rollback utfördes.

## Faktiska slutprov

- Fryst source `1a7e8417446a3d1ce3ea0873219f7627e614df8c`: full CRM/Outlook-regression (36,82 s), TypeScript (8,42 s), pnpm 11.25.0-bygge (8,81 s), isolerad workerd/D1/R2-runtime (5,51 s) och diff-check, terminal 0. Node 24.19.0. Befintliga mängd-/revisions-/acceptans-/CAS-/idempotenskrav behålls. Detta är syntetiska tekniska prov, inga riktiga kundorder eller kundgodkännanden.
- Runtime återställer 13 500 000 byte i tre testfiler, arkiv 18 010 856 byte, verifierade hashar, korrektur-/fotolänkar, idempotent retry, privata arbetsflöden och atomisk publicering. Ingen faktisk hostingåterställning påstås.
- Chromium mot exakt byggd HTTP-Worker och egen migrerad syntetisk D1/R2: **13/13 PASS** i en helt färsk slutkörning. Sex återhämtningsfall på 320×844, 390×844 och kort 390×460, normal och kontrollerad exakt 200 procent computed dialogtext. **23** förstoringar, **12** faktiska retry-Tab-/pointerkontroller, två konfliktknappar med Tab och en vanlig pointer-ersättning. Ingen OS/browser-zoom eller fysisk telefon påstås.
- MutationObserver: 23 spår/152 snapshots, noll observerfel. Samma text-only polite/atomic nod genom loading → fel → tom sr-only clean → pending → saving → saved → sparfel → saved. Inga tider/knappar inne i regionen eller aria-hidden/display:none/visibility:hidden-ancestors. Inputfokus och markering bevaras. DOM-semantik är inget prov av faktisk skärmläsaruppläsning.
- Fem loaderformtyper (kund, affär, uppgift, möte, generisk order), clean, settings och faktisk readerroll passerar. Reader har 19 disabled kontroller samt submit och inga privata anrop. Generisk note-createUI är inte nådd. Befintlig kundplan behåller exakt en egen wf-save-summary-status och ingen ny nästlad live-region i DraftStatus-detaljer.
- **19** verkliga privata GET 200, **19** POST 200 (andra syntetiska aktören ingår), **en faktisk Worker-CAS409**. Samma enda privata id går revision 1→2→3 i konfliktfallet. Åtta GET 503 och 13 POST 503 är kontrollerade browserresponses; lyckade läsningar/skrivningar går till verklig Worker. Text och request-ID bevaras vid misslyckat försök och stängning. **0 shared CRM POST**; båda arbetsytors samtliga delade tabeller/settings/version matchar hela fixture.
- Clean 390×460: första input och footer relativt formtop har **0 px** skillnad mot v26; inputhöjd 44 px och hela formhöjden är oförändrade. Tom status lägger inget nytt gridavstånd.
- **42 bilder** och reproducibel harness utanför Git. Root granskade final sparstatus och faktisk CAS409 vid 200 procent text. Samtliga **96 distfiler/source/tree/Worker** är byteidentiska före/efter; gitclean. Egen PID 70874 stoppad terminal 143, portar 8920/8921 stängda och bara ägd temporär store NxK7UH borttagen.
- Slutrapport `scratch/generic-draft-announcements-browser/final-1a7e841/report.json`, SHA256 `c3ec0220fc1c8ae96bf1d9b6434dcaca2df65f95bf9c4c540e9a08ad2c573603`. counts, request-ID-/revisioner, snapshots, artefaktindex, source-integrity, teardown och bilder ligger utanför det publika repot.

## Baseline och ej publicerad kandidat

Faktisk v26/809b77e-baseline visar synlig laddning och fel/retry men inga role=status/aria-live/aria-atomic i generellt DraftStatus. Verkligt retry-GET 200 utan privat POST och oförändrade snapshots. Baselinjerapport SHA256 `fbc30ff610714d72a9f83befa51e2160d3edcd57b68a4512bfa4eae7a1509261`.

Första källa c653839 passerade 13 fall men gav extra 14 px clean-gridgap. Den har aldrig pushats till Sites, sparats eller publicerats. Två defaultkundplan-locatorfel (förifylld textarea i labelnamn och fel relativ has-scope) korrigerades utan produkt-/kravändring; originalrapporter bevaras. De första tolv PASS återanvändes endast inom den kandidatens fortsättning. Final 1a7-körningen är däremot helt färsk 13/13 utan continuation eller återanvänt kandidat-PASS. Båda kandidatservrar/lager och baselineserver städades separat.

## Källa, main, artefakt och live

[PR #26](https://github.com/ludros93-prog/MAgnussons-CRM/pull/26), exakt head `d4b5930fb17c63c0396144bb62ce175fd06e92f3`, passerade samtliga 13 CI-steg i körning 37443819268/jobb 112203701566, success observerat 09:35:36 UTC. App-main `7288f82a43c90f33f51d5911381bcc0a4badc0ee` och Sites-källa `1a7e8417446a3d1ce3ea0873219f7627e614df8c` har samma träd `93b957280fea53cff897101e03d267a70be06a64`. Även app-main-CI 37444304647/jobb 112205295134 passerade alla 13 steg, observerat 09:40:00 UTC. V27 publicerades 09:40:40 UTC på samma [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), med lyckad deploy, exakt oförändrad custom-policy och envrevision 1/DB/BUCKET. Färska metadata verifierar källa/version/deploy; anonyma GET / och /api/crm gav 403/403 med bortkastade kroppar. Inga riktiga kundskrivningar.

- Worker SHA256 `865528f9038ce8f5e82175c72cec03ca89ecb8867611598e78ae941ad65ecebe`.
- Dist SHA256 `dd1ed3e28f87f9c62b1fed9b6d9f2e2581c96c10609cd654c2f96acd45b0a0af`: sorterad kompakt JSON av path/sha256/bytes, sorterade objektnycklar.
- Normal Sites-source-push 809b77e→1a7e841 bekräftades terminal 0 före save/deploy. Ingen force eller publish-on-push. Saknad officiell helper hanterades med etablerad stdin/childENV-fallback; inga credentials i filer/argv/output, credentials rensade efter användning.
- Gzip SHA256 `8128e9efc979f9779a269c39960d032e97956c8b28135156c789f4f85ac8e203`, **97 filer** endast dist och hostingmanifest; oförändrat efter save. Version `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_04634ba28790819186fa4eeb37d3ee90`. Backendens normaliserade tar `sha256:626918e163e5d46a2dc224f7f02e9ba00ff743900ba9efd51764742ade9a9ffe`, 4229120 byte/97 filer.
- Deploy `appgdep_6ac4c202a3208191a50a8901f6ec6973` succeeded, deployedAt `2026-10-06T09:40:40.058127+00:00`. Ingen ny Site, databas, R2-binding, miljörevision eller delning.

## Nästa underlag

Samlad/sticky privat- och CRM-spar-/felstatus, stängningsbesked, andra specialdialogers hjälpmedelsarbete, fokusåtergång och mobilkundlista kvarstår. B01b2, hostingbudget/återställningsrutin och personalpilot är fortsatt prioriterade. Faktisk skärmläsaruppläsning, initialmountuppläsning, fysisk telefon/OS-tangentbord, autentiserad live-UI, personal och riktiga integrationer är oprövade. Codex-referensen är oläst eftersom relevant read_thread saknas. Den efterföljande Markdownkvittensen har egen exakt-head CI och återpublicerar inte appen; slutlig dokumentations-main/checks rapporteras i PR-kvittensen.

---

# Synliga privata utkastfel och tillgängligt återförsök – v26, 2026-10-06

Startbas var färsk main `535b68ea539836d015414a28b51f37828e1df165` och live v25 från `03d2e61a0559eb03e4b2e5275a0ab95d4c6a34d9`. Egna worktrees/branch och atomisk körningsreservation användes; fjärrrevisioner, PR:er, andra lokala ändringar och Site kontrollerades. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är fortsatt oläst: endast Slack read_thread är anropbart. Explicit brief och repo-underlag användes.

## Ändrat beteende och avgränsning

FormDraftStatus visade tidigare bara status när ett current-record fanns. En misslyckad utkast-GET gav ready=false och tom lista, vilket dolde både befintlig feltext och Försök igen. Status renderas nu för stödda formulär även före färdig laddning, med formulärets stabila ID. Den befintliga revealFormControl omfattar också .draft-status button inom generiskt .edit-form: samma aktuella fokus-/anslutnings-/dialog-/höjdguard och uppmätta viewport-/footerkanter består. Footer, workorder och andra dialoger är undantagna. Ingen refokus, klick eller sparning utförs av hjälpen.

Netto ändras två render-/selektorrader. Provider, register/flush/consume, identitetsisolering, autosave, CAS, request-ID, serverroller, API, affärsdefinitioner, mängder, lagring, filer, dependencies och hostingmanifest är oförändrade. Ingen migration krävs. Samlad/sticky status, hjälpmedelsannonsering och generell CRM-felpresentation är inte levererade av denna ändring.

## Faktiska slutkontroller

- Node 24.19.0/pnpm 11.25.0. Full CRM/Outlook-regression, TypeScript utan incremental, produktionsbygge, isolerad HTTP workerd/D1/R2 och diff-check passerar på fryst slutkälla `809b77e992deb1244cf9cd06041161df40cf6f4f`. Befintliga 40→45, godkänd syntetisk 50→48, kassation, delleverans och dubbelklick/återförsök har kvar sina förväntningar. Graph/R2-ersättningar i regression är inga riktiga konton.
- Runtime återställer 13 500 000 råfilbytes i tre testfiler via 18 010 856 paketbytes; filhashar, korrektur-/foto-/versionslänkar, idempotens, privata workflows, atomisk publicering och nekad sen autosave passerar. Hosted återställning är inte verifierad.
- Installerad Chromium mot verklig byggd Worker och egen migrerad syntetisk D1/R2 passerar **10/10 fall**. Sex återhämtningsfall: 320×844, 390×844 och 390×460, normal text och kontrollerad 200 procent dialogtext. 21 förstoringar verifierar normal 14 px → 28 px och exakt dubblerad line-height efter två browserframes. Detta är ingen browser-/OS-zoom eller WCAG-certifiering.
- Långsam utkastladdning och lång svensk feltext visas före current-record. Misslyckad stängning behåller text; två vanliga återförsöksklick ger en pågående GET. Efter lyckad laddning sparas ett privat utkast. Efter två kontrollerade sparfel och ny retry bevaras samma request-ID, en privat post får revision 1→2 och senaste text återupptas efter reload.
- **12 Tab-/pointerkontroller** passerar med fri helbox och oförändrad 0,5 px tolerans. Vid 320×844/200 ligger knappbottnarna 579,34/578,53 före stickyfooter top 591. Vid kort 390×460/200 ligger de 448,33/447,92 inom 460 px. Lång feltext kan vara högre än skärmen och läses med vanlig vertikal scroll; inget krav på samtidigt synligt helt felblock eller hjälpmedelsannonsering har påståtts.
- Fem nåbara generella formulär visar laddning: kund, affär, uppgift, möte och order. Rent formulär visar inget falskt Sparat, settings får ingen privat status. Generic note stöds i komponenten men är inte nåbar från dagens skapa-anteckning-vy; inget sådant UI-prov påstås.
- Reader verifieras mot verkligt Workerbesked role=reader/version=5, fieldset.disabled/attribut, **19 inaktiverade kontrollfält och submit**, samt 0 privata GET/POST. Under samtliga fall sker 0 gemensamma CRM-POST; båda syntetiska arbetsytornas versioner och tabellrader är oförändrade.
- Fel/latens injiceras uttryckligen endast för draft-HTTP i browsern: 7 GET-503 och 12 POST-503. **14 lyckade privata GET och 12 lyckade privata POST** använder verklig Worker/D1. Inga externa anrop, oväntade console-/page-/assetfel eller riktiga kundskrivningar.
- Rapport `scratch/generic-draft-load-browser/final-809b77e/report.json`, SHA256 `65bf91e453ca7488ada41b38e019db235d0ca65cab2e6fccba09ea366cd88ab2`, reproducible harness, request-ID-/revisionbevis och **38 bilder** ligger utanför Git. Normal 390 px laddningsfel och kort 200-procentig sparstatus är visuellt granskade. Samtliga **96 distfiler** och source/tree/Worker är byteidentiska före/efter; gitclean. Egen PID 67354 stoppad terminal 143, portar 8918/8919 stängda och enbart ägd temporär store borttagen.

## Baseline, rättade prov och ej publicerad kandidat

V25:s verkliga UI visar varken laddning, feltext eller retry före current-record; baseline-rapport SHA256 `9b8f08d7984c23c5f6e7b52b467355084776275b3624ca6af72ca27164f9ced9`. Testets första navigation skedde före hydration och rättades genom att invänta verklig CRM-hämtning. En textprobe råkade senare kumulativt ge 400 procent; originalet sparades och tvåframes/explicit computed-värden infördes utan ändrade krav.

Kandidat `2661b7d4a3d371add0d44944e595ef19ec15a6ee` hade även ett separat **verifierat produktfel vid verklig 200 procent**: rätt retry var Tab-fokuserad med 28 px/42 px line-height men låg y=1094,34–1138,34 utanför 844 px efter över en sekund. Slutkälla 809b77e rättar detta genom den avgränsade källselektorn. 2661b7d pushades/sparades/publicerades aldrig. Vid sista readerfallet klassade Playwrights FIELDSET-hostassertion elementet fel; native disabled-property/attribut och samtliga faktiska kontroller verifierades i stället. Nio redan godkända fall behölls på exakt samma oförändrade artefakt, endast readerfallet fortsattes. Originalrapporter/diagnoser finns kvar. Ingen korrigerande fokus-/scroll-/CSS-fix injicerades i slutbrowsern; bara dokumenterad textförstoring.

## Källkod, main, artefakt och live

| Tillstånd | Verifierat underlag |
| --- | --- |
| PR #24 | Exakt head `31230aba03b3019ea9339a402e1dab5a447ea3bd`; grön Actions `37438543012`/jobb `112186280828`, samtliga 13 steg success observerade 08:50:36 UTC. |
| App-main | Merge `3d5096f9ab7787dd3f7d776639f73ea8b81621c6`, träd `d83c2d726307d7b7336c2023735ce7572725bf5d`. Push-CI `37439320990`/jobb `112188853808`, samtliga 13 steg success observerade 08:57:07 UTC. |
| Publicerad källa | `809b77e992deb1244cf9cd06041161df40cf6f4f`, exakt samma träd som app-main. Normal, ej tvingad push från 03d2e61 till 809b77e har terminal exit 0 före save/deploy. Credential bara i process/child-env, inget i Git eller fil. |
| Worker/dist | Worker SHA256 `77756c23ad486b42583a7207bd7a107c21c8ac31a22ac946bac7d9c8e3c30b93`; dist SHA256 `40e79364992ed47bc2eee0eecc31bbc8aad23f3c1bbde3bb12d09997f7910396` över sorted compact JSON records med sorted keys. |
| Oförändrat originalpaket | 97 filer, endast 96 dist och .openai/hosting.json. Gzip SHA256 `34f460c5546a24756c0e422099b5f8978aa977b25be9f98f7fd5c673cb36c71a` före/efter save; varje medlem jämförd byte för byte. |
| Sites v26 | `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_375e320951588191abff9d778a9ed699` från exakt source 809b77e. Backendlagrat normaliserat tar: SHA256 `e8c9bc650aeff98de67ceae4043046b87238278a127581470387cccf54e7af74`, 4 229 120 byte/97 filer. |
| Deploy | `appgdep_6ac4b7f9ef488191991f21a3291b85d7`, succeeded **08:57:51 UTC**, envrevision 1. Samma projekt/URL, custom-policy exakt oförändrad, policyrevision 2/en extern besökare. |
| Efterkontroll | Färska Site/version-metadata bekräftar source/version/deploy och oförändrad delning. Anonyma GET / och /api/crm: 403/403; svarskroppar kastas. Inga autentiserade live-UI-/kundskrivprov. |

Den efterföljande Markdownkvittensen ändrar ingen appkod och återpublicerar inte appen. Dess exakta PR-head/main/CI kompletteras i PR-kvittensen efter genomförda checks för att undvika att dokumentera sin egen framtida commit.

## Kvarvarande underlag och nästa steg

Samlad spar-/CRM-felstatus, hjälpmedelsannonsering, andra specialdialoger, fokusåtergång och mobilkundlista kvarstår; B01b2, driftbudget/hostingåterställning och personalpilot är fortsatt prioriterade. Inga riktiga Microsoft-, Fortnox-, AI-, produkt- eller leadkontoanslutningar, fysisk telefon/OS-tangentbord, skärmläsare eller personalprov verifieras av denna leverans. Inga verksamhetsbeslut, kundgodkännanden eller kontaktuppgifter har uppfunnits. Officiella Salesforce-/Lime-/W3C-principer och källgränser dokumenteras i RESEARCH.

---

Historiskt v25-underlag följer; dess dåvarande nästa steg läses i den tidigare releasekontexten.

# Generella formulär som ryms på mobil – v25, 2026-10-06

Startbas var färsk main `d79f1bb624e2e77ef7969143af45e90654325b51` och live v24 från `96191a927cc6c66f264909c246f0367cc2362868`. Egen branch/worktree och atomisk reservation användes; färska fjärrrevisioner, PR:er och Site kontrollerades. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` är fortsatt oläst eftersom endast Slack read_thread är anropbart. Den explicita briefen och repo-underlagen användes.

## Ändrat beteende och avgränsning

Långa kundnamn breddade tidigare dialogen från 300 till 405 px vid 320 px och från 366 till 405 px vid 390 px. Sparknappar klipptes fem px vid första öppning men blev synliga efter scroll. Generella formulär har nu krympbara kolumner, radbruten valtext och sparstatus, knappar som får växa och en footer som ryms. Vid kort viewport ligger handlingarna i normalt scrollflöde. Textareas behåller sina rader och gör lång text tillgänglig genom intern scroll. Det aktiva generella fältet rullas fram efter uppmätta dialog-, viewport- och footerkanter, endast när fältet ryms men är skymt och fortfarande anslutet/fokuserat. Ingen refokus, värdeändring eller sparning sker från hjälpen.

Kundkortets lässheet, privata kundflöden och workorderguiden får varken markör eller fokushelper. API, serverroller, privat utkastmodell, godkännanden, atomiska skrivningar, CAS/idempotens, lagring, filer, backup, dependencies och hostingmanifest är oförändrade. Ingen migration krävs. Generella formulärs samlade spar-/felstatus och återförsöksupplevelse är fortfarande nästa arbete.

## Faktiska slutkontroller

- Node 24.19.0, pnpm 11.25.0. Full CRM/Outlook-regression, TypeScript `--noEmit --incremental false`, bygge och isolerad workerd/D1/R2-runtime passerar på exakt slutkälla. Befintliga orderfall 40→45, godkänd 50→48 med syntetiskt dokumenterat underlag, kassation, delleverans och dubbelklick/återförsök behåller sina förväntningar.
- Runtime återställer 13 500 000 byte i tre testfiler genom en strömkopia på 18 010 856 byte med verifierade hashar, korrektur-/foto-/versionslänkar, idempotens, privata utkast, atomisk arkivering och nekad sen autosave. Detta är inget faktiskt Sites-återställningsprov.
- Faktisk lokal HTTP-Worker/Chromium med migrerad egen D1/R2 passerar **18/18 huvudfall**: 14 seller/admin-kombinationer med **77 formulär**, ett privat utkastflöde och tre readerfall. Bredder 320/390/768/1440, kort 390×460 och faktiskt dubblerad computed dialogtext på 320×844/390×460. Affär, kund, uppgift, möte och order provas; admin även inställningar. Kundens adresser och tre kontaktavsnitt öppnas.
- **1 937 verkliga Tab-fältbesök**, **170 footerknappsbesök** och sju interna textarea Ctrl+End-prov passerar med oförändrad 0,5 px tolerans. Noll undantag för överhöga kontroller. Normal pointerstängning fungerar utan force; full text och sista tecken bevaras.
- Privat syntetiskt affärsutkast har lång vald ansvarig, Vunnen och en ofullständig kalkylrad med okänd inköpskostnad. Sju vyer samt verklig sparning/omladdning/återöppning passerar. Exakt en draft-POST, noll gemensamma CRM-POST; Worker-version 5 och kund-/affärs-/orderantal är oförändrade. Acceptansen markeras aldrig och orderknappen skickas aldrig.
- Separat **4/4 portalvyer, 8/8 dropdowninteraktioner** passerar med pointer, native Tab och Escape, oförändrade värden/data, popup inom viewport och full återfokuserad trigger. Portalernas alternativ behåller normal källtypografi; 200-procentproben gäller dialogens element. Första portalharnessens aria-hidden-locator-timeout bevaras som diagnostik och ersattes av cachad faktisk DOM-mätning utan ändrade krav.
- 173 huvudbilder, varav 170 måttbilder, och åtta portalbilder. Root har visuellt granskat vanlig 390-affär, 320/200 won-footer och inställningstextarea. Alla 96 byggfiler samt Worker/source/tree är byteoförändrade före/efter; git är rent. Egen PID 62775 stoppades, store BYB0fo raderades och 8916/8917 stängdes **07:18:29 UTC**.

Textproben dubblerar varje dialogelements computed font/line-height i browserminne med !important och behåller viewport/fältbredd. Det är inte browser-/OS-zoom, fysisk telefon eller WCAG-certifiering. Ingen diagnostisk fokus-/layoutfix injicerades i slutbygget. Tidigare underkända källor 30f4f9b/88c4598/6db3e22/379004f/428a28c/765af94 finns som historik i LOG; ingen av dem publicerades eller räknades som slut-PASS.

## Kod, main, artefakt och faktisk publicering

| Underlag | Verifierad uppgift |
| --- | --- |
| PR #22 head | `b12ad7422e17c07b6d4235fe39bd6a7c41b962ff` |
| Exakt-head CI | [37428019931](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37428019931), jobb `112152038541`, alla 13 steg success observerat 07:12:35 UTC |
| App-main efter merge | `4595bf5db48e157d05824db6613343ee51220fee` |
| App-main push-CI | [37428943865](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37428943865), jobb `112154998965`, alla 13 steg success, faktisk completed_at 07:21:06 UTC |
| Pushad/publicerad Sites-källa | `03d2e61a0559eb03e4b2e5275a0ab95d4c6a34d9` |
| Gemensamt app-main/source-träd | `1001b844d832ceb3902240914e65113f5b2caef9` |
| Worker SHA-256 | `fe12fbc24e1aee5b3d83ef5687c445a14d747f56e29fc9d40547200a03e924d9` |
| Dist SHA-256 | `d89e5167b7f497cbc4056010883571d810367edca0e4372c476d0f0f1f834fe0` |
| Slutbrowserrapport SHA-256 | `d7b95c5f7d1251f4bf867c3e613bd4123b87d131917f55cbae76acb6e930a594` |
| Lokalt gzip SHA-256 | `c020ca21294565833b5a3408dc60f3d983b5320c670a4775b93e9b817b56bd8e` |
| Sites-lagrat tar | `sha256:bb200532b2519c9368d7fb0ed65172f5e116682929df4603778d764fceb95ae2`, 4 229 120 byte, 97 filer |
| Version | **25**, `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_8f560b3c4b2c8191b83b3576e5446c90` |
| Deploy | `appgdep_6ac4a1658d2081918fb022a2a4e44e89`, **succeeded 2026-10-06 07:21:30 UTC** |
| Live | [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), samma Site |

Dist är SHA-256 av sorterad kompakt JSON path/sha256/bytes med sorterade objektnycklar. Arkivet innehåller exakt de 96 oförändrade distfilerna och hostingmetadata, inga testlager/kunddata/exporter/hemligheter. Gzip och Sites tar har olika format/hashes; arkivet återanvändes utan nytt bygge. Normal sourcepush från 96191a9 till 03d2e61 bekräftades terminal exit0 före save/deploy. Sourcehelper saknas i kontrollerade pluginrötter; etablerad identitetskontrollerad credential-stdin/childENV-fallback användes utan force eller credentials i filer/argv/output. Ingen publish-on-push begärdes.

Färska native Site/version-svar bekräftar version/källa/deploy, exakt oförändrad custom-policy och envrevision 1; hostingmanifestets DB/BUCKET är oförändrat. Bara anonyma live-GET `/` och `/api/crm` utfördes: **403/403**, svarskroppar bortkastade. Ingen autentiserad live-kundskrivning, konto-/integration-/delnings-/schema-/prompt-/aktiveringsändring gjordes.

V24 är datakompatibel återgång utan migration men återför de dokumenterade layout-/fokusproblemen. Ingen rollback utfördes. Autentiserad live-UI, fysisk telefon/OS-tangentbord/visualViewport, skärmläsare, personalprov, riktiga integrationer och hostingåterställning är fortfarande oprövade. B01b2:s sammanhållna operativa ID-migrering, hostingbudget och pilot kvarstår. Den separata releasekvittensen på `docs/mobile-generic-form-release` ändrar endast Markdown, kräver egen exakt-head CI och återpublicerar inte appen.

# Kundvårdens rollstyrda återköp/merförsäljning – v24, 2026-10-06

Startbas: färsk main `a3a393c79760baa6487215fe5307b804643544bc`, live v23/source `5cdc2eee45eee7058bfd8f6898ef7f1085fbe3b6`. Öppna PR:er, reservationer, publicering och remote kontrollerades. Egen branch/worktree `fix/customer-care-role-actions` och atomisk reservation användes. Codex-referensen är fortsatt oläst eftersom Codex read_thread saknas.

Två Kundvård-knappar öppnade repeatpicker/affärsformulär för reader trots att parent/server nekade sparning. Enda appändringen använder komponentens befintliga canEdit(admin/seller) kring dessa knappar. Historik, kundkort och antal öppna affärer är kvar. Inga ändringar av serverroller, API, privat utkastmodell, basis, CAS/idempotens, atomisk arkivering, lagring, backup, dependency- eller hostingmanifest. Oberoende avgränsad UI-läsgranskning gav inga blockerare. Färska officiella Lime-/Salesforce-/Saleshub-källor i RESEARCH skiljer begripliga UI-handlingar från serverrätt.

## Slutprov och kvarvarande layoutfel

- Node 24.19.0 och repoets pnpm 11.25.0. Full `node tests/outlook.mjs`, TypeScript `--noEmit --incremental false`, sourcebygge och diff-/relativlänkkontroll passerar på slutkandidaten. Befintliga orderprov omfattar 40→45, dokumenterat godkänd 50→48 med syntetiskt underlag, kassation, delleverans och dubbelklick/återförsök. Befintliga förväntningar behålls.
- Byggd workerd/lokal diskbaserad D1/R2 passerar runtime: 13 500 000 byte i tre testfiler, 18 010 856 byte strömkopia, hash-/korrektur-/foto-/versionslänkar, oförändrad källa, idempotens, privat utkast och atomisk arkivering samt nekat sent utkast. Inget faktiskt Sites-återställningsprov.
- Faktisk Chromium med den frysta HTTP-appen och migrerad isolerad D1/R2 passerar **9/9 roll-/kort-/navigeringsfall** för reader/seller/admin på 320/390×844 och 1440×1000. 37 bilder, inga page-/asset-/externanropsfel; bara förväntade 403 i console. Långt syntetiskt kundnamn provas utan layout-/CSS-injektion eller force-click. Reader har inga opportunityelement i DOM/Tab och kan läsa/stänga historik/kundkort/anteckningar. Admin/seller öppnar verklig återköpsväljare via pointer och Merförsäljning via Tab/Enter, och stänger utan redigering. Inga godkända CRM-/draft-/fil-POST i dessa nio fall; kontrollsnapshot är oförändrat.
- Reader får faktisk lokal 403 för repeat_order, deal och form-draft med oförändrat underlag. Detta bekräftar oförändrad normal serveravvisning, inget auth-raceprov. Samma baslinje på v23 belade de missvisande ingångarna i alla tre bredder. Verklig komponent-SSR utan mockar passerar **5/5** för admin/seller/reader/unknown/saknad viewer; unknown/saknad viewer är bara in-memory-render, inget verkligt konto-/API-/hydrationprov.
- **Generella affärsformulärets mobillayout är fortsatt FAIL**, separat från godkända roll-/navigationprov: fyra seller/admin-fall på 320/390. Sex jämförbara writerfall har exakt samma dialog-/footerknappmått före/efter. Vid 320 är client/scroll 300/405 px; vid 390 är de 366/405 px. Grid min-content blir 385,47 px mot 325,59 px tillgängligt innehåll; kontroller går till x429,88 i 390-vy. Footern slutar y849 i viewport844, fem px utanför. Dessa fel räknas inte som layoutgodkända. Generella form-/CSS-/Sheet-/Select-/pickerfiler är byteidentiska före/efter; listkort och återköpspicker ryms. Nästa avgränsade formulärdesign ska rätta detta utan sänkta krav.
- Bara normaltext på dessa viewporter är prövad i v24. Ingen fysisk telefon/OSkeyboard, 200 procent text, skärmläsare, personalacceptans, generell rollrevision eller full mobil/WCAG-certifiering. Tidigare harnesslocatorfel med dold sidebar/disabledfieldset/BODY vid Tabslut är bevarade diagnostiker, inga produktfel eller slut-PASS-belägg.

## Exakt kod, main, artefakt och live

| Underlag | Faktiskt verifierat |
| --- | --- |
| PR #20 head | `6ec04cdeffdaae54b4771438c774065745cae8d1` |
| Exakt-head CI | [37418240326](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37418240326), jobb `112121568106`, alla steg success 05:24:30 UTC |
| Faktisk app-main | `0b91773127aca3ef414efe13add001ab19c89873` |
| App-main push-CI | [37418818798](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37418818798), jobb `112123369050`, alla steg success 05:31:29 UTC |
| Pushad/publicerad Sites-källa | `96191a927cc6c66f264909c246f0367cc2362868` |
| Gemensamt Git-träd | `b23b03ee7ff21d38771d28c64e8d7af310ef5abe` |
| Worker SHA-256 | `308b3991cc474dacc0eb51a833b31cb394dcb7c9df33343f5bed0190ae03b24c` |
| Dist SHA-256 | `7d658f5ef5671c5a66db52ae11fb8652eb4c3a4a5a7c09e66276afcf028d162e` |
| Slutbrowserrapport SHA-256 | `260e99dc6272a60fdb0a962a97f2f5d9781f85b01605564c85039773430e3941` |
| Baslinjerapport SHA-256 | `58a0d5e8bc7e5735cd712ea059a4932936932f2d76b62d8808adca8236328e7a` |
| Lokalt gzip SHA-256 | `5cddc0095176b5ee572231d2b194a8b9cc7e2cc1d740eca24450ced06dd7ecfa` |
| Sites-lagrat tar | `sha256:f1446f3c27eda850ccd8384d1949e561d4350d838dd2700ce46655ce469693cd`, 4 229 120 byte, 97 filer |
| Sparad version | **24**, `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_dfa9875cc1d08191b8e9a16448cde3dd` |
| Deploy | `appgdep_6ac4878abb4481919e1ac6dc9739749f`, **succeeded 2026-10-06 05:31:01 UTC** |
| Live | [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), samma Site |

Distmetoden är SHA-256 av sorterad kompakt JSON med path/sha256/bytes och sorterade objektnycklar. Alla 96 distfilers bytes är identiska före/efter runtime/browser; arkivet har dessa plus hostingmetadata, totalt 97. Lokalt gzip och Sites lagrade tar har olika format/hashes. Det frysta arkivet återanvändes utan nytt bygge efter slutprov, utan kunddata, exporter, testlager, hemligheter eller källkatalog.

Merge skedde med expected head efter alla obligatoriska exakt-head checks och färsk bas. Etablerad credential-stdin/childENV-fallback användes eftersom Sites sourcehelper saknas i kontrollerade pluginrötter; normal append-push kontrollerade tidigare remote 5cdc2eee och pushade 96191a9, utan force/credential i fil/argv/output. Pushens terminala exit0 inväntades och matchande archive-backed version bekräftades före deploy. Ingen automatisk publish-on-push begärdes. Native Site/version-svar efter deploy bekräftar källa/version/deploy, exakt oförändrad custom-access-policy revision 2/en extern besökare och envrevision 1/DB/BUCKET. Bara anonyma live-GET `/` och `/api/crm` utfördes: **403/403**, kroppar bortkastade. Inga autentiserade live-kundskrivningar, konto-/integrations-/delnings-/schema-/prompt-/aktiveringsändringar.

Egen baslinjeserver/lager städades 05:25:57 UTC; egen slutserver/lager 05:29:47 UTC, portar 8916/8917 stängda. Ingen migration krävs; v23 är datakompatibel återgång men återför missvisande reader-knappar, och ingen rollback utfördes. Den senare releasekvittensen ändrar endast Markdown och kräver egen CI före merge men ingen app-publicering. Autentiserad live-UI, verkliga konton/integrationer/personal och hostingåterställning är fortfarande oprövade. B01b2 och övriga editor-/uppföljningsingångar ingår inte i tvåknappfixen.

# Synlig privat sparstatus och ärliga återförsök – v23, 2026-10-06

Bas vid start: GitHub-main `d9a117f11455bdce97d2b0e65a90e5f505497562`, live v22 från `8636a5ef3205a3be590fb5b99ed635a90da275d6`. Egen reservation, branch/worktree och färska fjärr-/PR-/Sitekontroller användes. Ingen konkurrerande PR eller publicering upptäcktes. Codex-task `01a104c7-a5c5-7350-8577-a4f941138061` förblir oläst: anropbart Codex `read_thread` saknas. Explicit brief och verifierat repo användes.

## Beteende och slutkontroller

Kundplan, bearbetning och onboarding visar privat utkaststatus under rubriken vid scroll. Laddning, väntande/sparat, fel och konflikt kommer från befintligt serverutkast; färg kompletterar text. Statusknappar når fullständiga fel-/konfliktval med tangentbordsfokus. Portalens faktiskt monterade status/footer mäts för scrollutrymme. Fält och konfliktval bevaras. Oklart CRM-svar beskrivs som obekräftat: ett nekat svar efter legitim servercommit får inte beskrivas som bevisad utebliven skrivning.

Misslyckat onboardingavslut återförsöks med samma `complete:true`, hela payloaden och request-ID. Ett kvarliggande exakt CRM-fel ersätter duplicerad feltoast endast i dessa tre flöden, eftersom toasten täckte sparknappen. Andra formulärs toastbeteende och framgångsnotiser bevaras. Endast `app/page.tsx`, `app/customer-work.css` och `components/customer-workflow-draft.tsx` ändras i appen; backend/Worker/backup, API, utkastformat, basis, roller, CAS, idempotens och atomisk arkivering är oförändrade.

- Node 24.19.0, repoets pnpm **11.25.0** och låsta befintliga beroenden. Hela `node tests/outlook.mjs`, TypeScript `--noEmit --incremental false`, produktionsbygge och `git diff --check` är godkända för slutträdet. Befintliga mängd-/revisionsprov omfattar 40→45, verkligt dokumenterat godkänd 50→48, kassation, delleverans och dubbelklick/återförsök. Inga gamla förväntningar har sänkts.
- Slutbyggets `node tests/runtime-smoke.mjs` passerar med lokal workerd och isolerad diskbaserad D1/R2: tre filer om **13 500 000 byte**, **18 010 856 byte** strömkopia, hash-/korrektur-/foto-/versionslänkar, idempotent återförsök och oförändrad källa. Privata utkast, atomisk CRM-publicering/arkivering, nekat sent utkast, renderad startsida och nekat anonymt CRM-anrop ingår. Detta är lokal emulering, inte återställning i Sites.
- Oberoende read-only slutgranskning hittade inga blockerande fynd inom avgränsningen; payload/basis/revision/request-ID och serverregler är bevarade. Officiella Lime-, Salesforce- och WAI-källor och gränsen mot egna designval finns i RESEARCH. Saleshub gav ingen verifierad autosparningsspecifikation.
- Fryst byggd HTTP-app med Chromium/Playwright och faktisk lokal D1/R2 passerar **26/26 huvudfall + 6/6 extra tangentbordsfall**, processerna exit 0. 320/390/768/1440 px, 320×480 och 390×480 samt kontrollerad 200 procent text provas. 81 bilder, 79 layoutmätningar; ingen horisontell dokument-/dialogöverströmning eller page-/asset-/externanropsfel. Avsiktliga 400/403/409/503 är negativa prov, inte undanröjda fel.
- De 21 privata fallen använder riktiga lokala POST: väntande→sparat, admin→reader i D1 före nästa autosparning, verklig 403, oförändrad lagrad revision, exakt textbevarande och återställd rättighet/återförsök. En andra syntetisk identitet saknar dessa utkast. Gemensam kund-/affär-/order-/aktivitets-/eventdata är oförändrade. Det är en isolerad identitetskontroll, inget fullständigt samma-enhets-kontobytesprov.
- Faktisk lokal CRM400 behåller exakt servertext utan duplicerad toast; vanlig pointer utan force når sparknappen och ett andra faktiskt 400. Verkligt kundbasis409, ogiltigt lokalt utkastschema med avstängd CRM-sparning och väntande verklig GET provar konflikt/readiness. Ett uttryckligt **kontrollerat 503 före Worker** följt av faktiskt 200 verifierar hela identiska onboardingpayloaden/request-ID `9a94edcf-033e-4aaa-863f-a760c064b323`, `complete:true` och atomisk arkivering. Det är inget påstått verkligt serveravbrott.
- Textförstoringen väntar på monterade fält och fördubblar enbart uppmätt font/radhöjd med inline-important för att övervinna tidigare mobilregel 16px-important. Computed fält är **16→32 px**, status **14→28 px**, inputrad 48 px, inneryta 56/ytterhöjd 58 px; ÅÄÖ/gjpq granskades visuellt. Ingen position/bredd/padding/layout injiceras. Detta är textinstrumentering, inte OS/browser-sidzoom, fysisk mobilkeyboard, IME eller skärmläsarprov.
- Sex extra fall använder verklig Tab från sista fält till footern och mäter båda knapparna fria från status/viewportgräns. I viewport under 540 px ligger footern i scrollflödet och visas när användaren når den; samtidig synlighet under all redigering påstås inte. En lång textarea är delvis synlig (224 av 354 px i kort 2×-fall) och scrollas. Generell fokusbevaring vid workspace-/identitetsremount och övriga formulär ingår inte.

## Exakt källa, artefakt, main och live

| Underlag | Verifierat värde |
| --- | --- |
| PR #18 head | `51402713f49846f31582c3089ff5779d8e11f6e9` |
| PR-head CI | [37411127082](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37411127082), jobb `112099577518`, alla steg success, terminal 03:55:08 UTC |
| Faktisk app-main efter merge | `2ae9ff048d7ba6f7e26449015bb478d317b6a689` |
| App-main push-CI | [37411684781](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37411684781), jobb `112101286720`, alla steg success, terminal 04:02:30 UTC |
| Pushad och publicerad Sites-källa | `5cdc2eee45eee7058bfd8f6898ef7f1085fbe3b6` |
| Gemensamt exakt Git-träd | `728dbbd6e9d9ca5e89a92cfc7ad77f0efa0157d0` |
| Worker SHA-256 | `657e4d2ad2345e6924d079877c2c61c5549544e674168c6e4444bd8e347aa3f2` |
| Dist SHA-256 | `515707ca84a6a5fd1c7a0a5360e9c0b0925c26a125f81ec7610a19d7a7bf0374` |
| Browserrårapport SHA-256 | `297bc307e18744d610cb0586c1a20281ddc1a69c225b47f552dff6a623778a82` |
| Lokalt gzip-arkiv SHA-256 | `04b11407a5dca6ce24b7d0b43d04078ffa36ebc2b2f4f3fc9dc34019434cfbbe` |
| Sites-lagrat tar-arkiv | `sha256:17529e1759d82ba7335deea012c62765451abd54daa62b0ffa73a610fbbe429b`, 4 229 120 byte, 97 filer |
| Sparad version | **23**, `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_966ec7c7aff08191b8c66126799b05d6` |
| Lyckad deploy | `appgdep_6ac47327ccec8191b6b83298a8126993`, **succeeded 2026-10-06 04:04:02 UTC** |
| Befintlig Site | [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site), oförändrad projektidentitet |

Dist-hash är SHA-256 av sorterad kompakt JSON med `path`, `sha256`, `bytes` och sorterade objektnycklar. Alla **96 distfiler** var byteidentiska före/efter runtime/browser; publiceringsarkivet har dessa plus `.openai/hosting.json` (97 filer). Det byggdes på exakt Sites-källa före test och packades utan kunddata, testlager, hemligheter eller källkatalog. Lokalt gzip och Sites lagrade tar har skilda format/hashes och jämförs inte som samma bytes. Efter slutprov återanvändes det frysta arkivet utan nytt bygge.

PR merge gjordes med expected head efter grön exakt-head CI och färsk oförändrad bas. Normal Sites-sourcepush kontrollerade tidigare remote `8636a5e…` och efterföljande `5cdc2ee…`; ingen force. Skillnaden i GitHub-/Sites-commithistorik är avsiktlig, trädet är identiskt. Den paketerade Sites-sourcehelpern saknades i den kontrollerade miljön; etablerad lokal fallback bevarade identitetskontroll och använde kortlivad credential via stdin/child-ENV, utan credential i fil, argv eller output. Credentialprocessen avslutades. Ingen ändring av runtimevariabler, medlemskap, kontoinbjudningar, automationsschema/prompt/aktivering eller delning gjordes.

Efter deploy bekräftade färska native Site/version-svar v23/source/deployment och exakt oförändrad custom-access-policy, revision 2/en extern besökare, envrevision 1/DB/BUCKET. Endast anonyma live-GET `/` och `/api/crm` utfördes, **403/403**, med body bortkastad. Inga autentiserade kundorder eller annan verklig data skrevs. Egen browser-worker stoppades, portar 8914/8915 stängdes och eget isolerat D1/R2-lager raderades kl. 04:00:17 UTC.

Denna senare releasekvittens ändrar bara Markdown. Den kräver egen exakt-head CI före merge men ingen app-återpublicering; apprevisionerna och live ovan förblir samma. Ingen SQL-/lagrings-/backupformatändring kräver migration. Återgång till verifierad v22 kräver ingen datamigrering och bevarar dess serverkontroller, men återför mobilstatusens scrollbrist och tidigare footer-retry för onboarding; ingen rollback utfördes.

Autentiserad live-UI/framing, riktiga konton/Fortnox/Outlook/produkt-/AI-anslutningar, fysisk telefon, skärmläsare, personalacceptans, maximal hostingbudget/volym och faktisk hostingåterställning är fortfarande oprövade. Generella formulär och övriga specialdialogers status/utkast, fokusåtergång efter arbetsytebyte, mobilkundlista och B01b2 kvarstår. Testbeläggen är ingen garanti om världsranking.

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

## D01 – kundkort och svensk avsändningsdag, lokal slutkontroll före publicering 2026-10-05

Verifierad integrationsbas: main `6a58c2e2f85b5f83dd1002a6aedd1f8f33ad6bba`, träd `557e2c7cad89998e01ca4ebca5897fbeed658505`, med PR #8 och #9 sammanslagna efter gröna GitHub-kontroller för respektive exakt head. D01 ligger i `feat/customer-overview-design`; nedanstående resultat gäller slutbygge 4 av den lokala integrerade kandidaten. Verifierad live-bas är fortfarande Sites v18 från `8b777864ff47922e364a3f6173026593f6628559`, custom-delning, policyrevision 2 och en extern besökare. D01 har ännu ingen kvitterad merge eller publicering.

- Hela `node tests/outlook.mjs` och TypeScript med `--noEmit --incremental false` passerar på Node 24.19.0. Produktionsbygget med pnpm **11.25.0** passerar. Tidigare mängd-, order-, ansvars-, roll-, CAS-, återställnings- och utkastkrav behålls; gamla testförväntningar har inte sänkts.
- Ett faktiskt datumfel upptäcktes vid svensk midnatt: produktionsavsändningens UTC-prefix kunde ange gårdagen medan CRM använder dagens svenska datum. `latestDispatch` använder nu uttryckligen `Europe/Stockholm` för tidsstämplar; direkta leveransers redan registrerade datum behålls. Ogiltig äldre tidsstämpel ger ett begripligt regelfel. Vinter-/sommargränser, senaste avsändning samt både `receipt_confirm` och vanlig orderskrivning provas. För tidigt kundmottagande ger 400 utan ändrad CRM-version, order eller aktiviteter. Detta rättar avsändnings-/mottagandekontrollen; övriga tidszonsjämförelser återstår enligt BACKLOG.
- Slutbyggets lokala workerd/D1/R2-prov passerar via byggda HTTP-handlers: tre binära filer, **13 500 000 byte**, komplett strömkopia **18 010 856 byte**, verifierade hashar och korrektur-/arbetsfotolänkar, oförändrad källa, idempotens, nekad anonym åtkomst, privat kundutkast, atomisk CRM-publicering/arkivering och nekad sen autosparning. Det är isolerad lokal lagring, ingen hostingåterställning.
- Kallt Chromium/Playwright-prov på slutbygge 4 passerar **16 scenarier och 36 layout-/skärmbildskontroller** för kundkortet på 1440, 768, 390 och 320 px. Sektioner, tangentbordsfokus, primär/sekundär aktivitet, exakt orderöppning, tom kund, datumgrupperad historik, interna anteckningar, långa värden och läsarens tillåtna navigation provas. B01b1-dialogen behåller tomma initialval; öppning/stängning orsakar ingen kundöverföring. Lokal byggd Worker/D1 använder enbart fiktiva data. Outlooks visningsprov använder separata syntetiska GET-svar.
- Vid 200 procent kontrollerad textförstoring på 390 px ryms ord, sektionsknappar och ansvarsöverföringens text/ikon inom sina ytor. Provet fördubblar textstorlek och radhöjd; det är inte browserns sidzoom. Korta mobiltexter har kvar fullständiga ARIA-namn. Inga JavaScript-, asset- eller externa anropsfel observerades. Normalbilderna har 0 px dialogöverbredd. Vid kontrollerad textförstoring mäter dialogen 366 px klientbredd och 367 px scrollbredd, inom provets 1 px tolerans; dokumentet är 390 px och ingen text eller ikon klipps.
- Före/efter mot sparat B01a-bygge mäter första handlingen på normal 390 px till **666–710 px** och normal 320 px till **794–838 px**, inom 844 px viewport. Extra långa värden på 390 px ger **786–830 px**. Vid extra långa värden på 320 px ligger handlingen på **974–1018 px** och nås med vertikal scroll; den påstås inte synas direkt i detta fall. Slutbygget ersätter tidigare kandidater där huvudknappen låg för långt ned eller ansvarsöverföringens text klipptes vid förstoring.
- **Begränsning vid detta historiska prov:** den globala topbars Arbetsyta-trigger kunde vid 320 px täckas av arbetsytebannern och blockera pointerklick. Tangentbord användes för profilinitieringshinten i detta prov. Fyndet låg utanför kundkortets CSS och rättas senare i v20 enligt kvittensen nedan. De 16/36 kontrollerna belägger kundkortet, inte hela appens mobilanvändning. Fysisk telefon, Magnussons personal, verklig Sites-inloggning, Microsoft/Fortnox/AI och hostingåterställning har inte verifierats.
- Artefakter finns utanför Git i `/workspace/scratch/customer-design-browser/final-build4-evidence/report.json` och `position-comparison.json`, tillsammans med de 36 skärmbilderna. Browserprovet skickar inga gemensamma CRM-affärsändringar och inga Outlook-POST; callbackproven använder verkliga privata draft-POST. Browserrapport SHA-256: `f8d2f24569bbb7a9a9c44233b8fc7aa7902f4923513389cbb9af7ec092aedede`. Slutworker SHA-256: `a21572ed83ec066750d579d61ca056b678063165606c9a8eb612823990bbd358`. Byggträd SHA-256: `e82ea5c9d61e80d90969b7cf8b4e83cf3e7bee7912d8dcf858808a7d7c9bf045`.

Lokala kontroller förbereder kandidaten. Exakt sparad head, obligatoriska GitHub-checks, faktisk merge och eventuell senare Sites-publicering kvitteras separat i leveransens PR när utfallen finns. Inga verkliga kunddata, konton, utskick, externa anslutningar eller delningsregler ändras av proven.

## V19 – historisk releasekvittens 2026-10-05

- [PR #10](https://github.com/ludros93-prog/MAgnussons-CRM/pull/10), exakt head `54c918268efdfbc7a0801cd0cfdadb9fcf3198ba`, fick **success** i [CI-körning 37381886783](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37381886783), jobb `112005662458`, kl. 22:22:34 UTC. Merge är verifierad som main `4732da993a8a4526d8be461098958ec61d1efdb5`, träd `c13b4766d5d7a8eb08b3e34bee6dddee0908a22c`. Även [main-CI 37382408153](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37382408153), jobb `112007395998`, slutförde alla steg med **success** kl. 22:27:21 UTC.
- Den exakta Sites-källan `c6c40b44f3deb7e90ec31c0076f4f1b210c441ad` har samma Git-träd som publicerad main. Den byggdes på nytt och fick worker-SHA-256 `8277c733606936b889463f2559dc70be4f5aa8b040ee8834ba62b6e251d7053b` samt dist-träd-SHA-256 `d5853277ce04d718d4497bca57d9f4bc817a47210e2cd655eb0d56f0c9292eca`. Dessa skiljer sig från den tidigare lokala build 4-artefakten; samma 16 kundkortsscenarier och 36 mätningar kördes om och passerade på den exakta releaseartefakten. Evidensarkiv: `/workspace/scratch/customer-design-browser/exact-source-release-c6c40b44/`, browserrapport-SHA-256 `5bf7d9b791af1bd75d59cf1693b9962f3745a72ec5cdad387b63a705fd6cdd76`.
- Releaseartefaktens isolerade workerd/D1/R2-runtime passerar med 13 500 000 byte filer, strömkopia 18 010 856 byte, verifierade hashar/länkar, oförändrad källa, idempotens, privat kundutkast, atomisk publicering/arkivering och nekad sen autosparning. Oberoende paketkontroll jämförde 95 dist-filer plus hostingmetadata, totalt 96 filer, byte för byte. Inga hemligheter, nya SQL-migreringar eller beroenden tillkom i publiceringspaketet.
- Samma Site `appgprj_6aa71b309d90819181a32a9af6e6baf2` har sparad **v19**, versions-ID `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_20704044087c8191b6646ef8b1a1ea3c`. Deploy `appgdep_6ac42496abf481918116d871cda51458` bekräftades lyckad kl. **22:29:01 UTC** till [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site). Färska versions-/Site-svar bekräftar aktiv v19, källa och lyckad deploy samt oförändrad custom-delning, policyrevision 2 och en extern besökare.
- Efter publicering utfördes endast live-GET: anonym `/` och `/api/crm` gav hostingens **403**; ett probe med den officiella Sites-bypass-headern gav **401**. Lyckad deploy är verifierad, men autentiserad live-UI och verkliga kundflöden är inte verifierade. Inga live-skrivningar utfördes, inga kundpayloads sparades eller exponerades och inga verkliga konton, personalprov, integrationer eller hostingåterställningar prövades. Refererad Codex-tråd är fortsatt oläst.
- Browsermätningarnas omfattning är fortsatt kundkortet: normalbilder har 0 px dialogöverbredd; kontrollerad 200 procent textförstoring har 366/367 px inom 1 px tolerans utan klippt text/ikon. Första handlingens tidigare mått är bevarade; extra långa värden vid 320 px behöver vertikal scroll. Browserproven gjorde inga gemensamma CRM-affärsändringar, Outlook-POST eller externa POST; endast privata callbackutkast skrevs lokalt. Vid v19 var det globala pointerhindret i topbar på 320 px kvar. Det rättas och provas separat i v20 nedan. Detta är inget fullständigt mobil-/personalprov.

Denna senare releasekvittens ersätter äldre kandidatposters dåvarande vänteläge; deras testresultat och källhashar behålls som historik. Kvittensen lämnas i en separat dokumentationsleverans utan app-publicering. En senare dokumentations-main kan ha annat Git-träd genom Markdownändringarna, medan samtliga applikationsfiler är identiska med publicerad main `4732da993a8a4526d8be461098958ec61d1efdb5` och Sites-källa `c6c40b44f3deb7e90ec31c0076f4f1b210c441ad`. Scheman, prompt och aktivering har inte ändrats.

## V20 – faktisk releasekvittens 2026-10-05

- Slutkandidatens `node tests/outlook.mjs`, TypeScript med `--noEmit --incremental false`, pnpm **11.25.0**-bygge och diffkontroll passerar. Regressionen behåller 40→45, 50→48 med explicit kundgodkännande, kassation, delleverans och dubbelklick. Nya faktiska SQLite/API-prov täcker roll-/aktiv-/identitetsändring före SQL-skrivning, verklig CAS-förlust, oförändrat CRM/ledger/utkast vid avslag, atomisk arkivering och ACK-förlust samt båda godkännandenas vinter-/sommarmidnatt, ogiltiga tidpunkter och idempotent replay. Första testfixturens antagande om befintlig demokund rättades med eget syntetiskt underlag; produktkrav och gamla förväntningar sänktes inte.
- [PR #12](https://github.com/ludros93-prog/MAgnussons-CRM/pull/12), exakt head `b5a9a9ec7cdbccd0069be0d85e9779b6003d9a14`, fick **success** i [CI-körning 37389439095](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37389439095), jobb `112030737968`, kl. **23:38:09 UTC**. Verifierad main är `996d44082bf09e519dae3c85f93d280f541cbf73`, träd `b93eaaa3c5c982ccf0d4111885b62e217f1a0ec3`. [Main-CI 37389790695](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37389790695), jobb `112031885111`, fick **success** kl. **23:41:40 UTC**.
- Sites-källa `c858b05fc2e77870670db39ce5fe794f2d25db27` har samma Git-träd som denna main. Den kontrollerade publiceringsartefaktens worker-SHA-256 är `41d211537b3ab373c42bec0836b084a1dd6a4e6b44d049f80dbf0e075d4f5a12`; dist-träd-SHA-256 är `04bf358fee04c0a6c5929968c7d90dbb6b4036329ef7c47ddd196dd2807b912f`. Paketet innehåller 96 filer inklusive hostingmetadata. Käll-/CI-/deploykvittens finns utanför Git i `/workspace/scratch/release-c858/evidence.json`.
- Slutbrowserprovet på den oförändrade byggda artefakten passerar **13/13 pointerfall och 13/13 tangentbordsåtergångar** på 320/390/768/1440 px, med långa namn, textförstoring och ett läsarfall. Vanlig `locator.click` utan force öppnar väljaren och byter arbetsyta; verklig Tab/Space/End/Enter återöppnar och väljer tillbaka. Hit-test träffar rätt kontroll, text/ikoner ryms i header och knappar och dokumentet har ingen horisontell överbredd i dessa fall. Arbetsytebyten gav endast GET; inga API-skrivningar, externa anrop, JS-, asset- eller konsolfel observerades. Lokal byggd Worker och migrerad D1/R2 använder fiktiva identiteter utan mockade API-svar. Rapport: `/workspace/scratch/mobile-navigation-browser/candidate/report.json`, SHA-256 `06d56090df7428bbb8e3e74a8d401f000206a5fe0c7cb9a2358f8a3ca499dfe4`; metod och slutkvittens finns i `SUMMARY.md` bredvid rapporten.
- 200 procent innebär fördubblade uppmätta fontstorlekar och explicita pixelradavstånd **endast i header/banner**, inte sidzoom eller global WCAG-certifiering. Ingen produkt-CSS injicerades i slutprovet. Det tidigare pointerhindret från v19 är rättat inom dessa fall. **Kvarvarande fokusobservation:** provider-remount vid arbetsytebyte återställer fokus till BODY; fyra Tab på mobil och tio på dator når väljaren. Ett enda oförändrat v19-fall på 1440 px/Min dag/admin reproducerar samma reset och tio Tab. Detta belägger tidigare beteende i just det jämförelsefallet, ingen generell automatisk fokusbevaring.
- B02:s aktörskontroll gäller huvudendpointens `POST /api/crm`, inklusive `type=restore`, med förnyad rollkontroll vid CAS-försök och atomiskt krav på aktuellt aktivt medlemskap, identitet, roll och ansvar. Det är ingen generell granskning av återkallad behörighet i separata fil-, privata draft- eller backup-/återställningsendpoints. B03:s svenska godkännandedagar omfattar båda API-handlingarna `order_shortfall` och `order_amend_accept`; lagrade tidsstämplar och uttryckliga kundgodkännanden skrivs inte om. Datakompatibilitet och säker UI-återgång beskrivs i OPERATIONS.
- Den isolerade workerd/D1/R2-runtimekontrollen passerar med **13 500 000 byte filer** och **18 010 856 byte strömkopia**. Detta är lokalt återställnings-/runtimeunderlag, ingen återställning i Sites eller prövning med riktiga kunddata.
- Samma Site `appgprj_6aa71b309d90819181a32a9af6e6baf2` har **v20**, versions-ID `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_143b341ac7e88191bc2b9423fe90f637`. Deploy `appgdep_6ac4358c97248191ba275c1abf27706f` är verifierat lyckad kl. **23:41:11 UTC** till [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site). Färsk metadata bekräftar aktiv v20, oförändrad custom-delning, policyrevision 2 och en extern besökare.
- Live-efterkontrollen gjorde endast anonyma GET: `/` och `/api/crm` gav **401/401**. Autentiserad live-UI, riktiga konton, fysisk telefon, personal, integrationer och hostingåterställning är inte verifierade. Inga kundskrivningar utfördes på live. Refererad Codex-tråd är fortsatt oläst; scheman, prompter och aktivering ändrades inte.

V19 och tidigare kvittenser behålls som historiska belägg. Denna v20-kvittens är en separat Markdownleverans utan appåterpublicering; efterföljande dokumentationsrevision kan ändra Git-trädet medan applikationsfilerna förblir identiska med publicerad main `996d44082bf09e519dae3c85f93d280f541cbf73` och Sites-källa `c858b05fc2e77870670db39ce5fe794f2d25db27`.


## Kandidat 2026-10-06 – separata behörighetskontroller

- Fryst produkt på `fix/atomic-backup-authorization` från main `5ba7391` har passerat `node tests/outlook.mjs`, TypeScript `--noEmit --incremental false` och diffkontroll. Befintlig regression behåller 40→45 med ny accept, 50→48 med explicit kundgodkännande, kassation, delleverans och dubbelklick. Outlook använder kontrollerade Microsoft-svar.
- Nya verkliga SQLite/API-prov kräver oförändrat mål-CRM, ledger, filer och utkast samt enbart eget stagedobjekts städning vid återkallad behörighet före commit. JSON/NDJSON provas för inaktivering, admin→seller/reader, borttagen medlem, ombundet användar-ID, ändrat ansvar och medlems-ID (14 race). Återkallelse vid replay eller efter en legitim commit med/utan tappad ACK ger 403 utan CRM-data, och bevarar den committade filen. Historik/ledger använder fortsatt stabilt användar-ID.
- Fil-/privata utkastprov täcker create/update/archive, sju medlems-/rollfall, verklig samtidig draft INSERT/UPDATE, fräscha privata GET/replay/konflikt-/successsvar, arbetsfoto/work-version, workspace-CAS och bevarande av committade eller oklara R2-objekt. Fiktiva fixtures återställer omgivande testmiljö; fokustest passerade separat med tom och befolkad demo. Avsiktliga syntetiska 503-/ACK-fel loggas och kontrolleras.
- Inga SQL-, datamodell-, beroende- eller backupformatändringar. Ingen live-skrivning eller verklig hostingåterställning. Backupexport/ström, Outlook och medlemsadministration ligger utanför denna revokationsgranskning; redan lämnade bytes kan inte återkallas. Separat build/runtime/browser, exakt GitHub-head/main och Site-publicering återstår och kvitteras efter faktiskt utfall. Se OPERATIONS för datakompatibel återgång.


## V21 – faktisk releasekvittens 2026-10-06

- [PR #14](https://github.com/ludros93-prog/MAgnussons-CRM/pull/14), exakt head `489f2429d0404d58eaecb8b8605680ff9b306a36`, passerade alla steg i [CI 37394645055](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37394645055), jobb `112047602993`, kl. **00:35:22 UTC**. Färsk main `5ba7391` och CLEAN-status kontrollerades inför merge. App-main är `fe981c40945e9ea5f853d2c28b2012659df1b347`, träd `087b4ef3188a3e453b829c82086c43fdda54f0bd`. [Main-CI 37395359373](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37395359373), jobb `112049923936`, slutförde alla steg med success kl. **00:43:34 UTC**.
- Exakt Sites-källa `0dc0c8023cc25be56fca48aaf66718f8dcf80de5` har samma träd. Full regression och TypeScript passerar; pnpm **11.25.0**-bygge, isolerad runtime och browserprov kördes på samma slutliga artefakt. Worker-SHA-256 `28e70dc75096395ecee9d5fa705db274ef0d66c45020914c8e986b64ee2d4c6d`; dist-SHA-256 `56afe33484f92f04d6f564f8338a87218540439c33c1fe4141b63bf6575880a0` (sorterad kompakt JSON över dist/path, SHA och bytes). Alla 95 byggfiler och hostingmetadata jämfördes byte för byte mot arkivet; de är oförändrade efter QA. Lokal gzip-SHA och native-normaliserad tar-SHA redovisas separat i `/workspace/scratch/release-0dc0c802/evidence.json` och `artifact-before.json`.
- Nya negativa/progressionsprov för JSON/NDJSON, filer och privata utkast passerar enligt kandidatposten ovan. Befintliga 40→45, 50→48 med uttrycklig accept, kassation, delmängder och dubbelklick är fortsatt gröna. Runtime i verklig lokal workerd med isolerad persisterad D1/R2 återställer **13 500 000 byte filer** och **18 010 856 byte strömkopia**, med hashkontroller, filversioner, korrektur-/fotolänkar, idempotens, oförändrad källa, privat kundutkast, atomisk publicering och nekad sen autosparning. Detta bevisar ingen återställning i Sites eller med kunddata.
- Chromium: **4/4 fulla flöden**, exit 0, tio rapporterade skärmbilder. 1440/390 px privat formulär får verklig D1-rolländring admin→reader före nästa autosparning; 403 lämnar text och sparad revision intakta, felstatus ersätter privat Sparat, och återställd behörighet ger normalt återförsök och exakt återupptagning efter omladdning. Annan säljare får 200/tom lista även för två kända draft-ID:n. Filflödet visar normal uppladdning, nekat försök utan ny metadata/R2 och lyckat återförsök med bevarat filval/version. Inga gemensamma kund-/orderskrivningar eller externa anrop utfördes. Inga JS-/assetfel; tre väntade HTTP403-konsolposter hör till negativa prov.
- Mobilens felstatus ligger överst i det långa formuläret och befann sig först ovanför viewport efter textarea-arbete. Vanlig scroll visar status/återförsök, och normalt klick utan force fungerar. Före/efter-boxar och extra före-scrollbild sparades; ingen horisontell dokument-/dialogöverbredd uppmättes i tio bilder. Automatisk synlighet, fysisk telefon, full WCAG eller personalacceptans påstås inte. Två inledande harnessdiagnoser (etikettselector efter textarea-innehåll och scrollförväntan) är separat arkiverade; produkt och artefakt ändrades inte för grönt resultat. Slutrapport `/workspace/scratch/authority-browser/report.json`, SHA-256 `bf471b7cd91831b0a7aec8b45ff4e150b0f1d070a5cc3620ad19d7a171937617`. Root och browseragent granskade nyckelbilder. Egna 8900/8901 och temporär lagring är stängda/städade.
- Samma Site `appgprj_6aa71b309d90819181a32a9af6e6baf2` har sparad och publicerad **v21**, versions-ID `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_4f49e671dd60819196139a49d42d80e8`. Deploy `appgdep_6ac444058e188191917e3b6873b89ac1` bekräftades **succeeded** kl. **00:42:55 UTC** till [Magnussons CRM](https://magnussons-crm.rosen123.chatgpt.site). Färska native-svar bekräftar source SHA, deploy, aktiv v21 och oförändrad custom-delning, policyrevision 2/en extern besökare. Native tar har 96 filer; ingen ny deploy behövs för denna dokumentationskvittens.
- Efterkontroll: endast anonyma live-GET av `/` och `/api/crm`, **403/403**. Ingen autentiserad live-UI, konto-/integrations-/personal-/telefon-/hostingåterställning prövades. GET-backup/ström, Outlook och medlemsadministration ingår inte i denna avgränsade behörighetsgranskning, och redan lämnade bytes kan inte återkallas. Inga SQL-, modell-, format-, beroende-, kunddata- eller delningsändringar. Refererad Codex-tråd är fortsatt oläst. Scheman, prompter och aktivering är oförändrade.

Den faktiska v21-kvittensen ersätter kandidatpostens dåvarande vänteläge. Tidigare releasebelägg behålls som historik. Denna senare Markdownleverans kan ha ett nytt Git-träd, men samtliga applikationsfiler är identiska med ovanstående app-main och Sites-källa.

## Separat GET-backup – verifierad kandidat efter v21

- Baslinje före produktändring: actualSQLite/API lämnade JSON200 och komplett NDJSON200 med två syntetiska filer efter admininaktivering under första filläsningen. Kandidaten binder exporten till ursprunglig aktuell adminidentitet och håller varje begränsad fil privat till ny kontroll. Fel efter HTTPstart avbryter kroppen utan giltig slutpost; redan skickade bytes kan inte återkallas.
- `node tests/outlook.mjs` passerar för slutlig produkt/testkod. Nya `tests/backup-export-authorization.mjs` täcker sju medlemsändringar under JSON-/NDJSON-filläsning och sista stateawait, efter header och före slutpost. Null-user-ID återbinds inte; borttagen/återskapad medlem återöppnar inte exporten. Privata R2-fel ersätts med aktuellt åtkomstfel, kund-/fil-/ledger-/medlemsunderlag och R2-objekt bevaras.
- Zero read-ahead, avbruten headerläsning, pågående R2-reader och sen R2-get provas: oläst kropp stängs, avbrutet arbete lämnar ingen nästa fil. Legitima JSON/NDJSON har oförändrade bytes, kontrollsummor och fullständig slutpost. **110 små filer använder 475 D1-läsningar**, under det syntetiska regressionskravet 600. Detta verifierar inte Sites-plan eller manifestgränsens 2 000 filer.
- TypeScript `--noEmit --incremental false` och diffkontroll passerar. Befintliga mängd-/acceptans-/revisionsprov, 40→45, accepterad kortleverans, kassation, delleverans, CAS/idempotens, privata utkast och strömmad återställning kvarstår gröna. Inga gamla förväntningar sänktes. Officiella källor/driftbudget och kompatibel återgång finns i RESEARCH/OPERATIONS.
- Exakt produktionsbygge, workerd/D1/R2-runtime, browsernedladdning, CI, main och live kvitteras efter faktiskt utfall. Ingen SQL-/modell-/format-/beroendeändring, kundskrivning, kontoanslutning eller hostingåterställning införs. Request.signal-flaggan och delningen är oförändrade; syntetisk cancel är ingen garanti för verklig Sites-disconnect.

### Completionkrav – första kandidaten stoppad

Första head `5a3f3a5b…` klarade CI och 13,5 MB lokal återställning, men browserprovet stoppade leveransen: efter riktig D1-återkallelse saknade actual-workerd-HTTP-kopian end och 14 av 16 filer, medan native download rapporterades färdig. Varken merge, Sites-sourcepush eller deploy gjordes. Den lilla redan producerade kopians normala completion är en separat buffringsgräns. Det misslyckade stora provet och hashkvittensen finns i agent/LOG.

Reviderad kandidat använder verklig fixed-length-HTTP-body. Full payloadlängd ska provas oberoende av formeln, inklusive escapade Unicode-ID:n, base64rester och tom filsamling. Direkt producentprov och faktisk API-pipeline redovisas separat. Ny exakt head/regression/TypeScript/build/runtime/HTTP/browser behövs före leverans; status200 eller ren EOF räcker inte för backupframgång.

Reviderad slutregression och TypeScript passerar. Sju återkallelser i verklig JSON/HTTP-API-body och finalawait bevaras; exakta före-/efter-header-/end-/zero-read-ahead-gränser provas i den direkta producenten med uttrycklig readonly medlemscallback. API-pipeline-cancel når pågående/oläst R2 och stoppar nästa fil. Node-FLS-längden jämförs mot faktiskt mottagen UTF-8, inklusive Unicode/quote/backslash-ID:n, storlekar 1/2/3 och tom filsamling. 110 små filer använder fortsatt 475 D1-läsningar. Detta kvitterar inte native HTTP; byggd runtime kontrollerar verklig Content-Length genom HTTP-listenern, och browserns misslyckade partial-download måste provas igen.

Andra head `08453ecd43894de907fe1b92dcbe3649284cd6f4`, sourcekandidat `82c8d7db65103fc220023903b23aaf34ec196a57`, klarade regression, TypeScript och bygge men **inte runtime/CI/browser**: actual-workerd-HTTP saknade Content-Length eftersom Vinext bytte inner-FLS-kroppen mot en vanlig TransformStream. CI `37401452911`, jobb `112069328347`, failade just built-runtime kl. 01:55:08 UTC. Browserns normala kopia hade korrekt innehåll men saknade längd; större revokationsprov kördes därför inte på denna kandidat. Ingen merge/sourcepush/deploy gjordes.

Tredje kandidaten flyttar den sista längdvalideringen efter Vinexts cleanup i en dokumenterat stödd custom-Worker. Serverns validerade responsmetadata används; internmarkören tas bort och saknad eller ogiltig markör på målresponsen nekas. Autentisering, API-handler, lagring och övriga omärkta svar behålls. Slutregression, exakt byggd HTTP/runtime, native download-failure och retry samt head-CI måste på nytt passera före release.

Tredje kandidatens frysta produkt/test passerar full CRM/Outlook-regression, TypeScript och diffkontroll. 23 nya Worker-guardfall ger generiskt 503, sourcecancel och inga privata bytes/headers vid ogiltig eller saknad målmetadata. Två längdvaliderande lager bevarar sju medlemsändringar, finalawait, pipelinecancel, Unicode/escaping/base64/tom filsamling och 110 filer/475 D1-läsningar. Ett tidigt byggt actual-HTTP-probe passerar 13,5 MB återställning med rätt längd; exakt sourcebygge/runtime/browser och head-CI kvitteras fortfarande separat före release.

## V22 – faktisk leveranskvittens 6 oktober 2026

- [PR #16](https://github.com/ludros93-prog/MAgnussons-CRM/pull/16), exakt head `b432969bb383c727d8e16570a0ae5627a2219bd7`, passerade [CI 37402713450](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37402713450), jobb `112073254767`, alla steg success kl. 02:10:29 UTC. Färsk bas och inga konkurrerande öppna PR:er kontrollerades före merge. App-main är `60de185b96458992b176d43745970254a9bb3c38`, träd `5d12245a93b0ad900d4319d19de8aa3581ae965f`. [Main-CI 37403147145](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37403147145), jobb `112074632318`, passerade alla steg kl. 02:15:57 UTC.
- Exakt pushad Sites-källa `8636a5ef3205a3be590fb5b99ed635a90da275d6` har samma Git-träd. Full CRM/Outlook-regression, TypeScript, pnpm 11.25.0-produktionsbygge och isolerad workerd/D1/R2-runtime passerar. Actual-HTTP exporterar och återställer 13 500 000 byte filer i 18 010 856 byte kopia med korrekt Content-Length, hashar, filversioner, korrektur-/fotolänkar, idempotens, oförändrad källa, privat utkast, atomisk publicering och nekat sent autosparande. Befintliga 40→45, uttryckligt godkänd 50→48, kassation, delleverans och dubbelklick kvarstår gröna.
- Nya actualSQLite/API-prov täcker sju sena medlemsändringar, read-only återkontroller utan bootstrap/rebind, privata felsvar, producentens header/end och avbruten R2-reader/get. Final-Worker har 23 guardfall, saknad/ogiltig servermarkör, oförändrade andra svar, sourcecancel utan privata bytes/headers, under-/överflöde och exakt UTF-8/escaping/base64/tom filsamling. 110 små filer använder 475 D1-läsningar. Node-modellen ersätter inte riktig HTTP.
- Slut-Chromium på oförändrad artefakt passerar **fem exportflöden** och verklig Tab/Enter på 390 px: JSON, native NDJSON, nekad 403, avbruten stor kopia och legitimt återförsök. Stor actual-workerd-HTTP deklarerar **49 406 689 byte**; riktig D1-revokation efter header stoppar efter **6 006 417 byte**, utan giltig slutpost eller färdig nedladdningspath, med native failure `canceled`. Legitimerat återförsök hämtar exakt hela längden och samtliga **16 filer/37 048 576 råfilbytes** med rätt SHA/end. JSON är det äldre buffrade formatet; fixed-length-HTTP gäller native NDJSON. Inga JS-/consolefel, externa anrop eller appskrivningar; sourcekund-/filunderlag är oförändrat. Detta är lokalt browserprov med fiktiva identiteter, inget personalprov.
- Browserrapport `scratch/export-browser/candidate-8636a5ef/report.json`, SHA `541ad943fe29ce25741f7255eb8cd5714b2976b06b7b416a61634b69b211c981`, och distinct-ID/filhashbevis samt fem unika PNG/sex layoutmätningar ligger utanför Git. Mobilfokusbilden är visuellt granskad och har ingen dokumentöverbredd; ingen generell mobil-/WCAG-garanti påstås. Egna 8910/8911/intern36835/PID39811 stängda och egen temporär lagring borttagen. Worker SHA `bd9a9ebe00ff4326d5c44603a9e1e3255068ef2092d2f9d025452e3028968e52`, dist SHA `9ecaaf88d7695794ae0e9c295e3e7b7006e21ffe2d62e653f34ce9e5aa6e9f71`; alla 96 distfiler är oförändrade efter runtime/browser. Paketets 97 filer innehåller bara dist och hostingmetadata och jämfördes byte för byte.
- Samma Site publicerade **v22**, versions-ID `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_cfa2d0601e5481919bde635f20bf5340`, deploy `appgdep_6ac459c4525481918f13aed5594d1d3f`, succeeded kl. **02:15:53 UTC**. Färska version-/Site-svar bekräftar pushad källa och aktiv Site, samma custom-delning/policyrevision 2/en extern besökare och envrevision 1. [Live](https://magnussons-crm.rosen123.chatgpt.site). Endast anonyma live-GET av `/` och `/api/crm` gjordes efter deploy: **403/403**, inga kundskrivningar.
- Ingen SQL-/modell-/format-/beroende-/affärsdefinitionsändring. Konton, Outlook och privata utkast ingår fortsatt inte i gemensam kopia. Redan utlämnade/buffrade godkända bytes kan inte återkallas och D1-kontroll/HTTP är ingen gemensam atomisk transaktion. Faktisk Sites-disconnect, transport/framing med autentiserat livekonto, maximal hostingvolym, riktiga konton/integrationer/personal/fysisk telefon och hostingåterställning är fortfarande oprövade. Refererad Codex-task är oläst eftersom Codex read_thread saknas. Scheman, prompter och aktivering är oförändrade.

Den faktiska v22-kvittensen ersätter ovanstående kandidatposters dåvarande vänteläge. Två stoppade kandidater behålls som teknisk historik. Denna separata Markdownleverans återpublicerar inte appen; senare dokumentations-main kan ha annat Git-träd medan samtliga applikationsfiler är identiska med app-main och pushad Sites-källa ovan.
