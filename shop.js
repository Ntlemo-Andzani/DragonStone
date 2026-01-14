document.addEventListener('DOMContentLoaded', function() {
    // Initialize shop functionality
    initShop();
});

function initShop() {
    const products = getProducts();
    window.__SHOP_PRODUCTS__ = products;
    renderShop(products, 'all');
    setupEventListeners();
    setupCategoryFilter(products);
}

function getProducts() {
    // Try to get products from multiple sources
    if (typeof window.PRODUCTS !== 'undefined' && window.PRODUCTS.length) {
        return window.PRODUCTS;
    }
    try {
        const storedProducts = JSON.parse(localStorage.getItem('products'));
        if (storedProducts && storedProducts.length) {
            return storedProducts;
        }
    } catch (e) {
        console.warn('Could not parse products from localStorage', e);
    }
    // Fallback to empty array
    return [];
}

function renderShop(products, filterCategory = 'all') {
    const container = document.getElementById('shop-products');
    if (!container) return;
    container.innerHTML = '';
    // Group products by category
    const grouped = groupProductsByCategory(products, filterCategory);
    const categories = Object.keys(grouped).sort();
    categories.forEach(category => {
        const section = createCategorySection(category, grouped[category]);
        container.appendChild(section);
    });
    // Attach event listeners to new elements
    attachProductEventListeners();
}

function groupProductsByCategory(products, filterCategory) {
    const grouped = {};
    
    // Map product categories to banner categories
    const categoryMapping = {
        'Kitchen': 'Kitchen & Dining',
        'Kitchen & Dining': 'Kitchen & Dining',
        'Household': 'Cleaning & Household supplies',
        'Cleaning & Household supplies': 'Cleaning & Household supplies',
        'Home': 'Home Décor & Living',
        'Home Décor & Living': 'Home Décor & Living',
        'Personal Care': 'Bathroom & Personal Care',
        'Bathroom & Personal Care': 'Bathroom & Personal Care',
        'Eco-Friendly': 'Lifestyle & Wellness',
        'Lifestyle & Wellness': 'Lifestyle & Wellness',
        'Kids': 'Kids & Pets',
        'Kids & Pets': 'Kids & Pets',
        'Outdoor': 'Outdoor & Garden',
        'Outdoor & Garden': 'Outdoor & Garden',
        'Electronics': 'Lifestyle & Wellness'
    };
    
    products.forEach(product => {
        const originalCategory = product.category || 'Lifestyle & Wellness';
        const mappedCategory = categoryMapping[originalCategory] || 'Lifestyle & Wellness';
        
        // Apply filter if specified
        if (filterCategory && filterCategory !== 'all' && mappedCategory !== filterCategory) {
            return;
        }
        if (!grouped[mappedCategory]) grouped[mappedCategory] = [];
        grouped[mappedCategory].push(product);
    });
    return grouped;
}

function createCategorySection(category, products) {
    const section = document.createElement('div');
    section.className = 'category-section';
    
    // Create category header
    const header = document.createElement('div');
    header.className = 'category-header';
    
    // Map banner category names to images
    const categoryImages = {
        'Cleaning & Household supplies': 'img/bk.jpg',
        'Kitchen & Dining': 'img/bk.jpg',
        'Home Décor & Living': 'img/bk.jpg',
        'Bathroom & Personal Care': 'img/bk.jpg',
        'Lifestyle & Wellness': 'img/bk.jpg',
        'Kids & Pets': 'img/bk.jpg',
        'Outdoor & Garden': 'img/bk.jpg'
    };
    
    const categoryImage = categoryImages[category] || 'img/bamb.jpg';
    
    // Use background image
    header.style.backgroundImage = `url('${categoryImage}')`;
    header.style.backgroundSize = 'cover';
    header.style.backgroundPosition = 'center';
    
    header.innerHTML = `<h2>${category}</h2>`;
    section.appendChild(header);
    
    // Create products grid
    const grid = document.createElement('div');
    grid.className = 'products-grid';
    
    // Create product cards
    products.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
    
    section.appendChild(grid);
    return section;
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'pro';
    card.setAttribute('data-product-id', product.id);
    card.setAttribute('data-product-name', product.name || '');
    card.setAttribute('data-product-price', product.price || '0');
    const carbon = product.carbon || product.carbonFootprint || '';
    const safeImage = (product.image && String(product.image).trim()) ? product.image : 'img/bamb.jpg';
    card.innerHTML = `
        <img src="${safeImage}" alt="${product.name}" class="product-image">
        <div class="des">
            <span class="product-category">${product.category || ''}</span>
            <h5 class="product-name">${product.name}</h5>
            <p class="product-description">${product.description || ''}</p>
            ${carbon ? `<div class="carbon-badge">${carbon} kg CO₂</div>` : ''}
            <h4 class="product-price">R${product.price}</h4>
            <div class="card-buttons">
                <button class="btn view-details-btn" data-id="${product.id}">View Details</button>
                <button class="btn add-to-cart-btn" data-id="${product.id}">
                    <i></i> Add to Cart
                </button>
            </div>
        </div>
    `;
    return card;
}

function setupCategoryFilter(products) {
    const filter = document.getElementById('shop-category-filter');
    if (!filter) return;
    
    // Get unique mapped banner categories
    const categoryMapping = {
        'Kitchen': 'Kitchen & Dining',
        'Kitchen & Dining': 'Kitchen & Dining',
        'Household': 'Cleaning & Household supplies',
        'Cleaning & Household supplies': 'Cleaning & Household supplies',
        'Home': 'Home Décor & Living',
        'Home Décor & Living': 'Home Décor & Living',
        'Personal Care': 'Bathroom & Personal Care',
        'Bathroom & Personal Care': 'Bathroom & Personal Care',
        'Eco-Friendly': 'Lifestyle & Wellness',
        'Lifestyle & Wellness': 'Lifestyle & Wellness',
        'Kids': 'Kids & Pets',
        'Kids & Pets': 'Kids & Pets',
        'Outdoor': 'Outdoor & Garden',
        'Outdoor & Garden': 'Outdoor & Garden',
        'Electronics': 'Lifestyle & Wellness'
    };
    
    const categories = [...new Set(products.map(p => categoryMapping[p.category] || 'Lifestyle & Wellness').filter(Boolean))].sort();
    filter.innerHTML = '<option value="all">All</option>' + categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    filter.addEventListener('change', function() {
        renderShop(products, filter.value);
    });
}

function attachProductEventListeners() {
    // View Details buttons
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.dataset.id;
            const products = window.__SHOP_PRODUCTS__ || [];
            const product = products.find(p => String(p.id) === String(productId));
            if (product) {
                // Prefer existing showProductDetail if available
                if (typeof showProductDetail === 'function') {
                    showProductDetail(product.id);
                } else {
                    openProductDetails(product);
                }
            }
        });
    });
    // Add to Cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            // prevent card click handlers from also firing
            e.stopPropagation();
            const productId = this.dataset.id;
            const products = getProducts();
            const product = products.find(p => String(p.id) === String(productId));
            if (product) {
                const image = product.image || '';
                if (window.__cart && typeof window.__cart.addToCart === 'function'){
                    // Call the shared cart API with full product details
                    Promise.resolve(window.__cart.addToCart(product.id, product.name, product.price, image))
                        .then(() => { if (window.__cart && typeof window.__cart.updateCartCount === 'function') window.__cart.updateCartCount(); })
                        .catch(err => console.warn('Error adding to cart:', err));
                } else if (typeof addToCart === 'function'){
                    try { addToCart(product.id, product.name, product.price, image); } catch(err){ console.warn('Fallback addToCart failed', err); }
                } else {
                    console.log('Add to cart (no cart helper):', product.id);
                }
            }
        });
    });
}

function openProductDetails(product) {
    // This will populate the modal; prefer existing modal elements
    const modal = document.getElementById('product-detail-modal');
    const body = document.getElementById('product-detail-body');
    if (!modal || !body) {
        console.error('Product detail modal elements not found');
        return;
    }
    const carbon = product.carbon || product.carbonFootprint || '';
    const safeImage = (product.image && String(product.image).trim()) ? product.image : 'img/bamb.jpg';
    
    // Build sustainability info
    let sustainabilityHtml = '';
    if (Array.isArray(product.sustainability) && product.sustainability.length > 0) {
        sustainabilityHtml = '<h4>Sustainability Information</h4><ul>' + 
            product.sustainability.map(i=>`<li>${i}</li>`).join('') + 
            '</ul>';
    }
    
    // Build environmental impact section
    let impactHtml = '';
    if (product.wasteSaved || product.waterSaved) {
        impactHtml = '<div style="margin-top: 20px;"><p><strong>Environmental Impact per item:</strong></p>';
        if (product.wasteSaved) impactHtml += `<p>Waste Saved: ${product.wasteSaved} kg</p>`;
        if (product.waterSaved) impactHtml += `<p>Water Saved: ${product.waterSaved} L</p>`;
        impactHtml += '</div>';
    }
    
    body.innerHTML = `
        <div style="display:flex; gap:20px; flex-wrap:wrap;">
            <div style="flex:1; min-width:300px;"><img src="${safeImage}" alt="${product.name}" style="width:100%; border-radius:8px;"></div>
            <div style="flex:1; min-width:300px;">
                <h2>${product.name}</h2>
                <p style="color:#465b52; margin:10px 0;">${product.description || ''}</p>
                <div style="margin: 15px 0;">
                    <h3 style="color:var(--shop-color);">R${product.price}</h3>
                    ${carbon ? `<div class="carbon-footprint" style="margin-top: 10px;"><i class="fas fa-leaf"></i> Carbon Footprint: ${carbon} kg CO₂</div>` : ''}
                </div>
                <div class="sustainability-info">
                    ${sustainabilityHtml}
                </div>
                ${impactHtml}
                <button class="btn" id="modal-add-to-cart" data-id="${product.id}" style="margin-top:20px; padding:12px 30px; background:var(--shop-color); color:#fff; border:none; border-radius:6px;">Add to Cart</button>
            </div>
        </div>
    `;
    modal.style.display = 'block';
    const addBtn = document.getElementById('modal-add-to-cart');
if (addBtn) addBtn.addEventListener('click', function(e){
    e.stopPropagation(); // prevent double events

    const products = window.__SHOP_PRODUCTS__ || [];
    const productId = this.dataset.id;
    const product = products.find(p => String(p.id) === String(productId));

    if (!product) return;

    if (window.__cart && typeof window.__cart.addToCart === 'function'){
        Promise.resolve(window.__cart.addToCart(product.id, product.name, product.price, product.image || ''))
            .then(() => { 
                if (window.__cart && typeof window.__cart.updateCartCount === 'function') 
                    window.__cart.updateCartCount(); 
            })
            .catch(err => console.warn('Error adding to cart from modal:', err));
    } else if (typeof addToCart === 'function'){
        try { addToCart(product.id, product.name, product.price, product.image || ''); } 
        catch(err){ console.warn('Fallback addToCart failed', err); }
    }
}, { once: true }); // ensures listener is only attached once

}

function addToCart(productId){
    if (window.__cart && typeof window.__cart.addToCart === 'function'){
        // attempt to find product details
        const products = getProducts();
        const product = products.find(p => String(p.id) === String(productId));
        if (product) window.__cart.addToCart(product.id, product.name, product.price, product.image || '');
        else window.__cart.addToCart(productId, 'Product', 0, '');
    } else {
        console.log('addToCart called for', productId);
    }
}

function setupEventListeners() {
    const modal = document.getElementById('product-detail-modal');
    const overlay = document.getElementById('product-detail-overlay');
    const closeBtn = document.getElementById('close-product-modal');
    if (overlay) overlay.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
    if (closeBtn) closeBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
    // Listen for storage changes (when admin updates products)
    window.addEventListener('storage', function(e) {
        if (e.key === 'products') {
            const products = getProducts();
            const filter = document.getElementById('shop-category-filter');
            const currentFilter = filter ? filter.value : 'all';
            renderShop(products, currentFilter);
        }
    });
}
