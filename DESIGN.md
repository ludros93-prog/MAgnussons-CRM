# Magnussons CRM – designriktning

Ludwig betonade den 5 oktober 2026 att designen är ett huvudkrav och ska utvecklas med inspiration från Saleshub och Lime. Målet är att CRM-ovan personal snabbt förstår kunden, sitt ansvar och nästa handling. Designarbetet ingår i vidareutvecklingen av den befintliga appen.

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

Designarbetets kvalitetsregel är att kontrollera berörda vyer på dator och mobil med tangentbord, långa värden, tomma data och relevanta roller. D01:s slutbygge 4 har passerat 16 scenarier och 36 layout-/skärmbildskontroller för kundkortet, inklusive kontrollerad textförstoring 200 procent. Det är textstorlek/radhöjd, inte browserns sidzoom. Skärmbilder, mätningar och provgränser finns i [VALIDATION.md](VALIDATION.md). Browserprov visar layout och arbetsflöde; personalens användbarhet behöver observeras i deras verkliga arbete.

Kundkortets normala 390/320 px-vyer visar första handlingen direkt. Extra långa värden på 320 px kräver vertikal scroll. D01 ingår i den kvitterade publicerade Sites v19 enligt [VALIDATION.md](VALIDATION.md). Det är inte fullständig mobil-/personalverifiering eller ett prov av autentiserad live-UI. Den globala arbetsyteväljarens pointerklick kunde fortfarande täckas av bannern vid 320 px; tangentbord användes för initieringshinten. Detta är underlaget för nästa avgränsade layoutfix.

## Global mobilheader

På smala skärmar ska huvudraden växa när navigationen radbryts, så att arbetsyteväljare och övriga kontroller ryms ovanför arbetsytans banner. Långa vy- och arbetsytenamn får radbrytas inom sin yta. Behåll befintliga färger, texter och byten mellan arbetsytor; den fria tryckytan ska vara minst 44 px hög. Layouten ska fungera med pointer och tangentbord samt förstoring, med befintliga roller och skydden för privata utkast vid arbetsytebyte.

Den nya CSS-kandidaten har ett diagnostiskt browserprov med 13/13 godkända pointerfall. Det är preliminärt underlag; slutprov på faktiskt produktionsbygge och eventuell ny publicering kvitteras separat i VALIDATION och aktuell status. Leverantörs- och tillgänglighetsprinciperna finns i [agent/RESEARCH.md](agent/RESEARCH.md).

## Fortsatt designarbete

Efter kundkortet: en konsekvent visuell hierarki för kundregister, offertunderlag och Tryck & leverans; gemensamma statusord och datum; formulär med få nödvändiga uppgifter först. Fortsätt från observerad friktion och bevara Min dags fokus på personligt arbete. Månads-/årsförsäljning, marginal och nya prospects är huvudmåtten; TB blir inget huvudmått.
