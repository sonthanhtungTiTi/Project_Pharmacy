module.exports = {
  apps: [
    {
      name: "pharmacy-backend",
      script: "./index.js",
      cwd: "/home/ubuntu/Project_Pharmacy/backend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
