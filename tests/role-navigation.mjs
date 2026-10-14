import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../lib/role-navigation.ts',import.meta.url),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const navigation=await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');

assert.deepEqual(navigation.primaryViewsForRole('seller'),['today','customers','deals','calendar','overview']);
assert.deepEqual(navigation.primaryViewsForRole('reader'),['today','customers','deals','calendar','overview']);
assert.deepEqual(navigation.primaryViewsForRole('admin'),['today','customers','deals','calendar','overview']);
assert.deepEqual(navigation.primaryViewsForRole('production'),['production','notices']);
assert.deepEqual(navigation.primaryViewsForRole('print'),['print','notices']);
assert.deepEqual(navigation.primaryViewsForRole('warehouse'),['warehouse','notices']);
assert.deepEqual(navigation.primaryViewsForRole(undefined),[]);
assert.equal(navigation.canSeeAdminNavigation('admin'),true);
for(const role of ['seller','reader','production','print','warehouse',undefined])assert.equal(navigation.canSeeAdminNavigation(role),false);
assert.match(page,/primaryViewsForRole\(st\?\.viewer\?\.role\)/);
assert.match(page,/canSeeAdminNavigation\(st\?\.viewer\?\.role\).*<span>Admin<\/span>/);
assert.doesNotMatch(page,/<span>Inställningar<\/span>/);

console.log('role navigation: ok');
