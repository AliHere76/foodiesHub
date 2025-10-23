require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fooddelivery');
    console.log('✅ Connected to MongoDB\n');

    const email = 'customer@gmail.com';
    const newPassword = 'password123';
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await User.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );
    
    console.log(`Password reset for ${email}`);
    console.log(`New password: ${newPassword}`);
    console.log(`Documents modified: ${result.modifiedCount}`);
    
    // Also reset for restaurant owner
    const ownerEmail = 'owner@gmail.com';
    const ownerResult = await User.updateOne(
      { email: ownerEmail },
      { $set: { password: hashedPassword } }
    );
    
    console.log(`\nPassword reset for ${ownerEmail}`);
    console.log(`New password: ${newPassword}`);
    console.log(`Documents modified: ${ownerResult.modifiedCount}`);

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('Error:', error);
  }
}

resetPassword();
