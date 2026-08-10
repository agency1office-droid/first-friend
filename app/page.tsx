import { getAnimalsWithPhotoCounts } from "../lib/public-data";
import { HomeAnimalFeed } from "./components/HomeAnimalFeed";
import { HomeSearchFab } from "./components/HomeSearchFab";

export const dynamic="force-dynamic";

export default async function Home(){const animals=await getAnimalsWithPhotoCounts(30);return <div className="ff-page ff-home-page"><HomeAnimalFeed animals={animals}/><HomeSearchFab/></div>}
