// REGISTER
async function registerUser(name, email, password) {
  const client = window.supabaseClient;
  if (!client || !client.auth) {
    alert('Supabase client not initialized.');
    return;
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  });

  if (error) {
    alert(error.message);
    return;
  }

  // ✅ INSERT PROFILE ONLY ON FIRST REGISTRATION
  if (data.user) {
    const { error: profileError } = await client
      .from('profiles')
      .insert(
        {
          id: data.user.id,
          role: 'customer'
        },
        { ignoreDuplicates: true } // 🔒 prevents overwriting admin
      );

    if (profileError) {
      console.error('Profile insert error:', profileError);
    }
  }

  alert('Registration successful! Please check your email to confirm.');
}

// LOGIN
async function loginUser(email, password) {
  const client = window.supabaseClient;
  if (!client || !client.auth) {
    alert('Supabase client not initialized.');
    return;
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
  } else {
    window.location.href = 'index.html';
  }
}

// LOGOUT
async function logout() {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'index.html';
}
