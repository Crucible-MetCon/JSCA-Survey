import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-[#1B2A4A] text-white">
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
          <div>
            <span className="text-lg font-semibold tracking-tight">JCSA</span>
            <span className="hidden sm:inline text-sm text-gray-300 ml-2">
              Quarterly Industry Survey
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/methodology"
            className="text-gray-300 hover:text-[#ECB421] transition-colors"
          >
            Methodology
          </Link>
          <Link
            href="/results"
            className="text-gray-300 hover:text-[#ECB421] transition-colors"
          >
            Results
          </Link>
        </nav>
      </div>
    </header>
  );
}
