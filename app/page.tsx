import type { AnimalPage } from "../lib/public-animal-store";
import { HomeAnimalFeed } from "./components/HomeAnimalFeed";
import { HomeSearchFab } from "./components/HomeSearchFab";

export const dynamic="force-dynamic";

const initialPage: AnimalPage = { items: [], total: 0, nextCursor: null, syncedAt: null, stale: false };

export default function Home(){return <div className="ff-page ff-home-page"><HomeAnimalFeed initialPage={initialPage}/><HomeSearchFab/></div>}
