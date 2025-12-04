
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';
import { useSignIn } from '@clerk/clerk-react';

const SignIn = () => {
    const { isLoaded, signIn, setActive } = useSignIn();
    const navigate = useNavigate();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const result = await signIn.create({
                identifier: username, // Use username as identifier
                password,
            });

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });

                // Fetch user data from your API and store in localStorage
                try {
                    const userResponse = await fetch(`http://localhost:5000/api/users/${username}`);
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        localStorage.setItem('user', JSON.stringify(userData.user));
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }

                // Use navigate instead of window.location.href to prevent full page reload
                navigate('/dashboard');
            } else {
                console.log('Additional steps needed:', result);
            }
        } catch (err) {
            console.error('Error signing in:', err);
            alert('Sign in failed. Please check your credentials.');
        }
    };

    return (
        <div className="auth-page-wrapper">
            <div className="auth-container">
                <div className="auth-header">
                    <h2>Welcome Back</h2>
                    <p>Please enter your details to sign in</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            className="form-input"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input type="checkbox" />
                            Remember me
                        </label>
                        <a href="#" className="forgot-password">Forgot Password?</a>
                    </div>

                    <button type="submit" className="submit-btn">Sign In</button>
                </form>

                <div className="auth-footer">
                    Don't have an account?
                    <Link to="/signup" className="auth-link">Sign up</Link>
                </div>
            </div>
        </div>
    );
};

export default SignIn;
