"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip } from "seed-design/ui/chip";
import type { Animal } from "../../lib/data";
import { AnimalCard } from "./AnimalCard";

export function HomeAnimalFeed({animals}:{animals:Animal[]}){
  const[region,setRegion]=useState(""),[species,setSpecies]=useState("전체");
  useEffect(()=>{const update=(event?:Event)=>{const custom=event as CustomEvent<string>|undefined;setRegion(custom?.detail||window.localStorage.getItem("ff-home-region")||"")};update();window.addEventListener("ff-region-change",update);return()=>window.removeEventListener("ff-region-change",update)},[]);
  const visible=useMemo(()=>animals.filter(animal=>species==="전체"||animal.species.includes(species)).sort((a,b)=>{const aNear=region&&a.region.startsWith(region.split(" ")[0])?1:0,bNear=region&&b.region.startsWith(region.split(" ")[0])?1:0;return bNear-aNear||b.updated.localeCompare(a.updated)}),[animals,region,species]);
  return <section className="ff-home-feed" id="nearby-animals" aria-labelledby="nearby-title"><header className="ff-home-feed-head"><div><div className="ff-kicker">{region?`${region} 가까운 순`:"현재 위치를 설정하면 가까운 순"}</div><h1 id="nearby-title">가족을 기다리는 친구</h1></div><a href="/find">전체 {animals.length}마리</a></header><Chip.RadioRoot value={species} onValueChange={value=>setSpecies(String(value))}>{["전체","고양이","강아지"].map(item=><Chip.RadioItem key={item} value={item}><Chip.Label>{item}</Chip.Label></Chip.RadioItem>)}</Chip.RadioRoot><div className="ff-animal-list">{visible.map(animal=><AnimalCard animal={animal} layout="row" key={animal.id}/>)}</div></section>
}
