const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis-16455.c279.us-central1-1.gce.redns.redis-cloud.com',
  port: 16455,
  username: 'default',
  password: 'oa1FHzaw3Kwj0HkndIjR9mKv3LknqWrF',
  tls: {
    servername: 'redis-16455.c279.us-central1-1.gce.redns.redis-cloud.com',
    rejectUnauthorized: false, // For testing
  },
  connectTimeout: 15000,
  commandTimeout: 10000,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
  if (err.code === 'ERR_SSL_WRONG_VERSION_NUMBER') {
    console.error('TLS version mismatch. Using Node.js default TLS settings.');
  }
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('ready', () => {
  console.log('Redis ready to receive commands');
});

redis.ping()
  .then((result) => {
    console.log('Ping result:', result);
    redis.quit();
  })
  .catch((err) => {
    console.error('Ping error:', err);
    redis.quit();
  });