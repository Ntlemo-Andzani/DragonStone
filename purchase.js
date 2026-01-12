/**
 * purchase.js - Handles purchase-related functionality such as awarding eco points
 */
console.log('purchase.js loaded');

async function addEcoPointsLocal(points = 5) {
  const current = Number(localStorage.getItem('ecoPoints')) || 0;
  const updated = current + points;

  localStorage.setItem('ecoPoints', updated);
  updateEcoPointsUI(updated);

  // Sync to Supabase database for persistence across logins
  try {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && user.id && typeof supabaseClient !== 'undefined') {
      await supabaseClient
        .from('profiles')
        .update({ eco_points: updated })
        .eq('id', user.id);
      console.log('Eco points synced to database:', updated);
    }
  } catch (err) {
    console.warn('Failed to sync eco points to database:', err);
  }
}

function updateEcoPointsUI(points) {
  const el = document.getElementById('ecopoints-balance');
  if (el) el.textContent = points;
}

// Initialize eco points display on page load
updateEcoPointsUI(localStorage.getItem('ecoPoints') || 0);

// Add event listener for Place Order button
document.addEventListener('DOMContentLoaded', () => {
  const buyBtn = document.getElementById('buy-btn');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      // simulate successful purchase
      addEcoPointsLocal(5);
    });
  }
  
  // Also handle checkout button if it exists (cart page)
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      // Handle checkout - points will be awarded in handleCheckoutSubmit
    });
  }
});
