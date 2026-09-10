export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} Berrypink Showcase & Admin System. Built with Next.js, Tailwind CSS & Supabase.
        </p>
      </div>
    </footer>
  );
}
