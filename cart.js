// Cart page functionality with environmental impact
(function(){
    var cartItemsList = document.getElementById('cart-items-list');
    var cartEmptyMessage = document.getElementById('cart-empty-message');
    var cartContent = document.getElementById('cart-content');
    var cartSubtotal = document.getElementById('cart-subtotal');
    var cartTotalItems = document.getElementById('cart-total-items');
    var totalCarbonFootprint = document.getElementById('total-carbon-footprint');
    var wasteSaved = document.getElementById('waste-saved');
    var waterSaved = document.getElementById('water-saved');
    var checkoutBtn = document.getElementById('checkout-btn');
    var checkoutModal = document.getElementById('checkout-modal');
    var checkoutOverlay = document.getElementById('checkout-overlay');
    var closeCheckoutModal = document.getElementById('close-checkout-modal');
    var checkoutForm = document.getElementById('checkout-form');
    var checkoutItemsSummary = document.getElementById('checkout-items-summary');
    var checkoutTotal = document.getElementById('checkout-total');
    var cancelCheckout = document.getElementById('cancel-checkout');
    
    // Get products data 
    var PRODUCTS = window.PRODUCTS || [];
    
    // Get cart
    function getCart(){
        try {
            return JSON.parse(localStorage.getItem('cart')) || [];
        } catch(e){
            return [];
        }
    }

        window.__cart = {
    addToCart: function (id, name, price, image) {
        let cart = getCart();

        let existing = cart.find(item => String(item.id) === String(id));
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            cart.push({
                id,
                name,
                price: Number(price),
                image: image || '',
                quantity: 1
            });
        }

        saveCart(cart);
    },

    updateCartCount: function () {
        const cart = getCart();
        const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

        const el = document.getElementById('cart-count');
        if (el) el.textContent = count;
    }
};

    // Save cart 
    function saveCart(cart){
        localStorage.setItem('cart', JSON.stringify(cart));
        if(window.__cart && window.__cart.updateCartCount){
            window.__cart.updateCartCount();
        }
    }
    
    // Get product data by ID
    function getProductData(productId){
        var productIdNum = typeof productId === 'string' ? parseInt(productId) : productId;
        return PRODUCTS.find(function(p){ return p.id == productIdNum || p.id == productId; });
    }
    
    // Calculate environmental impact
    function calculateEnvironmentalImpact(cart){
        var totalCarbon = 0;
        var totalWaste = 0;
        var totalWater = 0;
        
        cart.forEach(function(item){
            var quantity = item.quantity || 1;
            // Try to use stored data first, then look up from PRODUCTS
            if(item.carbonFootprint !== undefined){
                totalCarbon += (item.carbonFootprint || 0) * quantity;
                totalWaste += (item.wasteSaved || 0) * quantity;
                totalWater += (item.waterSaved || 0) * quantity;
            } else {
                var product = getProductData(item.id);
                if(product){
                    totalCarbon += (product.carbonFootprint || 0) * quantity;
                    totalWaste += (product.wasteSaved || 0) * quantity;
                    totalWater += (product.waterSaved || 0) * quantity;
                }
            }
        });
        
        return {
            carbon: totalCarbon.toFixed(2),
            waste: totalWaste.toFixed(2),
            water: totalWater.toFixed(2)
        };
    }
    
    // Update quantity
    function updateQuantity(productId, change){
        var cart = getCart();
        var item = cart.find(function(i){ return i.id == productId || i.id == String(productId); });
        
        if(item){
            item.quantity = (item.quantity || 1) + change;
            if(item.quantity <= 0){
                cart = cart.filter(function(i){ return (i.id != productId && i.id != String(productId)); });
            } else {
                // If environmental data is missing, try to add it from PRODUCTS
                if(item.carbonFootprint === undefined){
                    var product = getProductData(item.id);
                    if(product){
                        item.carbonFootprint = product.carbonFootprint;
                        item.wasteSaved = product.wasteSaved;
                        item.waterSaved = product.waterSaved;
                    }
                }
            }
            saveCart(cart);
            renderCart();
        }
    }
    
    // Remove item from cart
    function removeItem(productId){
        var cart = getCart();
        cart = cart.filter(function(i){ 
            return (i.id != productId && i.id != String(productId)); 
        });
        saveCart(cart);
        renderCart();
    }
    
    //change cart
    function renderCart(){
        var cart = getCart();
        
        if(cart.length === 0){
            if(cartEmptyMessage) cartEmptyMessage.style.display = 'block';
            if(cartContent) cartContent.style.display = 'none';
            return;
        }
        
        if(cartEmptyMessage) cartEmptyMessage.style.display = 'none';
        if(cartContent) cartContent.style.display = 'block';
        
        // Render cart items
        if(cartItemsList){
            cartItemsList.innerHTML = '';
            
            cart.forEach(function(item){
                var product = getProductData(item.id);
                var quantity = item.quantity || 1;
                var itemTotal = item.price * quantity;
                // Use stored carbon footprint or look up from product data
                var carbonFootprint = '0';
                if(item.carbonFootprint !== undefined){
                    carbonFootprint = (item.carbonFootprint * quantity).toFixed(2);
                } else if(product){
                    carbonFootprint = ((product.carbonFootprint || 0) * quantity).toFixed(2);
                }
                
                var itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.style.cssText = 'display: flex; gap: 20px; padding: 20px; border: 1px solid #cce7d0; border-radius: 8px; margin-bottom: 15px; align-items: center;';
                
                itemElement.innerHTML = `
                    <div style="flex: 0 0 100px;">
                        <img src="${item.image || 'img/bamb.jpg'}" alt="${item.name}" style="width: 100%; border-radius: 8px;">
                    </div>
                    <div style="flex: 1;">
                        <h4>${item.name}</h4>
                        <p style="color: #465b52; font-size: 14px; margin: 5px 0;">
                            ${product ? product.description : ''}
                        </p>
                        <div class="carbon-footprint" style="margin: 5px 0;">
                            <i class="fas fa-leaf"></i> ${carbonFootprint} kg CO₂
                        </div>
                        <p style="color: var(--shop-color); font-weight: 700; margin-top: 10px;">R${item.price.toFixed(2)} each</p>
                    </div>
                    <div style="flex: 0 0 150px; text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                            <button onclick="updateCartQuantity('${item.id}', -1)" style="padding: 5px 10px; background: #E3E6F3; border: 1px solid #cce7d0; border-radius: 4px; cursor: pointer;">-</button>
                            <span style="font-weight: 700;">${quantity}</span>
                            <button onclick="updateCartQuantity('${item.id}', 1)" style="padding: 5px 10px; background: #E3E6F3; border: 1px solid #cce7d0; border-radius: 4px; cursor: pointer;">+</button>
                        </div>
                        <p style="font-weight: 700; color: var(--shop-color);">R${itemTotal.toFixed(2)}</p>
                        <button onclick="removeCartItem('${item.id}')" style="margin-top: 10px; padding: 5px 10px; background: var(--shop-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Remove</button>
                    </div>
                `;
                
                cartItemsList.appendChild(itemElement);
            });
        }
        
        // Calculate totals
        var subtotal = cart.reduce(function(sum, item){
            return sum + (item.price * (item.quantity || 1));
        }, 0);
        
        var totalItems = cart.reduce(function(sum, item){
            return sum + (item.quantity || 1);
        }, 0);
        
        var impact = calculateEnvironmentalImpact(cart);
        
        // Update summary
        if(cartSubtotal) cartSubtotal.textContent = 'R' + subtotal.toFixed(2);
        if(cartTotalItems) cartTotalItems.textContent = totalItems;
        if(totalCarbonFootprint) totalCarbonFootprint.textContent = impact.carbon + ' kg CO₂';
        if(wasteSaved) wasteSaved.textContent = impact.waste + ' kg';
        if(waterSaved) waterSaved.textContent = impact.water + ' L';
    }
    
    // Expose functions to global scope for onclick handlers
    window.updateCartQuantity = function(productId, change){
        updateQuantity(productId, change);
    };
    
    window.removeCartItem = function(productId){
        if(confirm('Are you sure you want to remove this item from your cart?')){
            removeItem(productId);
        }
    };
    
    // Checkout functionality
    function showCheckoutModal(){
        var cart = getCart();
        if(cart.length === 0){
            alert('Your cart is empty!');
            return;
        }
        
        // Calculate totals
        var subtotal = cart.reduce(function(sum, item){
            return sum + (item.price * (item.quantity || 1));
        }, 0);
        
        // Render checkout items summary
        if(checkoutItemsSummary){
            checkoutItemsSummary.innerHTML = '';
            cart.forEach(function(item){
                var quantity = item.quantity || 1;
                var itemTotal = item.price * quantity;
                var itemDiv = document.createElement('div');
                itemDiv.style.cssText = 'padding: 10px 0; border-bottom: 1px solid #e0e0e0;';
                itemDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between;">
                        <span>${item.name} x ${quantity}</span>
                        <span>R${itemTotal.toFixed(2)}</span>
                    </div>
                `;
                checkoutItemsSummary.appendChild(itemDiv);
            });
        }
        
        if(checkoutTotal) checkoutTotal.textContent = 'R' + subtotal.toFixed(2);
        
        // Pre-fill user data if logged in
        fillCheckoutForm();
        
        if(checkoutModal) checkoutModal.style.display = 'block';
    }
    
    // Function to fill checkout form with user data
    function fillCheckoutForm(){
        try{
            var user = JSON.parse(localStorage.getItem('currentUser'));
            if(user){
                var nameInput = document.getElementById('checkout-name');
                var emailInput = document.getElementById('checkout-email');
                var phoneInput = document.getElementById('checkout-phone');
                var addressInput = document.getElementById('checkout-address');
                
                if(nameInput) nameInput.value = user.name || '';
                if(emailInput) emailInput.value = user.email || '';
                if(phoneInput) phoneInput.value = user.phone || '';
                
                // Pre-fill shipping address from user profile
                var addressFilled = fillShippingAddress(user, addressInput);
                
                // Show message if address was auto-filled
                if(addressFilled && addressInput){
                    // Briefly highlight the address field to show it was filled
                    addressInput.style.borderColor = '#4CAF50';
                    setTimeout(function(){
                        addressInput.style.borderColor = '';
                    }, 2000);
                }
            }
        } catch(e){
            console.error('Error loading user data:', e);
        }
    }
    
    // Function to fill shipping address
    function fillShippingAddress(user, addressInput){
        if(!addressInput || !user) return false;
        
        var addressParts = [];
        
        // Add street address
        if(user.address && user.address.trim()){
            addressParts.push(user.address.trim());
        }
        
        //Add city
        if(user.city && user.city.trim()){
            addressParts.push(user.city.trim());
        }
        
        //Add postal code
        if(user.postalCode && user.postalCode.trim()){
            addressParts.push(user.postalCode.trim());
        }
        
        //Combine address parts
        if(addressParts.length > 0){
            addressInput.value = addressParts.join(', ');
            return true; // Address was filled
        } else {
            addressInput.value = '';
            return false; // No address to fill
        }
    }
    
    // Fill address button handler
    var fillAddressBtn = document.getElementById('fill-address-btn');
    if(fillAddressBtn){
        fillAddressBtn.addEventListener('click', function(){
            try{
                var user = JSON.parse(localStorage.getItem('currentUser'));
                if(user){
                    var addressInput = document.getElementById('checkout-address');
                    fillShippingAddress(user, addressInput);
                    
                    // Show feedback
                    var btn = this;
                    var originalText = btn.textContent;
                    btn.textContent = '✓ Address Filled!';
                    btn.style.background = '#4CAF50';
                    btn.style.color = 'white';
                    setTimeout(function(){
                        btn.textContent = originalText;
                        btn.style.background = '';
                        btn.style.color = '';
                    }, 2000);
                } else {
                    alert('Please login to use saved address. You can add your address in your profile settings.');
                }
            } catch(e){
                console.error('Error filling address:', e);
                alert('Error loading saved address. Please enter manually.');
            }
        });
    }
    
    function closeCheckoutModalFunc(){
        if(checkoutModal) checkoutModal.style.display = 'none';
    }
    
    function handleCheckoutSubmit(evt){
        evt.preventDefault();
        
        var name = document.getElementById('checkout-name').value;
        var email = document.getElementById('checkout-email').value;
        var phone = document.getElementById('checkout-phone').value;
        var address = document.getElementById('checkout-address').value;
        
        if(!name || !email || !phone || !address){
            alert('Please fill in all fields');
            return;
        }
        
        var cart = getCart();
        var subtotal = cart.reduce(function(sum, item){
            return sum + (item.price * (item.quantity || 1));
        }, 0);
        
        var impact = calculateEnvironmentalImpact(cart);
        
        // Create order object
        var order = {
            id: Date.now(),
            date: new Date().toISOString(),
            name: name,
            email: email,
            phone: phone,
            address: address,
            items: cart,
            subtotal: subtotal,
            environmentalImpact: impact
        };
        
        // Save order to localStorage (in a real app, this would be sent to a server)
        var orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));
        
        // Clear cart
        localStorage.removeItem('cart');
        if(window.__cart && window.__cart.updateCartCount){
            window.__cart.updateCartCount();
        }
        
        // after payment success
        addEcoPointsLocal(5);
        
        // Close modal
        closeCheckoutModalFunc();
        
        // Show success message
        alert('Order placed successfully! Order ID: ' + order.id + '\n\nEnvironmental Impact:\n' +
              'Carbon Footprint: ' + impact.carbon + ' kg CO₂\n' +
              'Waste Saved: ' + impact.waste + ' kg\n' +
              'Water Saved: ' + impact.water + ' L\n\n' +
              'Thank you for making a positive environmental impact!');
        
        // Redirect to home or reload cart
        renderCart();
    }
    
    // Event listeners
    if(checkoutBtn){
        checkoutBtn.addEventListener('click', showCheckoutModal);
    }
    
    if(closeCheckoutModal){
        closeCheckoutModal.addEventListener('click', closeCheckoutModalFunc);
    }
    
    if(checkoutOverlay){
        checkoutOverlay.addEventListener('click', closeCheckoutModalFunc);
    }
    
    if(cancelCheckout){
        cancelCheckout.addEventListener('click', closeCheckoutModalFunc);
    }
    
    if(checkoutForm){
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }
    
    // Initialize cart on page load
    renderCart();
})();

