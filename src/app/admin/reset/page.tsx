'use client';

import { useState } from 'react';

export default function ResetPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    answers: number;
    receipt_codes: number;
    submissions: number;
    aggregates_cache: number;
  } | null>(null);

  const confirmationMatch = confirmation === 'DELETE ALL SURVEY DATA';

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmationMatch || !password) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmation }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Reset failed');
      }

      const data = await res.json();
      setSuccess(data.deleted);
      setPassword('');
      setConfirmation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-2">
        Reset Database
      </h1>
      <p className="text-gray-600 mb-6">Testing Only</p>

      <div className="max-w-lg">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Warning</h2>
          <p className="text-sm text-red-700 mb-2">
            This action will permanently delete all:
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            <li>Survey submissions</li>
            <li>Survey answers</li>
            <li>Receipt codes</li>
            <li>Aggregation cache</li>
          </ul>
          <p className="text-sm text-red-700 mt-2">
            This does <strong>NOT</strong> delete: admin users, audit logs, survey definitions, or questions.
          </p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-green-700 mb-2">Reset Complete</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>Submissions deleted: {success.submissions}</li>
              <li>Answers deleted: {success.answers}</li>
              <li>Receipt codes deleted: {success.receipt_codes}</li>
              <li>Cache entries deleted: {success.aggregates_cache}</li>
            </ul>
          </div>
        )}

        <form onSubmit={handleReset} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 mb-1">
              Re-enter your admin password
            </label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#ECB421] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="reset-confirmation" className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="font-mono font-bold">DELETE ALL SURVEY DATA</span> to confirm
            </label>
            <input
              id="reset-confirmation"
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none font-mono ${
                confirmation && !confirmationMatch
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-[#ECB421]'
              }`}
              placeholder="DELETE ALL SURVEY DATA"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !confirmationMatch || !password}
            className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting...' : 'Reset All Survey Data'}
          </button>
        </form>
      </div>
    </div>
  );
}
