require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: { type: String, select: false },
  role: String,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function checkPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fooddelivery');
    console.log('✅ Connected to MongoDB\n');

    // Check specific user
    const email = 'customer@gmail.com';
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', user.email);
    console.log('Has password:', !!user.password);
    console.log('Password starts with $2a$ (bcrypt hash):', user.password ? user.password.startsWith('$2a$') || user.password.startsWith('$2b$') : false);
    
    if (user.password) {
      console.log('\nPassword hash preview:', user.password.substring(0, 30) + '...');
      
      // Test password comparison
      const testPassword = 'password123'; // Try common password
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`\nTesting password "${testPassword}":`, isValid ? '✅ VALID' : '❌ INVALID');
    } else {
      console.log('\n⚠️  User has no password set (might be Google OAuth user)');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPassword();
