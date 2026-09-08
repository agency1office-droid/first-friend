import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

test('manual neighborhood selection wins over delayed IP and profile restoration', async () => {
  const source = await readFile(new URL('../app/components/HomeTopbar.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  for (const stage of ['ip', 'profile', 'locations', 'unmount']) {
    const manual = { lat: 37.5, lng: 127, label: '직접 선택한 동네', source: 'search' };
    const automatic = { lat: 35.1, lng: 129, label: '이전 동네', source: 'ip' };
    const storage = new Map(), effects = [], labels = [];
    let stateIndex = 0, release;
    const delayed = new Promise(resolve => { release = resolve; });
    const exports = {};
    const stub = new Proxy({}, { get: (_target, key) => String(key) });
    runInNewContext(outputText, {
      exports, CustomEvent: class {},
      window: { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, dispatchEvent() {} },
      fetch: async (url, options) => {
        if (options?.method === 'POST') return Response.json({});
        if (url === '/api/profile') return stage === 'profile' ? delayed : Response.json({ homeRegion: automatic.label });
        return stage === 'locations' ? delayed : Response.json({ locations: [automatic] });
      },
      require: id => {
        if (id === 'react') return {
          useState: value => { const index = stateIndex++; return [index === 3 ? [manual] : index === 6 ? 'search' : value, next => { if (index === 0) labels.push(next); }]; },
          useRef: value => ({ current: value }), useEffect: fn => effects.push(fn),
        };
        if (id === './AppFeedback') return { useAppFeedback: () => ({ success() {}, error() {} }) };
        if (id === './defaultHomeLocation') return { loadDefaultHomeLocation: () => stage === 'ip' || stage === 'unmount' ? delayed : Promise.resolve(automatic) };
        if (id === '../../lib/geo') return { readHomeLocation: () => null, isKoreaPoint: () => true };
        if (id === 'react/jsx-runtime') return require(id);
        return stub;
      },
    });
    const tree = exports.HomeTopbar();
    const cleanup = effects[0]();
    const settle = () => new Promise(resolve => setImmediate(resolve));
    await settle();
    const findOption = node => {
      if (!node || typeof node !== 'object') return null;
      if (node.props?.role === 'option') return node;
      const children = Array.isArray(node) ? node : node.props?.children;
      return (Array.isArray(children) ? children : [children]).map(findOption).find(Boolean);
    };
    if (stage === 'unmount') cleanup();
    else findOption(tree).props.onClick();
    release(stage === 'profile' ? Response.json({ homeRegion: automatic.label }) : stage === 'locations' ? Response.json({ locations: [automatic] }) : automatic);
    await settle();
    if (stage === 'unmount') assert.equal(storage.size, 0, 'unmounted header cannot restore a location');
    else {
      assert.equal(JSON.parse(storage.get('ff-home-location')).label, manual.label, `${stage} response cannot overwrite a manual location`);
      assert.equal(labels.at(-1), manual.label);
      cleanup();
    }
  }
});

test('animal gallery handles a bubbling arrow key only once', async () => {
  const source = await readFile(new URL('../app/components/AnimalGallery.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  let selected = 0, stateIndex = 0, pageKeyDown;
  const exports = {};
  runInNewContext(outputText, {
    exports,
    window: { addEventListener: (_name, handler) => { pageKeyDown = handler; } },
    require: id => {
      if (id === 'react') return {
        useState: value => { const index = stateIndex++; return [value, next => { if (index === 0) selected = typeof next === 'function' ? next(selected) : next; }]; },
        useRef: value => ({ current: value }), useMemo: fn => fn(), useEffect: fn => fn(),
      };
      if (id === '@karrotmarket/react-monochrome-icon') return { IconXmarkLine: () => null };
      if (id === '../../lib/image-url') return { optimizedAnimalImageUrl: value => value };
      return require(id);
    },
  });
  const gallery = exports.AnimalGallery({ name: '검증', image: '/a.jpg', images: ['/b.jpg', '/c.jpg', '/d.jpg'] });
  const main = gallery.props.children.find(child => child?.type === 'button');
  const dialog = gallery.props.children.find(child => child?.type === 'dialog');
  const arrow = key => ({ key, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, target: { closest: () => null } });
  for (const element of [main, dialog]) {
    selected = 0;
    const event = arrow('ArrowRight');
    element.props.onKeyDown(event);
    pageKeyDown(event);
    assert.equal(selected, 1, 'element handler and global handler cannot both advance the photo');
  }
  pageKeyDown(arrow('ArrowRight'));
  assert.equal(selected, 2, 'page keyboard navigation still works outside the gallery');
  const inputEvent = arrow('ArrowLeft');
  inputEvent.target.closest = () => ({});
  pageKeyDown(inputEvent);
  assert.equal(selected, 2, 'typing in a form does not change photos');
});

// Exercise the actual click handlers with controlled network timing, without a live account.
for (const [name, props, endpoint] of [
  ['VolunteerButton', { shelterId: 'test', shelterName: '검증 보호소', region: '서울', postId: 1 }, '/api/volunteer'],
  ['SupportIntentButton', { kind: 'goods', title: '검증', targetId: 'test', label: '지원' }, '/api/support'],
]) {
  test(`${name} prevents concurrent submissions and recovers after network and HTTP failures`, async () => {
    const source = await readFile(new URL(`../app/components/${name}.tsx`, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
    const errors = [], successes = [], states = [], requests = [];
    let finish;
    let request = () => new Promise(resolve => { finish = resolve; });
    const exports = {};
    const location = { pathname: '/support', href: '' };
    runInNewContext(outputText, {
      exports, location,
      fetch: (url, options) => { requests.push({ url, options }); return request(); },
      require: id => {
        if (id === 'react') return { useRef: value => ({ current: value }), useState: value => [value, next => states.push(next)] };
        if (id === './AppFeedback') return { useAppFeedback: () => ({ error: value => errors.push(value), success: value => successes.push(value) }) };
        if (id === 'seed-design/ui/action-button') return { ActionButton: () => null };
        return require(id);
      },
    });
    const { onClick } = exports[name](props).props;
    const first = onClick();
    await onClick();
    assert.equal(requests.length, 1, 'second click cannot submit while the first request is pending');
    assert.equal(requests[0].url, endpoint);
    finish(Response.json({ message: '이미 지원한 공고예요.' }, { status: 201 }));
    await first;
    assert.equal(successes.length, 1);
    if (name === 'VolunteerButton') assert.equal(successes[0], '이미 지원한 공고예요.');
    assert.deepEqual(states, [true, false]);

    request = async () => { throw new Error('offline'); };
    await onClick();
    assert.equal(errors.length, 1, 'network failure is explained instead of escaping as an unhandled rejection');
    assert.equal(states.at(-1), false, 'network failure releases the pending UI');

    request = async () => Response.json({ error: '다시 확인해 주세요.' }, { status: 503 });
    await onClick();
    assert.equal(errors.at(-1), '다시 확인해 주세요.');
    request = async () => Response.json({}, { status: 201 });
    await onClick();
    assert.equal(successes.length, 2, 'a retry works after failed requests');

    request = async () => new Response('', { status: 401 });
    await onClick();
    assert.equal(location.href, '/login?return_to=%2Fsupport');
    assert.equal(states.at(-1), false);
  });
}
