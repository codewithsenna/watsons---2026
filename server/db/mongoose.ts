import mongoose from "mongoose";
import { env } from "../env";

let connectionPromise: Promise<typeof mongoose> | undefined;

export function connectMongoose() {
  if (!env.mongodb.uri) {
    throw new Error("MONGODB_URI is required to connect to MongoDB.");
  }

  connectionPromise ??= mongoose.connect(env.mongodb.uri, {
    dbName: env.mongodb.dbName
  });

  return connectionPromise;
}

export async function disconnectMongoose() {
  if (connectionPromise) {
    await mongoose.disconnect();
    connectionPromise = undefined;
  }
}
