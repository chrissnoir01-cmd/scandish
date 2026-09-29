"use client";

import { QRCodeSVG } from "qrcode.react";

/** A real, scannable QR code (opens scandish.online) printed on the table card illustration. */
export default function TableCardQr() {
  return <QRCodeSVG value="https://scandish.online/?s=qr" size={112} bgColor="#ffffff" fgColor="#1d1712" level="M" aria-label="QR code for scandish.online" />;
}
