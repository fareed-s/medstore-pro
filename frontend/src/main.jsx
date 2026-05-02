import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';
import store from './store';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';
import { registerSW } from './utils/pwa';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ReduxProvider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="colored" />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ReduxProvider>
  </React.StrictMode>
);

registerSW();
