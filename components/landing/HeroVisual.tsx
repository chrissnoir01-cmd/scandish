import Image from "next/image";
import { Search, Star } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import TableCardQr from "./TableCardQr";

const DISHES = [
  { name: "Sticky chicken wings", note: "Honey-chilli glaze", price: "7,500", img: "/images/food2.jpg", pick: true },
  { name: "Beef brochettes", note: "Charcoal-grilled, plantain", price: "6,000", img: "/images/goat.png" },
  { name: "Wood-fired pizza", note: "Tomato, mozzarella, sausage", price: "9,000", img: "/images/fries.jpg" },
  { name: "Market salad", note: "From local farms", price: "4,500", img: "/images/juice.jpg" },
];

/** The hero picture: a phone showing a menu page, and the printed QR card that opens it. Pure markup. */
export default function HeroVisual() {
  return (
    // On phones the whole picture (phone + card) is scaled down to ~¾ so it fits the screen comfortably.
    <div className="relative mx-auto h-[720px] w-[440px] max-w-none max-sm:[zoom:0.74] sm:h-[600px] sm:w-full sm:max-w-[440px]" aria-hidden>
      {/* Phone */}
      <div className="absolute right-0 top-0 w-[270px] rotate-[2deg] rounded-[2.6rem] border-[9px] border-[#1d1712] bg-[#1d1712] shadow-[0_40px_80px_-30px_rgba(29,23,18,0.55)] sm:w-[290px]">
        <div className="absolute left-1/2 top-1.5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1d1712]" />
        <div className="relative overflow-hidden rounded-[2rem] bg-white">
          <div className="relative h-36">
            <Image src="/images/food2.jpg" alt="" fill sizes="290px" className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-end gap-2.5 text-white">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                <Image src="/images/kigali-grill.png" alt="" fill sizes="40px" className="object-cover" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold leading-tight">Kigali Delicious</span>
                <span className="block text-[11px] text-white/80">Grill · Kimihurura</span>
              </span>
            </div>
          </div>
          <div className="px-3.5 pb-4 pt-3">
            <div className="flex items-center gap-2 rounded-lg bg-[#f4efe8] px-2.5 py-2 text-[11px] text-[#8a7e73]">
              <Search className="h-3.5 w-3.5" /> Search the menu
            </div>
            <div className="mt-3 flex gap-1.5 text-[11px] font-medium">
              {["Grill", "Pizza", "Salads", "Drinks"].map((c, i) => (
                <span key={c} className={`rounded-full px-2.5 py-1 ${i === 0 ? "bg-[#1d1712] text-white" : "bg-[#f4efe8] text-[#6f645a]"}`}>
                  {c}
                </span>
              ))}
            </div>
            <ul className="mt-3 space-y-2.5">
              {DISHES.map((d) => (
                <li key={d.name} className="flex items-center gap-2.5">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                    <Image src={d.img} alt="" fill sizes="48px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 truncate text-[12px] font-semibold text-[#1d1712]">
                      {d.name}
                      {d.pick && <Star className="h-3 w-3 fill-[#f08c6c] text-[#f08c6c]" />}
                    </span>
                    <span className="block truncate text-[10.5px] text-[#8a7e73]">{d.note}</span>
                  </span>
                  <span className="text-[11.5px] font-semibold text-[#b8502f]">{d.price}</span>
                </li>
              ))}
            </ul>
          </div>
          <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg">
            <FaWhatsapp className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* Printed table card */}
      {/* On narrow screens it sits below the phone so it never hides the dishes. */}
      <div className="absolute bottom-0 left-0 w-[190px] -rotate-[5deg] sm:bottom-6">
        <div className="rounded-t-xl border border-[#e4d9cc] bg-white px-4 pb-4 pt-5 text-center shadow-[0_30px_50px_-25px_rgba(29,23,18,0.45)]">
          <p className="font-display text-[15px] font-semibold text-[#1d1712]">Kigali Delicious</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#8a7e73]">Scan for the menu</p>
          <div className="mx-auto mt-3 w-fit rounded-lg border border-[#efe6db] p-2">
            <TableCardQr />
          </div>
          <p className="mt-2.5 text-[9px] text-[#8a7e73]">powered by ScanDish</p>
        </div>
        {/* card stand */}
        <div className="mx-auto h-3 w-[86%] rounded-b-md bg-[#d9cbbb]" />
      </div>
    </div>
  );
}
