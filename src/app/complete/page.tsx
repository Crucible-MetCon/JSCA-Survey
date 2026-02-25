'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';

function CompletionContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  if (!code) {
    return (
      <div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md text-center">
          <p className="text-gray-600 mb-4">No receipt code found.</p>
          <Link href="/" className="text-[#1B2A4A] underline hover:text-[#ECB421]">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)] flex items-center justify-center">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Image
            src="/jcsa-logo.svg"
            alt="JCSA Logo"
            width={60}
            height={60}
            className="mx-auto mb-6"
          />

          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[#1B2A4A] mb-2">
            Thank You!
          </h1>
          <p className="text-gray-600 mb-6">
            Your survey response has been submitted successfully.
          </p>

          {/* Receipt Code */}
          <div className="bg-[#F5F5F0] rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Your Receipt Code</p>
            <p className="font-mono text-xl font-bold text-[#1B2A4A] mb-4 break-all">
              {code}
            </p>
            <button
              onClick={handleCopy}
              className="bg-[#ECB421] text-[#1B2A4A] font-semibold px-6 py-2 rounded-lg hover:bg-[#d9a31e] transition-colors text-sm"
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800 font-medium">
              Save this code now. It cannot be retrieved later.
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Use this code to access aggregated results at any time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/results?code=${encodeURIComponent(code)}`}
              className="bg-[#1B2A4A] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#2a3d5e] transition-colors"
            >
              View Results
            </Link>
            <Link
              href="/"
              className="border border-gray-300 text-[#1B2A4A] px-6 py-3 rounded-lg text-sm font-medium hover:border-[#ECB421] transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense fallback={<div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)] flex items-center justify-center"><p>Loading...</p></div>}>
      <CompletionContent />
    </Suspense>
  );
}
