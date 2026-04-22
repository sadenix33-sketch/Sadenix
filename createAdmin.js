import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ceyplkjqckxlqxlbpknm.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNleXBsa2pxY2t4bHF4bGJwa25tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE4MjI5NywiZXhwIjoyMDkxNzU4Mjk3fQ.ye2hhuqHQyG6Pj6hN3dvP_Q2zhLRQaVZCfnI9rHS2FM'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

async function createSuperAdmin() {
  console.log("Creating super admin user...")
  
  // 1. Create User in Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: 'admin@sadenix.jo',
    password: 'sadenix2026',
    email_confirm: true,
    user_metadata: { role: 'super_admin', full_name: 'Saddam (Super Admin)' }
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
        console.log("User already exists in auth. Updating password and confirming just in case...")
        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const user = users.users.find(u => u.email === 'admin@sadenix.jo')
        
        if (user) {
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
                password: 'sadenix2026',
                email_confirm: true
            })
            console.log("Password updated. Proceeding to profile setup...")
        }
    } else {
        console.error("Auth Error:", authError)
        return
    }
  }

  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  const user = users.users.find(u => u.email === 'admin@sadenix.jo')

  if (!user) {
    console.error("Could not find the user.")
    return
  }

  // 2. Ensure Profile Exists and is super admin
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: user.id,
      email: 'admin@sadenix.jo',
      full_name: 'Saddam (Super Admin)',
      role: 'super_admin',
      is_active: true
    })

  if (profileError) {
    console.error("Profile Error:", profileError)
    return
  }

  console.log("🎉 Super Admin account created and profile linked successfully!")
}

createSuperAdmin()
