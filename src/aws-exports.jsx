// export const awsExports = {
//     "REGION" : "us-east-1",
//     "USER_POOL_ID": "us-east-1_R522GNFpq",
//     "USER_POOL_APP_CLIENT_ID": "4k2rtnhvl9v22eakb5p6l8uj6k",
//     "oauth": {
//     "domain": "us-east-1r522gnfpq.auth.us-east-1.amazoncognito.com", // e.g., "myapp-auth.auth.us-east-1.amazoncognito.com"
//     "scope": ["email", "profile", "openid"],
//     "redirectSignIn": "http://localhost:3000/",
//     "redirectSignOut": "http://localhost:3000/",
//     "responseType": "code"
//   },
//   "federationTarget": "COGNITO_USER_POOLS"
// };


// const awsExports = {
//   REGION: "us-east-1",
//   USER_POOL_ID: "us-east-1_R522GNFpq",
//   USER_POOL_APP_CLIENT_ID: "4k2rtnhvl9v22eakb5p6l8uj6k",
//   oauth: {
//     domain: "us-east-1r522gnfpq.auth.us-east-1.amazoncognito.com",
//     scope: ["email", "profile", "openid"],
//     redirectSignIn: "http://localhost:3000/",
//     redirectSignOut: "http://localhost:3000/",
//     responseType: "code"
//   },
//   federationTarget: "COGNITO_USER_POOLS"
// };

// export default awsExports;


const awsExports = {
  Auth: {
    region: "us-east-1",
    userPoolId: "us-east-1_R522GNFpq",
    userPoolWebClientId: "4k2rtnhvl9v22eakb5p6l8uj6k",
    oauth: {
      domain: "us-east-1r522gnfpq.auth.us-east-1.amazoncognito.com",
      scope: ["openid", "email","profile"],
      redirectSignIn: "http://localhost:5173/Form1",
      redirectSignOut: "http://localhost:5173/",
      responseType: "code"
    },
    federationTarget: "COGNITO_USER_POOLS"
  }
};

export default awsExports;
