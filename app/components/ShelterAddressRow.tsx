"use client";

import { useEffect, useState } from "react";
import { IconMapLocationpinLine } from "@karrotmarket/react-monochrome-icon";
import { useAppFeedback } from "./AppFeedback";

type AddressDetails = {
  roadAddress: string | null;
  lotAddress: string | null;
  postalCode: string | null;
};

function AddressValue({ label, value, secondary = false }: { label: string; value: string; secondary?: boolean }) {
  const feedback = useAppFeedback();
  const particle = label === "우편번호" ? "를" : "을";

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      feedback.success(`${label}${particle} 복사했어요`);
    } catch {
      feedback.error(`${label}${particle} 복사하지 못했어요`);
    }
  }

  return <div className="ff-shelter-address-value" data-secondary={secondary || undefined}>
    <small>{label}</small>
    <strong>{value}</strong>
    <button type="button" className="ff-address-copy" onClick={copy} aria-label={`${label} ${value} 복사`}>복사</button>
  </div>;
}

export function ShelterAddressRow({ address, lat, lng }: { address: string; lat: number; lng: number }) {
  const [details, setDetails] = useState<AddressDetails | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q: address, lat: String(lat), lng: String(lng) });
    void fetch(`/api/maps/address-details?${params}`, { signal: controller.signal })
      .then(async (result) => result.ok ? result.json() as Promise<{ address?: AddressDetails }> : null)
      .then((result) => setDetails(result?.address || null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [address, lat, lng]);

  const roadAddress = details?.roadAddress || address;
  return <div className="ff-shelter-address-row">
    <IconMapLocationpinLine aria-hidden="true"/>
    <span>주소</span>
    <div className="ff-shelter-address-values">
      <AddressValue label="도로명" value={roadAddress}/>
      {details?.lotAddress && details.lotAddress !== roadAddress && <AddressValue label="지번" value={details.lotAddress} secondary/>}
      {details?.postalCode && <AddressValue label="우편번호" value={details.postalCode} secondary/>}
    </div>
  </div>;
}
