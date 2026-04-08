import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚀 Premium Error Recovery:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-app flex items-center justify-center p-6 text-center">
          <div className="bg-bg-surface p-8 rounded-[32px] shadow-2xl border border-border-subtle max-w-sm w-full animate-in">
            <div className="text-6xl mb-6">🛠️</div>
            <h2 className="text-2xl font-black text-bold mb-2">មានបញ្ហាបន្តិចបន្តួច!</h2>
            <p className="text-sm font-bold text-muted mb-8 italic">
              Oops! Something went wrong behind the scenes.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-primary-accent text-white font-black rounded-2xl shadow-lg active:scale-95 transition-transform"
              >
                ព្យាយាមម្តងទៀត / Retry
              </button>
              <button 
                onClick={() => this.setState({ hasError: false })}
                className="w-full py-3 bg-bg-soft text-bold font-bold rounded-2xl active:scale-95 transition-transform"
              >
                ត្រលប់ក្រោយ / Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
