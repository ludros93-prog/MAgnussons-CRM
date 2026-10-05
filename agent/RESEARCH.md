# CRM-källor för Magnussons byggagent

Kontrollerat 2026-10-05. Källorna är officiella produktbeskrivningar eller dokumentation. De bevisar inte att Magnussons har dessa anslutningar, att leverantörernas drift har testats eller att ett visst arbetssätt ger en uppmätt tidsvinst. Kraven nedan är vår tillämpning för Magnussons.

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
