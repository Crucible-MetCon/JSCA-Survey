import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-[#F5F5F0] text-[#1B2A4A] border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/jcsa-logo.svg"
            alt="Jewellery Council of South Africa"
            width={48}
            height={48}
            className="h-12 w-auto"
            priority
          />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/methodology"
            className="text-gray-600 hover:text-[#ECB421] transition-colors"
          >
            Methodology
          </Link>
          <Link
            href="/results"
            className="text-gray-600 hover:text-[#ECB421] transition-colors"
          >
            Results
          </Link>
          <Link
            href="/admin"
            className="text-gray-600 hover:text-[#ECB421] transition-colors"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
