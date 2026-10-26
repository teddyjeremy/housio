"use client";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="container-page py-24 text-center"><h1 className="font-display text-3xl font-bold text-forest">Something went wrong</h1><p className="mt-2 text-muted">Please try again. Your bookings are safe.</p><button className="btn btn-primary mt-6" onClick={reset}>Try again</button></div>;
}
