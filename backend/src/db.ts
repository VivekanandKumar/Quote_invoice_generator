import mongoose from 'mongoose';

let cachedConn: typeof mongoose | null = null;
let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables. Please configure your MongoDB connection string.');
  }

  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  if (!cachedPromise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };
    cachedPromise = mongoose.connect(uri, opts).then((m) => {
      cachedConn = m;
      console.log('[MongoDB] Connected successfully');
      return m;
    });
  }

  try {
    cachedConn = await cachedPromise;
  } catch (error) {
    cachedPromise = null;
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }

  return cachedConn;
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
