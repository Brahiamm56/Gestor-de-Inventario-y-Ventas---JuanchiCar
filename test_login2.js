const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lvhdyvlqaqzdbixnwixq.supabase.co';
const supabaseKey = process.argv[2];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignIn() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'testlogin500@gmail.com',
        password: 'password123'
    });

    if (error) {
        console.error('Error signing in:', JSON.stringify(error, null, 2));
    } else {
        console.log('Successfully signed in as:', data.user.email);
    }
}

testSignIn();
