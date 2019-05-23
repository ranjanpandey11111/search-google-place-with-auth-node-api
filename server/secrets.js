const secrets = {
  dbUri: process.env.DB_URI || 'mongodb://localhost:27017/googleSearch',
  googleKey: process.env.GOOGLE_KEY || 'your google map key'
};

const getSecret = (key) => secrets[key];

module.exports = { getSecret };
