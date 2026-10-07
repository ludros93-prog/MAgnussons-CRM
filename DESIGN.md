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

## Nåbar mobilmeny på korta skärmar – publicerad v40

Mobil navigation ska gå att använda från början av en kort skärm, utan att först öppnas i större viewport. En namngiven modal panel, tydlig svensk Stäng och egen vertikal rullning håller arbetsområden nåbara. Text och ikon visar handlingarna. Menyval stänger panelen och avslut återför fokus med bevarat sidläge.

Ctrl/Cmd+B öppnar inte mobilmenyn när en annan modal dialog är öppen. När viewporten går över till desktopbredd stängs den mobila panelen; den återöppnas inte automatiskt när skärmen blir smal igen. Desktopens befintliga menyval och tangentbordsväxel behålls. Breda, korta skärmar använder den befintliga sidmenyn i sidans layout. Vid minst 768 px bredd och högst 540 px höjd får hela den menyn egen vertikal rullning; header, val och footer ligger i samma rullningsyta. Menyns val pressas därmed inte ihop till en smal remsa mellan header och footer. Den vanliga höga desktoplayouten behålls. I mobilpanelen och den breda, korta sidmenyn får svenska menyval, företagsnamn och profiltext radbrytas inom sin yta. Magnussons symbol får en innehållsanpassad box när texten förstoras; menyknapparnas höjd växer med texten och är minst 44 px.

52 unika färska Chromiumkontexter PASS för fryst slutkandidat 776d1a43: 20 pointer, 3 tangentbord, 2 initial Shift+Tab, 4 sök-/avbryt, 2 långsidrullning, 4 breddbyte, 5 roller, 2 andra modaler, 6 desktop med samtliga val, 2 mobil textförstoring och 2 bred kort textförstoring. Extra textförstoringsbilder är visuell evidens och tillför inga fall. Mobil 320/390×360/844 och 767×390: Stäng, Escape, backdrop och val; verklig native Tab/Shift+Tab, synlig full knappbox och hit-test, verklig Ctrl+B-öppnare från sökfält med bevarat huvudtext-/scrolläge. Inline 768×390, 844×260/390/540/541 och 1280×900: samtliga sex val via Tab/Shift+Tab och pointer. Breddbyte stänger utan återöppning; seller/reader/production/print/warehouse, företagsdialog och portalled Select. Kontrollerad exakt 200 procent font (15,2→30,4 px), inte full browserzoom, vid 320/390×360 och 768/844×390. [VALIDATION](VALIDATION.md) skiljer faktisk layout/native tangentbord från personal-, telefon- och hjälpmedelsprov. Nästa avgränsning: **B01b2: stabil ansvarig för öppna affärer och order, med granskad överföring och bevarat historiskt resultat**. B01b2:s stabila kommersiella ansvar, övriga specialdialoger, fokus efter arbetsytebyte, mobilkundlista, separat utkast-/konto-/Outlookbackup, hostingbudget/återställning och personalpilot kvarstår.

Officiella källor och vår avgränsade tillämpning finns i [RESEARCH](agent/RESEARCH.md).

## Begriplig kommersiell överlämning – publicerad v41

Ansvarsbyte är en relevant svensk handling vid den affär/order som ska byta ansvar. Granskningen visar kund, aktuellt ansvar, ny profil, nödvändiga åtaganden, frivilligt valda uppgifter och arbete som blir kvar. Ny ansvarig och valfria uppgifter har inga förval; nödvändiga åtaganden visas som obligatoriska. Orsak och avsikt bevaras vid fel. Ett ändrat gemensamt underlag upphäver granskningen; användaren får välja ett nytt underlag uttryckligen. Synlig spar-/felstatus, väntspärr, stängningsval och nåbara svenska handlingar stödjer mobil och tangentbord.

21 unika browserfall passerade på b382ddc/tree4e47 med samma byggda Worker och oförändrad distmanifest. Rapporten har inga browserfel eller externa anrop. Granskad affärs-/orderöverlämning, obligatoriska/valfria uppgifter, faktiskt dubbelklick och en överlämningshistorik, förlorad kvittens med samma intent/ID, transportfel, verkligt lokalt samtidig API-ändring och 409 följt av explicit nytt underlag och ny granskning, busy/stängningsskydd, osparad råtext/native beforeunload och fokus. Säljare/läsare/produktion/tryck/lager saknar adminingång; produktionens Ditt jobb bevaras för faktisk syntetisk user_id. Viewport 320×360, 390×844 och 1280×900; uppmätt dubblerad text i dialog och Select, Tab/ShiftTab och synligt fokus. [VALIDATION](VALIDATION.md) anger faktiska provgränser. Detta är inga personal-/telefon-/skärmläsarprov. [RESEARCH](agent/RESEARCH.md) skiljer leverantörsprinciper från egna kontrakt.

Nästa avgränsning: **B01b2:s återstående operativa ID-migrering och granskade personalöverlämning med bevarad historisk attribution**. Full B01b2, separat affärschefsroll, övriga privata specialdialoger, mobilkundlista/fokus efter arbetsytebyte, separat utkast-/konto-/Outlookbackup, hostingbudget/återställningsrutin, faktiska integrationer och personalpilot kvarstår.

## Begripligt kundansvar och granskat underlag – publicerad v42

Kundkortets ansvarshandling visar kunden, aktuellt ansvar, ny profil, uttryckligt valda aktiviteter och arbete som ligger kvar. Ny profil och aktiviteter saknar förval. Profilnamn tillsammans med ursprunglig ansvarskoppling hjälper när namn sammanfaller. Läsning av ett ändrat underlag och valet att använda det är skilda handlingar; nytt underlag kräver ny granskning. Kunddialogens valda profil visas i en egen DOM-span inne i Select.Value; just den textytan begränsas till två rader. Trigger har lokalt krympbar flexlayout med minWidth0 och overflow-skydd. Radix2.3.7 använder eget child-innehåll och ersätter inte denna span med ItemText-portalen. Hela det valda profilnamnet och ursprungliga ansvarsetiketten visas direkt under väljaren och kopplas med aria-describedby; popup och granskning behåller full text. Orsak och tillåtna val bevaras vid fel. Väntspärr, osparat stängningsval, synlig status och identitetsavgränsning för arbetsyta, användar-ID, medlems-ID och serverroll hindrar att lokala val förs över till nästa sammanhang. Misslyckad hämtning visar läs-/åtkomstfel och blir inget nytt granskningsunderlag. Detta ger inget nytt varaktigt privat serverutkast.

Slutlig oförändrad kandidat 0338cdc6/tree0fb144e passerade 25 av 25 browserfall utan sidfel eller externa anrop. Root har läst rapporten, verifierat frysta käll-/distmanifest och granskat tre bilder från just slutkörningen. Tydlig kundöverföring och noll förvalda uppgifter, giltig granskning, smutsig-form-skydd för Escape/utanför/kryss och beforeunload, 503 och retry med bevarad avsikt, misslyckad refresh, verklig relaterad 409 och separat hämtning/adoption, busy-stängning, dubbelklick och exakt förlorat ACK-replay, tillåten orelaterad ändring, inaktivering av mål, identitybyten för användare/roll/medlem/workspace, fem serverroller utan administrativ överföringsingång och filtrerade kommersiella kundfält för produktionsrollerna. Layoutprov i 320/390/1280 px och lokalt beräknad 200-procentstext. Samtliga 18 tabellnycklar kontrollerades; 13 otillåtna tabeller, tre positiva Outlooktabeller, privat utkast, annan workspace och två R2-filer bevarades. [VALIDATION](VALIDATION.md) anger faktiska provgränser. Detta är inga personal-/telefon-/skärmläsarprov. [RESEARCH](agent/RESEARCH.md) skiljer leverantörsprinciper från egna kontrakt.

Nästa avgränsning: **Stabilt uppgiftsansvar med profil-ID och granskad personalöverlämning som bevarar historiska försäljningsresultat och privat kommunikation**. Full B01b2, profil-ID för ansvariga på uppgifter, möten och specialflöden samt komplett personalavveckling, separat affärschefsroll, övriga privata specialdialoger, mobilkundlista/fokus efter arbetsytebyte, separat utkast-/konto-/Outlookbackup, hostingbudget/återställningsrutin, faktiska integrationer och personalpilot kvarstår.

## Begripligt uppgiftsansvar – v43

Min dags kopplade uppgifter och uppgiftssignaler följer den egna profilens UUID. Teamets ansvarstext visar aktuellt namn, oföränderlig ursprunglig etikett vid dubbla namn och **ansvar behöver förankras** för äldre ansvar utan profil-ID, även när etiketten redan matchar en granskad profil. Etiketten är visning, inte ny personidentitet. Vanliga uppgiftsrader behåller Följ upp; inga nya överlämnings-/redigeringsingångar påstås.

Fjorton slutbrowserfall och fem separata Worker-HTTP-fall passerar på samma frysta källa. Layout/tangentbord avser 320/390/1280 px och avgränsad 200-procentstext. Resumed generic edit och gammal basis provas via syntetiskt sparat privat utkast med tydlig **Ansvarskoppling**, kopiering och uttryckligt aktuellt versionsval. Root granskade fyra slutbilder; exakta rapport-/bildhashar finns i VALIDATION.

B07 har observerad kvarvarande 200-procentsklippning i befintlig utkaststatus, fokustagg och tom kontaktvy. Slutproven med fördubblad text avser ändrade uppgiftsetiketter, rader/knappar, scopeknappar och dokumentbredd, inte hela Min dag eller WCAG. Kod-/hashjämförelsen mot v42 visar oförändrade berörda områden; den är inget separat byggt v42-runtimeprov.

Nästa separat designarbete är denna klippning samt tidigare öppna mobilkundlista/fokus efter arbetsytebyte. Fysisk telefon, OS-tangentbord/zoom, skärmläsare och personalens förståelse är inte verifierade genom Chromiumproven.
