const mongoose = require("mongoose");

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
  } catch (error) {
    console.log(error);
    throw new Error("Can not connect to the Database.");
  }
}

async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.log(error);
    throw new Error("Error disconnecting from the Database.");
  }
}

export { connectToDatabase, disconnectFromDatabase };
