# CRM-källor för Magnussons byggagent

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
- [Saleshub AI funktioner](https://saleshubai.se/funktioner): HTTP200, slut-URL oförändrad kl. 19:21:26.428634 UTC. Beskriver sammanhängande kund-/affärs-/leveransinformation och nästa aktivitet. Tillämpning: samma underlag visar aktuellt besked, avsändning och kontrolluppgifter utan dubbelregistrering. Marknadsbeskrivning är inget integrationsprov.

Browserbelägget för v34 är 8 syntetiska fall; inga påståenden om uppmätt personalnytta, egna leverantörsintegrationer eller världens bästa CRM görs genom källorna.
