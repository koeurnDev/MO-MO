import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import './index.css'
import './App.css'

const root = document.getElementById('root');
const AppComponent = (
  <AppProvider>
    {import.meta.env.DEV ? (
      <React.StrictMode>
        <App />
      </React.StrictMode>
    ) : (
      <App />
    )}
  </AppProvider>
);

ReactDOM.createRoot(root).render(AppComponent);
