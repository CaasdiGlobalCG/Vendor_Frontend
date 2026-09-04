// export const awsExports = {
//     "REGION" : "ap-south-1",
//     "USER_POOL_ID": "ap-south-1_R522GNFpq",
//     "USER_POOL_APP_CLIENT_ID": "4k2rtnhvl9v22eakb5p6l8uj6k",
//     "oauth": {
//     "domain": "ap-south-1r522gnfpq.auth.ap-south-1.amazoncognito.com", // e.g., "myapp-auth.auth.ap-south-1.amazoncognito.com"
//     "scope": ["email", "profile", "openid"],
//     "redirectSignIn": "http://localhost:3000/",
//     "redirectSignOut": "http://localhost:3000/",
//     "responseType": "code"
//   },
//   "federationTarget": "COGNITO_USER_POOLS"
// };


// const awsExports = {
//   REGION: "ap-south-1",
//   USER_POOL_ID: "ap-south-1_R522GNFpq",
//   USER_POOL_APP_CLIENT_ID: "4k2rtnhvl9v22eakb5p6l8uj6k",
//   oauth: {
//     domain: "ap-south-1r522gnfpq.auth.ap-south-1.amazoncognito.com",
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
    region: "ap-south-1",
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ,
    userPoolWebClientId: import.meta.env.VITE_COGNITO_USER_POOL_APP_CLIENT_ID,
    oauth: {
      domain: "ap-south-1klsoqhj5m.auth.ap-south-1.amazoncognito.com",
      scope: ["openid", "email","profile"],
      redirectSignIn: "http://localhost:5173/Form1",
      redirectSignOut: "http://localhost:5173/",
      responseType: "code"
    },
    federationTarget: "COGNITO_USER_POOLS"
  }
};

export default awsExports;
