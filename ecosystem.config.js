module.exports = {
  apps: [
    {
      name: "backend",
      script: "index.js",
      cwd: "/home/ubuntu/Project_Pharmacy/backend",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "frontend-client",
      script: "serve",
      env: {
        PM2_SERVE_PATH: "/home/ubuntu/Project_Pharmacy/frontend-client/dist",
        PM2_SERVE_PORT: 3001,
        PM2_SERVE_SPA: "true",
        PM2_SERVE_HOMEPAGE: "/index.html"
      }
    },
    {
      name: "frontend-admin",
      script: "serve",
      env: {
        PM2_SERVE_PATH: "/home/ubuntu/Project_Pharmacy/frontend-admin/dist",
        PM2_SERVE_PORT: 3002,
        PM2_SERVE_SPA: "true",
        PM2_SERVE_HOMEPAGE: "/index.html"
      }
    }
  ]
};
