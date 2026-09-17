# Magnussons CRM

## Produkt

CRM för ett litet säljteam med gemensamt tryck- och lagerflöde. Användarna är ovana vid CRM. Behåll tydliga svenska ord, konkreta nästa handlingar och skillnaden mellan den egna arbetsdagen och teamets uppföljning.

## Arbetsflöde

- Läs README.md och relevanta delar av PRODUCT.md, OPERATIONS.md och OUTLOOK.md.
- Gör avgränsade ändringar i en egen branch och beskriv problem, beteende och verifiering i en pull request.
- Ändra inte produktlogik som en bieffekt av flytt, formatering eller verktygsinställningar.
- Bevara servervalidering, roller, idempotens och kontroller för samtidiga ändringar. Kundgodkännande, skickad leverans, kundmottagande och fakturering är skilda händelser.
- Skriv meningsfulla regressionstester när orderantal, revisioner, behörighet eller samtidighet ändras. Anpassa inte förväntningar enbart för att få gröna tester.
- Kör `node tests/outlook.mjs` och `node node_modules/typescript/bin/tsc --noEmit --incremental false` från reporoten. Node 24 och pnpm 11.25.0 används i CI.
- Lägg inte in driftdata, kundexporter, inspelningar, uppladdade filer, tokens eller lösenord i Git.
- GitHub-kontroller ersätter inte användartest, integrationstest med riktiga konton eller verifiering av hostingens åtkomst och återställning.

## Hosting

Projektet är kopplat till Sites genom `.openai/hosting.json`. Behåll projektets identitet. GitHub innehåller källkod; en merge publicerar inte automatiskt appen. Vid arbete med själva Site-publiceringen används Sites-instruktionerna och en dokumenterad källrevision. Koppla inte bort eller byt hosting som en bieffekt av en kodändring.
