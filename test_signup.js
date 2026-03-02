const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lvhdyvlqaqzdbixnwixq.supabase.co';
const supabaseKey = process.argv[2];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignUp() {
    const { data, error } = await supabase.auth.signUp({
        email: 'testlogin500@gmail.com',
        password: 'password123'
    });

    if (error) {
        console.error('Error signing up:', JSON.stringify(error, null, 2));
    } else {
        console.log('Successfully signed up as:', data.user.email);
    }
}

testSignUp();
