import Link from "next/link";
import { IconCheckmarkClipboardLine, IconHeartLine, IconHospitalcrossBuildingLine, IconHousePlusLine, IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";

const shortcuts = [
  { href: "/lost-found/animals", label: "실종 동물", icon: <IconMagnifyingglassLine aria-hidden/> },
  { href: "/shelters", label: "보호소", icon: <IconHospitalcrossBuildingLine aria-hidden/> },
  { href: "/readiness", label: "입양 준비", icon: <IconCheckmarkClipboardLine aria-hidden/> },
  { href: "/foster", label: "임시 보호", icon: <IconHousePlusLine aria-hidden/> },
  { href: "/support", label: "후원하기", icon: <IconHeartLine aria-hidden/> },
];

export function HomeShortcuts() {
  return <nav className="ff-home-shortcuts" aria-label="바로가기">
    {shortcuts.map(({ href, label, icon }) => <Link className="ff-home-shortcut" key={href} href={href}>
      <span className="ff-home-shortcut-icon">{icon}</span>{label}
    </Link>)}
  </nav>;
}
