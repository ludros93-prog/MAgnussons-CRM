# Magnussons CRM – privata behovsutkast finns live

Påbörjade behov i Årsplanering och kundens årshjul kan sparas privat och fortsättas från **Fortsätt där du slutade** i Min dag. Ofärdiga fält och text finns kvar efter återläsning. Privat sparning och sparning av ändringar i CRM har separata besked; påminnelsen följer behovets status. Vid konflikt granskas aktuell version innan den används.

Kodkandidat `aa57965cd45dbec9eb42cc3679524c99b87ba7ae`; app-main `31c38d103062bf88520f2062d0d2c604e7b44cbf` efter [PR #121](https://github.com/ludros93-prog/MAgnussons-CRM/pull/121). Sites-source `f847d0192ba05478738fd1c6a2394958cbf42f4c`, träd `5702706f2fb784227054eb5e48dabf57593c6b79`, exakt samma 351 spårade filer som den frysta testkandidaten. **Live v70**, deploy `succeeded` 2026-10-09T08:02:11.980430+00:00, [https://magnussons-crm.rosen123.chatgpt.site](https://magnussons-crm.rosen123.chatgpt.site).

Regression, TypeScript, bygge, isolerad HTTP/runtime och diff passerade; exakt-head och app-main-CI är gröna. Begränsad delning är bevarad. [Full kvittens](VALIDATION.md), [aktuell status](STATUS-2026-10-05.md) och [backup/återgång](OPERATIONS.md) håller tester och verkliga personliga prov isär.

Browser vid 320 px/text 2×, native tangentbord, personlig CRM-roll/inloggning och observerad personalpilot är inte verifierade här. Gröna tester är ingen personalacceptans eller fungerande Fortnox-/Outlook-anslutning. Full hostad återställning/live-rollback är oprövad.

## Historik före crm73-leveransen

# Magnussons CRM – verifierad main och publiceringsåterhämtning

På samma [CRM-adress](https://magnussons-crm.rosen123.chatgpt.site) har version **69** status **succeeded**, native uppdatering 2026-10-09 05:30:57.436424 UTC (terminalt återläst 05:34:06 UTC). Den för fram befintlig main: inventering av produktionsansvar, granskat byte av hinderansvar och **Hinder du ansvarar för** i Min dag med **Öppna jobbet**. Inget nytt verksamhetsbeslut eller ny appkod ingår i publiceringsarbetet.

Publicerad GitHub-mainrevision `9cbcdbba3f20e7791f8047596abb055e60dd8c37` och Sites-source `4cde45d4887efbd348d7193ba3aaf53809eb5070` har samma träd `3f97ea2beea1c9fff2a969ff2b4f0d7e48596f5f` och samtliga 345 spårade filer motsvarar den verifierade kandidaten byte för byte. [VALIDATION](VALIDATION.md) skiljer appkod, tester, main och publicerad källa. Återläsning 2026-10-09 05:34:20.404 UTC verifierar full returnerad begränsad åtkomstpolicy (custom, revision 2), miljö (revision 1, en post) och automationer oförändrade; bindings oförändrade.

Sourcehelpern saknas fortfarande. Det tidigare publiceringshindret hanterades med nativeverktygets uttryckliga reservväg för serverbygge när lokal paketering inte kan slutföras; ingen egen packare användes. [OPERATIONS](OPERATIONS.md) beskriver undantaget och återgångsgränsen. Verklig personalinloggning/pilot och full hostad återställning är fortfarande oprövade. Efter nya crm71-ansvarsskrivningar krävs kompatibel läsare/skrivare; oförändrad v68 ska inte antas vara säker skrivande återgång.

## Historik före publiceringsåterhämtningen 2026-10-09

# Magnussons CRM – granskat hinderansvar, crm71-kod

**Byt hinderansvar** låter administratören välja vem som ska hålla ihop nästa steg i ett öppet produktionshinder. Aktuell ansvarig visas separat från **Rapporterat av** och **Registrerad rapporttid**. Överlämningen bevarar rapportör, rapporttid, hindertext, jobbansvar, orderansvar och registrerat arbete; den löser inte hindret.

Vägen finns i produktionskortet, jobbdetaljerna och **Inställningar → Konton & roller → Produktionsarbete per konto**. Den gäller öppna hinder på lämnade, tryckta eller skickade jobb. Välj ett verkligt aktivt anslutet konto, läs roll och konto-ID, ange skäl och granska innan **Spara nytt hinderansvar**. Ett skickat jobbs jobbansvar förblir historiskt. För säljare finns produktionen via **Offerter & order → Tryck & leverans → Min produktion**. **Mitt arbete** visar också den aktuella användarens öppna hinder, även på skickade jobb, med **Ditt hinder** utan påhittat uppföljningsdatum. Bevarad överlämningshistorik visas även för arkiverat arbete efter lösning.

För lång orsak visar **Orsaken är för lång. Korta texten.**; ogiltig text visar **Orsaken innehåller ogiltig text. Skriv om texten.** Texten ligger kvar så att den kan rättas och granskas igen.

Kod `92470f29c7b342760fc7d48c4f7369619f657da7`, träd `558fc5134b53edb55769b283981ab5928f6e69f1`; GitHub app-main: `6d3c5f53ea28078a2c177c078024b6151cba608b`, app-PR: [PR #116](https://github.com/ludros93-prog/MAgnussons-CRM/pull/116). Slutkontroller: PASS på ren och byteoförändrad slutkandidat: regression 75,22 s, TypeScript utan incremental 11,54 s, bygge 9,89 s, native Worker/D1/R2 205,12 s och diffkontroll 0 s; alla fem exit 0. Exakt-head CI: PASS: CRM checks-run [37871478947](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37871478947), alla 13 steg lyckade på exakt `92470f29c7b342760fc7d48c4f7369619f657da7`; PR-bas och fjärr-main vid appens mergekontroll `020b4a92583dd94f61403c94525c2ba9327bdc93`. Kvitto `0d52ca5387c419c138c0c44efc4c7ce66822a183ce17b9b47ab8d62155b51295`. Browser: PASS 18/18 på samma frysta slutkod: 13 native fall och fem separat märkta transportfall (tre mock409, en mock503, en faktisk native200 med tappad klientkvittens). Alla sex layouter vid 320/390/1280 px med normal/exakt dubblerad CSS-text, 54 verkliga skärmbilder och 28 journalförda browser/APIRequest-POST. Tre ingångar, aktuell ansvarigs redigering/lösning, personlig kö även på skickat främmande kommersiellt jobb, verklig HTTP409 mellan kompletta requests, rollavslag, dubbelklick och exakt återförsök passerade; ingen påtvingad directory-read-interleaving i browsern eller personalacceptans påstås. Kvitto `aad94f247250eef8790354c2739ef6850c907d19e1ad4cebce55aaf306580b96`.

Lagringen får valfria hinderansvarsfält och bevarad överlämningsaudit. Efter första sådana skrivning krävs v71-kompatibel läsare/skrivare. Backupformatet är fortsatt `magnussons-crm-1`, utan ny SQL-migration eller automatisk versionsspärr. Faktiskt kompatibilitets-/återläsningsresultat: PASS: aktuell kandidat bevarar originalrapportör/tid, aktuell user-/member-koppling, löst och arkiverad audit, vanliga skrivningar med utelämnade äldre fält samt JSON och native NDJSON-återläsning. Alla sex SQL-migrationer är byteoförändrade. Oförändrad main020 tappade nya fält i 13 faktiska isolerade äldre skriv-/restoreoperationer; efter nya skrivningar krävs kompatibel läsare/skrivare. Kompatibel avser crm71-kodens formatstöd, oberoende av Sites versionsnummer.

**Kod/main/live är skilda tillstånd.** Senast faktiskt lästa Site är v68, källa `cea57b7f66c5dce49f65e61cc74fc8f54a450d2e`; äldre v69/crm70-förbättringar på main innebär ingen ny publicering. Crm71-publicering: Ej publicerad: [Sites-instruktionen](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) kräver “package with the source helper”; föreskriven helper saknas. Ingen egen paketering eller begäran om ny sourcecredential; ingen source-push via Sites-helpern, ny Site-version, deploy eller delnings-/miljöändring har gjorts. Samma begränsade Site ligger kvar på v68/källa `cea57b7f66c5dce49f65e61cc74fc8f54a450d2e`. Föreskriven sourcehelper saknas i läsbara sökvägar; kontrollens omfattning redovisas i [VALIDATION](VALIDATION.md).

Verklig personalinloggning/pilot, privata backuper, full hostad återställning och riktiga integrationskonton är fortsatt oprövade. Codex-referensen är oläst. Försäljning mot månads-/årsmål, marginal och nya prospects förblir huvudmåtten. Nästa: Återställ den föreskrivna sourcehelpern och publicera verifierad kompatibel main till samma Site med oförändrad begränsad delning; kontrollera lyckad deploy och exakt källrevision. Därefter observerad personalpilot och kvarvarande oklara produktionsidentiteter; inget nytt konto eller verksamhetsbeslut antas.

## Historik före crm71-koden

# Magnussons CRM – aktuell produktionsinventering, crm70-kod

Den avgränsade förbättringen avvisar katalogändringar som upptäcks mellan produktionsinventeringens kontrollerade läspunkter. Ett upptäckt byte av namn, roll, aktivitet eller identitetskoppling ger ett tydligt läsfel och omhämtning, med bevarade filter.

Kod `fe5ad1cf8b7eaa0772967aba670617c31ea1851c`, träd `07179bb5cd3e21b8390625fd7232014fdf563818`; GitHub app-main `ef476953f4ce50240450e6bd071e34542bd21433`. Fem obligatoriska slutkontroller är gröna på den frysta slutkandidaten: regressioner, icke-inkrementell TypeScript, bygge, isolerad runtime och diffkontroll. Kontrollkvitto SHA-256 `1f7d485e574f924c89dc443cf98b3d8570658a9b1c92b66dd5afdf6cff25cf87`; exakt-head CI [37859328931](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37859328931) har samtliga 13 steg completed/success. Browser: 11 (8 native HTTP/UI och 3 separat mockade409 UI/retry) godkända fall, 20 original sparade bilder, kvitto `b707bbd0c5b02cee4dfb8bce58d68568ae9063a896b65930ba7c49be2531c7f6`.

**Publicering blockerad:** den föreskrivna Sites-sourcehelpern `site-workflow.mjs` är fortfarande inte tillgänglig enligt denna körnings kontroll. Ingen ny Site-version har sparats eller publicerats i crm70. [Samma CRM-adress](https://magnussons-crm.rosen123.chatgpt.site) ligger kvar på **v68**, källa `cea57b7f66c5dce49f65e61cc74fc8f54a450d2e`. Github-main innehåller även v69:s inventeringsfix som ännu inte ligger live. Färsk efterkontroll av samma Site, full begränsad åtkomstpolicy och runtime-konfiguration redovisas i [VALIDATION](VALIDATION.md).

Ingen ändrad lagring, SQL-migration eller backupsemantik. `magnussons-crm-1` och v66-kompatibelt läsar-/skrivargolv efter äldre jobbansvarsrättning består. Jobb-/hinder-/kommersiellt ansvar, serverroller, skriv-CAS och idempotens bevaras. Kontrollerna är isolerade; verklig personalinloggning/pilot, full hostad återställning och riktiga integrationer är fortsatt oprövade. Codex-referensen är oläst.

**Nästa:** återfå den föreskrivna Sites-sourcehelpern, hämta färsk Site-källa och publicera exakt verifierad kandidat med bevarad identitet, miljö och begränsad delning. Därefter granskat hinderansvarsbyte och återstående oklara kopplingar enligt färsk inventering. Full personalöverlämning, chefsroll, privata backuper, personalpilot och faktiska integrationskonton kvarstår.

## Historik före crm70-koden

# Magnussons CRM

## Kvarstående hinder syns i produktionsinventeringen – v69-kod

**Konton & roller → Produktionsarbete per konto** visar även skickade jobb med öppna hinder. **Skickat · öppet hinder** skiljer det aktuella hindret från **Jobbansvar · historiskt**. Historiskt jobbansvar räknas inte som öppet arbete och får ingen överlämningsknapp.

**Öppna jobbet** öppnar jobbets detaljvy direkt; välj där **Lös kvarstående hinder** enligt befintlig behörighet. Ingen extra växling till Avslutat krävs. Aktiva jobb, konto-ID:n, filter och sidning behåller sina befintliga regler.

Kod `c78cd3af87e2290b104a1cf5e88456062f32526b`, träd `4970dbac44a3006e096c20e811f8dcf8e676c2b2`. GitHub app-main `0f72cef714b08cebed2f1c302f0779d529d1d7f3`; exakt-head CI 37853755931 och fem obligatoriska slutkontroller är gröna, kontrollkvitto SHA-256 `e3c10c7313dd997147bed2ba78ef7906fb10c76bb4ee880acc296d992f16e373`. Native browser: 10 godkända fall och 16 sparade bilder, kvitto `b217228e01eba7d20107594d7bc67b5c2ec9ae2c7ad63b0c5d437fc3e03dfe4c`.

**Publicering blockerad:** Sites-instruktionen kräver `site-workflow.mjs` för källöppning och packning. En källskrivcredential har utfärdats, men hjälpskriptet är inte åtkomligt och inget sådant öppnings-/packningsflöde har kunnat köras. Ingen v69-version har sparats eller publicerats. [Samma CRM-adress](https://magnussons-crm.rosen123.chatgpt.site) ligger kvar på **v68**, källa `cea57b7f66c5dce49f65e61cc74fc8f54a450d2e`, med bevarad begränsad delning.

Ingen ändrad lagring, SQL-migration eller backupsemantik. `magnussons-crm-1` och v66-kompatibelt läsar-/skrivargolv efter äldre jobbansvarsrättning består. Granskat hinderansvarsbyte, övriga oklara identiteter/full personalöverlämning, chefsroll, privata backuper, faktisk personalpilot, full hostad återställning och riktiga integrationskonton kvarstår. Codex-referensen är oläst. Huvudmåtten är fortsatt försäljning mot månads-/årsmål, marginal och nya prospects.

## Historik före v69-koden

# Magnussons CRM

## Lös ett kvarstående hinder på ett skickat jobb – v68

Ett skickat jobb med ett befintligt öppet hinder erbjuder nu **Lös kvarstående hinder** i produktionsvyerna. Rapportören eller en administratör kan läsa det registrerade underlaget, beskriva den faktiska lösningen och välja **Hindret är löst**. Den befintliga serverbehörigheten gäller fortsatt.

Dialogen visar kund, affär, order, arbetsreferens och den sparade hinderbeskrivningen från öppningstillfället. Beskrivningen är inget oföränderligt första rapportutkast. Lösningshistoriken bevarar registrerad rapportör, rapporttid och sparad hindertext samt anger faktisk lösningsaktör och tid.

Jobbet förblir skickat. Lösningsvägen ändrar inte beskrivningen, rapporterar inget nytt hinder och registrerar inga produktionsmängder. Kundmottagande och fakturering följer sina egna handlingar. Lokal text finns kvar vid fel i den öppna dialogen; kopiera den före stängning eller omladdning.

Kod `1aa1e5df8b5fbce00d5a570ae935f2eac461edff`, GitHub app-main `36975b211b31d097039bb791fa3e0e35de96af5c`. Alla fem obligatoriska slutkontroller och CI-körning 37840496296 med samtliga 13 steg passerade. Nativeprov: 36 godkända fall, 66 sparade bilder. [VALIDATION](VALIDATION.md) anger provgränser.

Samma [CRM-adress](https://magnussons-crm.rosen123.chatgpt.site) har v68, version `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_743535521c788191a30a3856c9e19d17`, källa `cea57b7f66c5dce49f65e61cc74fc8f54a450d2e`, deploy `appgdep_6ac8032156cc8191b491fe39f44c6650`, succeeded `2026-10-08T20:55:20.682180+00:00`. Dokumentationen har separat revision.

Ingen lagrings-/backupformatändring; v66-golvet efter äldre jobbansvarsrättning består. V67 är formatkompatibelt men döljer denna lösningsväg. Granskat hinderansvarsbyte, andra oklara kopplingar, full personalavveckling, privata backuper, personalpilot, full hostad återställning och riktiga integrationskonton återstår. Codex-referensen är oläst. Huvudmåtten är fortsatt försäljning mot månads-/årsmål, marginal och nya prospects.

## Historik före v68

# Magnussons CRM

## Ändra hinderbeskrivningen med bevarad rapportör – v67

När rapportören eller en administratör ändrar ett öppet produktionshinders beskrivning ligger registrerat rapportörs-ID, namn och rapporttid kvar. Redigeraren registreras i den befintliga händelsen; redigeringen flyttar inget ansvar. Därmed kan en administratörs textändring inte längre tömma rapportörens hinderansvar i kontoändringens kontroll.

Rapportering, beskrivningsredigering och registrering av lösningen har skilda instruktioner och handlingar. Dialogen visar kund, affär, order, arbetsreferens och det ursprungliga underlaget. Lokalt skriven text finns kvar vid fel i den öppna dialogen; den är inget varaktigt privat utkast.

De fyra berörda beskrivnings- och lösningsfälten har begränsad höjd och intern rullning för att göra lång text och tangentbordsfokus hanterbara på små skärmar. Hinderdialogens titel samt rubrikerna för registrerat underlag och lösning får radbrytas inom tillgänglig bredd. Jobbdetaljernas motsvarande breddanpassning gäller när hinderhanteringen är öppen. Hinderformulärens knappar har uttrycklig minimihöjd 44 CSS-pixlar som lokalt designmål. Övriga textfält följer sin tidigare utformning. Faktiska slutliga browserbelägg redovisas i [VALIDATION](VALIDATION.md).

När hinderformuläret är öppet visas jobbdatum i en kolumn på smala skärmar. Långa knapp- och varningstexter får radbrytas inom jobbvyns tillgängliga bredd; innehållet finns kvar.

Jobbdetaljernas två hindertextfält rullar vyn till fältet vid fokus utan att ändra text, fokus eller sparunderlag. Det är en lokal anpassning för ett faktiskt fynd där ett fokuserat fält delvis låg utanför skärmen.

Kod `7aece13c6905eac12dd0eb5a345b373e13092d3c`, GitHub app-main `67d53b987554449298c78b8dfa3ba943ed8b6cd0` via [PR #108](https://github.com/ludros93-prog/MAgnussons-CRM/pull/108). Kontroller: Alla fem obligatoriska kontroller passerade på den frysta slutkandidaten; varje exitkod var 0 och samtliga 337 spårade filer, head och träd var oförändrade efter provet. Live: Version 67 är publicerad med lyckad deploy på samma befintliga Site och adress på [samma CRM-adress](https://magnussons-crm.rosen123.chatgpt.site), verifierad källa `6ed430523ab5c55cb7f23688513448728f80a947`. Dokumentationen har separat revision. [VALIDATION](VALIDATION.md) anger belägg och gränser.

Ingen ny lagring eller formatgräns: v66-golvet efter äldre jobbansvarsrättning gäller fortsatt. Granskat byte av hinderansvar, verkliga personalprov och full hostad återställning återstår. Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten. Codex-referensen är oläst.

## Historik före v67

# Magnussons CRM

## Rätta äldre jobbansvar med granskning – v66

Administratören kan välja **Rätta äldre jobbansvar** för ett aktuellt jobb som är lämnat eller tryckt och bara har ett sparat ansvarigt namn. Läs det äldre namnet och tidsfältet, välj ett befintligt anslutet CRM-konto, beskriv det verkliga underlaget och granska före **Registrera rättning**. Det valda kontot får jobbansvaret från rättningen; namnet identifierar ingen tidigare person.

Mängder, tryck, kassation, delleveranser, hinderansvar och kommersiellt orderansvar bevaras. Andra oklara eller motsägande kopplingar behöver sina egna granskade arbetsflöden. Efter hanterat ansvar behöver kontoändringens granskning hämtas igen.

Ny rättningshistorik kräver **v66-kompatibel läsare och skrivare**. Backupformatet är fortsatt `magnussons-crm-1`; inga SQL-tabeller eller migrationer tillkommer. [OPERATIONS](OPERATIONS.md) beskriver arbetsgången. Fem obligatoriska slutkontroller passerade på exakt ren och oförändrad kod `36723ebb39b83623b0ddc27733d8b702515aaeec`, träd `11419ea162363bf95b744b7c94d352c68cb8cfbe`: regressioner, TypeScript, bygge, isolerad D1/R2-runtime och diffkontroll. Kontrollkvitto SHA-256 `f69375d58d09b44ac9ba6b44aaf08180297be52b868e5762593882a4db5113e8`.

GitHub app-main: `9d239cfaf14a6a14d538833dde44b02f7dce4c9b`. Main-CI `37814702689` är completed/success med samtliga 13 steg på exakt app-main `9d239cfaf14a6a14d538833dde44b02f7dce4c9b`. Sites **v66** är publicerad från source `9d976e0ac746796977d48ad11d1062adfb12a3e0`, version `appgprj_6aa71b309d90819181a32a9af6e6baf2~appgver_bc068e7250a48191aae8c62728539bab`. Deploy `appgdep_6ac7d0da31708191aeb81131ad613855` gav terminalt `succeeded` direkt, faktisk uppdateringstid `2026-10-08T17:20:37.463233+00:00`. Färsk återläsning bekräftade samma URL, custom-delning revision 2, hela åtkomstpolicyn, runtime-miljö revision 1 och automationer oförändrade. Native arkivmetadata stämmer med lokalt verifierad tarhash, storlek och antal. Samma [Magnussons CRM-adress](https://magnussons-crm.rosen123.chatgpt.site) används; dokumentationen har separat revision.

Verkliga personalinloggningar, personalpilot, full hostad återställning samt kommersiell/privat/extern personalavveckling och Sites-åtkomst återstår. Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten.

## Historik före v66

# Magnussons CRM

## Se arbetet som spärrar kontoändringen – v65

Under **Konton & roller → Ändra → Granska kontoändringen** kan administratören välja **Visa arbete som spärrar ändringen**. Listan visar arbetsyta, arbetsreferens, order-ID, produktionsstatus och konkret orsak för varje **Jobbansvar** eller **Öppet hinderansvar**. **Visa fler ansvarsdelar** hämtar nästa 20.

Ett jobb kan ha två ansvarsdelar, och ett skickat jobb kan ha ett öppet hinder. Äldre oklara kopplingar visas utan att en person gissas från namnet. Listan är läsande; granskad rättning av oklara kopplingar behöver ett separat arbetsflöde. [Arbetsgång](OPERATIONS.md) och [verifiering](VALIDATION.md) beskriver omfattningen.

Kod: `7d99c066e435a082fe3673636977676ff2079058`. GitHub app-main: `12c1ac6a794a7728f40f2fa080ae49eaf1a51fb8`, produkt-PR [#104](https://github.com/ludros93-prog/MAgnussons-CRM/pull/104). Live: **v65**, verifierad Sites-källa `9fe2deaf213944105264362cdcd807c0e1086436` och lyckad publicering på [samma CRM-adress](https://magnussons-crm.rosen123.chatgpt.site). Dokumentationen har separat revision.

Full kommersiell/privat/extern personalavveckling, samordnad Sites-åtkomst, granskad rättning av äldre identitetskopplingar, verkliga personalinloggningar, personalpilot och full hostad återställning återstår. Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten. Codex-referensen är oläst; den uttryckliga briefen och färskt repo används.

## Historik före v65

# Magnussons CRM

## Granska kontoändringar innan produktionsåtkomst minskas – v64

Under **Konton & roller** visar **Granska kontoändringen** vad som behöver lämnas över innan ett aktivt CRM-konto inaktiveras eller får mindre produktionsbehörighet. Kontrollen visar **Jobbansvar**, **Öppet hinderansvar** och **Kopplingar att granska** per lagrad arbetsyta. Ett tomt urval i den vanliga produktionskön räcker inte.

Administratören får ett tydligt besked före sparning. Kvarvarande ansvar och oklara kopplingar spärrar ändringen; inget arbete flyttas automatiskt. Vid fel finns formulärvärdena kvar. En osäker sparning kräver återläsning; en bekräftad sparning visas som sparad även om översikten inte kunde uppdateras. [Arbetsgång](OPERATIONS.md) och [verifiering](VALIDATION.md) beskriver omfattningen.

Kod: `c56486d42ad289bdbf722b74faab5cb1fafe229e`. GitHub app-main: `0aa9d5ca01a0014f1b8e10f434bda9ea45e112d9`, produkt-PR [#102](https://github.com/ludros93-prog/MAgnussons-CRM/pull/102). Live: **v64**, lyckad publicering 2026-10-08 13:15:11 UTC på [samma CRM-adress](https://magnussons-crm.rosen123.chatgpt.site). Verifierad Sites-källrevision `c7bea6df6bd6857adcbd18a66dfcd92a1aaba17a` har samma produktträd. Begränsad delning är bevarad; verkliga personalinloggningar återstår.

Kontrollen gäller registrerat produktionsansvar. Kommersiellt ansvar, privata utkast och mejl, externa konton och Sites-åtkomst behöver separata arbetsflöden. Full personalavveckling, verkliga personalinloggningar, personalpilot och full hostad återställning återstår. Huvudmåtten är fortsatt försäljning mot månads-/årsmål, marginal och nya prospects.

## Historik före v64

# Magnussons CRM

## Produktionsarbete per konto – v63

Under **Konton & roller** kan administratören inventera ett kontos öppna produktionsjobb och hinder i den valda arbetsytan. Välj ett konto eller en arbetskö och använd **Granska jobbansvar** för befintlig granskad överlämning, eller **Öppna jobbet** för nästa arbetsmoment. Jobbansvar och hinderansvar visas var för sig. Orderns kommersiella ansvar ligger kvar.

Inaktiva konton och oklara identitetskopplingar syns i underlaget. Konton med samma namn skiljs åt med konto-ID. Ett tomt urval betyder inte att kontot kan stängas. [Arbetsgång](OPERATIONS.md) och [aktuellt testbelägg](VALIDATION.md) beskriver omfattningen.

Källkandidat `e0958b8c1ec3880ca9a209339ed23b9e29a450d9`. GitHub app-main `361703b7d862a3c0cb578beaf71379a00877699d`. Samma [Magnussons Site](https://magnussons-crm.rosen123.chatgpt.site) har publicerad version 63 från källrevision `5690de11319ca1fa1d87165b9a0e713e47a831de`, deployment `appgdep_6ac776182d34819180ab1ab716188046` med status succeeded. Dokumentationen sparas separat från appversionen.

Full personalavveckling, verifierade personalinloggningar, faktisk pilot och full hosted återställning återstår. Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten.

## Historik före v63

# Magnussons CRM

## Granskat produktionsansvar för ett jobb – v62

Administratören kan tilldela eller byta vem som håller ihop ett aktivt jobb i tryck och lager. Öppna jobbet, välj **Tilldela produktionsansvar** eller **Byt produktionsansvar**, välj ett befintligt CRM-konto, skriv varför och granska innan du sparar. **Orderansvar** visas separat och ligger kvar. Mängder, instruktioner och registrerade leveranser följer jobbet.

Konton med samma namn skiljs åt med sitt verkliga konto-ID. Sparat ansvar och tidigare byten kan följas i jobbets ansvarshistorik. En ändring i jobbet eller det valda kontot kräver ett nytt granskningsunderlag; en osäker sparning får en tydlig återförsöksväg. [Arbetsgången finns i OPERATIONS.md](OPERATIONS.md).

Källrevision `d1b47198a3986a20d40006dd249658e302eb5bbf`, träd `609632102d6619d27d1a1a3add285dffb867fd8c`. Slutkandidaten är oberoende källgranskad och har fem gröna obligatoriska kontroller samt 33 faktiska browserfall. GitHub-main och publicerad version redovisas separat: Produkt-PR [#98](https://github.com/ludros93-prog/MAgnussons-CRM/pull/98) slogs samman med aktuell bas till app-main `139407e3164b8c7baef7d5fbd356340596f58dc1`, samma produktträd. PR-CI [37752477119](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37752477119) och app-main-CI [37753435157](https://github.com/ludros93-prog/MAgnussons-CRM/actions/runs/37753435157) har vardera 13 gröna steg. Dokumentationen hanteras i en separat revision efter produktleveransen. Samma [Magnussons Site](https://magnussons-crm.rosen123.chatgpt.site) har version 62, källrevision `18b2d59e8a9022a59b336173e4b5d984b635db1e`, lyckad deployment `appgdep_6ac75bdc35648191b85f4391757838d2`. Alla 321 källfiler och produktträdet matchar den testade kandidaten. Lokalt paket (98 filer, 5 273 600 tarbyte) matchar native metadata/hash; native payload har inte laddats ned för bytejämförelse. Full begränsad delningspolicy revision 2, runtime-konfiguration revision 1 och noll automations är oförändrade. Dokumentationsrevisionen publiceras inte som ny appversion.

Ändringen gäller ett aktivt jobb. Full personalavveckling, verkliga personalprov, verifierad inloggning för Sebbe och levande Fortnox-/Outlookanslutningar är fortsatt separata införandefrågor. Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten; TB är inget huvudmått. Nästa steg: Inventera samtliga öppna produktionsjobb för ett konto inför personalbyte och koppla granskad överlämning till säker kontoinaktivering. Behåll kommersiellt ansvar och historiska resultat; full Sites-/flerarbetsyteavveckling och faktisk personalpilot återstår.

## Historik före v62

# Magnussons CRM

## Aktivitetens ansvar och förberedelsernas ansvar – v61

En företagsaktivitet har nu eget stabilt ansvar. Varje förberedelse behåller sitt eget ansvar, datum och status. Ett byte av aktivitetsansvar flyttar därför inte checklistans uppgifter. I kalendern visar separata rubriker vilken nivå du granskar.

Administratören kan för en planerad aktivitet välja **Byt aktivitetsansvar**, eller **Granska aktivitetens ansvar** när en äldre namnkoppling behöver förankras. Dialogen visar aktivitetens nuvarande ansvar, förberedelserna som ligger kvar, ett uttryckligt val av mottagare, orsak och granskningsruta. Vanlig kalenderredigering ändrar inte ett redan registrerat aktivitetsansvar. Ett äldre privat utkast med eget ändrat ansvar kräver ett uttryckligt ställningstagande.

V61 är publicerad efter obligatoriska regressioner, TypeScript, bygge och isolerad runtime på exakt slutkandidat samt 23 lokala browserfall och grön PR-/main-CI. Fullständig spårbarhet, formatgräns v61 och publiceringsbegränsningar finns i aktuell STATUS och VALIDATION.

Försäljning mot månads-/årsmål, marginal och nya prospects är fortsatt huvudmåtten. Denna leverans ansluter inga Fortnox-, Outlook-, produkt- eller AI-konton och bekräftar ingen persons inloggning. Fullständig överlämning av en medarbetares arbete och verkligt återställnings-/personalprov är fortfarande separata uppgifter.

## Historik före v61

# Magnussons CRM

## Eget ansvar för varje eventförberedelse – v60

Administratören kan granska och överlämna en öppen förberedelse i **Företagets aktiviteter**. **Förberedelsens ansvar** och **Aktivitetens ansvar** visas separat. Ett uttryckligt profilval, en orsak och granskning ändrar bara den valda radens ansvar och registrerar historiken atomiskt. Vanlig aktivitetssparning och klarmarkering bevarar historiken.

App-PR #94 är på main och v60 är publicerad på samma begränsat delade Site. De fem slutkontrollerna och 24 isolerade browserfall är gröna; riktiga konto-/integrationsprov och personalpilot återstår. [OPERATIONS](OPERATIONS.md) beskriver stegen; [VALIDATION](VALIDATION.md) anger bevis/gränser. Ny förberedelsehistorik kräver **v60-kompatibel läsare och skrivare**. Aktivitetens övergripande ansvar, full personalavveckling och hostingåterställning återstår.

## Historik före v60

## Överlämna kundkontakten efter leveransen – v59

Administratören kan granska och byta ansvar för en öppen **Leveransuppföljning** efter registrerat kundmottagande och komplett avsändningsunderlag. Dialogen visar skilda uppgifts-, kundrelations- och orderansvar. Endast uppgiften överlämnas; mottagande, fakturering och tidigare resultat ligger kvar. Orsak/val bevaras vid fel.

Fem slutkontroller och 22 isolerade browserfall passerade. Samma Site har publicerad v59. [OPERATIONS](OPERATIONS.md) beskriver arbetssättet; [VALIDATION](VALIDATION.md) belägg/gränser. Ny länkhistorik kräver **v59-kompatibel läsare och skrivare**. Konto-/personalprov och full hostingåterställning återstår.

## Historik före v59

## Rätt arbetsvy från första laddningen – v58

CRM visar en neutral svensk startvy tills användaren är känd. Vid fel finns **Arbetsyta** och **Försök igen**. Tryck/lager får direkt sin tillåtna vy. Outlook följer rätt live-identitet och döljer tidigare innehåll vid byte.

Fem slutkontroller och 23 browserfall passerade; samma Site har publicerad v58. [OPERATIONS](OPERATIONS.md) beskriver starten; [VALIDATION](VALIDATION.md) anger bevis/gränser. Verkliga Microsoft-konton och personalpilot återstår.

## Historik före v58

## Överlämna en kundaktivitet med granskning – v57

Administratören kan välja **Byt uppgiftsansvar** för en öppen **Kundavstämning**, **Kommande kundbehov** eller **Prospektkontakt** utan affärskoppling. Välj en tillgänglig aktiv granskad profil, skriv varför och granska innan sparning. En enda skrivning ändrar uppgiftens ansvar och registrerar dess överföring/händelse. **Kundrelationsansvar · ligger kvar** visar vem som fortfarande äger relationen; kundplan, prospektkvalificering och tidigare resultat flyttas inte.

Befintliga kundplan-/prospektuppdateringar bevarar den överlämnade uppgiftens profil-ID. En ny kanonisk uppgift utgår fortfarande från kundrelationsansvarig. Följ upp och prospektkvalificering har kvar sina egna regler; överlämningen registrerar ingen kontakt, kvalificering, affär eller kundacceptans. [OPERATIONS](OPERATIONS.md) beskriver arbetssättet.

Kod `0928c096c2e54c264c1bc75bd7b00f696c6160f6`, app-main `c4a29ae0571b5d311851f1577ba969e9fbf20515`, [app-PR #88](https://github.com/ludros93-prog/MAgnussons-CRM/pull/88). Slutkontroller: 5/5 exit 0 på ren, oförändrad head: CRM/Outlook-regressioner, icke-inkrementell TypeScript, produktionsbygge, isolerad runtime och git diff --check; isolerade browserprov: 24/24 PASS. Samma Site version `57`, source `70ec24a37e0b0c30176c5a440bf9b02fc2e3fd6f`, deploy `appgdep_6ac6deba62088191a4cabc95fdfccbb1`, succeeded `2026-10-08T00:07:48.220332+00:00`. [VALIDATION](VALIDATION.md) skiljer kod-, GitHub- och publiceringsbevis.

Inga nya lagringsfält/tabeller eller SQL-migrationer. Efter direkt överföring av dessa specialuppgifter krävs **v57-kompatibel läsare och skrivare**: äldre oförändrad v56 avvisar den nya historiksemantiken även vid läsning, export och restore. Konto/Sitesåtkomst, privata data och full personalavveckling är separata; se [RUNBOOK](agent/RUNBOOK.md).

## Historik före v57


## Återöppna samma kundrelation med granskning – v56

Administratören kan öppna ett **Avslutat** kundkort och välja **Återöppna kundrelation**. Välj aktiv granskad kundrelationsansvarig, relation, orsak och en ny uppföljning med egen beskrivning och datum. En enda sparning återöppnar samma kund, förankrar kundrelationsansvaret och skapar den planerade uppgiften med en spårbar historikhändelse. Tidigare affärer, order, resultat och aktiviteter behåller sina ansvariga.

Den tidigare tvåstegsvägen – granskat kundansvarsbyte följt av vanlig statusredigering – finns kvar. Den nya adminhandlingen samlar återöppning och planerad uppföljning atomiskt. Den antar ingen kundkontakt, ny affär, kundacceptans eller generell återöppningspolicy. [OPERATIONS](OPERATIONS.md) beskriver valen och kvarvarande gränser.

Kod `58e82f68990074fca0f80ad7a961cb64f1506ea4`, app-main `a212b63dbd12c2bed5908623de53aed71c104deb`, [app-PR #86](https://github.com/ludros93-prog/MAgnussons-CRM/pull/86). Slutkontroller: 5/5 exit 0 på ren, oförändrad head: CRM/Outlook-regressioner, icke-inkrementell TypeScript, produktionsbygge, isolerad runtime och git diff --check; isolerade browserprov: 18/18 PASS. Samma Site: version `56`, source `f1191a9b7bbd89259a1eab366a3416a5e0f5e02c`, deploy `appgdep_6ac6cf51eecc8191bd16698b296c834a`, succeeded `2026-10-07T23:02:01.928120+00:00`. [VALIDATION](VALIDATION.md) anger faktiska kvitton och provgränser.

Inga nya lagringsfält/tabeller eller SQL-migrationer införs. Minsta kompatibla skrivare är fortsatt **v55** efter dess profilavslutshistorik; v56 höjer inte den gränsen. Konto/Sitesåtkomst, privata utkast och generell historisk affärs-/orderredigering ingår inte i återöppningen.

## Historik före v56


## Granskat avslut av resultatprofil – v55

Efter att öppet arbete hanterats kan administratören öppna **Konton & roller → Överlämna arbete → Granska profilavslut** och göra resultatprofilen historisk i vald arbetsyta. Servern kontrollerar hela profilens operativa underlag, oavsett sökning, kategori eller antal visade kort. Orsak och ny uttrycklig granskning krävs. Profil-ID, tidigare resultat, mål, avslutade poster och sparad kontolänk bevaras.

**Resultatprofil**, **CRM-konto** och **Sidåtkomst** visar olika tillstånd. Profilavslutet stänger inget konto och kontrollerar inte andra arbetsytor eller produktionens användaransvar. Det är därför ingen full personalavveckling. [OPERATIONS](OPERATIONS.md) beskriver handlingen och kvarvarande steg.

Kod `01bead7b097673b7c74499786e0f4a0bc602a4ca`, app-main `3162d6ef5546ac5192510a9b75799733714a923d`, [app-PR #84](https://github.com/ludros93-prog/MAgnussons-CRM/pull/84). Lokala slutkontroller: 5/5 exit 0 på ren, oförändrad head: CRM/Outlook-regressioner, icke-inkrementell TypeScript, produktionsbygge, isolerad runtime och git diff --check; isolerade browserprov: 16/16 PASS. Samma Site: version `55`, source `9fe89ae7167d6561ae56b99d822228effcd8f435`, deploy `appgdep_6ac6c009b0bc8191b6fc8f115b22f7ac`, succeeded `2026-10-07T21:56:49.614848+00:00`. [VALIDATION](VALIDATION.md) skiljer detta från verkliga konto-, integrations-, personal- och hostingåterställningsprov.

Profilavslutets historik kräver en **v55-kompatibel skrivare**. Äldre oförändrad v54 kan skriva bort den nya historiken och är därför ingen säker skrivande återgång efter nya v55-data. Behåll en v55-kompatibel korrigering eller genomför en faktiskt verifierad full återställning med plan för senare arbete; se [RUNBOOK](agent/RUNBOOK.md).

## Historik före v55

## Samlad arbetsöverlämning – v54

Administratören öppnar **Konton & roller → Överlämna arbete**, väljer en säljarprofil och ser personens kvarvarande kundrelationer och öppna ansvarsdelar. Sökning, arbetskategori och **Visa fler ansvarsposter** gör urvalet hanterbart. **Granska** öppnar rätt befintlig överlämning; orsak, mottagare, uppgiftsval och sparning görs där. Äldre eller oklar ansvarskoppling märks tydligt, och inaktiva profiler kan fortfarande ha arbete kvar.

Översikten stänger inget konto och flyttar inga historiska resultat, privata utkast eller personliga Outlook-data. Produktionspersoner och företagsevent har separata ansvar. Ett tomt urval innebär inte att en person kan avvecklas. [OPERATIONS](OPERATIONS.md) beskriver arbetssättet och kvarvarande gränser.

Verifierad kod `ab0d64dd7209cb2dc458742ac8a5903fd08a1378`, app-main `b4b75010a0cc3a59a232d3a983eaccff70a4da56`, [app-PR #82](https://github.com/ludros93-prog/MAgnussons-CRM/pull/82). Lokala slutkontroller: 5/5 godkända på oförändrad ren slutkandidat; isolerade slutbrowserprov: 31/31 godkända. Samma Site: version `54`, source `73fc3dd07d93077234a1acc07b56075f00beaf6d`, deploy `appgdep_6ac6b48932988191a6426b431da3c62f`, succeeded `2026-10-07T21:07:45.104197+00:00`. [VALIDATION](VALIDATION.md) skiljer kod, main, publicering och provens begränsningar.

## Historik före v54

## Årshjul med eget behovsansvar – v53

Under **Kunder → Årsplanering** visar **Mina behov** och **Teamets behov** kundens planerade inköp utifrån behovets ansvar, med olika datum för kontakt och leveransbehov. Administratören förankrar eller byter behovsansvar med orsak, granskning och uttryckligt valda öppna årshjulsuppgifter. Vanlig redigering behåller ansvar och visar ändrat underlag före ny sparning. Behovsformulärets text bevaras i den öppna dialogen men är ännu inget privat serverutkast.

Samtliga fem obligatoriska slutkontroller och 22/22 isolerade browserfall passerade på ren kandidat `355482080525a3ee8bd4e34cdf8921d5dd70eedf`. [App-PR #80](https://github.com/ludros93-prog/MAgnussons-CRM/pull/80) är sammanslagen till app-main `95b7af782b49aaa05f733da21cb1781fff0bb4f1`; exakt PR-head och app-main har 13/13 completed/success CI-steg. Samma Site publicerade version `53` från verifierad source `560a0c49fb7536ca6ff1ac1c25ffcd097c21ea75`, succeeded 2026-10-07T19:24:07.221448+00:00. [VALIDATION](VALIDATION.md) skiljer kod, main, publicering och kvarvarande konto-/personal-/återställningsprov.

### Historik: v52 – Kundärenden med eget ansvar

Kundvård visar **Kundrelationer** och **Mina kundärenden** separat. Kundärendets ansvar följer en stabil profil; administratören förankrar eller byter det med orsak, granskning och uttryckligt valda öppna ärendeuppgifter. Kundplanens privata text och kundrelationens ansvar ligger kvar.

Lokala slutkontroller för kod `2e3c102e3c7664adc9b27d2e5775023542ebfe70`: samtliga fem obligatoriska kontroller passerade på ren, oförändrad kandidat. Slutliga browserprov: 22/22 godkända på byggd isolerad Worker/D1/R2 med faktiska roller, 320/390/1280 px, 2× dialogtext, verklig 409, dubbelklick och privat utkaståterläsning/adoption/publicering; 282 källfiler/96 distfiler oförändrade, positiva 18 råtabeller och R2-/Outlook-/utkastgränser verifierade. App-main: `a81ce8870d8b1badf5cb4a7d85c0fe54178939f9`. Samma Site: version `52`, succeeded. [VALIDATION](VALIDATION.md) anger exakta bevis, återgångsgräns och kvarvarande prov.

### Historik: v51 – Onboardingansvar

Onboarding får stabil ansvarig profil och granskad administratörsöverlämning med uttryckligt valda öppna uppgifter. Fem obligatoriska lokala kontroller, slutliga 19 browserfall och CI för exakt slut-head är godkända. Profilväljare och orsakfält är verifierade i den avgränsade mobil-/textmatrisen.

App-main: `298c3ac219cf67f86fbf1aac5bf29beff9c4b2df`. Samma Site: version `51`. [VALIDATION](VALIDATION.md) anger kod, releasebevis, återgångsgräns och provens begränsningar.

### Historik: v50

CRM för Magnussons med egen arbetsdag, säljuppföljning, kundvård, order, tryck och lager. Version 13 är ursprunglig utgångspunkt. Aktuell agentetablering finns i [STATUS-2026-10-05.md](STATUS-2026-10-05.md), med tidigare granskning och pilotgränser i [STATUS-2026-10-04.md](STATUS-2026-10-04.md); verksamhetsbeslut och acceptansprov i [HANDOFF-2026-10-04.md](HANDOFF-2026-10-04.md). Ursprunglig källrevision och överföringsstatus finns i [SOURCE.md](SOURCE.md).

Kundväljaren får full text, egen **Öppna kundkort**/**Välj kund**-knapp och en rullningsyta för korta skärmar.

Fem slutkontroller och 51 lokala browserfall passerade på fryst kandidat `8886c46d3ebe67e9d737a17ab52deaabbe2d4738`. [App-PR #74](https://github.com/ludros93-prog/MAgnussons-CRM/pull/74) är sammanslagen till app-main `5d67eacd6555090482f3c155fb916359a4d67f8a`; exakt-head och app-main-CI är gröna. Samma Site publicerade v50 från source `4a62752ee5a1b2cde42e928221e64e1835ad7070`, succeeded 2026-10-07T13:55:50.690411+00:00. [VALIDATION](VALIDATION.md) skiljer kod, main, live och provgränser.

### Historik: v49

V49 återför efter användarvalt arbetsytebyte fokus till aktuell väljare, annars aktuell tillgänglig rubrik. Fortsatt inmatning avslutar återgången. Datorheadern växer/radbryts vid behov så hela arbetsytetexten och fokusramen ryms.

Fem obligatoriska slutkontroller och 54 lokala browserfall passerar på ren kandidat `ba0fb8cffb89846f9def7ca9c89432fe9df04a3a`. [App-PR #72](https://github.com/ludros93-prog/MAgnussons-CRM/pull/72) är sammanslagen till app-main `beeba143f53771fe12a8700027db115b3c858d3f` efter grön exakt-head-CI; app-main-CI är också grön. Samma Site har publicerad v49 från verifierad source `df00f356d53f19aa8c08a372f569b6c3d7bb8b14`, succeeded 2026-10-07T12:17:48.787839+00:00. Autentiserad live-UI och riktiga konto-/personalprov återstår. [STATUS](STATUS-2026-10-05.md), [VALIDATION](VALIDATION.md) och [DESIGN](DESIGN.md) anger provgränser och nästa arbete.

### Historik: v48

V48 återför fokus efter användarens stängning av kundkortet till samma öppningskontroll, eller till vyns namngivna rubrik om kontrollen saknas. Bakgrundsladdning och navigation flyttar inte fokus genom denna funktion. Arbetsytebytets separata fokuslucka och observerad personalpilot kvarstår.

Fem obligatoriska slutkontroller och 41 lokala browserfall passerar på ren kandidat `5357d1ff0b2d2b994b35d4aa2d687c7b825df3e8`. [App-PR #70](https://github.com/ludros93-prog/MAgnussons-CRM/pull/70) är sammanslagen till app-main `245512582ebffb328ae2b6664eeb334629784392`; exakt-head och app-main-CI är gröna. Samma Site har publicerad v48 från verifierad source `ca1681891da9a26f30c5639360c3081c72e0dd7a`, succeeded 2026-10-07 10:06:08 UTC. Riktiga konto-/personalprov och autentiserad live-UI återstår. [STATUS](STATUS-2026-10-05.md), [VALIDATION](VALIDATION.md) och [DESIGN](DESIGN.md) anger provgränser och nästa arbete.

### Historik: v47

V47 gör **Kundregister** responsivt: fullständigt kundnamn, kundansvarig och nästa verkliga öppna uppgift eller planerade CRM-möte visas med en separat avstämningsplan. **Öppna kundkort** har en egen tydlig knapp. Fem slutkontroller och 17 lokala browserfall passerar på slutkandidat `418531aa80e359ece524352a22a26a6cbc571e8d`; app-PR #68 är sammanslagen till app-main `6102c4eb2b47913a303ba03da6ffdd1e9f807f6b` med gröna exakt-head/main-checks. Sites v47 är publicerad 2026-10-07 08:52:19 UTC från verifierad source `b3118e0671a1967e90c14f3e2d9fd46893b05452`. Riktiga konto-/personalprov återstår. [STATUS](STATUS-2026-10-05.md), [VALIDATION](VALIDATION.md) och [DESIGN](DESIGN.md) skiljer lokala prov, main och publicerad version. V46:s Min dag-förbättringar består och dokumenteras som historik.

Vid v47 var fokusåtergång efter stängt kundkort och arbetsytebyte öppna designuppgifter. V48 rättar den avgränsade kundkortsåtergången ovan.

### Historik: v46

V46 förbättrar läsbarheten i **Min dag**: privat utkaststatus, dagens fokusetikett och texten när inga kunder behöver kontakt får plats även med större text. Nästa handling, ordning och svenska statusord består. Fem slutkontroller och 29 lokala browserfall passerar på slutkandidat `04dfa5cd`; app-PR #66 är sammanslagen till main `acc744d1` med gröna exakt-head/main-checks. Sites v46 är publicerad 2026-10-07 07:45:58 UTC från verifierad source `c8c922b3`. Riktiga konto-/personalprov återstår. [STATUS](STATUS-2026-10-05.md), [VALIDATION](VALIDATION.md) och [DESIGN](DESIGN.md) skiljer lokala prov, main och publicerad version. Autentiserad live-UI och personalens användbarhet återstår att observera.

## Utveckling och kontroller

Använd Node.js 24 och pnpm 11.25.0. Kör från projektets rot:

```sh
pnpm install --frozen-lockfile --prod=false
node tests/outlook.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Regressionstesterna täcker även CRM, v12 och v13. De använder isolerad SQLite och ersättningar för R2 och Microsoft Graph. Inga riktiga kundkonton eller externa tokens behövs. GitHub Actions kontrollerar pull requests och push till main när arbetsflödet finns i respektive revision. Kontrollera utfallet i PR:ens Checks-flik.

Lokalt kan den portabla utvecklingsservern startas med `pnpm dev`. Databas och inloggning måste förberedas enligt projektets driftinstruktioner. För en hanterad Sites-miljö används Sites-flödet för profil, installation, förhandsvisning och publicering.

## Kodöversikt

| Plats | Innehåll |
| --- | --- |
| `app/` | Sidor och server-API |
| `components/` | Säljarens, ledningens och produktionens vyer |
| `lib/` | Domänregler, roller, datalagring och integrationer |
| `drizzle/` | Databasmigreringar |
| `tests/` | Regressionstester |

## Arbetsflöde

Skapa en branch för en avgränsad ändring, kör kontrollerna och öppna en pull request. Beskriv vilket arbetsmoment som förbättras och vad som har verifierats. [AGENTS.md](AGENTS.md) gäller även när Codex eller en annan kodassistent arbetar i repot.

Det löpande CRM-bygguppdraget finns i [agent/MISSION.md](agent/MISSION.md), med [prioriterad arbetslista](agent/BACKLOG.md), [körinstruktion](agent/RUNBOOK.md), [leverantörskällor](agent/RESEARCH.md) och [verifieringslogg](agent/LOG.md). Agenten förbättrar befintligt CRM självständigt enligt Ludwigs mandat den 5 oktober; schema och faktiskt verifierade resultat dokumenteras separat.

GitHub lagrar källkod och granskningshistorik. Kunddata och uppladdade filer ligger i driftmiljön och ingår inte i en Git-backup. En merge publicerar inte automatiskt CRM:et; publicering sker separat genom Sites och ska kunna kopplas till en bestämd källrevision.

## Produkt- och driftunderlag

- [PRODUCT.md](PRODUCT.md): produkt och arbetsflöden.
- [DESIGN.md](DESIGN.md): visuellt uttryck, kundkort och designkontroller.
- [OPERATIONS.md](OPERATIONS.md): drift, åtkomst och återställning.
- [OUTLOOK.md](OUTLOOK.md): Outlook-konfiguration och gränser.
- [CLAUDE_REVIEW.md](CLAUDE_REVIEW.md): källhänvisningar och verifieringsunderlag för en oberoende v13-granskning.

Riktiga Outlook-, Fortnox-, AI- och webbshopskopplingar är inte aktiverade av denna GitHub-förberedelse. Godkända kodtester är inte bevis på produktionsberedskap eller på att säljarna klarar arbetsflödet utan hjälp.
Privata behovsutkast finns i **Årsplanering**, på kundens årshjul och under **Fortsätt där du slutade** i Min dag. Ofärdigt arbete kan sparas privat och återupptas. Dina ändringar sparas i CRM först genom det separata valet **Spara behov och påminnelse**; påminnelsen följer behovets status. [Drift- och återgångsgränser](OPERATIONS.md) samt [faktiskt verifierat main/live-resultat](VALIDATION.md) redovisas separat.
