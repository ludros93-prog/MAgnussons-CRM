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
