const mongoose = require("mongoose");

const DEFAULT_DB_NAME = "loadsheddingDB";

function getMongoUri() {
  return process.env.MONGODB_URI || process.env.MONGO_URI || "";
}

function getDatabaseNameFromUri(uri) {
  if (!uri) return null;

  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    return dbName ? decodeURIComponent(dbName) : null;
  } catch {
    return null;
  }
}

function getMongoDatabaseName(uri = getMongoUri()) {
  return process.env.DB_NAME || getDatabaseNameFromUri(uri) || DEFAULT_DB_NAME;
}

async function connectMongoose(options = {}) {
  const uri = getMongoUri();

  if (!uri) {
    throw new Error("MONGODB_URI or MONGO_URI is not set");
  }

  return mongoose.connect(uri, {
    dbName: getMongoDatabaseName(uri),
    ...options,
  });
}

module.exports = {
  DEFAULT_DB_NAME,
  connectMongoose,
  getMongoDatabaseName,
  getMongoUri,
};
