import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("saved cards reuse home information while preserving grid photos and other grids", async t => {
  const modules = {
    "next/link": 'import {createElement} from "react"; export default ({prefetch,...props})=>createElement("a",props);',
    "./FavoriteButton": 'import {createElement} from "react"; export const FavoriteButton=()=>createElement("button",null,"스크랩");',
    "./AnimalThumbnail": 'import {createElement} from "react"; export const AnimalThumbnail=({src,alt})=>createElement("img",{src,alt});',
    "seed-design/ui/badge": 'export {Badge} from "@seed-design/react";',
  };
  const server = await createServer({
    configFile: false, envFile: false, appType: "custom", logLevel: "error",
    ssr: { external: ["react", "react/jsx-runtime", "react/jsx-dev-runtime"], noExternal: [/^@seed-design\//] },
    server: { middlewareMode: true, hmr: false },
    plugins: [{ name: "favorite-card-fixtures", enforce: "pre",
      resolveId(source) { if (source in modules) return "\0favorite-card:" + source; },
      load(id) { if (id.startsWith("\0favorite-card:")) return modules[id.slice("\0favorite-card:".length)]; },
    }],
  });
  t.after(() => server.close());
  const { AnimalCard } = await server.ssrLoadModule("/app/components/AnimalCard.tsx");
  const { FavoriteAnimalGrid } = await server.ssrLoadModule("/app/components/FavoriteAnimalGrid.tsx");
  const animal = {
    id: "saved-dog", name: "진도견 · 00169", species: "강아지", age: "2023(년생)", sex: "수컷",
    region: "부산광역시 연제구", shelter: "청조동물병원", shelterId: "shelter-id",
    distanceMeters: 7200, image: "/dog.jpg", source: "공공데이터", traits: ["기존 태그"],
    health: ["현재 상태: 보호중"], life: ["공고 2099. 1. 1. ~ 2099. 1. 10."],
  };
  const render = props => renderToStaticMarkup(createElement(AnimalCard, { animal, ...props }));
  const home = render({ layout: "row" });
  const saved = renderToStaticMarkup(createElement(FavoriteAnimalGrid, { animals: [animal] }));
  const info = html => html.match(/<a[^>]*class="ff-animal-row-animal-link"[\s\S]*?<\/a>/)?.[0];
  assert.ok(info(home));
  assert.equal(info(saved), info(home));
  for (const value of ["청조동물병원", "연제구", "7.2km", "2023년생", "보호자 확인 공고 중", 'src="/dog.jpg"', "/shelters/shelter-id"]) assert.ok(saved.includes(value), value);
  assert.doesNotMatch(saved, /ff-animal-card-row-main|기존 태그|공공데이터/);
  assert.match(render({}), /기존 태그/);
  const withoutDistance = renderToStaticMarkup(createElement(AnimalCard, { animal: { ...animal, distanceMeters: undefined }, showHomeInfo: true }));
  assert.doesNotMatch(withoutDistance, /ff-animal-distance|NaN/);
});
