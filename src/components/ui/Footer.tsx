import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#F5F5F0] text-gray-500 mt-auto border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-4">
            <Link
              href="/methodology"
              className="hover:text-[#ECB421] transition-colors"
            >
              Methodology
            </Link>
            <span className="text-gray-300">|</span>
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
