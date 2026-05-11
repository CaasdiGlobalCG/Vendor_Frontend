import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

const CandidateAuthContext = createContext(null);

// Cognito configuration - these should come from environment variables
const poolData = {
  UserPoolId: import.meta.env.VITE_CANDIDATE_COGNITO_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
  ClientId: import.meta.env.VITE_CANDIDATE_COGNITO_CLIENT_ID || 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
};

const userPool = new CognitoUserPool(poolData);

export function CandidateAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const cognitoUser = userPool.getCurrentUser();
    
    if (cognitoUser) {
      cognitoUser.getSession((err, session) => {
        if (err) {
          console.error('Session error:', err);
          setUser(null);
          setLoading(false);
          return;
        }

        if (session.isValid()) {
          // Get user attributes
          cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
              console.error('Error getting attributes:', err);
              setUser(null);
              setLoading(false);
              return;
            }

            const userAttributes = {};
            attributes.forEach(attr => {
              userAttributes[attr.Name] = attr.Value;
            });

            setUser({
              username: cognitoUser.getUsername(),
              email: userAttributes.email,
              firstName: userAttributes.given_name,
              lastName: userAttributes.family_name,
              phone: userAttributes.phone_number,
              emailVerified: userAttributes.email_verified === 'true',
              session: session,
              cognitoUser: cognitoUser,
            });
            setLoading(false);
          });
        } else {
          setUser(null);
          setLoading(false);
        }
      });
    } else {
      setUser(null);
      setLoading(false);
    }
  };

  const signup = async ({ email, password, firstName, lastName, phone }) => {
    setError(null);

    const attributeList = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'given_name', Value: firstName }),
      new CognitoUserAttribute({ Name: 'family_name', Value: lastName }),
    ];

    if (phone) {
      attributeList.push(new CognitoUserAttribute({ Name: 'phone_number', Value: phone }));
    }

    return new Promise((resolve, reject) => {
      userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) {
          setError(err.message);
          reject(err);
          return;
        }
        resolve(result.user);
      });
    });
  };

  const confirmSignup = async (username, code) => {
    setError(null);

    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          setError(err.message);
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  };

  const login = async (email, password) => {
    setError(null);

    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session) => {
          // Get user attributes after successful login
          cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
              setError(err.message);
              reject(err);
              return;
            }

            const userAttributes = {};
            attributes.forEach(attr => {
              userAttributes[attr.Name] = attr.Value;
            });

            const userData = {
              username: cognitoUser.getUsername(),
              email: userAttributes.email,
              firstName: userAttributes.given_name,
              lastName: userAttributes.family_name,
              phone: userAttributes.phone_number,
              emailVerified: userAttributes.email_verified === 'true',
              session: session,
              cognitoUser: cognitoUser,
            };

            setUser(userData);
            resolve(userData);
          });
        },
        onFailure: (err) => {
          setError(err.message);
          reject(err);
        },
        newPasswordRequired: (userAttributes) => {
          // Handle new password required scenario
          reject(new Error('New password required'));
        },
      });
    });
  };

  const logout = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    setUser(null);
  };

  const forgotPassword = async (email) => {
    setError(null);

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.forgotPassword({
        onSuccess: (result) => {
          resolve(result);
        },
        onFailure: (err) => {
          setError(err.message);
          reject(err);
        },
      });
    });
  };

  const confirmPassword = async (email, code, newPassword) => {
    setError(null);

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          setError(err.message);
          reject(err);
        },
      });
    });
  };

  const resendConfirmationCode = async (username) => {
    setError(null);

    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          setError(err.message);
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  };

  const getIdToken = () => {
    if (!user || !user.session) {
      return null;
    }
    return user.session.getIdToken().getJwtToken();
  };

  const value = {
    user,
    loading,
    error,
    signup,
    confirmSignup,
    login,
    logout,
    forgotPassword,
    confirmPassword,
    resendConfirmationCode,
    getIdToken,
    isAuthenticated: !!user,
  };

  return (
    <CandidateAuthContext.Provider value={value}>
      {children}
    </CandidateAuthContext.Provider>
  );
}

export function useCandidateAuth() {
  const context = useContext(CandidateAuthContext);
  if (!context) {
    throw new Error('useCandidateAuth must be used within CandidateAuthProvider');
  }
  return context;
}
