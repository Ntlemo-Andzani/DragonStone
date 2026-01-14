// Protect admin page
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        // Not logged in at all
        alert('You must log in first.');
        window.location.href = 'login.html';
        return;
    }

    // Optionally, check role from profiles table
    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (error || !profile || profile.role !== 'admin') {
        alert('Access denied: Admins only.');
        window.location.href = 'index.html';
        return;
    }

    // Only now initialize the admin dashboard
    initAdmin();
});

// Admin Dashboard Functionality
async function initAdmin(){
    // Try to sync users from server on admin load (non-blocking). This will
    // update `localStorage.users` if the server endpoint is available.
    fetchUsersFromServer();

    // Listen for users changes from other tabs/windows and refresh the
    // users table in real-time when localStorage.users is updated.
    window.addEventListener('storage', function(e){
        try{
            if(!e) return;
            if(e.key === 'users'){
                if(typeof loadUsers === 'function'){
                    try{ loadUsers(); } catch(err){}
                }
            }
        } catch(err){}
    });
    
    // Product categories used across the admin product management UI
    var PRODUCT_CATEGORIES = [
        'Cleaning', 'Household', 'Kitchen', 'Dining', 'Home Décor', 'Living',
        'Bathroom', 'Personal Care', 'Lifestyle', 'Wellness', 'Kids', 'Pets',
        'Outdoor', 'Garden'
    ];

    function populateCategoryControls(){
        var filter = document.getElementById('product-category-filter');
        var select = document.getElementById('product-category');
        if(filter){
            var options = ['<option value="all">All</option>'].concat(
                PRODUCT_CATEGORIES.map(function(c){ return '<option value="'+c+'">'+c+'</option>'; })
            ).join('');
            filter.innerHTML = options;
        }
        if(select){
            var opts = PRODUCT_CATEGORIES.map(function(c){ return '<option value="'+c+'">'+c+'</option>'; }).join('');
            select.innerHTML = opts;
        }
    }

    // Populate category selects now
    try{ populateCategoryControls(); } catch(e){}

    // Get users from localStorage
    function getUsers(){
        try{
            return JSON.parse(localStorage.getItem('users')) || [];
        } catch(e){
            return [];
        }
    }

    // Fetch users from the server and update localStorage (async). This keeps
    // the existing localStorage-based UI working while ensuring the admin
    // dashboard can sync authoritative data from the DB.
    function fetchUsersFromServer(){
        try{
            // Include credentials so the PHP session cookie is sent. Requires
            // the client to have logged in via api/login.php.
            fetch('api/list_users.php', { method: 'GET', credentials: 'include' })
            .then(function(res){
                if(res.status === 401){
                    console.warn('Not authenticated as admin, server refused users listing');
                    return { success: false };
                }
                return res.json();
            })
            .then(function(data){
                if(data && data.success && Array.isArray(data.users)){
                    try{
                        localStorage.setItem('users', JSON.stringify(data.users));
                        // Notify other parts of the app/tabs
                        try{ window.dispatchEvent(new Event('storage')); } catch(e){}
                        // Refresh the users table if the function exists
                        if(typeof loadUsers === 'function'){
                            try{ loadUsers(); } catch(e){}
                        }
                    } catch(e){ console.error('Failed to save users from server', e); }
                } else {
                    // Not fatal; keep using localStorage copy
                    console.warn('list_users.php returned no users or error', data);
                }
            })
            .catch(function(err){
                console.warn('Could not fetch users from server', err);
            });
        } catch(e){
            console.warn('fetchUsersFromServer failed', e);
        }
    }

    // Save users to localStorage
    function saveUsers(users){
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Get products from window.PRODUCTS or localStorage
    function getProducts(){
        // Try to use window.PRODUCTS first (loaded by script.js)
        if(window.PRODUCTS && Array.isArray(window.PRODUCTS) && window.PRODUCTS.length > 0){
            return window.PRODUCTS;
        }
        // Fall back to localStorage
        try{
            var stored = localStorage.getItem('products');
            if(stored){
                var parsed = JSON.parse(stored);
                if(parsed && parsed.length > 0){
                    window.PRODUCTS = parsed;
                    return parsed;
                }
            }
        } catch(e){
            console.error('Error loading products:', e);
        }
        // Return empty array if nothing found
        return [];
    }

    // Save products to localStorage and update window.PRODUCTS
    function saveProducts(products){
        localStorage.setItem('products', JSON.stringify(products));
        window.PRODUCTS = products;
        // Trigger storage event for other tabs/pages
        window.dispatchEvent(new Event('storage'));
        // Also update in script.js if it exists
        if(typeof PRODUCTS !== 'undefined'){
            PRODUCTS = products;
        }
        // Call refresh function if it exists
        if(typeof window.refreshProducts === 'function'){
            window.refreshProducts();
        }
    }

    // Get orders from localStorage
    function getOrders(){
        try{
            return JSON.parse(localStorage.getItem('orders')) || [];
        } catch(e){
            return [];
        }
    }

    // Save orders to localStorage
    function saveOrders(orders){
        localStorage.setItem('orders', JSON.stringify(orders));
    }

    // Tab functionality
    var tabButtons = document.querySelectorAll('.tab-btn');
    var tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(function(button){
        button.addEventListener('click', function(){
            var targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(function(btn){ btn.classList.remove('active'); });
            tabContents.forEach(function(content){ content.classList.remove('active'); });
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab + '-tab').classList.add('active');
            
            // Load data for the active tab
            if(targetTab === 'users'){
                loadUsers();
            } else if(targetTab === 'products'){
                loadProducts();
            } else if(targetTab === 'orders'){
                loadOrders();
            } else if(targetTab === 'analytics'){
                loadAnalytics();
            } else if(targetTab === 'community'){
                loadModeration();
            } else if(targetTab === 'support'){
                loadSupportPanel();
            } else if(targetTab === 'content'){
                // Content review helpers could be added here
            } else if(targetTab === 'customer-support'){
                // Customer support wiring is via orders & support tickets
            }
        });
    });

    // ========== USER MANAGEMENT ==========
    
    // Load users from Supabase
    async function loadUsersForAdmin() {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, name, email, role, eco_points, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load users:', error);
        return;
      }

      renderUsers(data);
    }

    // Render users in the table
    function renderUsers(users) {
      const tbody = document.querySelector('#users-table tbody');
      tbody.innerHTML = '';

      users.forEach(user => {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${user.id.slice(0, 8)}</td>
          <td>${user.name || 'N/A'}</td>
          <td>${user.email}</td>
          <td>N/A</td>
          <td>
            <span class="${user.role === 'admin' ? 'admin-badge' : 'user-badge'}">
              ${user.role.toUpperCase()}
            </span>
          </td>
          <td>${user.eco_points}</td>
          <td>${new Date(user.created_at).toLocaleDateString()}</td>
          <td>
            <button onclick="toggleRole('${user.id}', '${user.role}')">Edit</button>
            <button onclick="deleteUser('${user.id}')">Delete</button>
          </td>
        `;

        tbody.appendChild(row);
      });
    }
    
    function loadUsers(){
        var users = getUsers();
        var tbody = document.getElementById('users-table-body');
        var searchTerm = document.getElementById('user-search').value.toLowerCase();
        var roleFilter = document.getElementById('user-role-filter').value;
        
        // Filter users
        var filteredUsers = users.filter(function(user){
            var matchesSearch = !searchTerm || 
                user.name.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm);
            var matchesRole = roleFilter === 'all' || user.role === roleFilter;
            return matchesSearch && matchesRole;
        });
        
        // Render users table
        if(tbody){
            tbody.innerHTML = '';
            filteredUsers.forEach(function(user){
                var row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id || 'N/A'}</td>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.phone || 'N/A'}</td>
                    <td><span class="badge badge-${user.role}">${user.role}</span></td>
                    <td>${user.ecopoints || 0}</td>
                    <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn-sm btn-edit" onclick="editUser(${user.id || 'null'})">Edit</button>
                        <button class="btn-sm btn-delete" onclick="deleteUser(${user.id || 'null'})">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // Update stats
        document.getElementById('total-users-count').textContent = users.length;
        document.getElementById('active-users-count').textContent = users.filter(function(u){ return u.role === 'user'; }).length;
        document.getElementById('admin-count').textContent = users.filter(function(u){ return u.role === 'admin'; }).length;
    }

    // Add user button
    document.getElementById('add-user-btn').addEventListener('click', function(){
        document.getElementById('user-modal-title').textContent = 'Add New User';
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = '';
        document.getElementById('user-modal').style.display = 'block';
    });

    // User form submit
    document.getElementById('user-form').addEventListener('submit', function(e){
        e.preventDefault();
        var userId = document.getElementById('user-id').value;
        var users = getUsers();
        var userData = {
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            phone: document.getElementById('user-phone').value,
            role: document.getElementById('user-role').value,
            ecopoints: parseInt(document.getElementById('user-ecopoints').value) || 100,
            password: document.getElementById('user-password').value,
            created_at: new Date().toISOString()
        };
        
        if(userId){
            // Edit existing user
            var index = users.findIndex(function(u){ return u.id == userId; });
            if(index !== -1){
                userData.id = users[index].id;
                userData.created_at = users[index].created_at || userData.created_at;
                if(!userData.password){
                    userData.password = users[index].password;
                }
                users[index] = userData;
            }
        } else {
            // Add new user
            userData.id = Date.now();
            users.push(userData);
        }
        
        saveUsers(users);
        loadUsers();
        document.getElementById('user-modal').style.display = 'none';
        alert('User saved successfully!');
    });

    // Edit user
    window.editUser = function(userId){
        var users = getUsers();
        var user = users.find(function(u){ return u.id == userId; });
        if(user){
            document.getElementById('user-modal-title').textContent = 'Edit User';
            document.getElementById('user-id').value = user.id;
            document.getElementById('user-name').value = user.name || '';
            document.getElementById('user-email').value = user.email || '';
            document.getElementById('user-phone').value = user.phone || '';
            document.getElementById('user-role').value = user.role || 'user';
            document.getElementById('user-ecopoints').value = user.ecopoints || 100;
            document.getElementById('user-password').value = '';
            document.getElementById('user-modal').style.display = 'block';
        }
    };

    // Delete user
    window.deleteUser = function(userId){
        if(confirm('Are you sure you want to delete this user?')){
            var users = getUsers();
            users = users.filter(function(u){ return u.id != userId; });
            saveUsers(users);
            loadUsers();
            alert('User deleted successfully!');
        }
    };

    // Toggle user role (promote/demote)
    window.toggleRole = async function(userId, currentRole) {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';

      const { error } = await supabaseClient
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (!error) {
        await loadUsersForAdmin();
      } else {
        alert('Failed to update user role: ' + error.message);
      }
    };

    // Update eco points for a user
    window.updateEcoPoints = async function(userId, points) {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ eco_points: points })
        .eq('id', userId);

      if (!error) {
        await loadUsersForAdmin();
      } else {
        alert('Failed to update eco points: ' + error.message);
      }
    };

    // User search and filter
    document.getElementById('user-search').addEventListener('input', loadUsers);
    document.getElementById('user-role-filter').addEventListener('change', loadUsers);

    // User modal close
    document.getElementById('close-user-modal').addEventListener('click', function(){
        document.getElementById('user-modal').style.display = 'none';
    });
    document.getElementById('user-modal-overlay').addEventListener('click', function(){
        document.getElementById('user-modal').style.display = 'none';
    });
    document.getElementById('cancel-user-modal').addEventListener('click', function(){
        document.getElementById('user-modal').style.display = 'none';
    });

    // ========== PRODUCT MANAGEMENT ==========
    
    function loadProducts(){
        var products = getProducts();
        var tbody = document.getElementById('products-table-body');
        var searchTerm = document.getElementById('product-search').value.toLowerCase();
        var categoryFilter = document.getElementById('product-category-filter').value;
        
        // Filter products
        var filteredProducts = products.filter(function(product){
            var matchesSearch = !searchTerm || 
                product.name.toLowerCase().includes(searchTerm) ||
                (product.description && product.description.toLowerCase().includes(searchTerm));
            var matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
        
        // Render products table
        if(tbody){
            tbody.innerHTML = '';
            filteredProducts.forEach(function(product){
                var row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.id}</td>
                    <td><img src="${product.image || 'img/bamb.jpg'}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                    <td>${product.name}</td>
                    <td>${product.category || 'N/A'}</td>
                    <td>R${product.price}</td>
                    <td>${product.carbonFootprint || 0} kg CO₂</td>
                    <td>${product.stock !== undefined ? product.stock : 'N/A'}</td>
                    <td>
                        <button class="btn-sm btn-edit" onclick="editProduct(${product.id})">Edit</button>
                        <button class="btn-sm btn-delete" onclick="deleteProduct(${product.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // Update stats
        var categories = [...new Set(products.map(function(p){ return p.category; }))];
        document.getElementById('total-products-count').textContent = products.length;
        document.getElementById('categories-count').textContent = categories.length;
        document.getElementById('low-stock-count').textContent = products.filter(function(p){ return p.stock !== undefined && p.stock < 10; }).length;
    }

    // Add product button
    document.getElementById('add-product-btn').addEventListener('click', function(){
        document.getElementById('product-modal-title').textContent = 'Add New Product';
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        // Set default category to first of PRODUCT_CATEGORIES if available
        try{
            var defaultCat = (PRODUCT_CATEGORIES && PRODUCT_CATEGORIES.length) ? PRODUCT_CATEGORIES[0] : '';
            var productCatEl = document.getElementById('product-category');
            if(productCatEl){ productCatEl.value = defaultCat; }
        } catch(e){}
        document.getElementById('product-modal').style.display = 'block';
    });

    // Product form submit
    document.getElementById('product-form').addEventListener('submit', function(e){
        e.preventDefault();
        var productId = document.getElementById('product-id').value;
        var products = getProducts();
        var sustainabilityText = document.getElementById('product-sustainability').value;
        var sustainability = sustainabilityText.split('\n').filter(function(s){ return s.trim(); });
        
        var productData = {
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            image: document.getElementById('product-image').value || 'img/bamb.jpg',
            stock: parseInt(document.getElementById('product-stock').value) || 0,
            carbonFootprint: parseFloat(document.getElementById('product-carbon').value) || 0,
            wasteSaved: parseFloat(document.getElementById('product-waste').value) || 0,
            waterSaved: parseFloat(document.getElementById('product-water').value) || 0,
            sustainability: sustainability
        };
        
        if(productId){
            // Edit existing product
            var index = products.findIndex(function(p){ return p.id == productId; });
            if(index !== -1){
                productData.id = products[index].id;
                products[index] = productData;
            }
        } else {
            // Add new product
            productData.id = products.length > 0 ? Math.max.apply(null, products.map(function(p){ return p.id; })) + 1 : 1;
            products.push(productData);
        }
        
        saveProducts(products);
        loadProducts();
        document.getElementById('product-modal').style.display = 'none';
        alert('Product saved successfully!');
        
        // Reload products on index page if it's open
        if(window.location.pathname.includes('index.html') && typeof renderProducts === 'function'){
            renderProducts(products);
        }
    });

    // Edit product
    window.editProduct = function(productId){
        var products = getProducts();
        var product = products.find(function(p){ return p.id == productId; });
        if(product){
            document.getElementById('product-modal-title').textContent = 'Edit Product';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-price').value = product.price || '';
            document.getElementById('product-category').value = product.category || (PRODUCT_CATEGORIES && PRODUCT_CATEGORIES.length ? PRODUCT_CATEGORIES[0] : '');
            document.getElementById('product-image').value = product.image || '';
            document.getElementById('product-stock').value = product.stock !== undefined ? product.stock : 0;
            document.getElementById('product-carbon').value = product.carbonFootprint || 0;
            document.getElementById('product-waste').value = product.wasteSaved || 0;
            document.getElementById('product-water').value = product.waterSaved || 0;
            document.getElementById('product-sustainability').value = (product.sustainability || []).join('\n');
            document.getElementById('product-modal').style.display = 'block';
        }
    };

    // Delete product
    window.deleteProduct = function(productId){
        if(confirm('Are you sure you want to delete this product?')){
            var products = getProducts();
            products = products.filter(function(p){ return p.id != productId; });
            saveProducts(products);
            loadProducts();
            alert('Product deleted successfully!');
        }
    };

    // Product search and filter
    document.getElementById('product-search').addEventListener('input', loadProducts);
    document.getElementById('product-category-filter').addEventListener('change', loadProducts);

    // Product modal close
    document.getElementById('close-product-modal-btn').addEventListener('click', function(){
        document.getElementById('product-modal').style.display = 'none';
    });
    document.getElementById('product-modal-overlay').addEventListener('click', function(){
        document.getElementById('product-modal').style.display = 'none';
    });
    document.getElementById('cancel-product-modal').addEventListener('click', function(){
        document.getElementById('product-modal').style.display = 'none';
    });

    // ========== ORDER MANAGEMENT ==========
    
    function loadOrders(){
        var orders = getOrders();
        var tbody = document.getElementById('orders-table-body');
        var searchTerm = document.getElementById('order-search').value.toLowerCase();
        var statusFilter = document.getElementById('order-status-filter').value;
        var dateFilter = document.getElementById('order-date-filter').value;
        
        // Filter orders
        var filteredOrders = orders.filter(function(order){
            var matchesSearch = !searchTerm || 
                String(order.id).includes(searchTerm) ||
                (order.name && order.name.toLowerCase().includes(searchTerm)) ||
                (order.email && order.email.toLowerCase().includes(searchTerm));
            var matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            var matchesDate = !dateFilter || (order.date && order.date.startsWith(dateFilter));
            return matchesSearch && matchesStatus && matchesDate;
        });
        
        // Sort by date (newest first)
        filteredOrders.sort(function(a, b){
            return new Date(b.date || 0) - new Date(a.date || 0);
        });
        
        // Render orders table
        if(tbody){
            tbody.innerHTML = '';
            filteredOrders.forEach(function(order){
                var row = document.createElement('tr');
                var itemCount = order.items ? order.items.length : 0;
                var statusClass = 'badge-' + (order.status || 'pending');
                row.innerHTML = `
                    <td>#${order.id}</td>
                    <td>${order.name || 'N/A'}<br><small>${order.email || ''}</small></td>
                    <td>${itemCount} item(s)</td>
                    <td>R${order.subtotal ? order.subtotal.toFixed(2) : '0.00'}</td>
                    <td><span class="badge ${statusClass}">${order.status || 'pending'}</span></td>
                    <td>${order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn-sm btn-edit" onclick="viewOrderDetail(${order.id})">View</button>
                        <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)" style="margin-left: 5px;">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            <option value="returned" ${order.status === 'returned' ? 'selected' : ''}>Returned</option>
                        </select>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // Update stats
        var totalRevenue = orders.reduce(function(sum, order){
            return sum + (order.subtotal || 0);
        }, 0);
        document.getElementById('total-orders-count').textContent = orders.length;
        document.getElementById('pending-orders-count').textContent = orders.filter(function(o){ return o.status === 'pending'; }).length;
        document.getElementById('total-revenue').textContent = 'R' + totalRevenue.toFixed(2);
    }

    // Update order status
    window.updateOrderStatus = function(orderId, newStatus){
        var orders = getOrders();
        var order = orders.find(function(o){ return o.id == orderId; });
        if(order){
            order.status = newStatus;
            order.updated_at = new Date().toISOString();
            saveOrders(orders);
            loadOrders();
            alert('Order status updated to ' + newStatus);
        }
    };

    // View order detail
    window.viewOrderDetail = function(orderId){
        var orders = getOrders();
        var order = orders.find(function(o){ return o.id == orderId; });
        if(order){
            var content = document.getElementById('order-detail-content');
            var itemsHtml = '';
            if(order.items && order.items.length > 0){
                itemsHtml = order.items.map(function(item){
                    return `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity || 1}</td>
                            <td>R${item.price.toFixed(2)}</td>
                            <td>R${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                        </tr>
                    `;
                }).join('');
            }
            
            var impactHtml = '';
            if(order.environmentalImpact){
                impactHtml = `
                    <div class="environmental-impact" style="margin-top: 15px;">
                        <h4>Environmental Impact</h4>
                        <p>Carbon Footprint: ${order.environmentalImpact.carbon} kg CO₂</p>
                        <p>Waste Saved: ${order.environmentalImpact.waste} kg</p>
                        <p>Water Saved: ${order.environmentalImpact.water} L</p>
                    </div>
                `;
            }
            
            content.innerHTML = `
                <div>
                    <h4>Order Information</h4>
                    <p><strong>Order ID:</strong> #${order.id}</p>
                    <p><strong>Date:</strong> ${order.date ? new Date(order.date).toLocaleString() : 'N/A'}</p>
                    <p><strong>Status:</strong> <span class="badge badge-${order.status}">${order.status}</span></p>
                </div>
                
                <div style="margin-top: 20px;">
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${order.name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${order.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${order.phone || 'N/A'}</p>
                    <p><strong>Address:</strong> ${order.address || 'N/A'}</p>
                </div>
                
                <div style="margin-top: 20px;">
                    <h4>Order Items</h4>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    <p style="margin-top: 15px;"><strong>Total: R${order.subtotal ? order.subtotal.toFixed(2) : '0.00'}</strong></p>
                </div>
                
                ${impactHtml}
                
                <div style="margin-top: 20px;">
                    <button class="btn-primary" onclick="processReturn(${order.id})" ${order.status === 'delivered' ? '' : 'disabled'}>Process Return</button>
                    <button class="btn-secondary" onclick="document.getElementById('order-detail-modal').style.display='none'">Close</button>
                </div>
            `;
            
            document.getElementById('order-detail-modal').style.display = 'block';
        }
    };

    // Process return
    window.processReturn = function(orderId){
        if(confirm('Process return for this order? This will update the order status to "returned".')){
            updateOrderStatus(orderId, 'returned');
            document.getElementById('order-detail-modal').style.display = 'none';
            alert('Return processed successfully. Order status updated to returned.');
        }
    };

    // Order search and filter
    document.getElementById('order-search').addEventListener('input', loadOrders);
    document.getElementById('order-status-filter').addEventListener('change', loadOrders);
    document.getElementById('order-date-filter').addEventListener('change', loadOrders);

    // Order detail modal close
    document.getElementById('close-order-detail-modal').addEventListener('click', function(){
        document.getElementById('order-detail-modal').style.display = 'none';
    });
    document.getElementById('order-detail-overlay').addEventListener('click', function(){
        document.getElementById('order-detail-modal').style.display = 'none';
    });

    // Export orders
    document.getElementById('export-orders-btn').addEventListener('click', function(){
        var orders = getOrders();
        var csv = 'Order ID,Date,Customer,Email,Total,Status\n';
        orders.forEach(function(order){
            csv += `${order.id},${order.date || ''},${order.name || ''},${order.email || ''},${order.subtotal || 0},${order.status || ''}\n`;
        });
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'orders_' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
    });

    // ========== ANALYTICS ==========
    
    function loadAnalytics(){
        var orders = getOrders();
        var products = getProducts();
        var users = getUsers();
        
        // Calculate analytics
        var totalRevenue = orders.reduce(function(sum, order){ return sum + (order.subtotal || 0); }, 0);
        var totalOrders = orders.length;
        var totalUsers = users.length;
        
        // Top products
        var productSales = {};
        orders.forEach(function(order){
            if(order.items){
                order.items.forEach(function(item){
                    if(!productSales[item.name]){
                        productSales[item.name] = 0;
                    }
                    productSales[item.name] += (item.quantity || 1);
                });
            }
        });
        
        var topProducts = Object.keys(productSales)
            .map(function(name){ return { name: name, sales: productSales[name] }; })
            .sort(function(a, b){ return b.sales - a.sales; })
            .slice(0, 5);
        
        // Environmental impact
        var totalCarbon = 0;
        var totalWaste = 0;
        var totalWater = 0;
        orders.forEach(function(order){
            if(order.environmentalImpact){
                totalCarbon += parseFloat(order.environmentalImpact.carbon) || 0;
                totalWaste += parseFloat(order.environmentalImpact.waste) || 0;
                totalWater += parseFloat(order.environmentalImpact.water) || 0;
            }
        });
        
        // Render analytics
        var topProductsHtml = topProducts.length > 0 ? 
            topProducts.map(function(p){
                return `<div style="padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>${p.name}</strong>: ${p.sales} sold</div>`;
            }).join('') : 
            '<p>No sales data available</p>';
        
        document.getElementById('top-products-list').innerHTML = topProductsHtml;
        
        document.getElementById('user-engagement-stats').innerHTML = `
            <p><strong>Total Users:</strong> ${totalUsers}</p>
            <p><strong>Total Orders:</strong> ${totalOrders}</p>
            <p><strong>Average Orders per User:</strong> ${totalUsers > 0 ? (totalOrders / totalUsers).toFixed(2) : 0}</p>
        `;
        
        document.getElementById('environmental-impact-stats').innerHTML = `
            <p><strong>Total Carbon Footprint:</strong> ${totalCarbon.toFixed(2)} kg CO₂</p>
            <p><strong>Total Waste Saved:</strong> ${totalWaste.toFixed(2)} kg</p>
            <p><strong>Total Water Saved:</strong> ${totalWater.toFixed(2)} L</p>
        `;
    }

    // ========== COMMUNITY / MODERATION & SUPPORT ==========

    // Posts (community blog) - localStorage fallback and server sync
    function getPosts(){
        try{
            return JSON.parse(localStorage.getItem('posts')) || [];
        } catch(e){
            return [];
        }
    }

    function savePosts(posts){
        localStorage.setItem('posts', JSON.stringify(posts));
    }

    function fetchPostsFromServer(){
        try{
            fetch('api/list_posts.php', { method: 'GET' })
            .then(function(res){ return res.json(); })
            .then(function(data){
                if(data && data.success && Array.isArray(data.posts)){
                    try{
                        // Merge server posts with any locally-stored comments (local comments should be preserved)
                        var serverPosts = data.posts || [];
                        var localPosts = [];
                        try{ localPosts = JSON.parse(localStorage.getItem('posts')) || []; } catch(e){ localPosts = []; }
                        var localById = {};
                        localPosts.forEach(function(lp){ if(lp && lp.id){ localById[String(lp.id)] = lp; } });

                        // Attach local comments to server posts if present
                        var merged = serverPosts.map(function(sp){
                            var key = String(sp.id);
                            var lp = localById[key];
                            if(lp && Array.isArray(lp.comments) && lp.comments.length){
                                sp.comments = sp.comments && Array.isArray(sp.comments) ? sp.comments.concat(lp.comments) : lp.comments.slice();
                            } else if(!sp.comments){
                                sp.comments = sp.comments || [];
                            }
                            return sp;
                        });

                        // Also preserve any entirely-local posts (with local ids) that may not exist on server yet
                        localPosts.forEach(function(lp){ if(lp && lp.id && String(lp.id).startsWith('local-')){ merged.unshift(lp); } });

                        localStorage.setItem('posts', JSON.stringify(merged));
                        try{ window.dispatchEvent(new Event('storage')); } catch(e){}
                        if(typeof loadModeration === 'function'){
                            try{ loadModeration(); } catch(e){}
                        }
                    } catch(e){ console.error('Failed to save posts from server', e); }
                } else {
                    console.warn('list_posts.php returned no posts or error', data);
                }
            })
            .catch(function(err){ console.warn('Could not fetch posts from server', err); });
        } catch(e){ console.warn('fetchPostsFromServer failed', e); }
    }

    function loadModeration(){
        var posts = getPosts();
        var tbody = document.getElementById('posts-table-body');
        var searchTerm = (document.getElementById('post-search')||{value:''}).value.toLowerCase();
        var statusFilter = (document.getElementById('post-status-filter')||{value:'all'}).value;

        var filtered = posts.filter(function(p){
            var matchesSearch = !searchTerm || (p.title && p.title.toLowerCase().includes(searchTerm)) || (p.author && p.author.toLowerCase().includes(searchTerm)) || (p.body && p.body.toLowerCase().includes(searchTerm));
            var matchesStatus = statusFilter === 'all' || (p.status === statusFilter);
            return matchesSearch && matchesStatus;
        });

        if(tbody){
            tbody.innerHTML = '';
            filtered.forEach(function(p){
                var row = document.createElement('tr');
                row.innerHTML = `
                    <td>${p.id || 'N/A'}</td>
                    <td>${p.title || '(no title)'}</td>
                    <td>${p.author || 'Anonymous'}</td>
                    <td>${(p.body || '').slice(0,120).replace(/\n/g,' ') + (p.body && p.body.length>120 ? '...' : '')}</td>
                    <td><span class="badge">${p.status || 'pending'}</span></td>
                    <td>${p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}</td>
                    <td>
                        <button class="btn-sm btn-primary" onclick="approvePost('${p.id}')">Approve</button>
                        <button class="btn-sm btn-danger" onclick="deletePost('${p.id}')">Delete</button>
                        <button class="btn-sm" onclick="viewPostDetail('${p.id}')">View</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    }

    // Approve post locally (and ideally via server)
    window.approvePost = function(postId){
        if(!confirm('Approve this post?')) return;
        var posts = getPosts();
        var idx = posts.findIndex(function(p){ return String(p.id) === String(postId); });
        if(idx !== -1){
            posts[idx].status = 'approved';
            posts[idx].updated_at = new Date().toISOString();
            savePosts(posts);
            // Optionally sync to server (TODO: implement approve endpoint)
            loadModeration();
            alert('Post approved.');
        }
    };


    // Delete post - calls server API then updates localStorage
    window.deletePost = function(postId){
        if(!confirm('Permanently delete this post? This cannot be undone.')) return;
        // Attempt server delete
        try{
            var form = new FormData();
            form.append('id', postId);
            fetch('api/delete_post.php', { method: 'POST', body: form })
            .then(function(res){ return res.json(); })
            .then(function(data){
                if(data && data.success){
                    // remove locally
                    var posts = getPosts();
                    posts = posts.filter(function(p){ return String(p.id) !== String(postId); });
                    savePosts(posts);
                    loadModeration();
                    alert('Post deleted successfully.');
                } else {
                    // still remove locally as fallback
                    var posts = getPosts();
                    posts = posts.filter(function(p){ return String(p.id) !== String(postId); });
                    savePosts(posts);
                    loadModeration();
                    alert('Post removed locally. Server deletion may have failed.');
                }
            })
            .catch(function(err){
                console.warn('delete_post.php failed', err);
                var posts = getPosts();
                posts = posts.filter(function(p){ return String(p.id) !== String(postId); });
                savePosts(posts);
                loadModeration();
                alert('Post removed locally. Server deletion failed.');
            });
        } catch(e){
            console.warn('deletePost failed', e);
        }
    };

    // Simple post viewer
    window.viewPostDetail = function(postId){
        var posts = getPosts();
        var p = posts.find(function(x){ return String(x.id) === String(postId); });
        if(!p){ alert('Post not found'); return; }
        var html = `<h4>${p.title || '(no title)'}</h4><p><em>By ${p.author || 'Anonymous'} on ${p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}</em></p><div style="white-space: pre-wrap;">${p.body || ''}</div>`;
        var w = window.open('', '_blank', 'width=800,height=600');
        w.document.write(html);
    };

    // ========== USER SUPPORT / TICKETS ==========
    function getSupportTickets(){
        try{ return JSON.parse(localStorage.getItem('supportTickets')) || []; } catch(e){ return []; }
    }
    function saveSupportTickets(tickets){ localStorage.setItem('supportTickets', JSON.stringify(tickets)); }

    function loadSupportPanel(){
        var tickets = getSupportTickets();
        var tbody = document.getElementById('support-table-body');
        var searchTerm = (document.getElementById('support-search')||{value:''}).value.toLowerCase();
        var statusFilter = (document.getElementById('support-status-filter')||{value:'all'}).value;

        var filtered = tickets.filter(function(t){
            var matchesSearch = !searchTerm || (t.user && t.user.toLowerCase().includes(searchTerm)) || (t.subject && t.subject.toLowerCase().includes(searchTerm)) || (t.message && t.message.toLowerCase().includes(searchTerm));
            var matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        if(tbody){ tbody.innerHTML = ''; filtered.forEach(function(t){
            var row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.id}</td>
                <td>${t.user}</td>
                <td>${t.subject}</td>
                <td>${(t.message||'').slice(0,120)}${t.message && t.message.length>120?'...':''}</td>
                <td>${t.status}</td>
                <td>${t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A'}</td>
                <td>
                    <button class="btn-sm" onclick="respondTicket('${t.id}')">Respond</button>
                    <button class="btn-sm btn-primary" onclick="markTicketInProgress('${t.id}')">In Progress</button>
                    <button class="btn-sm btn-danger" onclick="deleteTicket('${t.id}')">Close/Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        }); }
    }

    window.respondTicket = function(ticketId){
        var tickets = getSupportTickets();
        var t = tickets.find(function(x){ return x.id === ticketId; });
        if(!t) return alert('Ticket not found');
        var response = prompt('Write a response to the user:');
        if(response){
            t.status = 'in_progress';
            t.updated_at = new Date().toISOString();
            t.responses = t.responses || [];
            t.responses.push({ by: 'admin', message: response, at: new Date().toISOString() });
            saveSupportTickets(tickets);
            loadSupportPanel();
            alert('Response saved (local).');
        }
    };

    window.markTicketInProgress = function(ticketId){
        var tickets = getSupportTickets();
        var t = tickets.find(function(x){ return x.id === ticketId; });
        if(!t) return;
        t.status = 'in_progress';
        t.updated_at = new Date().toISOString();
        saveSupportTickets(tickets);
        loadSupportPanel();
    };

    window.deleteTicket = function(ticketId){
        if(!confirm('Close and remove this ticket?')) return;
        var tickets = getSupportTickets();
        tickets = tickets.filter(function(x){ return x.id !== ticketId; });
        saveSupportTickets(tickets);
        loadSupportPanel();
    };

    // Wire support search/filter listeners
    try{
        document.getElementById('support-search').addEventListener('input', loadSupportPanel);
        document.getElementById('support-status-filter').addEventListener('change', loadSupportPanel);
        document.getElementById('post-search').addEventListener('input', loadModeration);
        document.getElementById('post-status-filter').addEventListener('change', loadModeration);
        document.getElementById('comment-search').addEventListener('input', loadContentReview);
    } catch(e){}

    // Try server sync for posts at admin init
    try{ fetchPostsFromServer(); } catch(e){}

    // ========== CONTENT REVIEW (COMMENTS) ==========
    // Aggregate comments across posts and render for admin review
    function getCommentsFromPosts(){
        var posts = getPosts();
        var comments = [];
        posts.forEach(function(p){
            if(p && Array.isArray(p.comments)){
                p.comments.forEach(function(c){
                    comments.push({
                        id: c.id || ('c-'+Date.now()),
                        postId: p.id,
                        postTitle: p.title || '(no title)',
                        author: c.author || 'Anonymous',
                        body: c.body || '',
                        created_at: c.created_at || new Date().toISOString()
                    });
                });
            }
        });
        // newest first
        comments.sort(function(a,b){ return new Date(b.created_at) - new Date(a.created_at); });
        return comments;
    }

    function loadContentReview(){
        var allComments = getCommentsFromPosts();
        var tbody = document.getElementById('comments-table-body');
        if(!tbody) return;
        var searchTerm = (document.getElementById('comment-search')||{value:''}).value.toLowerCase();
        var filtered = allComments.filter(function(c){
            return !searchTerm || c.author.toLowerCase().includes(searchTerm) || c.body.toLowerCase().includes(searchTerm) || String(c.postTitle).toLowerCase().includes(searchTerm);
        });
        tbody.innerHTML = '';
        filtered.forEach(function(c){
            var tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${c.id}</td>
                <td>${escapeHtml(c.postTitle)}</td>
                <td>${escapeHtml(c.author)}</td>
                <td>${escapeHtml(c.body).slice(0,150)}${c.body.length>150?'...':''}</td>
                <td>${c.created_at ? new Date(c.created_at).toLocaleString() : 'N/A'}</td>
                <td>
                    <button class="btn-sm btn-danger" onclick="adminDeleteComment('${c.id}','${c.postId}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Helper to escape HTML for display
    function escapeHtml(s){
        if(!s) return '';
        return String(s).replace(/[&<>"']/g, function(ch){
            return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[ch];
        });
    }

    // Admin deletes a comment: remove from localStorage posts and try server API
    window.adminDeleteComment = function(commentId, postId){
        if(!confirm('Delete this comment? This action cannot be undone.')) return;
        try{
            var posts = getPosts();
            var changed = false;
            posts = posts.map(function(p){
                if(String(p.id) === String(postId) && Array.isArray(p.comments)){
                    var before = p.comments.length;
                    p.comments = p.comments.filter(function(c){ return String(c.id) !== String(commentId); });
                    if(p.comments.length !== before) changed = true;
                }
                return p;
            });
            if(changed){
                savePosts(posts);
                loadModeration();
                loadContentReview();
            }
            // attempt server call (best-effort)
            var form = new FormData();
            form.append('post_id', postId);
            form.append('comment_id', commentId);
            fetch('api/delete_comment.php', { method: 'POST', body: form })
                .then(function(r){ return r.json(); })
                .then(function(data){ /* ignore result - local state already updated */ })
                .catch(function(){ /* ignore network errors */ });
            alert('Comment removed.');
        } catch(e){ console.error('adminDeleteComment failed', e); alert('Failed to delete comment.'); }
    };

    // Load content review when content tab is selected (ensure wiring)
    try{ document.getElementById('comment-search').addEventListener('input', loadContentReview); } catch(e){}

    // Logout
    var logoutLink = document.getElementById('logout-link');
    if(logoutLink){
        logoutLink.addEventListener('click', function(e){
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    // Initialize - load users by default
    loadUsers();
    
    // Initialize users if empty (add demo users)
    var users = getUsers();
    if(users.length === 0){
        users = [
            { id: 1, name: 'Admin', email: 'admin@demo.com', role: 'admin', ecopoints: 0, created_at: new Date().toISOString() },
            { id: 2, name: 'Customer', email: 'user@demo.com', role: 'user', ecopoints: 120, created_at: new Date().toISOString() }
        ];
        saveUsers(users);
    }
    
    // Initialize products if empty (will be loaded from script.js or use defaults)
    var products = getProducts();
    if(products.length === 0 && typeof loadProducts === 'function'){
        // If script.js loaded, use its loadProducts function
        products = loadProducts();
        saveProducts(products);
    } else if(products.length === 0){
        // Fallback: create at least one product
        products = [
            {
                id: 1,
                name: "Bee's Wrap",
                description: "Reusable Beeswax Wraps",
                price: 150,
                image: "img/bwrap.jpg",
                category: "Eco-Friendly",
                carbonFootprint: 0.5,
                wasteSaved: 2.5,
                waterSaved: 50,
                sustainability: [
                    "100% reusable and washable",
                    "Made from organic cotton and beeswax",
                    "Replaces single-use plastic wrap",
                    "Biodegradable when composted",
                    "Lasts up to 1 year with proper care"
                ]
            }
        ];
        saveProducts(products);
    }
}

// Admin protection: check Supabase session & role on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
      window.location.href = 'index.html';
      return;
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile.role !== 'admin') {
      alert('Access denied');
      window.location.href = 'index.html';
      return;
    }

    // Initialize the admin dashboard
    await initAdmin();
});

