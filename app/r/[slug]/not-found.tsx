import Link from "next/link";

export default function RestaurantNotFound() {
  return (
    <main className="min-h-screen bg-[#fff8f5] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-[#f2ddd6] rounded-3xl shadow-sm p-8 text-center">
        <div className="text-5xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-3 text-gray-600">
          The page you are looking for may have been removed or the QR link is incorrect.
        </p>
        <Link href="/" className="mt-6 inline-block font-semibold text-[#f08c6c]">
          Go to ScanDish
        </Link>
      </div>
    </main>
  );
}
