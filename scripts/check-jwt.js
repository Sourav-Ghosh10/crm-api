require('dotenv').config();

console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
if (process.env.JWT_SECRET) {
    console.log('JWT_SECRET length:', process.env.JWT_SECRET.length);
} else {
    console.error('JWT_SECRET is MISSING');
}

console.log('JWT_REFRESH_SECRET present:', !!process.env.JWT_REFRESH_SECRET);
if (process.env.JWT_REFRESH_SECRET) {
    console.log('JWT_REFRESH_SECRET length:', process.env.JWT_REFRESH_SECRET.length);
} else {
    console.error('JWT_REFRESH_SECRET is MISSING');
    process.exit(1);
}

