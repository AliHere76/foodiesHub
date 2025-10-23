require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  tenantId: mongoose.Schema.Types.ObjectId,
  provider: String,
  isActive: Boolean,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function checkUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fooddelivery');
    console.log('✅ Connected to MongoDB\n');

    // Count all users
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}\n`);

    // List all users
    const users = await User.find().select('name email role provider createdAt');
    
    if (users.length > 0) {
      console.log('Users found:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role} - Provider: ${user.provider}`);
      });
    } else {
      console.log('No users found in database.');
      console.log('\nCreating a test user...');
      
      // Create a test user
      const hashedPassword = await bcrypt.hash('password123', 12);
      const testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'customer',
        provider: 'local',
        isActive: true,
      });
      
      console.log('✅ Test user created:');
      console.log('   Email: test@example.com');
      console.log('   Password: password123');
      console.log('   Role: customer');
    }

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
