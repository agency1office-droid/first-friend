"use client";
import { Analytics } from "@vercel/analytics/react";

export function ServiceAnalytics() {
  return <Analytics beforeSend={event => {
    const url = new URL(event.url);
    if (!["www.firstfriend.me", "firstfriend.me", "first-friend.vercel.app"].includes(url.hostname)
      || /^\/(api|operations|applications|family|mypage|verification|appeal|login|email)(\/|$)/.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  }} />;
}
