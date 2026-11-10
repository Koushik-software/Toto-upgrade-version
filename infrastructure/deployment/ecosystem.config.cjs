module.exports = {
  apps: [
    {
      name: 'totodrive-backend',
      script: 'dist/server.cjs',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
