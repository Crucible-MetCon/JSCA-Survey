import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1B2A4A] text-gray-400 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-4">
            <Link
              href="/methodology"
              className="hover:text-[#ECB421] transition-colors"
            >
              Methodology
            </Link>
            <span className="text-gray-600">|</span>
            <a
              href="https://www.jewellery.org.za"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#ECB421] transition-colors"
            >
              jewellery.org.za
            </a>
          </div>
          <p>&copy; {year} Jewellery Council of South Africa. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
