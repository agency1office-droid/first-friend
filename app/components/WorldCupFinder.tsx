"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";

const choices=[
  {emoji:"🐕",label:"햇살 운동가",tags:["강아지","활발","산책"]},
  {emoji:"🐈",label:"조용한 관찰자",tags:["고양이","차분","실내"]},
  {emoji:"🐶",label:"폭신한 애교쟁이",tags:["강아지","복슬","사람좋아"]},
  {emoji:"🐱",label:"도도한 장난꾸러기",tags:["고양이","큰눈","놀이"]},
  {emoji:"🐕‍🦺",label:"든든한 동행자",tags:["강아지","중대형","차분"]},
  {emoji:"🐈‍⬛",label:"신비로운 친구",tags:["고양이","검정","독립적"]},
  {emoji:"🐾",label:"작고 용감한 친구",tags:["소형","어린 친구","호기심"]},
  {emoji:"💛",label:"나이보다 마음",tags:["성견성묘","차분","교감"]},
];

export function WorldCupFinder(){
  const[round,setRound]=useState(choices),[pair,setPair]=useState(0),[winners,setWinners]=useState<typeof choices>([]),[history,setHistory]=useState<string[][]>([]);
  const current=round.slice(pair,pair+2),done=round.length===1,tags=useMemo(()=>Array.from(new Set(history.flat())).slice(0,6),[history]),progress=Math.min(100,history.length/7*100);
  function pick(item:typeof choices[number]){const nextW=[...winners,item],nextPair=pair+2;setHistory(value=>[...value,item.tags]);if(nextPair>=round.length){setRound(nextW);setWinners([]);setPair(0)}else{setWinners(nextW);setPair(nextPair)}}
  function reset(){setRound(choices);setPair(0);setWinners([]);setHistory([])}
  if(done)return <div className="ff-worldcup-result" aria-live="polite"><div className="ff-worldcup-emoji" aria-hidden>{round[0].emoji}</div><div className="ff-kicker">7번의 선택으로 찾은 나의 취향</div><h2>{round[0].label}</h2><p className="ff-description">선택 결과를 보호 중인 친구의 특징과 연결했어요.</p><div className="ff-tags">{tags.map(tag=><span className="ff-tag" key={tag}>{tag}</span>)}</div><ActionButton asChild size="large"><a href={`/find/conditions?worldcup=${encodeURIComponent(tags.join(","))}`}>이 태그로 보호동물 보기</a></ActionButton><ActionButton variant="neutralWeak" onClick={reset}>처음부터 다시 하기</ActionButton></div>;
  return <div className="ff-worldcup"><div className="ff-kicker">고민하지 말고 더 끌리는 쪽</div><h2>{round.length}강 · {Math.floor(pair/2)+1}번째 선택</h2><div className="ff-worldcup-progress" role="progressbar" aria-label="이상형 월드컵 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{width:`${progress}%`}}/></div><p className="ff-meta" aria-live="polite">전체 7번 중 {history.length+1}번째 선택 · 선택할수록 추천 태그가 정교해져요</p><div className="ff-worldcup-pair">{current.map(item=><button type="button" key={item.label} onClick={()=>pick(item)} aria-label={`${item.label} 선택, ${item.tags.join(", ")}`}><span aria-hidden>{item.emoji}</span><strong>{item.label}</strong><small>{item.tags.join(" · ")}</small></button>)}</div></div>
}
