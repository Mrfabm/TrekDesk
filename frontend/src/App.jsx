import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
          Something went wrong
        </h2>
        <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
          {error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Router>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App; 