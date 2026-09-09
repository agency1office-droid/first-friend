"use client";
import { useState } from "react";
import { IconChevronDownLine } from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { Chip } from "seed-design/ui/chip";

export function FavoriteFilterSheet({ triggerLabel, title, description, value, options, active, onChange, onReset }: { triggerLabel?: string; title: string; description: string; value: string; options: readonly (readonly [string, string, string])[]; active: boolean; onChange: (value: string) => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  return <BottomSheetRoot open={open} onOpenChange={setOpen}><BottomSheetTrigger asChild><Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={active || undefined}><Chip.Label>{triggerLabel ?? (title === "정렬 기준" ? value === "recent" ? "최근 등록순" : "가까운 순" : "보호 단계")}</Chip.Label><Chip.SuffixIcon><Icon svg={<IconChevronDownLine />} /></Chip.SuffixIcon></Chip.Button></BottomSheetTrigger><BottomSheetContent title={title} description={description}><BottomSheetBody className="ff-status-filter-body"><div className="ff-status-options" role="listbox" aria-label={title}>{options.map(([optionValue, label, optionDescription]) => <button className="ff-status-option" type="button" key={optionValue} role="option" aria-selected={value === optionValue} onClick={() => { onChange(optionValue); setOpen(false); }}><span><strong>{label}</strong><small>{optionDescription}</small></span>{value === optionValue && <b aria-hidden>✓</b>}</button>)}</div></BottomSheetBody>{active && <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={() => { onReset(); setOpen(false); }}>선택 해제</ActionButton></BottomSheetFooter>}</BottomSheetContent></BottomSheetRoot>;
}
