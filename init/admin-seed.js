const mongoose = require('mongoose');
const User = require('../models/user');

const MONGO_URI = 'mongodb://127.0.0.1:27017/collegeEvent';

// Connect to MongoDB
main()
    .then(() => {
        console.log('MongoDB connected');
    }).catch((err) => {
        console.error('MongoDB connection error:', err);
    });

async function main() {
    await mongoose.connect(MONGO_URI);
}

// Create default admin and student users
const createDefaultUsers = async () => {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@college.edu' });
        
        if (!existingAdmin) {
            // Create admin user
            const admin = new User({
                name: 'Admin User',
                email: 'admin@college.edu',
                password: 'admin123', // Will be hashed automatically
                role: 'admin'
            });
            await admin.save();
            console.log('✅ Admin user created: admin@college.edu (password: admin123)');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        // Check if student already exists
        const existingStudent = await User.findOne({ email: 'student@college.edu' });
        
        if (!existingStudent) {
            // Create sample student user
            const student = new User({
                name: 'John Doe',
                email: 'student@college.edu',
                password: 'student123', // Will be hashed automatically
                role: 'student'
            });
            await student.save();
            console.log('✅ Student user created: student@college.edu (password: student123)');
        } else {
            console.log('ℹ️  Student user already exists');
        }

        console.log('\n📋 Default Users Summary:');
        console.log('Admin: admin@college.edu / admin123');
        console.log('Student: student@college.edu / student123');
        console.log('\n⚠️  Please change these passwords in production!');
        
        mongoose.connection.close();
    } catch (err) {
        console.error('Error creating default users:', err);
        mongoose.connection.close();
    }
};

createDefaultUsers();