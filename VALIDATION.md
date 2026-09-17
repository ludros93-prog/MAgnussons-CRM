# Verifiering 2026-09-17

- GitHub-baseline `3504f82d6f5ecce24f01c39963091eb612e9d76f` har verifierat samma Git-träd som ursprungsrevision `e5e99b6503681cebf4870a976e31a7e600299bae` (alla 200 spårade filer och filrättigheter).
- Node.js v24.19.0.
- `node tests/outlook.mjs`: godkänd, inklusive CRM-, v12- och v13-scenarier.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: godkänd.
- Kontrollerna kördes i förberedd kopia utan next-env.d.ts eller .next, med befintliga installerade beroenden från källprojektet. En ren installation på GitHub-runner har inte körts.
- Applikationskod och databasmigreringar är oförändrade. Ingen publicering har gjorts.
- GitHub-repo och baseline är upplagda. CI-filen, PR-mallen och arbetsinstruktionerna läggs i en separat PR. Första körningen i GitHub Actions återstår vid denna dokumentrevision; kontrollera aktuell PR-status.
