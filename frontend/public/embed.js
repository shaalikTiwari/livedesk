(function () {
    // Figure out where this script itself is hosted, so the iframe points to the same frontend
    const currentScript = document.currentScript;
    const scriptSrc = currentScript.src;
    const frontendOrigin = new URL(scriptSrc).origin;
  
    const businessId = currentScript.getAttribute("data-business-id");
  
    if (!businessId) {
      console.error("LiveDesk: missing data-business-id attribute on the script tag.");
      return;
    }
  
    // Get or create a per-visitor conversation ID, stored in this website's own localStorage
    const storageKey = `livedesk_conversation_${businessId}`;
    let conversationId = localStorage.getItem(storageKey);
    if (!conversationId) {
      conversationId = "conv-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now();
      localStorage.setItem(storageKey, conversationId);
    }
  
    // --- Floating bubble button ---
    const bubble = document.createElement("button");
    bubble.innerText = "💬";
    bubble.style.position = "fixed";
    bubble.style.bottom = "20px";
    bubble.style.right = "20px";
    bubble.style.width = "56px";
    bubble.style.height = "56px";
    bubble.style.borderRadius = "50%";
    bubble.style.background = "#2563eb";
    bubble.style.color = "white";
    bubble.style.fontSize = "24px";
    bubble.style.border = "none";
    bubble.style.cursor = "pointer";
    bubble.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
    bubble.style.zIndex = "999999";
  
    // --- Chat iframe (hidden until bubble is clicked) ---
    const iframe = document.createElement("iframe");
    iframe.src = `${frontendOrigin}/widget-embed?businessId=${encodeURIComponent(
      businessId
    )}&conversationId=${encodeURIComponent(conversationId)}`;
    iframe.style.position = "fixed";
    iframe.style.bottom = "90px";
    iframe.style.right = "20px";
    iframe.style.width = "370px";
    iframe.style.height = "560px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "16px";
    iframe.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
    iframe.style.zIndex = "999999";
    iframe.style.display = "none";
  
    let isOpen = false;
  
    bubble.addEventListener("click", () => {
      isOpen = !isOpen;
      iframe.style.display = isOpen ? "block" : "none";
      bubble.innerText = isOpen ? "✕" : "💬";
    });
  
    document.body.appendChild(iframe);
    document.body.appendChild(bubble);
  })();