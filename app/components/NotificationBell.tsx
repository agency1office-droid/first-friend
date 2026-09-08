"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconBellLine } from "@karrotmarket/react-monochrome-icon";
import { ensureDisplayScope } from "./display-scope";

export function NotificationBell({ home = false }: { home?: boolean }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => {
      void ensureDisplayScope().then(scope => scope === "guest" ? null : fetch("/api/notifications/summary"))
        .then((response) => response?.ok ? response.json() : { unread: 0 })
        .then((body) => { if (active) setUnread(Number(body.unread) || 0); })
        .catch(() => { if (active) setUnread(0); });
    };
    load();
    window.addEventListener("ff-notifications-change", load);
    return () => { active = false; window.removeEventListener("ff-notifications-change", load); };
  }, []);

  const label = unread ? `알림 확인, 읽지 않은 알림 ${unread}개` : "알림 확인";
  return <Link prefetch={false} className={`ff-icon-link ff-notification-bell${home ? " ff-home-notification" : ""}`} href="/notifications" aria-label={label}>
    <IconBellLine aria-hidden />
    {unread > 0 && <span className="ff-notification-count" aria-hidden>{unread > 99 ? "99+" : unread}</span>}
  </Link>;
}
