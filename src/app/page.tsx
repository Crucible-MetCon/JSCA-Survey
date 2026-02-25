import Link from 'next/link';
import Image from 'next/image';
import { SECTOR_LABELS } from '@/types';
import type { Sector } from '@/types';

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
      <section className="bg-[#1B2A4A] text-white py-16">
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
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-2">
            Help shape the future of the South African jewellery industry.
            Your anonymous responses provide vital insights for the sector.
          </p>
          <p className="text-sm text-gray-400">
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
