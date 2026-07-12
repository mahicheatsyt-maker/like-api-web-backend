const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/qyro';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, {
      bufferCommands: false, // ❗ important
    }).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
