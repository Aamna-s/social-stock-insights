import React from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';
import { useSignUp } from '@clerk/clerk-react';
const SignUp = () => {
    const { isLoaded, signUp, setActive } = useSignUp();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [pendingVerification, setPendingVerification] = React.useState(false);
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [pic, setPic] = React.useState(null);

    const convertBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload = () => {
                resolve(fileReader.result);
            };
            fileReader.onerror = (error) => {
                reject(error);
            };
        });
    };

    const post = async (username, password, firstName, lastName, pic) => {
        let base64Pic = '';
        if (pic) {
            try {
                base64Pic = await convertBase64(pic);
            } catch (error) {
                console.error("Error converting image to base64:", error);
            }
        }

        const data = {
            username: username,
            password: password,
            firstName: firstName,
            lastName: lastName,
            profilePicture: base64Pic
        };

        try {
            const response = await fetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.statusText}`);
            }

            console.log('Data posted successfully');
        } catch (error) {
            console.error('Error posting data:', error);
            alert('Failed to save user data to backend');
        }
    };
    const handleSignUp = async (e) => {
        e.preventDefault();

        if (!isLoaded) return;

        try {
            const result = await signUp.create({
                username,
                password
            });
            if (result.status === 'complete') {
                // Post data to backend before setting active session to avoid unmounting issues
                await post(username, password, firstName, lastName, pic);

                // Fetch user data from API and store in localStorage (consistent with SignIn.js)
                try {
                    const userResponse = await fetch(`http://localhost:5000/api/users/${username}`);
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        // Handle both possible structures (userData.user or just userData)
                        const userToSave = userData.user || userData;
                        localStorage.setItem('user', JSON.stringify(userToSave));
                        console.log('User data stored in localStorage:', userToSave);
                    }
                } catch (error) {
                    console.error('Error fetching user data for localStorage:', error);
                }

                await setActive({ session: result.createdSessionId });
                window.location.href = '/dashboard';
            } else {
                console.log('Sign up status:', result.status);
                // Handle any other status if needed
            }

        } catch (err) {
            console.error('Error signing up:', err);
            alert('Sign up failed. Please try again.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-header">
                <h2>Create Account</h2>
                <p>Join us and start your journey today</p>
            </div>

            <form className="auth-form" onSubmit={handleSignUp}>
                <div className="form-group">
                    <label htmlFor="first-name">First Name</label>
                    <input
                        type="text"
                        id="first-name"
                        className="form-input"
                        placeholder="Enter your full name"
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="last-name">Last Name</label>
                    <input
                        type="text"
                        id="last-name"
                        className="form-input"
                        placeholder="Enter your last name"
                        onChange={(e) => setLastName(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="profile-pic">Profile Picture</label>
                    <input
                        type="file"
                        id="profile-pic"
                        accept="image/*"
                        onChange={(e) => setPic(e.target.files[0])}
                        style={{ color: 'white' }}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        className="form-input"
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        className="form-input"
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="confirm-password">Confirm Password</label>
                    <input
                        type="password"
                        id="confirm-password"
                        className="form-input"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                    />
                </div>

                <button type="submit" className="submit-btn">Sign Up</button>
            </form>

            <div className="auth-footer">
                Already have an account?
                <Link to="/signin" className="auth-link">Sign in</Link>
            </div>
        </div>
    );
};

export default SignUp;
