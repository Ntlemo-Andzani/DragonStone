// Use global supabaseClient from auth/supabaseClient.js
// The Supabase client is created ONLY in auth/supabaseClient.js
// Do NOT create it here - just use the global one (access via window.supabaseClient)

// Helper function to hash the password
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Global updateUIForAuth function - defined early so loadSession() can call it safely
function updateUIForAuth(profile) {
  console.log("Updating UI for:", profile);

  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginLink = document.getElementById('login-link');
  const logoutLink = document.getElementById('logout-link');
  const userDash = document.getElementById('user-dashboard');
  const adminDash = document.getElementById('admin-dashboard');
  const profileLink = document.getElementById('profile-link');
  const adminLink = document.getElementById('admin-link');
  const ecoPointsLabel = document.getElementById('ecopoints-balance');

  if (profile) {
    loginBtn?.style.setProperty("display", "none");
    logoutBtn?.style.setProperty("display", "block");
    loginLink?.style.setProperty('display', 'none');
    logoutLink?.style.setProperty('display', 'block');

    // Reveal profile link for logged-in users and admin dashboard for admins.
    // Do NOT automatically show the user dashboard — only show it when user clicks Profile.
    if (profileLink) profileLink.style.setProperty('display', 'block');
    // Reveal admin nav link for admins but do NOT auto-show the admin dashboard.
    if (profile.role === 'admin') {
      if (adminLink) adminLink.style.setProperty('display', 'block');
      adminDash?.style.setProperty('display', 'none');
    } else {
      if (adminLink) adminLink.style.setProperty('display', 'none');
      adminDash?.style.setProperty('display', 'none');
    }

    // Update eco points display
    const localEco = localStorage.getItem('ecoPoints');
    if (ecoPointsLabel) {
      ecoPointsLabel.textContent = localEco !== null ? localEco : (profile.eco_points || 0);
    }
  } else {
    loginBtn?.style.setProperty("display", "block");
    logoutBtn?.style.setProperty("display", "none");
    loginLink?.style.setProperty('display', 'block');
    logoutLink?.style.setProperty('display', 'none');
    if (profileLink) profileLink.style.setProperty('display', 'none');
    if (adminLink) adminLink.style.setProperty('display', 'none');
    // hide dashboards when not logged in
    userDash?.style.setProperty('display', 'none');
    adminDash?.style.setProperty('display', 'none');

    // Reset eco points display
    if (ecoPointsLabel) {
      ecoPointsLabel.textContent = '0';
    }
  }
}

//Registration supa - Supabase Auth
async function registerUser(name, email, password, phone) {
  if (!supabaseClient) {
    console.error('supabaseClient not initialized');
    return { success: false, error: 'Supabase client not available' };
  }
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        showRegisterError(error.message);
        return { success: false, error: error.message };
    }

    if (!error && data.user) {
        try {
            await supabaseClient
                .from('profiles')
                .insert(
                    {
                        id: data.user.id,
                        name,
                        email,
                        phone,
                        role: 'user',
                        eco_points: 0
                    },
                    { ignoreDuplicates: true }
                );
        } catch (profileError) {
            console.warn('Profile insert failed:', profileError);
        }
    }

  return { success: true, data: data };
}

//Login supa - Supabase Auth
async function loginUser(email, password) {
  if (!supabaseClient) {
    console.error('supabaseClient not initialized');
    return { success: false, error: 'Supabase client not available' };
  }
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data };
}

//Session supa - Load current Supabase Auth session
async function loadSession() {
  if (!supabaseClient) {
    console.warn('supabaseClient not initialized, skipping session load');
    updateUIForAuth(null);
    return;
  }
  
  const { data } = await supabaseClient.auth.getSession();

  if (data.session && data.session.user) {
    const user = data.session.user;
    const userId = user.id;
    
    // Get user name from metadata or email
    const userName = user.user_metadata
  ? (user.user_metadata.name || user.email)
  : user.email;

// Read-only: fetch role and eco_points from profiles
let profile = null;

try {
  const { data: profileData, error: profileError } = await supabaseClient
    .from('profiles')
    .select('role, eco_points')
    .eq('id', userId)
    .single();

  if (profileError) throw profileError;

  // ✅ ONLY set role if Supabase returns it
  profile = {
    id: userId,
    name: userName,
    email: user.email,
    role: profileData.role,
    eco_points: profileData.eco_points || 0
  };

  // Sync eco_points to localStorage
  if (profileData.eco_points !== null && profileData.eco_points !== undefined) {
    localStorage.setItem('ecoPoints', profileData.eco_points);
  }

} catch (error) {
  console.warn('Could not fetch profile role and eco_points:', error);

  // 🚫 DO NOT DEFAULT ROLE
  profile = {
    id: userId,
    name: userName,
    email: user.email,
    role: null,
    eco_points: 0
  };
}

    // Check if role is assigned — restrict access if null
    if (!profile.role) {
      console.warn('No role assigned — access restricted');
      updateUIForAuth(null);
      return;
    }

    // Store user data in localStorage for UI helpers only (not for auth state)
    if (window.setCurrentUser) {
      window.setCurrentUser(profile);
    }

        // Reveal admin link for admins (hide for non-admins)
        try {
            const adminLink = document.getElementById('admin-link');
            if (profile.role === 'admin') {
                adminLink?.style.setProperty('display', 'block');
            } else {
                adminLink?.style.setProperty('display', 'none');
            }
        } catch (e) { /* ignore DOM errors */ }

    // Update UI based on Supabase session
    if (window.updateUIForAuth) {
      window.updateUIForAuth(profile);
    }
  } else {
    // No session - clear UI helper data and update UI
    if (window.clearCurrentUser) {
      window.clearCurrentUser();
    }
        // Ensure admin link is hidden when no session
        try {
            const adminLink = document.getElementById('admin-link');
            adminLink?.style.setProperty('display', 'none');
        } catch (e) {}
    if (window.updateUIForAuth) {
      window.updateUIForAuth(null);
    }
  }
}

loadSession();

//Logout supa

async function logout() {
  try {
    // Sign out from Supabase
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }

    // Clear UI helper storage
    clearCurrentUser();
    localStorage.clear();
    sessionStorage.clear();

    // Hide admin and user dashboards
    const adminDash = document.getElementById('admin-dashboard');
    const userDash = document.getElementById('user-dashboard');
    if (adminDash) adminDash.style.display = 'none';
    if (userDash) userDash.style.display = 'none';

    // Hide admin link
    const adminLink = document.getElementById('admin-link');
    if (adminLink) adminLink.style.display = 'none';

    // Update UI to show login button
    updateUIForAuth(null);

    // Optional: Clear cart
    if (window.__cart && typeof window.__cart.clearCart === 'function') {
      await window.__cart.clearCart();
    }

    // Redirect to home page
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Logout failed:', err);
    alert('Logout failed. Please try again.');
  }
}



// Example: Reset password (commented out - use when needed)
// if (supabaseClient) {
//   await supabaseClient.auth.resetPasswordForEmail(email);
// }

// Example: Check session (commented out - use when needed)
// if (supabaseClient) {
//   const { data } = await supabaseClient.auth.getSession();
//   if (!data.session) {
//     window.location.href = 'index.html';
//   }
// }

// updateUIForAuth is now defined at the top of the file before loadSession()

// Simple client-side auth (MVP)
(function(){
    var loginLink = document.getElementById('login-link');
    var logoutLink = document.getElementById('logout-link');
    var loginModal = document.getElementById('login-modal');
    var loginOverlay = document.getElementById('login-overlay');
    var loginCancel = document.getElementById('login-cancel');
    var loginForm = document.getElementById('login-form');
    var message = document.getElementById('login-message');
    var userDash = document.getElementById('user-dashboard');
    var adminDash = document.getElementById('admin-dashboard');
    var userNameLabel = document.getElementById('user-name-label');
    var ecoPointsLabel = document.getElementById('ecopoints-balance');

    var hero = document.getElementById('hero');
    var feature = document.getElementById('feature');
    var product1 = document.getElementById('product1');

    var DEMO_USERS = {
        'admin@demo.com': { password: 'admin123', role: 'admin', name: 'Admin' },
        'user@demo.com': { password: 'user123', role: 'user', name: 'Customer' }
    };

    // UI helper functions - localStorage is ONLY for UI display, NOT for auth state
    function getCurrentUser(){
        try { return JSON.parse(localStorage.getItem('currentUser')) || null; } catch(e){ return null; }
    }
    function setCurrentUser(user){ localStorage.setItem('currentUser', JSON.stringify(user)); }
    function clearCurrentUser(){ localStorage.removeItem('currentUser'); }
    
    // Make these available globally for UI helpers
    window.getCurrentUser = getCurrentUser;
    window.setCurrentUser = setCurrentUser;
    window.clearCurrentUser = clearCurrentUser;
    
    // Check auth state from Supabase session (not localStorage)
    async function isLoggedIn(){
        if (!supabaseClient) return false;
        try {
            const { data } = await supabaseClient.auth.getSession();
            return !!(data && data.session);
        } catch(e) {
            return false;
        }
    }

    function showModal(){ if(loginModal) loginModal.style.display = 'block'; }
    function hideModal(){ if(loginModal) loginModal.style.display = 'none'; }

    function show(el){ if(el) el.style.display = ''; }
    function hide(el){ if(el) el.style.display = 'none'; }

    function showHomePage(){
        // Always show home page content and hide dashboards
        show(hero);
        show(feature);
        show(product1);
        hide(userDash);
        hide(adminDash);
    }

    async function handleLoginSubmit(evt){
        evt.preventDefault();
        var email = (document.getElementById('email')||{}).value || '';
        var password = (document.getElementById('password')||{}).value || '';

        // Show loading state
        var submitBtn = document.getElementById('login-submit');
        var originalText = submitBtn ? submitBtn.textContent : 'Sign In';
        if(submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';
        }

        try {
            // Use Supabase Auth sign in
            var result = await loginUser(email.trim(), password);
            
            if(submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }

            if(result.success && result.data){
                // Login successful - get user info
                var userData = result.data.user;
                var userName = userData.user_metadata ? (userData.user_metadata.name || userData.email) : userData.email;
                
                // Create user object for local storage
                var user = {
                    id: userData.id,
                    email: userData.email,
                    name: userName,
                    role: 'user', // Default role, can be updated from profiles table
                    ecopoints: 100 // Default ecopoints
                };

                // Try to get profile from Supabase
                try {
                    if (supabaseClient) {
                        var { data: profile } = await supabaseClient
                            .from('profiles')
                            .select('*')
                            .eq('id', userData.id)
                            .single();
                        
                        if(profile) {
                            if(profile.name) user.name = profile.name;
                            if(profile.role) user.role = profile.role;
                            if(typeof profile.ecopoints !== 'undefined') user.ecopoints = profile.ecopoints;
                        }
                    }
                } catch(profileError) {
                    console.warn('Could not fetch profile:', profileError);
                }

                // Store user data for UI helpers only
                setCurrentUser(user);
                hideModal();
                
                // Reload session from Supabase to update UI based on actual auth state
                await loadSession();
                
                if(window.__cart && typeof window.__cart.updateCartCount === 'function'){ 
                    window.__cart.updateCartCount(); 
                }
                
                // Show success message
                if(message) {
                    message.textContent = `Welcome back, ${userName}!`;
                    message.style.color = "green";
                }
            } else {
                // Login failed
                var errorMsg = result.error || 'Login failed. Please check your credentials.';
                if(message) {
                    message.textContent = "Login failed: " + errorMsg;
                    message.style.color = "red";
                } else {
                    alert(errorMsg);
                }
            }
        } catch(error){
            if(submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
            console.error('Login error:', error);
            var errorMsg = 'Login failed. Please check your connection and try again.';
            if(message) {
                message.textContent = errorMsg;
                message.style.color = "red";
            } else {
                alert(errorMsg);
            }
        }
    }

    // Registration modal elements
    var registerLink = document.getElementById('register-link');
    var registerModal = document.getElementById('register-modal');
    var registerOverlay = document.getElementById('register-overlay');
    var registerCancel = document.getElementById('register-cancel');
    var registerForm = document.getElementById('register-form');
    var registerError = document.getElementById('register-error');
    var registerSuccess = document.getElementById('register-success');
    var showRegisterLink = document.getElementById('show-register-link');
    var showLoginLink = document.getElementById('show-login-link');

    function showRegisterModal(){ if(registerModal) registerModal.style.display = 'block'; }
    function hideRegisterModal(){ 
        if(registerModal) registerModal.style.display = 'none';
        if(registerForm) registerForm.reset();
        if(registerError) { registerError.style.display = 'none'; registerError.textContent = ''; }
        if(registerSuccess) { registerSuccess.style.display = 'none'; registerSuccess.textContent = ''; }
    }

    async function handleRegisterSubmit(evt){
        evt.preventDefault();
        var name = (document.getElementById('reg-name')||{}).value || '';
        var email = (document.getElementById('reg-email')||{}).value || '';
        var phone = (document.getElementById('reg-phone')||{}).value || '';
        var password = (document.getElementById('reg-password')||{}).value || '';
        var confirmPassword = (document.getElementById('reg-confirm-password')||{}).value || '';

        // Client-side validation
        if(!name || name.trim().length < 2){
            showRegisterError('Please enter a valid name (at least 2 characters)');
            return;
        }
        if(!email || !email.includes('@')){
            showRegisterError('Please enter a valid email address');
            return;
        }
        if(!password || password.length < 6){
            showRegisterError('Password must be at least 6 characters');
            return;
        }
        if(password !== confirmPassword){
            showRegisterError('Passwords do not match');
            return;
        }

        // Show loading state
        var submitBtn = document.getElementById('register-submit');
        var originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';

        try {
            // Use Supabase Auth sign up
            var result = await registerUser(name.trim(), email.trim(), password, phone.trim());
            
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            if(result.success){
                // Registration successful
                showRegisterSuccess('Registration successful! Check your email to confirm your account.');
                
                // Wait a moment then reload to check session
                setTimeout(function(){
                    location.reload();
                }, 2000);
            } else {
                showRegisterError(result.error || 'Registration failed. Please try again.');
            }
        } catch(error){
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            console.error('Registration error:', error);
            showRegisterError('Registration successful! Please check your email to confirm.');
        }
    }

    function showRegisterError(message){
        if(registerError){
            registerError.textContent = message;
            registerError.style.display = 'block';
            if(registerSuccess) registerSuccess.style.display = 'none';
        }
    }

    function showRegisterSuccess(message){
        if(registerSuccess){
            registerSuccess.textContent = message;
            registerSuccess.style.display = 'block';
            if(registerError) registerError.style.display = 'none';
        }
    }

    // Event wiring
    if(loginLink){ loginLink.addEventListener('click', function(e){ e.preventDefault(); showModal(); }); }
    if(registerLink){ registerLink.addEventListener('click', function(e){ e.preventDefault(); showRegisterModal(); }); }
    if(showRegisterLink){ showRegisterLink.addEventListener('click', function(e){ e.preventDefault(); hideModal(); showRegisterModal(); }); }
    if(showLoginLink){ showLoginLink.addEventListener('click', function(e){ e.preventDefault(); hideRegisterModal(); showModal(); }); }
    if(logoutLink){ 
        logoutLink.addEventListener('click', async function(e){ 
            e.preventDefault(); 
            if(confirm('Are you sure you want to logout?')){
                try {
                    // Supabase logout (server-side session)
                    if (typeof logoutUser === 'function') {
                        await logoutUser();
                    } else if (supabaseClient && supabaseClient.auth) {
                        await supabaseClient.auth.signOut();
                    }
                } catch (err) {
                    console.warn('Supabase logout failed or not configured:', err);
                }

                // Clear UI helper data
                clearCurrentUser(); 
                if(window.__cart && typeof window.__cart.clearCart === 'function'){ 
                    window.__cart.clearCart(); 
                }
                
                // Reload session from Supabase to update UI based on actual auth state
                await loadSession();
                
                // Show home page after logout
                showHomePage();
                alert('You have been logged out successfully.');
            }
        }); 
    }
    if(loginOverlay){ loginOverlay.addEventListener('click', function(){ hideModal(); }); }
    if(registerOverlay){ registerOverlay.addEventListener('click', function(){ hideRegisterModal(); }); }
    if(loginCancel){ loginCancel.addEventListener('click', function(){ hideModal(); }); }
    if(registerCancel){ registerCancel.addEventListener('click', function(){ hideRegisterModal(); }); }
    if(loginForm){ loginForm.addEventListener('submit', handleLoginSubmit); }
    if(registerForm){ registerForm.addEventListener('submit', handleRegisterSubmit); }
    
    // Home link - show home page content
    var homeLink = document.getElementById('home-link');
    if(homeLink){
        homeLink.addEventListener('click', async function(e){
            e.preventDefault();
            showHomePage();
            // Update auth UI based on actual Supabase session state
            await loadSession();
        });
    }

    // Initialize on load - use Supabase session for auth state, not localStorage
    // loadSession() will be called automatically and will update the UI based on actual auth state
    // This ensures UI reflects the real authentication state from Supabase
})();

// Cart functionality
(function(){
    var cartCountBadge = document.getElementById('cart-count');
    
    // Get cart from localStorage
    function getCart(){
        try {
            return JSON.parse(localStorage.getItem('cart')) || [];
        } catch(e){
            return [];
        }
    }
    
    // Save cart to localStorage
    function saveCart(cart){
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
    }
    
    // Check login state from Supabase session (not localStorage)
    async function isLoggedIn(){
        if (!supabaseClient) return false;
        try {
            const { data } = await supabaseClient.auth.getSession();
            return !!(data && data.session);
        } catch(e) {
            return false;
        }
    }

    // Update cart count badge (only visible when logged in)
    async function updateCartCount(){
        const loggedIn = await isLoggedIn();
        if(!loggedIn){
            if(cartCountBadge){ cartCountBadge.textContent = '0'; cartCountBadge.style.display = 'none'; }
            return;
        }
        var cart = getCart();
        var totalItems = cart.reduce(function(sum, item){ return sum + (item.quantity || 1); }, 0);
        if(cartCountBadge){
            cartCountBadge.textContent = totalItems;
            cartCountBadge.style.display = totalItems > 0 ? 'inline-block' : 'none';
        }
    }
    
    // Add product to cart
    async function addToCart(productId, productName, productPrice, productImage){
        const loggedIn = await isLoggedIn();
        if(!loggedIn){
            // If not logged in, don't add; optionally prompt login
            var loginLink = document.getElementById('login-link');
            if(loginLink) loginLink.click();
            return;
        }
        
        // Get product data for carbon footprint
        var productData = null;
        if(window.PRODUCTS){
            productData = window.PRODUCTS.find(function(p){ return p.id == productId; });
        }
        
        var cart = getCart();
        var existingItem = cart.find(function(item){ return item.id == productId || item.id == String(productId); });
        
        if(existingItem){
            // Increment quantity if product already in cart
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            // Add new product to cart
            cart.push({
                id: String(productId),
                name: productName,
                price: parseFloat(productPrice),
                image: productImage || '',
                quantity: 1,
                carbonFootprint: productData ? productData.carbonFootprint : 0,
                wasteSaved: productData ? productData.wasteSaved : 0,
                waterSaved: productData ? productData.waterSaved : 0
            });
        }
        
        saveCart(cart);
        showAddToCartNotification(productName);
    }
    
    // Show notification when product is added
    function showAddToCartNotification(productName){
        // Create notification element
        var notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.textContent = productName + ' added to cart!';
        notification.style.cssText = 'position: fixed; top: 80px; right: 20px; background: #4CAF50; color: white; padding: 12px 20px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 1001; animation: slideIn 0.3s ease;';
        document.body.appendChild(notification);
        
        // Remove notification after 2 seconds
        setTimeout(function(){
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(function(){
                if(notification.parentNode){
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
    
    // Initialize cart count on page load
    updateCartCount();
    
    // Handle add to cart button clicks
    var addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(function(button){
        button.addEventListener('click', function(e){
            e.preventDefault();
            // Prevent product card click handler from also firing
            e.stopPropagation();
            var productCard = button.closest('.pro');
            if(productCard){
                var productId = productCard.getAttribute('data-product-id');
                var productName = productCard.getAttribute('data-product-name');
                var productPrice = productCard.getAttribute('data-product-price');
                var productImage = productCard.querySelector('img');
                var imageSrc = productImage ? productImage.src : '';
                
                if(productId && productName && productPrice){
                    addToCart(productId, productName, productPrice, imageSrc);
                }
            }
        });
    });

    // Allow clicking anywhere on the product card to add to cart
    var productCards = document.querySelectorAll('.pro[data-product-id]');
    productCards.forEach(function(card){
        card.addEventListener('click', function(e){
            // If the direct add-to-cart button was clicked, let that handler run
            if(e.target && e.target.closest('.add-to-cart-btn')){
                return;
            }
            var productId = card.getAttribute('data-product-id');
            var productName = card.getAttribute('data-product-name');
            var productPrice = card.getAttribute('data-product-price');
            var productImage = card.querySelector('img');
            var imageSrc = productImage ? productImage.src : '';
            if(productId && productName && productPrice){
                addToCart(productId, productName, productPrice, imageSrc);
            }
        });
    });
    
    // Handle cart link click (prevent navigation if cart.html doesn't exist)
    var cartLink = document.getElementById('cart-link');
    if(cartLink){
        cartLink.addEventListener('click', function(e){
            var cart = getCart();
            if(cart.length === 0){
                e.preventDefault();
                alert('Your cart is empty!');
            }
            // If cart.html exists, it will navigate normally
            // If not, we'll handle it gracefully
        });
    }

    // Expose helpers for auth module
    window.__cart = {
        updateCartCount: updateCartCount, // async - checks Supabase session
        clearCart: async function(){ localStorage.removeItem('cart'); await updateCartCount(); },
        getCart: getCart,
        saveCart: saveCart,
        addToCart: addToCart // async - checks Supabase session
    };
})();

// Products data with carbon footprint and sustainability info
// Default products
var DEFAULT_PRODUCTS = [
    {
        id: 1,
        name: "Bee's Wrap",
        description: "Reusable Beeswax Wraps",
        price: 150,
        image: "img/bwrap.jpg",
        category: "Kitchen",
        carbonFootprint: 0.5, // kg CO2
        wasteSaved: 2.5, // kg
        waterSaved: 50, // liters
        sustainability: [
            "100% reusable and washable",
            "Made from organic cotton and beeswax",
            "Replaces single-use plastic wrap",
            "Biodegradable when composted",
            "Lasts up to 1 year with proper care"
        ]
    },
    {
        id: 2,
        name: "Bamboo Toothbrush",
        description: "Eco-Friendly Bamboo Toothbrush",
        price: 45,
        image: "img/bamb.jpg",
        category: "Personal Care",
        carbonFootprint: 0.2,
        wasteSaved: 0.15,
        waterSaved: 10,
        sustainability: [
            "Biodegradable bamboo handle",
            "BPA-free bristles",
            "Sustainable bamboo sourcing",
            "Reduces plastic waste",
            "Compostable packaging"
        ]
    },
    {
        id: 3,
        name: "Stainless Steel Water Bottle",
        description: "Reusable Stainless Steel Water Bottle",
        price: 299,
        image: "img/ssbottle.jpg",
        category: "Eco-Friendly",
        carbonFootprint: 1.2,
        wasteSaved: 5.0,
        waterSaved: 200,
        sustainability: [
            "Durable stainless steel construction",
            "Replaces hundreds of plastic bottles",
            "BPA-free and safe",
            "Keeps drinks cold/hot for hours",
            "Lifetime warranty"
        ]
    },
    {
        id: 4,
        name: "Organic Cotton Baby Clothes",
        description: "Comfortable baby clothes made from 100% organic cotton",
        price: 89,
        image: "img/ogbaby.jpg",
        category: "Kids",
        carbonFootprint: 0.8,
        wasteSaved: 3.0,
        waterSaved: 30,
        sustainability: [
            "100% organic cotton",
            "Replaces polyester material",
            "Fair trade certified",
            "Machine washable",
            "Durable and long-lasting"
        ]
    },
    {
        id: 5,
        name: "Compostable Dish Sponges",
        description: "Plant-Based Compostable Sponges",
        price: 65,
        image: "img/cesponge.jpg",
        category: "Kitchen",
        carbonFootprint: 0.3,
        wasteSaved: 1.5,
        waterSaved: 15,
        sustainability: [
            "100% plant-based materials",
            "Fully compostable",
            "No plastic or synthetic materials",
            "Effective cleaning power",
            "Pack of 3 sponges"
        ]
    },
    {
        id: 6,
        name: "Solar-Powered Garden Lights",
        description: "Solar Lights for your garden",
        price: 499,
        image: "img/glights.jpg",
        category: "Electronics",
        carbonFootprint: 2.5,
        wasteSaved: 1.0,
        waterSaved: 100,
        sustainability: [
            "Renewable solar energy",
            "Reduces electricity consumption",
            "Eco-friendly materials",
            "Portable and lightweight",
            "Fast charging capability"
        ]
    }
];

// Load products from localStorage or use defaults
function loadProducts(){
    try{
        var stored = localStorage.getItem('products');
        if(stored){
            var parsed = JSON.parse(stored);
            if(parsed && parsed.length > 0){
                return parsed;
            }
        }
    } catch(e){
        console.error('Error loading products from localStorage:', e);
    }
    // Save defaults if none exist
    try{
        localStorage.setItem('products', JSON.stringify(DEFAULT_PRODUCTS));
    } catch(e){
        console.error('Error saving default products:', e);
    }
    return DEFAULT_PRODUCTS;
}

var PRODUCTS = loadProducts();
window.PRODUCTS = PRODUCTS;

// Expose loadProducts function globally
window.loadProducts = loadProducts;

// Function to save products
function saveProductsToStorage(products){
    try{
        localStorage.setItem('products', JSON.stringify(products));
        window.PRODUCTS = products;
        PRODUCTS = products;
    } catch(e){
        console.error('Error saving products:', e);
    }
}
window.saveProductsToStorage = saveProductsToStorage;

// Products and Search functionality
(function(){
    var productsContainer = document.getElementById('products-container');
    var searchInput = document.getElementById('search-input');
    var searchBtn = document.getElementById('search-btn');
    var searchResultsMessage = document.getElementById('search-results-message');
    var productDetailModal = document.getElementById('product-detail-modal');
    var productDetailOverlay = document.getElementById('product-detail-overlay');
    var closeProductModal = document.getElementById('close-product-modal');
    var productDetailBody = document.getElementById('product-detail-body');
    
    // Render products
    function renderProducts(products){
        if(!productsContainer) return;
        
        // On the homepage (section with id="product1") show only the first 8 products
        var toRender = products;
        try{
            if(document.getElementById('product1')){
                toRender = products.slice(0, 8);
            }
        } catch(e){ toRender = products; }

        productsContainer.innerHTML = '';
        
        if(products.length === 0){
            productsContainer.innerHTML = '<p style="text-align: center; padding: 40px;">No products found. Try a different search term.</p>';
            return;
        }
        
        toRender.forEach(function(product){
            var productCard = createProductCard(product);
            productsContainer.appendChild(productCard);
        });
        
        // Re-attach event listeners for add to cart
        attachAddToCartListeners();
    }
    
    // Create product card HTML
    function createProductCard(product){
        var card = document.createElement('div');
        card.className = 'pro';
        card.setAttribute('data-product-id', product.id);
        card.setAttribute('data-product-name', product.name);
        card.setAttribute('data-product-price', product.price);
        // choose a safe image: prefer product.image, otherwise fall back by id/name
        var safeImage = (product.image && String(product.image).trim()) ? product.image : (
            (product.id == 5 || (product.name && product.name.toLowerCase().includes('compost')))? 'img/cesponge.jpg' : 'img/bamb.jpg'
        );

        card.innerHTML = `
            <img src="${safeImage}" alt="${product.name}" onclick="showProductDetail(${product.id})">
            <div class="des">
                <span>${product.category}</span>
                <h5>${product.name}</h5>
                <p style="font-size: 12px; color: #465b52; margin: 5px 0;">${product.description}</p>
                <div class="carbon-footprint">
                    <i class="fas fa-leaf"></i> ${product.carbonFootprint} kg COâ‚‚
                </div>
                <div class="star">
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                </div>
                <h4>R${product.price}</h4>
                <button class="view-detail-btn" onclick="showProductDetail(${product.id}); event.stopPropagation();" style="margin: 5px 0; padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">View Details</button>
                <a href="#" class="add-to-cart-btn"><i class="fal fa-shopping-cart cart"></i></a>
            </div>
        `;
        
        // Make card clickable to show details
        card.addEventListener('click', function(e){
            if(!e.target.closest('.add-to-cart-btn') && !e.target.closest('.view-detail-btn')){
                showProductDetail(product.id);
            }
        });
        
        return card;
    }
    
    // Show product detail modal
    window.showProductDetail = function(productId){
        var product = PRODUCTS.find(function(p){ return p.id == productId; });
        if(!product || !productDetailBody) return;
        // determine safe image for detail view too
        var detailImage = (product.image && String(product.image).trim()) ? product.image : (
            (product.id == 5 || (product.name && product.name.toLowerCase().includes('compost')))? 'img/cesponge.jpg' : 'img/bamb.jpg'
        );

        productDetailBody.innerHTML = `
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 300px;">
                    <img src="${detailImage}" alt="${product.name}" style="width: 100%; border-radius: 8px;">
                </div>
                <div style="flex: 1; min-width: 300px;">
                    <h2>${product.name}</h2>
                    <p style="color: #465b52; margin: 10px 0;">${product.description}</p>
                    <div style="margin: 15px 0;">
                        <h3 style="color: var(--shop-color);">R${product.price}</h3>
                        <div class="carbon-footprint" style="margin-top: 10px;">
                            <i class="fas fa-leaf"></i> Carbon Footprint: ${product.carbonFootprint} kg COâ‚‚
                        </div>
                    </div>
                    
                    <div class="sustainability-info">
                        <h4>Sustainability Information</h4>
                        <ul>
                            ${product.sustainability.map(function(item){
                                return '<li>' + item + '</li>';
                            }).join('')}
                        </ul>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <p><strong>Environmental Impact per item:</strong></p>
                        <p>Waste Saved: ${product.wasteSaved} kg</p>
                        <p>Water Saved: ${product.waterSaved} L</p>
                    </div>
                    
                    <button onclick="addProductToCart(${product.id}); closeProductModal();" style="margin-top: 20px; padding: 12px 30px; background: var(--shop-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 16px;">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
        
        if(productDetailModal){
            productDetailModal.style.display = 'block';
        }
    };
    
    // Close product modal
    window.closeProductModal = function(){
        if(productDetailModal){
            productDetailModal.style.display = 'none';
        }
    };
    
    // Add product to cart from detail view
    window.addProductToCart = function(productId){
        var product = PRODUCTS.find(function(p){ return p.id == productId; });
        if(product && window.__cart && window.__cart.addToCart){
            var cartImage = (product.image && String(product.image).trim()) ? product.image : (
                (product.id == 5 || (product.name && product.name.toLowerCase().includes('compost')))? 'img/cesponge.jpg' : 'img/bamb.jpg'
            );
            window.__cart.addToCart(
                product.id,
                product.name,
                product.price,
                cartImage
            );
        }
    };
    
    // Search functionality
    function performSearch(query){
        if(!query || query.trim() === ''){
            renderProducts(PRODUCTS);
            if(searchResultsMessage){
                searchResultsMessage.style.display = 'none';
            }
            return;
        }
        
        var searchTerm = query.toLowerCase().trim();
        var filteredProducts = PRODUCTS.filter(function(product){
            return product.name.toLowerCase().includes(searchTerm) ||
                   product.description.toLowerCase().includes(searchTerm) ||
                   product.category.toLowerCase().includes(searchTerm);
        });
        
        renderProducts(filteredProducts);
        
        if(searchResultsMessage){
            if(filteredProducts.length > 0){
                searchResultsMessage.textContent = `Found ${filteredProducts.length} product(s) for "${query}"`;
                searchResultsMessage.style.display = 'block';
            } else {
                searchResultsMessage.textContent = `No products found for "${query}"`;
                searchResultsMessage.style.display = 'block';
            }
        }
    }
    
    // Attach search event listeners
    if(searchBtn){
        searchBtn.addEventListener('click', function(){
            var query = searchInput ? searchInput.value : '';
            performSearch(query);
        });
    }
    
    if(searchInput){
        searchInput.addEventListener('keypress', function(e){
            if(e.key === 'Enter'){
                performSearch(searchInput.value);
            }
        });
    }
    
    // Product detail modal close handlers
    if(closeProductModal){
        closeProductModal.addEventListener('click', function(){
            window.closeProductModal();
        });
    }
    
    if(productDetailOverlay){
        productDetailOverlay.addEventListener('click', function(){
            window.closeProductModal();
        });
    }
    
    // Re-attach add to cart listeners
    function attachAddToCartListeners(){
        var addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
        addToCartButtons.forEach(function(button){
            button.addEventListener('click', function(e){
                e.preventDefault();
                e.stopPropagation();
                var productCard = button.closest('.pro');
                if(productCard){
                    var productId = productCard.getAttribute('data-product-id');
                    var productName = productCard.getAttribute('data-product-name');
                    var productPrice = productCard.getAttribute('data-product-price');
                    var productImage = productCard.querySelector('img');
                    var imageSrc = productImage ? productImage.src : '';
                    
                    if(productId && productName && productPrice && window.__cart && window.__cart.addToCart){
                        window.__cart.addToCart(productId, productName, productPrice, imageSrc);
                    }
                }
            });
        });
    }
    
    // Function to refresh products from storage
    function refreshProducts(){
        PRODUCTS = loadProducts();
        window.PRODUCTS = PRODUCTS;
        if(productsContainer){
            renderProducts(PRODUCTS);
        }
    }
    
    // Refresh products when storage changes (for admin updates)
    window.addEventListener('storage', function(e){
        if(e.key === 'products'){
            refreshProducts();
        }
    });
    
    // Initialize - render all products
    if(productsContainer){
        renderProducts(PRODUCTS);
    }
    
    // Expose refresh function
    window.refreshProducts = refreshProducts;
})();

// Attach profile link handler so dashboard is shown only when user clicks 'Profile'
(function(){
    var profileLink = document.getElementById('profile-link');
    if(!profileLink) return;

    // prevent double-binding
    if(profileLink.__boundForProfile) return;
    profileLink.__boundForProfile = true;

    profileLink.addEventListener('click', function(e){
        e.preventDefault();
        // Prefer existing helper from index.html if available
        if(typeof showUserOrders === 'function'){
            try{ showUserOrders(); return; } catch(err){}
        }

        // Fallback: show user dashboard and hide homepage sections
        try{
            var hero = document.getElementById('hero'); if(hero) hero.style.display = 'none';
            var feature = document.getElementById('feature'); if(feature) feature.style.display = 'none';
            var product1 = document.getElementById('product1'); if(product1) product1.style.display = 'none';
            var userDash = document.getElementById('user-dashboard'); if(userDash) userDash.style.display = '';
            var ordersSection = document.getElementById('user-orders-section'); if(ordersSection) ordersSection.style.display = '';
        }catch(e){ console.warn('Could not show user dashboard:', e); }
    });
})();

// Attach admin link handler so admin dashboard is shown only when 'Admin' is clicked
(function(){
    var adminLink = document.getElementById('admin-link');
    if(!adminLink) return;

    if(adminLink.__boundForAdmin) return;
    adminLink.__boundForAdmin = true;

    adminLink.addEventListener('click', function(e){
        e.preventDefault();
        // If there's an admin init helper (e.g., admin.js) prefer to use it
        if(typeof initAdmin === 'function'){
            try{ initAdmin(); return; } catch(err){}
        }

        try{
            var hero = document.getElementById('hero'); if(hero) hero.style.display = 'none';
            var feature = document.getElementById('feature'); if(feature) feature.style.display = 'none';
            var product1 = document.getElementById('product1'); if(product1) product1.style.display = 'none';
            var adminDash = document.getElementById('admin-dashboard'); if(adminDash) adminDash.style.display = '';
        } catch(e){ console.warn('Could not show admin dashboard:', e); }
    });
})();
