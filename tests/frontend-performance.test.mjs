import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('deferred monitoring retains early errors, initializes once and hands over global handlers', async () => {
  const source = await readFile(new URL('../lib/client-error-monitor.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  function fixture({ hostname = 'www.firstfriend.me', dsn = 'test', readyState = 'loading', fail = false } = {}) {
    const window = new EventTarget(), exports = {}, captured = [];
    window.location = { hostname };
    let imports = 0, initialized = 0;
    const sdk = { initialize() { initialized++; }, captureException(error, hint) { assert.equal(initialized, 1); captured.push({ error, hint }); } };
    runInNewContext(outputText, { exports, window, document: { readyState }, process: { env: { NEXT_PUBLIC_SENTRY_DSN: dsn } },
      require(name) { assert.equal(name, './client-sentry'); imports++; if (fail) throw new Error('offline'); return sdk; },
    });
    return { window, exports, captured, counts: () => ({ imports, initialized }), recover: () => { fail = false; } };
  }
  const normal = fixture();
  normal.exports.startClientErrorMonitoring(); normal.exports.startClientErrorMonitoring();
  await tick(); assert.equal(normal.counts().imports, 0, 'SDK must not compete with initial resources');
  normal.window.dispatchEvent(new Event('load')); await tick();
  assert.deepEqual(normal.counts(), { imports: 1, initialized: 1 });
  const early = fixture(), error = new TypeError('original error'), rejection = new Error('original rejection');
  early.exports.startClientErrorMonitoring();
  const errorEvent = new Event('error'); errorEvent.error = error;
  const rejectionEvent = new Event('unhandledrejection'); rejectionEvent.reason = rejection;
  early.window.dispatchEvent(errorEvent); early.window.dispatchEvent(rejectionEvent);
  await tick();
  assert.deepEqual(early.counts(), { imports: 1, initialized: 1 });
  assert.equal(early.captured[0].error, error); assert.equal(early.captured[1].error, rejection);
  assert.equal(early.captured[0].hint.mechanism.handled, false);
  early.window.dispatchEvent(errorEvent); early.window.dispatchEvent(new Event('load')); await tick();
  assert.equal(early.captured.length, 2, 'temporary listeners stop reporting after SDK handover');
  early.exports.reportClientError(error); await tick();
  assert.equal(early.captured.length, 3, 'React error boundary still reports after initialization');
  const failed = fixture({ fail: true }); failed.exports.startClientErrorMonitoring();
  failed.window.dispatchEvent(new Event('load')); await tick(); failed.recover();
  failed.exports.reportClientError(error); await tick();
  assert.deepEqual(failed.counts(), { imports: 2, initialized: 1 });
  assert.equal(failed.captured[0].error, error);
  const loaded = fixture({ readyState: 'complete' }); loaded.exports.startClientErrorMonitoring(); await tick();
  assert.equal(loaded.counts().initialized, 1);
  for (const options of [{ hostname: 'localhost' }, { dsn: '' }]) {
    const disabled = fixture(options); disabled.exports.startClientErrorMonitoring(); disabled.exports.reportClientError(error);
    disabled.window.dispatchEvent(new Event('load')); await tick(); assert.equal(disabled.counts().imports, 0);
  }
});

test('list prefetch uses the rendered thumbnail URL and gallery keeps adjacent photos at low priority', async t => {
  const server = await createServer({configFile:false,envFile:false,ssr:{noExternal:[/^@seed-design\//]},server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
  t.after(() => server.close());
  const {animalCardImageUrl, optimizedAnimalImageUrl} = await server.ssrLoadModule('/lib/image-url.ts');
  const {AnimalThumbnail} = await server.ssrLoadModule('/app/components/AnimalThumbnail.tsx');
  const cases = [
    {image:'https://openapi.animal.go.kr/a.jpg', expected:'/api/media?url=https%3A%2F%2Fopenapi.animal.go.kr%2Fa.jpg&w=480'},
    {image:'https://openapi.animal.go.kr/a.jpg', thumbnail:'https://storage.example/thumb.webp', expected:'https://storage.example/thumb.webp'},
    {image:'/local.jpg', expected:'/local.jpg'},
  ];
  for (const animal of cases) {
    const src = animalCardImageUrl(animal);
    assert.equal(src, animal.expected);
    const html = renderToStaticMarkup(createElement(AnimalThumbnail, {src, fallbackSrc:animal.image, alt:'test'}));
    assert.ok(html.includes(`src="${optimizedAnimalImageUrl(src).replaceAll('&','&amp;')}"`));
  }
  const {AnimalGallery} = await server.ssrLoadModule('/app/components/AnimalGallery.tsx');
  const html = renderToStaticMarkup(createElement(AnimalGallery, {image:'/first.jpg', images:['/first.jpg','/second.jpg'], name:'test'}));
  const photos = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
  assert.equal(photos.length, 2, 'adjacent photo remains available before swiping');
  assert.match(photos[0], /fetchPriority="high"/);
  assert.match(photos[1], /fetchPriority="low"/);
  assert.match(html, /aria-keyshortcuts="ArrowLeft ArrowRight"/);
});

test('quiz badge requests wait for scope, skip guests and resume after account changes', async () => {
  const source = await readFile(new URL('../app/components/AdoptionPlanningCard.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const require = createRequire(import.meta.url), events = new EventTarget(), document = new EventTarget();
  const states = [], requests = [], exports = {};
  let effect, index = 0, scope, resolveScope, rejectScope;
  let scopePromise = new Promise((resolve, reject) => { resolveScope = resolve; rejectScope = reject; });
  document.visibilityState = 'visible';
  runInNewContext(outputText, { exports, document, window: events, AbortController, Date,
    fetch: (_url, options) => new Promise(resolve => requests.push({resolve, signal: options.signal})),
    require: name => {
      if (name === 'react') return { useEffect: fn => { effect = fn; }, useState: value => { const i = index++; states[i] = value; return [value, next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; } };
      if (name === './display-scope') return {readDisplayScope: () => scope, ensureDisplayScope: () => scopePromise};
      if (name.includes('quiz-completion')) return {quizCompletionUpdatedEvent: 'completion'};
      if (name === './detailReturn') return {openDetailFlow() {}};
      if (name.endsWith('.css')) return {default: {}};
      if (name === 'seed-design/ui/badge') return {Badge: 'span'};
      if (name === 'next/link') return {default: 'a'};
      return require(name);
    }
  });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  exports.AdoptionPlanningCard(); const cleanup = effect();
  events.dispatchEvent(new Event('focus'));
  assert.equal(requests.length, 0, 'no speculative member request while scope is unknown');
  scope = 'guest'; resolveScope(scope); await tick();
  assert.equal(requests.length, 0); assert.equal(states[1], '도전하기');
  scope = 'alice'; events.dispatchEvent(new Event('focus'));
  assert.equal(requests.length, 1, 'sign-in starts the authenticated endpoint');
  scope = 'guest'; events.dispatchEvent(new Event('focus'));
  assert.ok(requests[0].signal.aborted);
  requests[0].resolve(Response.json({completions: {'pet-knowledge': 'old account'}})); await tick();
  assert.equal(Object.keys(states[0]).length, 0, 'late member response cannot cross logout');
  scope = undefined; scopePromise = new Promise((resolve, reject) => { resolveScope = resolve; rejectScope = reject; });
  events.dispatchEvent(new Event('completion')); rejectScope(new Error('offline')); await tick();
  scope = 'bob'; events.dispatchEvent(new Event('focus')); assert.equal(requests.length, 2);
  requests[1].resolve(Response.json({completions: {'pet-knowledge': 'current account'}})); await tick();
  assert.equal(states[0]['pet-knowledge'], 'current account');
  cleanup(); events.dispatchEvent(new Event('focus')); assert.equal(requests.length, 2);
});

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
