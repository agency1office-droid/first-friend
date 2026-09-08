import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('favorites distinguish failed/missing data and ignore responses from an old login', async t => {
  const originals = Object.fromEntries(['document', 'window', 'sessionStorage', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const fixture = { result: { data: [], error: null }, effects: [], states: [], feedback: [], createElement };
  globalThis.__favoriteAudit = fixture;
  const modules = {
    'react': 'export const useEffect=f=>globalThis.__favoriteAudit.effects.push(f); export const useRef=v=>({current:v}); export const useState=v=>[v,n=>globalThis.__favoriteAudit.states.push(n)];',
    'next/navigation': 'export const useRouter=()=>({push(){}});',
    'lucide-react': 'export const Bookmark=()=>null;',
    './AppFeedback': 'export const useAppFeedback=()=>({success:v=>globalThis.__favoriteAudit.feedback.push(v),error:v=>globalThis.__favoriteAudit.feedback.push(v)});',
    'chatgpt-auth': 'export const getChatGPTUser=async()=>({userId:"member"}); export const chatGPTSignInPath=()=>"/login";',
    'supabase/server': 'export const getSupabaseServerClient=()=>({from(){const q={select(){return q},eq(){return q},order(){return Promise.resolve(globalThis.__favoriteAudit.result)}};return q}});',
    'lib/public-data': 'export const getAnimalsByIds=async(ids)=>ids.map(()=>undefined);',
    'FavoriteAnimalGrid': 'export const FavoriteAnimalGrid=()=>globalThis.__favoriteAudit.createElement("div",null,"아직 스크랩한 친구가 없어요.");',
    'seed-design/ui/callout': 'export const Callout=p=>globalThis.__favoriteAudit.createElement("aside",null,p.title,p.description);',
  };
  const server = await createServer({ configFile: false, envFile: false, appType: 'custom', logLevel: 'error', ssr: { external: ['react/jsx-runtime', 'react/jsx-dev-runtime'], noExternal: [/^react$/, 'lucide-react'] }, server: { middlewareMode: true, hmr: false }, plugins: [{
    name: 'favorites-audit-fixtures', enforce: 'pre',
    resolveId(source) { const key = Object.keys(modules).find(key => source === key || source.endsWith('/' + key)); return key ? '\0favorite-audit:' + key : undefined; },
    load(id) { if (id.startsWith('\0favorite-audit:')) return modules[id.slice('\0favorite-audit:'.length)]; },
  }] });
  t.after(async () => {
    await server.close(); delete globalThis.__favoriteAudit;
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  });
  const { default: Page } = await server.ssrLoadModule('/app/mypage/favorites/page.tsx');
  fixture.result = { data: null, error: { message: 'database unavailable' } };
  let html = renderToStaticMarkup(await Page());
  assert.match(html, /관심 친구를 불러오지 못했어요/);
  assert.doesNotMatch(html, /아직 스크랩한 친구가 없어요/);
  fixture.result = { data: [{ animal_id: 'missing' }], error: null };
  html = renderToStaticMarkup(await Page());
  assert.match(html, /스크랩 1건 중 1건/);
  assert.doesNotMatch(html, /아직 스크랩한 친구가 없어요/);
  fixture.result = { data: [], error: null };
  assert.match(renderToStaticMarkup(await Page()), /아직 스크랩한 친구가 없어요/);

  globalThis.document = { body: { dataset: { favoriteScope: 'account-a' } } };
  globalThis.window = new EventTarget();
  const storage = new Map();
  globalThis.sessionStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
  globalThis.fetch = async () => Response.json({ favorites: [] });
  const { FavoriteButton } = await server.ssrLoadModule('/app/components/FavoriteButton.tsx');
  FavoriteButton({ animalId: 'animal', animalName: '친구' });
  const cleanup = fixture.effects.pop()();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.states.at(-1), false);
  cleanup();

  let finish;
  globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
  const button = FavoriteButton({ animalId: 'animal', animalName: '친구' });
  const pending = button.props.onClick();
  document.body.dataset.favoriteScope = 'account-b';
  finish(Response.json({ error: 'expired' }, { status: 401 }));
  await pending;
  assert.deepEqual(fixture.feedback, [], 'old account response produces no new account error or redirect');
  assert.equal(storage.size, 0, 'old account response does not write a new account cache');
  globalThis.fetch = async input => Response.json(String(input).includes('/display-scope') ? { scope: 'bbbbbbbbbbbbbbbbbbbbbbbb' } : { favorites: [] });
  FavoriteButton({ animalId: 'previously-saved', animalName: '친구', initialSaved: true });
  const stop = fixture.effects.pop()();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.states.at(-1), true);
  const restore = new Event('pageshow');
  Object.defineProperty(restore, 'persisted', { value: true });
  window.dispatchEvent(restore);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.states.at(-1), false, 'bfcache restoration cannot reuse the old account initialSaved flag');
  stop();
});
