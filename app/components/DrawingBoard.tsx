/* eslint-disable @next/next/no-img-element -- uploaded drawings use authenticated media keys */
"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";
import { sanitizeImageFile } from "../../lib/client-image";
import { useAppFeedback } from "./AppFeedback";

type Match = {
  id: number;
  animalId: string;
  reason: string;
  selected: boolean;
  points: number;
};
type Post = {
  id: number;
  title: string;
  description: string;
  imageKey: string;
  species: string;
  tagsJson: string;
  status: string;
  matches: Match[];
};

export function DrawingBoard() {
  const [posts, setPosts] = useState<Post[]>([]),
    [error, setError] = useState(""),
    feedback = useAppFeedback();
  const load = useCallback(() => {
    fetch("/api/community?type=drawings")
      .then((r) => r.json())
      .then((b) => setPosts(b.posts || []));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget,
      f = new FormData(form),
      file = f.get("drawing");
    if (!(file instanceof File) || !file.size)
      return setError("그림 파일을 선택해 주세요.");
    const upload = new FormData();
    upload.set("file", await sanitizeImageFile(file));
    upload.set("purpose", "drawing-board");
    const u = await fetch("/api/uploads", { method: "POST", body: upload });
    if (u.status === 401) {
      window.location.assign("/login?return_to=%2Fdrawings");
      return;
    }
    if (!u.ok) return setError("그림을 올리지 못했어요.");
    const imageKey = (await u.json()).key,
      r = await fetch("/api/community", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "drawing-create",
          title: f.get("title"),
          description: f.get("description"),
          species: f.get("species"),
          imageKey,
          tags: String(f.get("tags") || "").split(/[,·]/),
        }),
      });
    if (r.ok) {
      form.reset();
      feedback.success("그림 탐정 게시판에 올렸어요");
      load();
    } else setError((await r.json()).error);
  }
  async function match(e: React.FormEvent<HTMLFormElement>, postId: number) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form),
      r = await fetch("/api/community", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "drawing-match",
          postId,
          animalId: f.get("animalId"),
          reason: f.get("reason"),
        }),
      });
    if (r.status === 401) {
      window.location.assign("/login?return_to=%2Fdrawings");
      return;
    }
    if (r.ok) {
      form.reset();
      feedback.success("닮은 친구를 추천했어요");
      load();
    }
  }
  async function select(id: number) {
    const r = await fetch("/api/community", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "drawing-select", id }),
      }),
      b = await r.json();
    if (r.status === 401) {
      window.location.assign("/login?return_to=%2Fdrawings");
      return;
    }
    if (r.ok) {
      feedback.success("정답을 채택하고 탐정에게 100P를 지급했어요");
      load();
    } else feedback.error(b.error);
  }
  return (
    <>
      <section className="ff-play-card">
        <div className="ff-kicker">AI와 사람의 눈을 함께</div>
        <h2>내가 그린 첫 친구를 올려요</h2>
        <p>
          그림의 특징을 적으면 다른 회원이 퍼스트 프렌드에서 본 보호동물을 찾아
          연결해 줍니다.
        </p>
        <form className="ff-form" onSubmit={create}>
          <label className="ff-photo-drop ff-upload-compact">
            <span>그린 그림 선택</span>
            <input
              name="drawing"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
          </label>
          <select className="ff-native-select" name="species">
            <option value="cat">고양이</option>
            <option value="dog">강아지</option>
          </select>
          <TextField label="그림 제목">
            <TextFieldInput name="title" required />
          </TextField>
          <TextField label="찾고 싶은 모습">
            <TextFieldTextarea name="description" minLength={10} required />
          </TextField>
          <TextField label="특징 태그" description="예: 치즈, 큰 눈, 짧은 털">
            <TextFieldInput name="tags" />
          </TextField>
          {error && <Callout tone="critical" description={error} />}
          <ActionButton>그림 탐정단에 공개</ActionButton>
        </form>
      </section>
      <div className="ff-drawing-board">
        {posts.map((post) => (
          <article key={post.id}>
            <img src={`/media/${post.imageKey}`} alt={post.title} />
            <div>
              <span className="ff-kicker">
                {post.status === "matched" ? "매칭 성공" : "탐정단 찾는 중"}
              </span>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <div className="ff-tags">
                {(JSON.parse(post.tagsJson || "[]") as string[]).map((tag) => (
                  <span className="ff-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <form className="ff-form" onSubmit={(e) => match(e, post.id)}>
                <TextField label="닮은 보호동물 공고번호">
                  <TextFieldInput name="animalId" required />
                </TextField>
                <TextField label="닮았다고 생각한 이유">
                  <TextFieldInput name="reason" minLength={5} required />
                </TextField>
                <ActionButton size="small">이 친구 같아요</ActionButton>
              </form>
              {post.matches.map((item) => (
                <div className="ff-match-answer" key={item.id}>
                  <a href={`/friends/${item.animalId}`}>
                    <strong>
                      {item.selected ? "🏆 채택 · " : ""}
                      {item.animalId}
                    </strong>
                    <span>
                      {item.reason}
                      {item.points ? ` · +${item.points}P` : ""}
                    </span>
                  </a>
                  {!item.selected && (
                    <button type="button" onClick={() => select(item.id)}>
                      정답 채택 +100P
                    </button>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
