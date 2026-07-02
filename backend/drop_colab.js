const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/doncor";
async function run() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();
    await db.collection("colaboradores").drop();
    console.log("Colaboradores dropped");
    await client.close();
  } catch (e) {
    console.log("Error or collection doesnt exist");
  }
}
run();
