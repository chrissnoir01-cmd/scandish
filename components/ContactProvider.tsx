"use client";

import { createContext, useContext } from "react";
import { DEFAULT_CONTACT, type ContactInfo } from "@/lib/settings";

const ContactContext = createContext<ContactInfo>(DEFAULT_CONTACT);

/** Makes ScanDish's current contact details (MasterAdmin → Settings) available to interactive screens. */
export function ContactProvider({ value, children }: { value: ContactInfo; children: React.ReactNode }) {
  return <ContactContext.Provider value={value}>{children}</ContactContext.Provider>;
}

export const useContact = () => useContext(ContactContext);
