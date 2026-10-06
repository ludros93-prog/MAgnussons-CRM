# Magnussons CRM – designriktning

Designen är ett huvudkrav och ska utvecklas med inspiration från Saleshub, Lime och Salesforce. Målet är att CRM-ovan personal snabbt förstår kunden, sitt ansvar och nästa handling. Designarbetet ingår i vidareutvecklingen av den befintliga appen.

## Gemensamt uttryck

Utgå från CRM:ets befintliga logotyp, mörka navigation, ljusa arbetsytor och röda handlingsknappar. Nuvarande variabler är `--foreground: #182740`, `--primary: #ce3545` och `--care: #087e70`. De är verifierade i koden, inte en fastställd grafisk profil för företaget. Nya vyer ska dela samma former, typografi och avstånd.

- Visa den viktigaste arbetsuppgiften först, med kund, orsak, ansvarig, datum och en tydlig handling.
- Skilj primär handling från navigation och redigering. Svenska verb ska beskriva det som faktiskt händer.
- Använd lugna bakgrunder, tydliga rubriker och grupperad information. Fler kort eller färger får inte göra arbetsordningen svårare att förstå.
- Status ska ha text och vid behov ikon. Färg får inte vara enda sättet att förstå försenat, blockerat eller klart.
- Använd läsbar löptext, synligt tangentbordsfokus och mobila handlingar på minst 44 px. Långa namn, mejladresser och instruktioner ska brytas inom sin yta.
- Visa tomt läge och saknat underlag med en begriplig nästa handling. Inga dekorativa prognoser, påhittade resultat eller falska integrationsstatusar.

## Kundkortets första designleverans

Kundöversikten samlar nästa steg, kontaktplan, order/leverans och tidslinje i tydliga sektioner. Lokal sektionsnavigation hjälper användaren att hitta rätt utan att lämna kunden. Försenad, dagens och kommande aktivitet använder text tillsammans med färg. Nästa aktivitet behåller samma befintliga uppföljningsflöde.

Kontaktuppgifter och ansvar får en kompakt, läsbar presentation. Interna anteckningar benämns som anteckningar i tidslinjen. Orderdatum, kundkontakt och nästa planerade avstämning är skilda uppgifter. Designen ändrar inte affärsregler, roller, privat kommunikation eller datalagring. Nästa aktivitet har sin handling före datum och ansvar på mobilen. Korta synliga mobiltexter behåller fullständiga ARIA-namn. Långa ord bryts inom sin yta och sektionsknapparna får två kolumner vid 320 px.

## Inspiration och kontroll

Leverantörskällor och avgränsade designlärdomar dokumenteras i [agent/RESEARCH.md](agent/RESEARCH.md). Vår tillämpning är anpassad till Magnussons arbetsmoment; leverantörernas färger, varumärken och produktlöften återanvänds inte som våra.

Designarbetets kvalitetsregel är att kontrollera berörda vyer på dator och mobil med tangentbord, långa värden, tomma data och relevanta roller. D01:s tidigare slutbygge 4 och den exakta v19-artefakten passerade 16 scenarier och 36 layout-/skärmbildskontroller för kundkortet, inklusive kontrollerad textförstoring 200 procent. Det är historiskt kundkortsunderlag med textstorlek/radhöjd, inte browserns sidzoom. Skärmbilder, mätningar och provgränser finns i [VALIDATION.md](VALIDATION.md). Browserprov visar layout och arbetsflöde; personalens användbarhet behöver observeras i deras verkliga arbete.

### Begriplighet i det befintliga användarprovet

I T26 och B07:s befintliga pilotmoment ska en CRM-ovan användare kunna svara på tre frågor utifrån den berörda vyn: Vilken kund och egen-/team-/arbetsyta arbetar jag i? Vad behöver min uppmärksamhet och vilken handling kommer härnäst? Är mina uppgifter sparade som privat utkast eller inlämnade till gemensamt CRM?

Observera vad personen faktiskt väljer och registrera feltolkningar, backningar och behov av hjälp per moment. Ett förlorat eller nekat svar får inte tolkas som bekräftad CRM-sparning. Använd befintliga pilotuppgifter och fiktivt underlag; detta inför inget nytt testprogram eller påhittat tidsmål. Browserprov ska kontrollera att rätt information och handling går att nå. De besvarar inte frågan om personalen förstår vyn utan handledning.

Två redan öppna designuppgifter får följande konkreta mål. De är krav för nästa implementation, inte verifierat slutbeteende:

| Arbetsmoment | Önskat beteende och avgränsad kontroll |
| --- | --- |
| Hitta en kund på mobilen | På 320/390 px ska kundlistan visa kundnamn, ansvarig och nästa aktivitet eller ett ärligt besked om att den saknas. Kundkortet ska kunna öppnas med vanlig pointer och tangentbord. Långa värden ska vara läsbara inom vyn utan att kundens viktigaste handling kräver horisontell scroll; inga påhittade ansvariga eller aktiviteter fyller tomma fält. |
| Byta arbetsyta | Efter ett användarvalt byte ska vald arbetsyta framgå i text och tangentbordsfokus återgå till motsvarande väljare i den nya vyn, eller en namngiven start om väljaren inte finns. Fokus får inte tappas till BODY. Bakgrundsladdning och autosparning får inte stjäla fokus. Prova vanligt tangentbordsbyte och efterföljande Tab; bevara skydden för privata utkast och rätt roll/sammanhang. |

Kundkortets normala 390/320 px-vyer visar första handlingen direkt i de tidigare proven. Extra långa värden på 320 px kräver vertikal scroll. D01 publicerades i v19 och kvarstår i v22 enligt [VALIDATION.md](VALIDATION.md). Vid v19 kunde bannern täcka den globala arbetsyteväljarens pointerklick på 320 px och tangentbord användes för initieringshinten. Detta fynd ligger till grund för den slutprovade och publicerade v20-rättningen nedan. Autentiserad live-UI och personalens användbarhet är fortfarande inte verifierade.

## Global mobilheader

På smala skärmar ska huvudraden växa när navigationen radbryts, så att arbetsyteväljare och övriga kontroller ryms ovanför arbetsytans banner. Långa vy- och arbetsytenamn får radbrytas inom sin yta. Behåll befintliga färger, texter och byten mellan arbetsytor; den fria tryckytan ska vara minst 44 px hög. Layouten ska fungera med pointer och tangentbord samt förstoring, med befintliga roller och skydden för privata utkast vid arbetsytebyte.

Den publicerade v20-artefakten har passerat 13/13 vanliga pointerklick utan force och 13/13 tangentbordsåtergångar med Tab/Space/End/Enter på 320/390/768/1440 px, med långa värden och ett läsarfall. Kontrollernas text och ikoner ryms i headern ovanför bannern. Kontrollerad 200 procent textförstoring omfattar endast header/banner; det är inte sidzoom eller global WCAG-certifiering. Arbetsytebyte remonterar provider och återställer fortfarande fokus till BODY. Väljaren nås med fyra Tab på mobil och tio på dator. Samma reset reproducerades i ett oförändrat v19-fall på 1440 px; automatisk fokusbevaring påstås inte. Slutartefakt och publicering kvitteras i VALIDATION. Leverantörs- och tillgänglighetsprinciperna finns i [agent/RESEARCH.md](agent/RESEARCH.md).

## Fortsatt designarbete

Efter kundkortet: en konsekvent visuell hierarki för kundregister, offertunderlag och Tryck & leverans; gemensamma statusord och datum; formulär med få nödvändiga uppgifter först. Fortsätt från observerad friktion och bevara Min dags fokus på personligt arbete. Månads-/årsförsäljning, marginal och nya prospects är huvudmåtten; TB blir inget huvudmått.


## Synlig status i privata kundflöden – publicerad v23

Vid arbete långt ned i kundplan, bearbetning och onboarding ska en kort statusyta fortsätta visa privat serversparning och en relevant nästa handling. Kundens CRM ändras först vid uttrycklig sparning där. Färg kompletterar statusorden. Långa fel och revisionsval ligger kvar i formuläret med en fokuserbar väg från statusytan; de ska inte låsas över mobilens arbetsfält.

Statusytans och sparhandlingarnas verkliga höjd ger rullningsutrymme för fokus även när texten radbryts. Fälttext, serverfel och befintliga konfliktval bevaras. Det frysta v23-bygget passerar 26/26 browserfall och 6/6 tangentbordsfall med kontrollerad 200 procent fälttext, kort viewport och faktisk lokal sparning/konflikt/återförsök. Under 540 px höjd ligger nedersta handlingarna i normalt scrollflöde; de kan nås och rullas fram med Tab utan att döljas helt av statusytan. En stor textarea visas delvis och scrollas. En duplicerad CRM-feltoast tas bort endast i dessa flöden; exakt fel ligger kvar i dialogen. VALIDATION kvitterar faktisk v23-publicering. Fysisk telefon, skärmläsare och personalacceptans kräver separat prov; automatisk browserkontroll är ingen allmän tillgänglighetscertifiering.


## Kundvårdens relevanta handlingar, v24

Affärsingångarna Återköp/Merförsäljning följer nu befintlig säljar-/adminförmåga; reader behåller läsning och historik utan de två oanvändbara formuläringångarna. Detta är en avgränsad tydlighetsförbättring enligt aktuella leverantörsprinciper i RESEARCH. Roll-/kort-/navigeringsprov på 320/390/1440 px och komponentrender passerar. Det generella affärsformulärets min-content-bredd och fem px klippta footer är däremot belagda gamla fel med långt kundnamn, lika före/efter. Nästa formulärdesign ska rätta dessa mått och provas med sparstatus, textförstoring och kort viewport utan att sänka kraven. Fysiskt mobil-/personalprov är fortsatt oprövat.


## Generella formulär – publicerad v25

Långa kundnamn, valtext och befintlig privat sparstatus ryms inom formuläret. Krympbara kolumner ger en kolumn på mobil; svenska handlingar radbryts och har minst 44 px höjd. Footer tar hänsyn till safe-area och ligger i vanligt scrollflöde vid kort viewport. Textareas behåller sina rader, full text, intern scroll och manuell resizing.

Native fokus kan visa en textmarkör samtidigt som fältets nederkant ligger bakom en radbruten footer. Hjälpen mäter därför aktuella kanter för det fortfarande fokuserade generella fältet och rullar bara dialogen vid behov. Den ändrar inga värden, ingen fokusdestination och ingen sparning. Workorder och privata kundflöden är oförändrade.

Slutbygget passerar 18/18 fall och 77 formprov på 320/390/768/1440, kort 390×460 och kontrollerad 200 procent dialogtext, samt åtta dropdowninteraktioner. Alla 1 937 Tab-fältbesök har fri helbox med befintlig tolerans. V24-fyndet ovan är historiskt; faktisk rättning/publicering kvitteras i VALIDATION. Portalernas textförstoring, fysisk telefon/OS-tangentbord, skärmläsare och personalanvändbarhet är inga godkända prov här. Färska leverantörs-/webbstandardkällor finns i RESEARCH.

## Synlig laddning och nåbara statusknappar – publicerad v26

Generella formulär visar nu det befintliga laddnings-/felbeskedet och Försök igen även innan ett privat record finns. Öppna uppgifter kan vara osparade; först ett lyckat privat återförsök ger Sparat som privat utkast. Ett rent formulär och inställningar får ingen falsk privat bekräftelse.

Radix Tab-wrap kan fokusera en knapp utan att rulla den till synlig yta. Den befintliga generella scrollhjälpen omfattar därför även utkastets statusknappar och mäter fri yta före aktuell footer. Den ändrar inte fokus, text eller sparning. Workorder, reader, footer och andra dialogers kontrakt består. Lång feltext får vara större än skärmen och läses med vertikal scroll.

Slutkälla 809b77e passerar 10/10 Worker-/Chromiumfall, sex återhämtningsflöden och 12 native Tab-/pointerkontroller på 320/390, kort 390×460 och kontrollerad exakt 200 procent dialogtext. Samma96 distfiler är oförändrade. Officiella Salesforce/Lime/W3C-principer och deras gränser finns i RESEARCH. Samlad/sticky spar-/CRM-felstatus och hjälpmedelsannonsering är fortsatt nästa arbete. Fysisktelefon/OS-tangentbord, skärmläsare och personalprov är oprövade; ingen generell användbarhetsgaranti följer av dessa kontroller.

## Bestående textstatus utan extra mellanrum – publicerad v27

Generella formulär behåller en text-only polite/atomic statusregion även när ingen sparning pågår. Clean-regionen klipps visuellt med befintlig sr-only-utility och ligger utanför gridflödet; den tas inte bort eller göms från hjälpmedel. Tider och handlingsknappar ligger utanför regionen. Väntande arbete, privata sparningar, fel och konflikt använder tidigare svenska texter och visuella statusar utan fokusflytt.

Slutbrowser 13/13 på 1a7e841 verifierar samma nod, exakt oförändrade clean-mått mot v26, native Tab/pointer, verklig 200-procenttext och faktisk privat CAS409. Första kandidatens extra 14 px är rättade. 96 byggfiler är oförändrade efter prov. Ingen faktisk skärmläsaruppläsning eller generell tillgänglighetscertifiering påstås. Officiella W3C/Salesforce/Lime-källor och deras gränser finns i RESEARCH; samlad privat-/CRM-felstatus är nästa avgränsning.

## Samlad privat/CRM-status – publicerad v29

Generella formulär samlar privat utkaststatus och besked från CRM-/stängningsförsök vid spara- och stängknapparna. En bestående textregion med role=status, aria-live=polite och aria-atomic=true ger sammanfattningen; tider, hjälprad och detaljknapp ligger utanför. Fullständiga privata besked och befintliga återförsöks-/versionsval finns kvar i formuläret. Visa besked/Granska flyttar fokus till rätt detalj först när användaren väljer handlingen. Statusändringar flyttar inte fokus.

Footerns faktiska höjd mäts och används för att hålla samma fokuserade generella fält synligt. Den följer normalt scrollflöde när viewporthöjden är högst 540 px eller dess uppmätta höjd överstiger halva tillgängliga vyhöjden; annars behålls sticky. Clean-formulärets hjälprad förklarar Spara utan privat sparbekräftelse eller extra privat DOM-gap. Inställningar och läsare får egna tydliga besked. Slutbrowser passerar 23/23 fall på oförändrad artefakt med 119 bilder/19 före-/efterauditer; fem generella former med normal/computed200-text bevarar fokus och markering genom autosave. I kort 390×460/text200-vy syns respektive Tab-fokuserad knapp helt, medan status och alla handlingar kräver scroll. V29 är faktiskt publicerad; se VALIDATION för source/main/live och fullständiga belägg. Faktisk skärmläsaruppläsning, fysisk telefon/OS-zoom/tangentbord och personalanvändbarhet är fortsatt oprövade.
