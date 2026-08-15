"use client";

import { useRef } from "react";
import { IconPhoneLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";

export function ShelterPhoneDialog({ shelter, phone }: { shelter: string; phone: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tel = phone.replace(/[^0-9+]/g, "");

  function handleClick() {
    if (window.matchMedia("(min-width: 521px)").matches) {
      dialogRef.current?.showModal();
      return;
    }
    window.location.href = `tel:${tel}`;
  }

  return <>
    <button type="button" className="ff-detail-contact-link" onClick={handleClick} aria-label={`${shelter} 전화번호 보기`}>
      <IconPhoneLine aria-hidden />
    </button>
    <dialog ref={dialogRef} className="ff-phone-dialog" aria-labelledby="shelter-phone-title">
      <div className="ff-phone-dialog-card">
        <button type="button" className="ff-phone-dialog-close" onClick={() => dialogRef.current?.close()} aria-label="전화번호 안내 닫기">
          <IconXmarkLine aria-hidden />
        </button>
        <p className="ff-phone-dialog-label">보호소 전화번호</p>
        <h2 id="shelter-phone-title">{shelter}</h2>
        <a className="ff-phone-dialog-number" href={`tel:${tel}`}>{phone}</a>
        <p className="ff-phone-dialog-help">PC에서는 아래 번호로 직접 전화해 주세요.</p>
      </div>
    </dialog>
  </>;
}
