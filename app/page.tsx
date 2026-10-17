import type { Metadata } from "next";
import { preload } from "react-dom";
import type { AnimalPage } from "../lib/public-animal-store";
import { HomeAnimalFeed } from "./components/HomeAnimalFeed";
import { HomeSearchFab } from "./components/HomeSearchFab";

export const dynamic="force-static";
export const metadata: Metadata = { alternates: { canonical: "https://www.firstfriend.me/" } };

const initialPage: AnimalPage = { items: [], total: 0, nextCursor: null, syncedAt: null, stale: false };

export default function Home(){
  // Start the first-visit location dependency before the client bundle hydrates.
  // The browser reuses this response for the existing same-origin fetch.
  preload("/api/location/default", { as: "fetch", crossOrigin: "anonymous" });
  return <div className="ff-page ff-home-page"><HomeAnimalFeed initialPage={initialPage}/><HomeSearchFab/></div>;
}
