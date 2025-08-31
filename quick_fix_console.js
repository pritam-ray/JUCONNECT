// IMMEDIATE FIX for stuck "(sending...)" messages
// Copy and paste this into your browser console (F12 -> Console tab)

console.log('🔧 JU_CONNECT: Fixing stuck sending messages...');

// Find all message elements with "(sending...)" text
const sendingMessages = Array.from(document.querySelectorAll('*')).filter(el => 
  el.textContent && el.textContent.includes('(sending...)')
);

console.log(`Found ${sendingMessages.length} stuck messages`);

// If using React DevTools, you can also try this approach:
// Look for React components and force a re-render
try {
  // Force a page refresh to clear all optimistic state
  if (sendingMessages.length > 0) {
    console.log('🔄 Refreshing page to clear optimistic state...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } else {
    console.log('✅ No stuck messages found!');
  }
} catch (error) {
  console.log('⚠️ Manual refresh required - just press F5');
}

// Alternative: Clear localStorage optimistic state if any
try {
  const keys = Object.keys(localStorage);
  const optimisticKeys = keys.filter(key => key.includes('optimistic') || key.includes('temp-'));
  optimisticKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log('🧹 Cleared:', key);
  });
} catch (error) {
  console.log('No localStorage optimistic data found');
}

console.log('✅ Fix applied! The new version will auto-fix stuck messages.');
