import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Catch-all: handle OPTIONS preflight and reject non-POST methods with JSON
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
        const formData = await request.formData();
        const name = formData.get('name');
        const email = formData.get('email');
        const budget = formData.get('budget') || 'N/A';
        const message = formData.get('message');
        const subject = formData.get('_subject') || 'New Inquiry from Renix Landing';

        // 1. Initialize Supabase
        const supabaseUrl = env.VITE_SUPABASE_URL || 'https://olmsjbunvfxhtwbpnntn.supabase.co';
        // Note: we need the ANON key or SERVICE_ROLE key here. We'll use ANON key if passed via env.
        const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sbXNqYnVudmZ4aHR3YnBubnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjc1NDksImV4cCI6MjA4NjY0MzU0OX0.6ycgQ1yNWLI9un69NQxC3iP7jyAsqEDlANiUp3CQi8M';
        if (supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // 2. Insert into Supabase contacts table
          const { error: dbError } = await supabase
              .from('contacts')
              .insert([
                  { name, email, budget, message }
              ]);

          if (dbError) {
              console.error('Supabase Error:', dbError);
          }
        }

        // 3. Send Email via Resend
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
                subject: `${subject}: ${name}`,
                html: `
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
            })
        });

        if (!emailResponse.ok) {
            const errorData = await emailResponse.text();
            throw new Error(`Resend API Error: ${errorData}`);
        }

        return new Response(JSON.stringify({ success: true, message: 'Message sent successfully!' }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

    } catch (error) {
        console.error('Submission Error:', error);
        return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}
