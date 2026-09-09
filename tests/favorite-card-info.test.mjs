import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("saved cards show only photo, name and status while preserving other card layouts", async t => {
  const modules = {
    "next/link": 'import {createElement} from "react"; export default ({prefetch,...props})=>createElement("a",props);',
    "./FavoriteButton": 'import {createElement} from "react"; export const FavoriteButton=()=>createElement("button",null,"스크랩");',
    "./AnimalThumbnail": 'import {createElement} from "react"; export const AnimalThumbnail=({src,alt})=>createElement("img",{src,alt});',
    "seed-design/ui/badge": 'export {Badge} from "@seed-design/react";',
    "seed-design/ui/chip": 'export {Chip} from "/seed-design/ui/chip.tsx";',
    "./FavoriteFilterSheet": 'export const FavoriteFilterSheet=()=>null;',
    "seed-design/ui/dialog": 'export {DialogRoot,DialogContent,DialogFooter} from "/seed-design/ui/dialog.tsx";',
    "seed-design/ui/action-button": 'export {ActionButton} from "/seed-design/ui/action-button.tsx";',
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
    distanceMeters: 7200, image: "/dog.jpg", photoCount: 3, source: "공공데이터", traits: ["기존 태그"],
    health: ["현재 상태: 보호중"], life: ["공고 2099. 1. 1. ~ 2099. 1. 10."],
  };
  const render = props => renderToStaticMarkup(createElement(AnimalCard, { animal, ...props }));
  const home = render({ layout: "row" });
  const saved = renderToStaticMarkup(createElement(FavoriteAnimalGrid, { animals: [animal] }));
  for (const value of ["진도견 · 00169", "보호자 확인 공고 중", 'src="/dog.jpg"', 'href="/friends/saved-dog"', "ff-animal-photo-caption", "ff-animal-photo-status", "스크랩"]) assert.ok(saved.includes(value), value);
  assert.doesNotMatch(saved, /ff-animal-info|ff-card-photo-count|청조동물병원|연제구|7\.2km|2023년생|수컷|기존 태그|공공데이터/);
  assert.match(saved, /ff-detail-gallery-status ff-public-status-notice ff-animal-photo-status/);
  assert.match(saved, /ff-detail-status-day/);
  assert.ok(saved.indexOf("ff-animal-photo-caption") < saved.indexOf("ff-animal-photo-status"), "name stays on photo above the full-width status footer");
  assert.doesNotMatch(saved, /seed-badge__root/, "photo card uses the detail status strip instead of a solid badge");
  assert.doesNotMatch(saved, /<a[^>]*>[\s\S]*<button[\s\S]*<\/a>/, "scrap button stays outside the detail link");
  for (const value of ["청조동물병원", "연제구", "7.2km", "2023년생", "ff-card-photo-count"]) assert.ok(home.includes(value), value);
  assert.match(render({}), /기존 태그/);
  assert.match(render({ layout: "photo", animal: { ...animal, health: ["현재 상태: 종료(입양)"] } }), /새 가족을 만났어요/);
});
