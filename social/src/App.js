import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import CreatePost from './components/CreatePost';
import MyPosts from './components/MyPosts';
import './App.css';

function App() {
  const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

  if (!clerkPubKey) {
    return <div>Missing Publishable Key</div>;
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey} sessionOptions={{
      expiry: 60 * 60 * 24, // 24 hours instead of default
      idle: 60 * 60 * 2, // 2 hours idle timeout
    }} clerkJSVariant="headless"
    >
      <Router>
        <div className="App">
          <Routes>
            <Route path="/signin" element={
              <SignedOut>
                <SignIn />
              </SignedOut>
            } />
            <Route path="/signup" element={
              <SignedOut>
                <SignUp />
              </SignedOut>
            } />
            <Route
              path="/dashboard"
              element={
                <SignedIn>
                  <Dashboard />
                </SignedIn>
              }
            />
            <Route
              path="/create-post"
              element={
                <SignedIn>
                  <CreatePost />
                </SignedIn>
              }
            />
            <Route
              path="/my-posts"
              element={
                <SignedIn>
                  <MyPosts />
                </SignedIn>
              }
            />
            <Route
              path="/"
              element={
                <>
                  <SignedIn>
                    <Navigate to="/dashboard" replace />
                  </SignedIn>
                  <SignedOut>
                    <Navigate to="/signin" replace />
                  </SignedOut>
                </>
              }
            />
            {/* Catch all for protected routes */}
            <Route
              path="*"
              element={
                <SignedIn>
                  <Navigate to="/dashboard" replace />
                </SignedIn>
              }
            />
          </Routes>
        </div>
      </Router>
    </ClerkProvider>
  );
}

export default App;
