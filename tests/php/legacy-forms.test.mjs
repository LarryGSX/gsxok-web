import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {validNewPassword,passwordPolicyMessage} from '../../lib/portal/password-policy.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');const require=createRequire(resolve(root,'package.json'));
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const ts=require('typescript');
function component(file,extra=''){
 const compiled=ts.transpileModule(readFileSync(resolve(root,file),'utf8')+extra,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 const localRequire=name=>{
  if(name==='@/lib/portal/password-policy')return {validNewPassword,passwordPolicyMessage};
  if(name==='@/lib/portal/api')return {};
  if(name==='@/components/ui/Button')return {Button:({children,variant,size,...props})=>React.createElement('button',props,children)};
  if(name==='next/dynamic')return ()=>()=>null;
  if(name==='next/link')return ({children,...props})=>React.createElement('a',props,children);
  if(name==='next/navigation')return {useSearchParams:()=>new URLSearchParams('token=fictional')};
  return require(name);
 };
 vm.runInNewContext(compiled,{require:localRequire,module,exports:module.exports,TextEncoder,URLSearchParams,console});return module.exports;
}
test('browser and PHP password policies agree on whitespace, Unicode, NUL and byte boundaries',()=>{
 const values=['short','abcdefghijkl','  spaced fictional  ','😀'.repeat(12),'😀'.repeat(18),'😀'.repeat(19),'a'.repeat(72),'a'.repeat(73),'abcdefghijkl\0'];
 const expected=[false,true,true,true,true,false,true,false,false];assert.deepEqual(values.map(validNewPassword),expected);
 assert(process.env.GSX_TEST_PHP&&process.env.GSX_TEST_PHP_EXT);
 const result=execFileSync(process.env.GSX_TEST_PHP,['-n','-d',`extension_dir=${process.env.GSX_TEST_PHP_EXT}`,'-d','extension=php_mbstring.dll',resolve(root,'tests/php/password-policy.php')],{input:JSON.stringify(values),encoding:'utf8'});
 assert.deepEqual(JSON.parse(result),expected);
});
test('legacy reset and staff password forms render the new minimum and visible byte-limit instructions',()=>{
 const reset=component('components/portal/ResetPasswordForm.tsx').ResetPasswordForm;
 const staff=component('components/admin/AdminPanel.tsx').AdminPanel;
 for(const [form,props] of [[reset,{}],[staff,{firstName:'Fictional',mustChangePassword:true,onSignedOut(){}}]]){
  const html=renderToStaticMarkup(React.createElement(form,props));assert.equal((html.match(/minLength="12"/g)||[]).length,2);assert.match(html,/72 UTF-8 bytes/);assert(!html.includes('minLength="8"'));
 }
});
test('shared legacy registration input requires twelve characters while existing-password login remains unrestricted',()=>{
 const {FixturePasswordField}=component('components/portal/PortalAuth.tsx','\nexport { PasswordField as FixturePasswordField };');
 const props={id:'fictional',name:'password',label:'Password',visible:false,onToggleVisible(){}};
 const newField=renderToStaticMarkup(React.createElement(FixturePasswordField,{...props,autoComplete:'new-password'}));
 const login=renderToStaticMarkup(React.createElement(FixturePasswordField,{...props,autoComplete:'current-password'}));
 assert.match(newField,/minLength="12"/);assert(!login.includes('minLength='));
});
