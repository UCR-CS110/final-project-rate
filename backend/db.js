const mongoose = require("mongoose");

async function connectDB() {
  const dbName = process.env.MONGO_DB_NAME || "test";

  await mongoose.connect(process.env.MONGO_URI, { dbName });
  console.log(`MongoDB Atlas Connected to ${dbName}`);
}

module.exports = connectDB;
