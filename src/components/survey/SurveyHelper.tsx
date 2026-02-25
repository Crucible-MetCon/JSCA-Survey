// TODO: Implement LLM Survey Helper in a future phase.
// This component will provide an AI-powered chat assistant
// to help respondents understand survey questions.

export default function SurveyHelper() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        disabled
        className="w-12 h-12 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center cursor-not-allowed opacity-50"
        title="AI Survey Helper (coming soon)"
        aria-label="AI Survey Helper (coming soon)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>
    </div>
  );
}
