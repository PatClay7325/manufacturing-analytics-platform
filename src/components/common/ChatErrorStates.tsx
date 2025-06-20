import ErrorAlert from './ErrorAlert';
import LoadingSpinner from './LoadingSpinner';

interface ChatErrorStatesProps {
  error?: string | null;
  isLoading?: boolean;
  onRetry?: () => void;
  onClearError?: () => void;
}

export function ChatErrorStates({
  error,
  isLoading,
  onRetry,
  onClearError,
}: ChatErrorStatesProps) {
  if (isLoading) {
    return (
      <div className="flex justify-start mb-4">
        <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-2">
          <LoadingSpinner size="sm" message="Thinking..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4">
        <ErrorAlert
          title="Chat Error"
          message={error}
          onRetry={onRetry}
          onDismiss={onClearError}
          type="error"
        />
      </div>
    );
  }

  return null;
}

interface NetworkErrorProps {
  onRetry?: () => void;
}

export function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <div className="flex justify-center mb-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
        <div className="flex items-center space-x-3">
          <svg
            className="h-5 w-5 text-red-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h?.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Connection Error
            </h3>
            <p className="text-sm text-red-600 mt-1">
              Unable to connect to the AI service. Please check your connection and try again.
            </p>
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center px-3 py-1 text-xs font-medium text-red-800 bg-red-100 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RateLimitErrorProps {
  retryAfter?: number;
}

export function RateLimitError({ retryAfter }: RateLimitErrorProps) {
  return (
    <div className="flex justify-center mb-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
        <div className="flex items-center space-x-3">
          <svg
            className="h-5 w-5 text-yellow-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h?.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Rate Limit Reached
            </h3>
            <p className="text-sm text-yellow-600 mt-1">
              You've sent too many messages. 
              {retryAfter ? `Please wait ${retryAfter} seconds before trying again.` : 'Please wait a moment before sending another message.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatErrorStates;