import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest({ request }) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    return new Response(
        JSON.stringify({ success: false, message: `Method ${request.method} not allowed. Use POST.` }),
        { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
}

export async function onRequestPost({ request, env }) {
    try {
        const { email, password, fullName } = await request.json();

        // Initialize Supabase
        const supabaseUrl = env.VITE_SUPABASE_URL || 'https://olmsjbunvfxhtwbpnntn.supabase.co';
        // Note: Use VITE_SUPABASE_ANON_KEY to hit the Auth endpoints
        const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sbXNqYnVudmZ4aHR3YnBubnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjc1NDksImV4cCI6MjA4NjY0MzU0OX0.6ycgQ1yNWLI9un69NQxC3iP7jyAsqEDlANiUp3CQi8M';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const demoStart = new Date().toISOString();
        
        // 1. Try to sign up the user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    is_demo: true,
                    demo_start: demoStart
                }
            }
        });

        if (error) {
            // Check if user already exists
            if (error.message.toLowerCase().includes('already registered')) {
                // If they exist, let's log them in to check their demo status
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (signInError) {
                    return new Response(JSON.stringify({ success: false, message: 'Invalid credentials or user exists with different password.' }), {
                        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }

                const user = signInData.user;
                const start = user.user_metadata?.demo_start;
                if (!start) {
                     return new Response(JSON.stringify({ success: false, message: 'Account exists but is not a demo account.' }), {
                        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }

                const startTime = new Date(start).getTime();
                const now = new Date().getTime();
                const diffTime = Math.abs(now - startTime);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const daysLeft = 14 - diffDays;

                if (daysLeft <= 0) {
                    return new Response(JSON.stringify({ success: false, message: 'You cannot take the demo twice. Your demo period has expired.' }), {
                        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                } else {
                    return new Response(JSON.stringify({ success: true, message: `You are already signed up! You have ${daysLeft} days left.`, user: signInData.user }), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }
            }
            throw error;
        }
        
        // We might get an obfuscated fake user if email uniqueness is on and they exist. 
        // Supabase v2 returns an identical response for signup of existing vs new to prevent enumeration.
        // We'll assume the client gets a session if successful.
        if (data?.user?.identities?.length === 0) {
            // They already existed but Supabase obfuscated it
            return new Response(JSON.stringify({ success: false, message: 'Email already in use. Please try another or sign in.' }), {
                status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Insert into demo_accounts table
        const { error: dbError } = await supabase
            .from('demo_accounts')
            .insert([{
                name: fullName,
                email: email,
                password: password,
                demo_start: demoStart
            }]);

        if (dbError) {
            console.error('Supabase Demo Account Insert Error:', dbError);
        }

        // 2. Send Email via Resend to info@moslogix.com
        const resendApiKey = env.RESEND_API_KEY || "re_huntHqkk_FzBA21W95denW9hE8athbHhC";
        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'onboarding@resend.dev',
                to: 'info@moslogix.com',
                subject: 'New Renix Demo Signup',
                html: `
                  <p>A new user has signed up for the 14-day Renix demo.</p>
                  <p><strong>Name:</strong> ${fullName}</p>
                  <p><strong>Email:</strong> ${email}</p>
                `
            })
        });

        if (!emailResponse.ok) {
            console.error('Failed to send email:', await emailResponse.text());
        }

        return new Response(JSON.stringify({ success: true, message: 'Successfully signed up for the 14-day demo!', user: data.user }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

    } catch (error) {
        console.error('Demo Signup Error:', error);
        return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}
