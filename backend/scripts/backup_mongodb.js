#!/usr/bin/env node
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const DEFAULT_COLLECTIONS = ["areas", "outages", "users", "feedbacks", "purchases"];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required in backend/.env");
  }

  const backupRoot = path.join(__dirname, "..", "backups");
  const backupDir = path.join(backupRoot, `backup-${timestamp()}`);
  fs.mkdirSync(backupDir, { recursive: true });

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const manifest = {
    createdAt: new Date().toISOString(),
    databaseName: db.databaseName,
    collections: {},
  };

  for (const collectionName of DEFAULT_COLLECTIONS) {
    const collection = db.collection(collectionName);
    const docs = await collection.find({}).toArray();
    const filePath = path.join(backupDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
    manifest.collections[collectionName] = {
      count: docs.length,
      file: path.basename(filePath),
    };
    console.log(`Backed up ${collectionName}: ${docs.length} documents`);
  }

  fs.writeFileSync(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await mongoose.disconnect();

  console.log(`Backup completed at ${backupDir}`);
}

main().catch((error) => {
  console.error("Backup failed:", error.message);
  process.exit(1);
});
