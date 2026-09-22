import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import './pending-results.test.mjs';

const require = createRequire(import.meta.url);

test('quiz start asks guests once at entry, preserves the return URL and lets members start directly', async () => {
  const source = await readFile(new URL('../app/components/QuizStartButton.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  for (const signedIn of [false, true]) {
    for (const worldcup of [false, true]) {
      const states = [], exports = {};
      let index = 0, started = 0, effect;
      const returnTo = '/quiz/pet-knowledge?return_to=%2Ffriends%2F123&return_scroll=800#intro';
      const location = { href: `https://firstfriend.test${returnTo}` };
      const history = { state: { existing: true }, replaceState: (state, _, url) => { assert.equal(state, history.state); location.href = `https://firstfriend.test${url}`; } };
      runInNewContext(outputText, { exports, URL, window: { location, history }, require: name => {
        if (name === 'react') return { useEffect: fn => { effect = fn; }, useState: initial => { const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = value; }]; } };
        if (name === './AuthForm') return { AuthForm: 'auth' };
        if (name === '@seed-design/react') return { Divider: 'hr' };
        if (name === 'seed-design/ui/bottom-sheet') return new Proxy({}, { get: (_, key) => String(key) });
        if (name === 'seed-design/ui/action-button') return { ActionButton: 'button' };
        if (name.endsWith('.css')) return { default: {} };
        return require(name);
      } });
      const render = () => { index = 0; return exports.QuizStartButton({ signedIn, worldcup, onStart: () => started++ }); };
      render().props.children[0].props.onClick();
      if (signedIn) {
        assert.equal(started, 1); assert.equal(states[0], false);
        location.href = `https://firstfriend.test${returnTo.replace('#intro', '&quiz_start=1#intro')}`;
        effect(); effect();
        assert.equal(started, 2, 'login return starts once');
        assert.equal(location.href, `https://firstfriend.test${returnTo}`);
        continue;
      }
      assert.equal(started, 0);
      const sheet = render().props.children[1];
      assert.equal(sheet.props.open, true);
      const content = sheet.props.children;
      assert.equal(content.props.title, '로그인하고 기록을 남겨 보세요');
      assert.equal(content.props.description, '결과를 저장할 수 있어요.');
      const auth = content.props.children[0].props.children;
      assert.equal(auth.props.returnTo, returnTo.replace('#intro', '&quiz_start=1#intro'));
      const guest = content.props.children[1].props.children[1];
      sheet.props.onOpenChange(false);
      assert.equal(started, 0, 'dismissing login returns to the intro');
      assert.equal(guest.props.children, worldcup ? '로그인 없이 시작하기' : '로그인 없이 풀기');
      guest.props.onClick();
      assert.equal(states[0], false);
      assert.equal(started, 1);
    }
  }
});

test('admin quiz previews explain that results are not saved, even after an earlier save', async () => {
  const source = await readFile(new URL('../app/components/QuizCompletionNotice.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  let state = 'idle';
  const exports = {};
  runInNewContext(outputText, { exports, require: name => {
    if (name === 'react') return { useSyncExternalStore: () => state };
    if (name.includes('quiz-completion')) return {};
    if (name === 'seed-design/ui/action-button') return { ActionButton: () => null };
    return require(name);
  } });
  for (const quiz of ['care-readiness', 'adoption-prep', 'pet-knowledge']) {
    for (state of ['idle', 'saving', 'saved', 'login', 'error']) {
      const notice = exports.QuizCompletionNotice({ quiz, preview: true, quietSuccess: true });
      assert.equal(notice.props.role, 'status');
      assert.equal(notice.props.children.props.children, '미리보기 결과는 저장되지 않아요. 퀴즈를 완료하면 회원정보에 기록돼요.');
    }
  }
  state = 'saved';
  assert.equal(exports.QuizCompletionNotice({ quiz: 'care-readiness', quietSuccess: true }), null);
  assert.match(exports.QuizCompletionNotice({ quiz: 'pet-knowledge' }).props.children[0].props.children, /최고 결과 카드를 저장했어요/);
});

test('quiz badges refresh quietly, throttle focus and discard previous-account responses', async () => {
  const source = await readFile(new URL('../app/components/AdoptionPlanningCard.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const events = new EventTarget(), document = new EventTarget(), states = [], pending = [];
  document.visibilityState = 'visible';
  let effect, stateIndex = 0, scope = 'alice', now = 100_000;
  const exports = {};
  runInNewContext(outputText, {
    exports, AbortController, document, Date: { now: () => now }, window: events,
    fetch: (_url, options) => new Promise(resolve => pending.push({ resolve, signal: options.signal })),
    require: name => {
      if (name === 'react') return {
        useEffect: callback => { effect = callback; },
        useState: initial => { const index = stateIndex++; states[index] = initial; return [initial, value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
      };
      if (name === './display-scope') return { readDisplayScope: () => scope };
      if (name.includes('quiz-completion')) return { quizCompletionUpdatedEvent: 'ff-quiz-completion-updated' };
      if (name === './detailReturn') return { openDetailFlow() {} };
      if (name.endsWith('.css')) return { default: {} };
      if (name === 'seed-design/ui/badge') return { Badge: 'span' };
      if (name === 'next/link') return { default: 'a' };
      return require(name);
    },
  });
  exports.AdoptionPlanningCard();
  const cleanup = effect();
  const settle = async (index, completions, status = 200) => {
    pending[index].resolve(Response.json({ completions }, { status }));
    await new Promise(resolve => setImmediate(resolve));
  };
  const gold = { 'pet-knowledge': '상위 1% · 최고의 반려인' };
  await settle(0, gold);
  assert.equal(states[0]['pet-knowledge'], gold['pet-knowledge']);
  const first = states[0];
  events.dispatchEvent(new Event('focus'));
  events.dispatchEvent(new Event('pageshow'));
  document.dispatchEvent(new Event('visibilitychange'));
  const unrelated = new Event('storage'); unrelated.key = 'unrelated'; events.dispatchEvent(unrelated);
  assert.equal(pending.length, 1, 'rapid focus and unrelated storage events do not fetch');
  now += 31_000;
  events.dispatchEvent(new Event('focus'));
  events.dispatchEvent(new Event('pageshow'));
  assert.equal(pending.length, 2, 'in-flight requests are deduplicated');
  assert.equal(states[0], first, 'existing badges remain visible while loading');
  assert.equal(states[1], '도전하기');
  await settle(1, gold);
  assert.equal(states[0], first, 'unchanged server data preserves the state reference');
  now += 31_000;
  events.dispatchEvent(new Event('focus'));
  await settle(2, {}, 503);
  assert.equal(states[0], first, 'background failure does not erase valid badges');
  events.dispatchEvent(new Event('ff-quiz-completion-updated'));
  await settle(3, { 'pet-knowledge': '상위 10% · 세심한 반려인' });
  assert.match(states[0]['pet-knowledge'], /세심한/);
  const completed = new Event('storage'); completed.key = 'ff-quiz-completion-updated'; events.dispatchEvent(completed);
  assert.equal(pending.length, 5, 'completion in another tab bypasses the throttle');
  scope = 'bob';
  events.dispatchEvent(new Event('focus'));
  assert.equal(pending[4].signal.aborted, true);
  assert.equal(Object.keys(states[0]).length, 0, 'account change immediately clears previous badges');
  await settle(4, gold);
  assert.equal(Object.keys(states[0]).length, 0, 'late previous-account response cannot restore badges');
  await settle(5, {});
  scope = 'alice';
  events.dispatchEvent(new Event('focus'));
  await settle(6, {}, 503);
  assert.equal(states[1], '확인 필요', 'first-load errors remain visible');
  events.dispatchEvent(new Event('ff-quiz-completion-updated'));
  await settle(7, gold);
  now += 31_000;
  events.dispatchEvent(new Event('focus'));
  await settle(8, {}, 401);
  assert.equal(Object.keys(states[0]).length, 0, 'expired authorization clears stored display');
  assert.equal(states[1], '도전하기');
  cleanup();
  events.dispatchEvent(new Event('ff-quiz-completion-updated'));
  assert.equal(pending.length, 9);
});

test('quiz completion saves to the server and exposes authentication and save failures', async () => {
  const source = await readFile(new URL('../lib/quiz-completion.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const events = new EventTarget(), stored = new Map(), calls = [];
  let response = async () => Response.json({ title: '상위 1% · 최고의 반려인' });
  const exports = {};
  runInNewContext(outputText, {
    exports, Event, require: () => ({ rememberPending: () => true, forgetPending: () => {} }),
    fetch: async (url, options) => { calls.push({ url, options }); return response(); },
    window: { localStorage: { setItem: (k, v) => stored.set(k, v) }, dispatchEvent: events.dispatchEvent.bind(events), addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) },
  });
  let updates = 0;
  const unsubscribe = exports.subscribeQuizCompletion(() => updates++);
  await exports.saveQuizCompletion('pet-knowledge', 1, '최고의 반려인');
  assert.equal(exports.readSaveState('pet-knowledge'), 'saved');
  assert.equal(calls[0].url, '/api/quiz-completions');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(JSON.parse(calls[0].options.body).quiz, 'pet-knowledge');
  assert.deepEqual([...stored.keys()], ['ff-quiz-completion-updated'], 'only a refresh signal, never result data, is stored locally');
  assert.equal(updates, 2);
  response = async () => new Response('', { status: 401 });
  await exports.saveQuizCompletion('adoption-prep', 1, '완벽한 반려인');
  assert.equal(exports.readSaveState('adoption-prep'), 'login');
  response = async () => { throw new Error('offline'); };
  await exports.saveQuizCompletion('pet-knowledge', 1, '최고의 반려인');
  assert.equal(exports.readSaveState('pet-knowledge'), 'error');
  response = async () => new Response('', { status: 503 });
  await exports.saveQuizCompletion('pet-knowledge', 1, '최고의 반려인');
  assert.equal(exports.readSaveState('pet-knowledge'), 'error');
  response = async () => Response.json({});
  await exports.saveQuizCompletion('pet-knowledge', 1, '최고의 반려인');
  assert.equal(exports.readSaveState('pet-knowledge'), 'saved');
  unsubscribe();
});

test('member quiz API shares results across devices but never across members', async () => {
  const care = {}, model = {};
  for (const [path, exports] of [['../lib/care-readiness.ts', care], ['../lib/result-card.ts', model]]) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    runInNewContext(outputText, { exports, require: () => care });
  }
  const source = await readFile(new URL('../app/api/quiz-completions/route.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const rows = new Map();
  let member = 'alice', fail = false;
  const db = { async rpc(name, args) {
    assert.equal(name, 'save_best_quiz_card');
    const key = args.p_member_id + ':' + args.p_quiz;
    const old = rows.get(key);
    const updated = !old || args.p_medal > old.medal || (args.p_medal === old.medal && args.p_ratio > old.ratio);
    if (!fail && updated) rows.set(key, { member_id: args.p_member_id, quiz: args.p_quiz, ratio: args.p_ratio, title: args.p_title, medal: args.p_medal, completed_at: args.p_completed_at, card: args.p_card });
    return { data: updated, error: fail ? {} : null };
  }, from(table) {
    assert.equal(table, 'member_quiz_completions');
    return {
      select() { return this; },
      eq(field, value) {
        assert.equal(field, 'member_id');
        return Promise.resolve({ data: [...rows.values()].filter(row => row.member_id === value), error: fail ? {} : null });
      },
      async upsert(row, options) {
        assert.equal(options.onConflict, 'member_id,quiz');
        if (!fail) rows.set(row.member_id + ':' + row.quiz, row);
        return { error: fail ? {} : null };
      },
    };
  } };
  const device = () => {
    const exports = {};
    runInNewContext(outputText, { exports, Response, URL, require: name => name.includes('chatgpt-auth') ? { getChatGPTUser: async () => member ? { userId: member, displayName: member } : null } : name.includes('result-card') ? model : { getSupabaseServerClient: () => db } });
    return exports;
  };
  const phone = device(), laptop = device();
  const request = (body, origin = 'https://firstfriend.test') => new Request('https://firstfriend.test/api/quiz-completions', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const result = { quiz: 'pet-knowledge', ratio: 1, title: 'arbitrary client title', member_id: 'bob' };
  assert.equal((await phone.POST(request(result))).status, 200);
  const loaded = await laptop.GET();
  assert.equal(loaded.headers.get('cache-control'), 'private, no-store');
  assert.equal((await loaded.json()).completions['pet-knowledge'], '상위 1% · 최고의 반려인');
  member = 'bob';
  assert.deepEqual((await (await laptop.GET()).json()).completions, {});
  member = 'alice';
  await phone.POST(request({ quiz: 'adoption-prep', ratio: 14 / 17 }));
  const answers = Object.fromEntries(care.careSections('dog').flatMap(s => s.questions.map(q => [q.id, 'ready'])));
  await phone.POST(request({ quiz: 'care-readiness', answers }));
  const all = (await (await laptop.GET()).json()).completions;
  assert.equal(all['adoption-prep'], '상위 10% · 따뜻한 반려인');
  assert.equal(all['care-readiness'], '함께할 준비가 차곡차곡 갖춰졌어요');
  await phone.POST(request({ ...result, ratio: 12 / 15 }));
  assert.equal(rows.size, 3, 'retakes update the member/quiz row');
  assert.equal((await (await laptop.GET()).json()).completions['pet-knowledge'], '상위 1% · 최고의 반려인');
  const originalDate = rows.get('alice:pet-knowledge').completed_at;
  assert.equal((await (await phone.POST(request(result))).json()).updated, false);
  assert.equal(rows.get('alice:pet-knowledge').completed_at, originalDate);
  for (const body of [null, {}, { ...result, ratio: 2 }, { ...result, ratio: 0.99 }, { ...result, quiz: 'unknown' }]) assert.equal((await phone.POST(request(body))).status, 400);
  assert.equal((await phone.POST(request(result, 'https://other.test'))).status, 403);
  assert.equal((await phone.POST(new Request('https://firstfriend.test/api/quiz-completions', { method: 'POST', body: '{' }))).status, 400);
  fail = true;
  assert.equal((await phone.GET()).status, 503);
  assert.equal((await phone.POST(request(result))).status, 503);
  member = null;
  assert.equal((await phone.GET()).status, 401);
  assert.equal((await phone.POST(request(result))).status, 401);
});

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
        if (id === '../../lib/geo') return { readHomeLocation: () => null, isKoreaPoint: () => true, readAllRegions: () => false, ALL_REGIONS_KEY: 'ff-home-region-all' };
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
