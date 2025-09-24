const mongoose = require('mongoose');
const Quiz = require('../src/models/Quiz'); // Ensure path is correct

async function runMigration() {
  try {
    // Use the Atlas URI from your .env
    await mongoose.connect('mongodb+srv://sagnik23102_db_user:9RL7zEiEe20Ten0v@cluster0.qzsyrws.mongodb.net/shayak?retryWrites=true&w=majority', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const result = await Quiz.updateMany(
      { isProctored: { $exists: false } }, // Find docs missing the field
      { $set: { isProctored: true } }      // Set to schema default
    );

    console.log(`Migration complete. Updated ${result.modifiedCount} quizzes.`);
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();