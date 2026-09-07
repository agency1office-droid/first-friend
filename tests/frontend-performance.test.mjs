import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('parallel home consumers share location request and recover after failure', async t => {
  const server = await createServer({configFile:false,envFile:false,ssr:{noExternal:[/^@seed-design\//]},server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
  const originalFetch = globalThis.fetch;
  t.after(async () => { globalThis.fetch = originalFetch; await server.close(); });
  const {loadDefaultHomeLocation} = await server.ssrLoadModule('/app/components/defaultHomeLocation.ts');
  let requests = 0, finish;
  globalThis.fetch = (_url, options) => {
    requests += 1;
    assert.ok(options.signal, 'first-photo dependency has a timeout');
    return new Promise(resolve => { finish = resolve; });
  };
  const a = loadDefaultHomeLocation(), b = loadDefaultHomeLocation();
  assert.equal(requests, 1);
  assert.equal(a, b);
  const location = {lat:37.5,lng:127,label:'서울'};
  finish(Response.json({location}));
  assert.deepEqual(await a, location);
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await loadDefaultHomeLocation(), null);
  globalThis.fetch = async () => Response.json({location});
  assert.deepEqual(await loadDefaultHomeLocation(), location);
  const {TextField, TextFieldInput} = await server.ssrLoadModule('/seed-design/ui/text-field.tsx');
  const html = renderToStaticMarkup(createElement(TextField, {label:'보호소 이름',defaultValue:'검증 보호소'}, createElement(TextFieldInput, {name:'name'})));
  assert.match(html, /value="검증 보호소"/, 'SEED wrapper forwards defaultValue to its state hook');
});
