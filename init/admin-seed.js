if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}

const mongoose = require('mongoose');
const User = require('../models/user');
const connectDB = require('../utils/db');

// Create default admin and student users
const createDefaultUsers = async () => {
    // Production safety check: Prevent unintended seeding in production
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
        console.error('❌ Refusing to run admin seed script in production!');
        console.error('To force seeding in production, set ALLOW_SEED=true in environment variables.');
        process.exit(1);
    }

    try {
        await connectDB();

        const adminName = process.env.ADMIN_NAME || 'Admin User';
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@college.edu';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const studentName = process.env.STUDENT_NAME || 'John Doe';
        const studentEmail = process.env.STUDENT_EMAIL || 'student@college.edu';
        const studentPassword = process.env.STUDENT_PASSWORD || 'student123';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        
        if (!existingAdmin) {
            const admin = new User({
                name: adminName,
                email: adminEmail,
                password: adminPassword, // Will be hashed automatically by user schema
                role: 'admin'
            });
            await admin.save();
            console.log(`✅ Admin user created: ${adminEmail}`);
        } else {
            console.log(`ℹ️  Admin user already exists (${adminEmail})`);
        }

        // Check if student already exists
        const existingStudent = await User.findOne({ email: studentEmail });
        
        if (!existingStudent) {
            const student = new User({
                name: studentName,
                email: studentEmail,
                password: studentPassword, // Will be hashed automatically by user schema
                role: 'student'
            });
            await student.save();
            console.log(`✅ Student user created: ${studentEmail}`);
        } else {
            console.log(`ℹ️  Student user already exists (${studentEmail})`);
        }

        console.log('\n📋 Default Users Summary:');
        console.log(`Admin: ${adminEmail}`);
        console.log(`Student: ${studentEmail}`);
        if (process.env.NODE_ENV !== 'production') {
            console.log('\n⚠️  Change these passwords in production!');
        }
    } catch (err) {
        console.error('Error creating default users:', err.message);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
};

createDefaultUsers();