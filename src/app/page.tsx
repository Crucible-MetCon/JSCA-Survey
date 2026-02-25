import Link from 'next/link';
import Image from 'next/image';
import { SECTOR_LABELS } from '@/types';
import type { Sector } from '@/types';

const SECTOR_ICONS: Record<Sector, React.ReactNode> = {
  manufacturers: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M2 20h20M5 20V8l5-4v16M10 20V4l9 4v12M10 8h1M10 12h1M14 8h1M14 12h1M14 16h1M5 12h1M5 16h1" />
    </svg>
  ),
  retailers: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M3 9l1-4h16l1 4M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M9 21V13h6v8" />
      <circle cx="6.5" cy="9" r="2" /><circle cx="12" cy="9" r="2" /><circle cx="17.5" cy="9" r="2" />
    </svg>
  ),
  wholesalers_importers: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  ),
  diamond_dealers: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M6 3h12l4 6-10 13L2 9l4-6zM2 9h20M12 22L6 9M12 22l6-13M12 3l-4 6M12 3l4 6" />
    </svg>
  ),
  refiners: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M12 12c2-2.96 0-7-1-8 0 3.04-4 6.04-4 8a5 5 0 1010 0c0-1.96-1-3-2-4-.5 1.5-1 2-3 4z" />
      <path d="M8 21h8M10 21v-3a2 2 0 014 0v3" />
    </svg>
  ),
};

const SECTORS: { key: Sector; description: string }[] = [
  { key: 'manufacturers', description: 'Jewellery manufacturers and workshops' },
  { key: 'retailers', description: 'Retail jewellery stores and online sellers' },
  { key: 'wholesalers_importers', description: 'Wholesalers, importers, and distributors' },
  { key: 'diamond_dealers', description: 'Diamond dealers and traders' },
  { key: 'refiners', description: 'Precious metal refiners and processors' },
];

export default function HomePage() {
  return (
    <div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)]">
      {/* Hero */}
      <section className="bg-[#F5F5F0] text-[#1B2A4A] py-16 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Image
            src="/jcsa-logo.svg"
            alt="JCSA Logo"
            width={80}
            height={80}
            className="mx-auto mb-6"
            priority
          />
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Quarterly Industry Survey
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-2">
            Help shape the future of the South African jewellery industry.
            Your anonymous responses provide vital insights for the sector.
          </p>
          <p className="text-sm text-gray-500">
            Estimated time: 10–15 minutes &middot; Fully anonymous &middot; No
            identifying information collected
          </p>
        </div>
      </section>

      {/* Sector Selection */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-[#1B2A4A] mb-2 text-center">
          Select Your Sector
        </h2>
        <p className="text-gray-600 text-center mb-8">
          Choose the sector that best describes your business to begin the survey.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTORS.map(({ key, description }) => (
            <Link
              key={key}
              href={`/methodology?sector=${key}`}
              className="block bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-[#ECB421] hover:shadow-md transition-all group"
            >
              <div className="text-[#1B2A4A] group-hover:text-[#ECB421] transition-colors mb-3">
                {SECTOR_ICONS[key]}
              </div>
              <h3 className="text-lg font-semibold text-[#1B2A4A] group-hover:text-[#ECB421] transition-colors mb-2">
                {SECTOR_LABELS[key]}
              </h3>
              <p className="text-sm text-gray-600">{description}</p>
            </Link>
          ))}
        </div>

        {/* Info box */}
        <div className="mt-10 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-[#1B2A4A] mb-3">
            About This Survey
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-[#ECB421] font-bold">&#10003;</span>
              <span>Completely anonymous — no names, emails, or company identifiers collected</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#ECB421] font-bold">&#10003;</span>
              <span>All questions offer &quot;Prefer not to answer&quot; as an option</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#ECB421] font-bold">&#10003;</span>
              <span>Data reported only in aggregated form with k-anonymity protection</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#ECB421] font-bold">&#10003;</span>
              <span>Receive a receipt code to verify your participation and access results</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
