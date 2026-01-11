// User Profile Management Functionality
(function(){
    // Profile modal elements
    var profileModal = document.getElementById('profile-modal');
    var profileModalOverlay = document.getElementById('profile-modal-overlay');
    var closeProfileModal = document.getElementById('close-profile-modal');
    var cancelProfileModal = document.getElementById('cancel-profile-modal');
    var manageProfileCard = document.getElementById('manage-profile-card');
    var viewOrdersCard = document.getElementById('view-orders-card');
    var profileForm = document.getElementById('profile-form');
    var preferencesForm = document.getElementById('preferences-form');
    var profileError = document.getElementById('profile-error');
    var profileSuccess = document.getElementById('profile-success');
    var preferencesSuccess = document.getElementById('preferences-success');
    
    // Profile tab functionality
    var profileTabButtons = document.querySelectorAll('.profile-tab-btn');
    var profileTabContents = document.querySelectorAll('.profile-tab-content');
    
    profileTabButtons.forEach(function(button){
        button.addEventListener('click', function(){
            var targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            profileTabButtons.forEach(function(btn){ btn.classList.remove('active'); });
            profileTabContents.forEach(function(content){ content.classList.remove('active'); });
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab + '-tab').classList.add('active');
        });
    });
    
    // Get current user
    function getCurrentUser(){
        try{
            return JSON.parse(localStorage.getItem('currentUser')) || null;
        } catch(e){
            return null;
        }
    }
    
    // Get users from localStorage
    function getUsers(){
        try{
            return JSON.parse(localStorage.getItem('users')) || [];
        } catch(e){
            return [];
        }
    }
    
    // Save users to localStorage
    function saveUsers(users){
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Update current user in localStorage
    function updateCurrentUser(user){
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    // Get user preferences
    function getUserPreferences(){
        try{
            var user = getCurrentUser();
            if(user && user.preferences){
                return user.preferences;
            }
            // Default preferences
            return {
                newsletter: false,
                promotional: false,
                productUpdates: false,
                orderUpdates: true,
                ecoTips: false,
                emailFrequency: 'monthly'
            };
        } catch(e){
            return {
                newsletter: false,
                promotional: false,
                productUpdates: false,
                orderUpdates: true,
                ecoTips: false,
                emailFrequency: 'monthly'
            };
        }
    }
    
    // Load profile data into form
    function loadProfileData(){
        var user = getCurrentUser();
        if(!user) return;
        
        document.getElementById('profile-name').value = user.name || '';
        document.getElementById('profile-email').value = user.email || '';
        document.getElementById('profile-phone').value = user.phone || '';
        document.getElementById('profile-address').value = user.address || '';
        document.getElementById('profile-city').value = user.city || '';
        document.getElementById('profile-postal-code').value = user.postalCode || '';
        
        // Load preferences
        var preferences = getUserPreferences();
        document.getElementById('newsletter-subscription').checked = preferences.newsletter || false;
        document.getElementById('promotional-emails').checked = preferences.promotional || false;
        document.getElementById('product-updates').checked = preferences.productUpdates || false;
        document.getElementById('order-updates').checked = preferences.orderUpdates !== false; // Default to true
        document.getElementById('eco-tips').checked = preferences.ecoTips || false;
        document.getElementById('email-frequency').value = preferences.emailFrequency || 'monthly';
    }
    
    // Show profile modal
    function showProfileModal(){
        loadProfileData();
        if(profileModal){
            profileModal.style.display = 'block';
            // Reset to personal tab
            profileTabButtons.forEach(function(btn){ btn.classList.remove('active'); });
            profileTabContents.forEach(function(content){ content.classList.remove('active'); });
            document.querySelector('.profile-tab-btn[data-tab="personal"]').classList.add('active');
            document.getElementById('personal-tab').classList.add('active');
        }
    }
    
    // Close profile modal
    function closeProfileModalFunc(){
        if(profileModal){
            profileModal.style.display = 'none';
            if(profileError) profileError.style.display = 'none';
            if(profileSuccess) profileSuccess.style.display = 'none';
            if(preferencesSuccess) preferencesSuccess.style.display = 'none';
        }
    }
    
    // Handle profile form submit
    if(profileForm){
        profileForm.addEventListener('submit', function(e){
            e.preventDefault();
            
            var user = getCurrentUser();
            if(!user){
                showError('You must be logged in to update your profile.');
                return;
            }
            
            var name = document.getElementById('profile-name').value;
            var email = document.getElementById('profile-email').value;
            var phone = document.getElementById('profile-phone').value;
            var address = document.getElementById('profile-address').value;
            var city = document.getElementById('profile-city').value;
            var postalCode = document.getElementById('profile-postal-code').value;
            var currentPassword = document.getElementById('profile-current-password').value;
            var newPassword = document.getElementById('profile-new-password').value;
            var confirmPassword = document.getElementById('profile-confirm-password').value;
            
            // Validate email
            if(!email || !email.includes('@')){
                showError('Please enter a valid email address.');
                return;
            }
            
            // Handle password change
            if(newPassword || confirmPassword || currentPassword){
                if(!currentPassword){
                    showError('Please enter your current password to change it.');
                    return;
                }
                if(newPassword.length < 6){
                    showError('New password must be at least 6 characters long.');
                    return;
                }
                if(newPassword !== confirmPassword){
                    showError('New passwords do not match.');
                    return;
                }
                // In a real app, verify current password with server
                // For demo, we'll just update it
            }
            
            // Update user data
            var users = getUsers();
            var userIndex = users.findIndex(function(u){ return u.email === user.email; });
            
            // Create updated user object
            var updatedUser = {};
            for(var key in user){
                if(user.hasOwnProperty(key)){
                    updatedUser[key] = user[key];
                }
            }
            updatedUser.name = name;
            updatedUser.email = email;
            updatedUser.phone = phone;
            updatedUser.address = address;
            updatedUser.city = city;
            updatedUser.postalCode = postalCode;
            
            // Update password if provided
            if(newPassword && newPassword === confirmPassword){
                updatedUser.password = newPassword;
            }
            
            // Update in users array
            if(userIndex !== -1){
                users[userIndex] = updatedUser;
                saveUsers(users);
            }
            
            // Update current user
            updateCurrentUser(updatedUser);
            
            // Update UI
            var userNameLabel = document.getElementById('user-name-label');
            if(userNameLabel) userNameLabel.textContent = updatedUser.name || updatedUser.email;
            
            // Update ecopoints if displayed
            var ecoPointsLabel = document.getElementById('ecopoints-balance');
            if(ecoPointsLabel && updatedUser.ecopoints !== undefined){
                ecoPointsLabel.textContent = String(updatedUser.ecopoints);
            }
            
            // Clear password fields
            document.getElementById('profile-current-password').value = '';
            document.getElementById('profile-new-password').value = '';
            document.getElementById('profile-confirm-password').value = '';
            
            showSuccess('Profile updated successfully!');
            
            // Refresh after a moment
            setTimeout(function(){
                closeProfileModalFunc();
                // Reload profile data in case user reopens
                loadProfileData();
            }, 1500);
        });
    }
    
    // Handle preferences form submit
    if(preferencesForm){
        preferencesForm.addEventListener('submit', function(e){
            e.preventDefault();
            
            var user = getCurrentUser();
            if(!user){
                showError('You must be logged in to update preferences.');
                return;
            }
            
            var preferences = {
                newsletter: document.getElementById('newsletter-subscription').checked,
                promotional: document.getElementById('promotional-emails').checked,
                productUpdates: document.getElementById('product-updates').checked,
                orderUpdates: document.getElementById('order-updates').checked,
                ecoTips: document.getElementById('eco-tips').checked,
                emailFrequency: document.getElementById('email-frequency').value
            };
            
            // Update user preferences
            var users = getUsers();
            var userIndex = users.findIndex(function(u){ return u.email === user.email; });
            
            // Create updated user object
            var updatedUser = {};
            for(var key in user){
                if(user.hasOwnProperty(key)){
                    updatedUser[key] = user[key];
                }
            }
            updatedUser.preferences = preferences;
            
            // Update in users array
            if(userIndex !== -1){
                users[userIndex] = updatedUser;
                saveUsers(users);
            }
            
            // Update current user
            updateCurrentUser(updatedUser);
            
            if(preferencesSuccess){
                preferencesSuccess.textContent = 'Preferences saved successfully!';
                preferencesSuccess.style.display = 'block';
                setTimeout(function(){
                    preferencesSuccess.style.display = 'none';
                }, 2000);
            }
        });
    }
    
    // Show error message
    function showError(message){
        if(profileError){
            profileError.textContent = message;
            profileError.style.display = 'block';
            if(profileSuccess) profileSuccess.style.display = 'none';
        }
    }
    
    // Show success message
    function showSuccess(message){
        if(profileSuccess){
            profileSuccess.textContent = message;
            profileSuccess.style.display = 'block';
            if(profileError) profileError.style.display = 'none';
        }
    }
    
    // Event listeners
    if(manageProfileCard){
        manageProfileCard.addEventListener('click', showProfileModal);
    }
    
    if(closeProfileModal){
        closeProfileModal.addEventListener('click', closeProfileModalFunc);
    }
    
    if(profileModalOverlay){
        profileModalOverlay.addEventListener('click', closeProfileModalFunc);
    }
    
    if(cancelProfileModal){
        cancelProfileModal.addEventListener('click', closeProfileModalFunc);
    }
    
    if(document.getElementById('cancel-preferences-modal')){
        document.getElementById('cancel-preferences-modal').addEventListener('click', closeProfileModalFunc);
    }
    
    // ========== ORDERS VIEWING ==========
    
    // Load user orders
    function loadUserOrders(){
        var user = getCurrentUser();
        if(!user) return;
        
        var orders = [];
        try{
            orders = JSON.parse(localStorage.getItem('orders')) || [];
        } catch(e){
            orders = [];
        }
        
        // Filter orders for current user
        var userOrders = orders.filter(function(order){
            return order.email === user.email || order.name === user.name;
        });
        
        // Sort by date (newest first)
        userOrders.sort(function(a, b){
            return new Date(b.date || 0) - new Date(a.date || 0);
        });
        
        renderUserOrders(userOrders);
    }
    
    // Render user orders
    function renderUserOrders(orders){
        var ordersList = document.getElementById('user-orders-list');
        var ordersSection = document.getElementById('user-orders-section');
        
        if(!ordersList) return;
        
        if(orders.length === 0){
            ordersList.innerHTML = '<p>You have no orders yet. <a href="index.html" style="color: var(--shop-color);">Start shopping!</a></p>';
            if(ordersSection) ordersSection.style.display = 'block';
            return;
        }
        
        ordersList.innerHTML = '';
        
        orders.forEach(function(order){
            var orderCard = document.createElement('div');
            orderCard.className = 'user-order-card';
            
            var statusClass = 'badge-' + (order.status || 'pending');
            var itemsHtml = '';
            if(order.items && order.items.length > 0){
                itemsHtml = order.items.map(function(item){
                    return `
                        <div class="user-order-item">
                            <span>${item.name} x ${item.quantity || 1}</span>
                            <span>R${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                        </div>
                    `;
                }).join('');
            }
            
            var impactHtml = '';
            if(order.environmentalImpact){
                impactHtml = `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0;">
                        <p style="font-size: 12px; color: #4CAF50;">
                            <strong>Environmental Impact:</strong> 
                            ${order.environmentalImpact.carbon} kg CO₂ saved, 
                            ${order.environmentalImpact.waste} kg waste saved, 
                            ${order.environmentalImpact.water} L water saved
                        </p>
                    </div>
                `;
            }
            
            orderCard.innerHTML = `
                <h4>Order #${order.id} - <span class="badge ${statusClass}">${order.status || 'pending'}</span></h4>
                <p><strong>Date:</strong> ${order.date ? new Date(order.date).toLocaleString() : 'N/A'}</p>
                <p><strong>Total:</strong> R${order.subtotal ? order.subtotal.toFixed(2) : '0.00'}</p>
                <div class="user-order-items">
                    <strong>Items:</strong>
                    ${itemsHtml}
                </div>
                ${impactHtml}
            `;
            
            ordersList.appendChild(orderCard);
        });
        
        if(ordersSection) ordersSection.style.display = 'block';
    }
    
    // Toggle orders view
    function toggleOrdersView(){
        var ordersSection = document.getElementById('user-orders-section');
        if(ordersSection){
            if(ordersSection.style.display === 'none'){
                loadUserOrders();
            } else {
                ordersSection.style.display = 'none';
            }
        }
    }
    
    // Event listener for view orders card
    if(viewOrdersCard){
        viewOrdersCard.addEventListener('click', function(){
            toggleOrdersView();
        });
    }
    
    // Expose functions globally if needed
    window.showProfileModal = showProfileModal;
    window.loadUserOrders = loadUserOrders;
})();

