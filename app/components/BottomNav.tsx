const items = [
  { href: "/", icon: "⌂", label: "홈" },
  { href: "/find", icon: "⌕", label: "찾기" },
  { href: "/stories", icon: "◌", label: "이야기" },
  { href: "/mypage", icon: "♙", label: "나의 페이지" },
];

export function BottomNav() {
  return <nav className="bottom-nav" aria-label="주요 메뉴">
    {items.map((item) => <a className="nav-item" href={item.href} key={item.href}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></a>)}
  </nav>;
}
