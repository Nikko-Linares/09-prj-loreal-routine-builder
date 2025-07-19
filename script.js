// --- Chatbox elements ---
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

// --- Store conversation history for the chatbox ---
let chatMessages = [];

// --- Helper: Add a message to the chat window ---
function addMessageToChat(role, content) {
  const msgDiv = document.createElement("div");
  msgDiv.className = role === "user" ? "chat-user" : "chat-assistant";
  msgDiv.textContent = content;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// --- Helper: Render all chat messages ---
function renderChat() {
  chatWindow.innerHTML = "";
  chatMessages.forEach((msg) => addMessageToChat(msg.role, msg.content));
}

// --- Handle chat form submission ---
if (chatForm) {
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userInput = document.getElementById("userInput").value.trim();
    if (!userInput) return;

    // Only allow questions about the routine or beauty topics
    const allowedTopics = [
      "skincare",
      "haircare",
      "makeup",
      "fragrance",
      "routine",
      "beauty",
      "product",
      "step",
      "how",
      "why",
      "when",
      "what",
    ];
    const isAllowed = allowedTopics.some((topic) =>
      userInput.toLowerCase().includes(topic)
    );
    if (!isAllowed) {
      addMessageToChat(
        "assistant",
        "Sorry, I can only answer questions about your routine or beauty topics like skincare, haircare, makeup, or fragrance."
      );
      document.getElementById("userInput").value = "";
      return;
    }

    // Add user message to chat history
    chatMessages.push({ role: "user", content: userInput });
    renderChat();
    document.getElementById("userInput").value = "";

    // Show loading message
    addMessageToChat("assistant", "Thinking...");

    // Send full chat history to OpenAI API
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: chatMessages,
          }),
        }
      );
      const data = await response.json();
      // Remove loading message
      chatWindow.removeChild(chatWindow.lastChild);
      if (
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content
      ) {
        chatMessages.push({
          role: "assistant",
          content: data.choices[0].message.content,
        });
        renderChat();
      } else {
        addMessageToChat(
          "assistant",
          "Sorry, something went wrong. Please try again."
        );
      }
    } catch (err) {
      chatWindow.removeChild(chatWindow.lastChild);
      addMessageToChat("assistant", "Error: " + err.message);
    }
  });
}
// --- Get reference to Generate Routine button and output area ---
const generateBtn = document.getElementById("generateRoutine");
const routineOutput = document.getElementById("routineOutput");

// --- Generate Routine using OpenAI API ---
async function generateRoutine() {
  const routineOutput = document.getElementById("routineOutput");
  if (selectedProducts.length === 0) {
    routineOutput.textContent = "Please select at least one product.";
    return;
  }

  // Build a messages array for the OpenAI API
  const productList = selectedProducts
    .map((p) => `- ${p.name} (${p.brand})`)
    .join("\n");
  // Start a new chat history for the routine
  chatMessages = [
    {
      role: "system",
      content: "You are a helpful skincare and beauty routine assistant.",
    },
    {
      role: "user",
      content: `Here are my selected products:\n${productList}\n\nPlease generate a simple routine using these products. Explain each step simply for a beginner.`,
    },
  ];

  routineOutput.textContent = "Generating routine...";

  try {
    const response = await fetch(RELAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatMessages,
      }),
    });
    const data = await response.json();
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      routineOutput.textContent = data.choices[0].message.content;
      // Add assistant's routine to chat history
      chatMessages.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      renderChat();
    } else {
      routineOutput.textContent =
        "Sorry, something went wrong. Please try again.";
    }
  } catch (err) {
    routineOutput.textContent = "Error: " + err.message;
  }
}

// --- Add event listener to Generate Routine button ---
if (generateBtn) {
  generateBtn.addEventListener("click", generateRoutine);
}
// --- On page load, create output area if not present ---
document.addEventListener("DOMContentLoaded", () => {
  loadSelectedProducts();
  // Add output area if not present
  if (!document.getElementById("routineOutput")) {
    const outputDiv = document.createElement("div");
    outputDiv.id = "routineOutput";
    outputDiv.style.marginTop = "20px";
    outputDiv.style.whiteSpace = "pre-line";
    const parent = document.querySelector(".selected-products");
    if (parent) parent.appendChild(outputDiv);
  }
});
// --- Get references to DOM elements ---
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");

// --- Store selected products in an array ---
let selectedProducts = [];
let currentCategory = null; // Track the current selected category

// --- Load selected products from localStorage ---
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    selectedProducts = JSON.parse(saved);
  }
  displaySelectedProducts();
}

// --- Save selected products to localStorage ---
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

// --- Load product data from JSON file ---
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// --- Display product cards ---
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
        <div class="product-card${
          isProductSelected(product.id) ? " selected" : ""
        }" data-product-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
            <button class="desc-toggle-btn" aria-expanded="false" aria-controls="desc-${
              product.id
            }">Show Description</button>
            <div class="product-desc" id="desc-${product.id}" hidden>${
        product.description
      }</div>
          </div>
        </div>
      `
    )
    .join("");
  addProductCardListeners();
  addDescriptionToggleListeners();
  // --- Add click listeners to description toggle buttons ---
  function addDescriptionToggleListeners() {
    const descBtns = document.querySelectorAll(".desc-toggle-btn");
    descBtns.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation(); // Don't trigger card select
        const descId = btn.getAttribute("aria-controls");
        const descDiv = document.getElementById(descId);
        const expanded = btn.getAttribute("aria-expanded") === "true";
        if (expanded) {
          btn.setAttribute("aria-expanded", "false");
          btn.textContent = "Show Description";
          descDiv.hidden = true;
        } else {
          btn.setAttribute("aria-expanded", "true");
          btn.textContent = "Hide Description";
          descDiv.hidden = false;
        }
      });
    });
  }
}

// --- Check if a product is selected ---
function isProductSelected(productId) {
  return selectedProducts.some((p) => p.id === productId);
}

// --- Add click listeners to product cards ---
function addProductCardListeners() {
  const cards = document.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.addEventListener("click", handleProductCardClick);
  });
}

// --- Handle product card click ---
async function handleProductCardClick(event) {
  const card = event.currentTarget;
  const productId = card.dataset.productId;
  const products = await loadProducts();
  const product = products.find((p) => String(p.id) === String(productId));
  if (!product) return;
  if (isProductSelected(productId)) {
    // Unselect
    selectedProducts = selectedProducts.filter(
      (p) => String(p.id) !== String(productId)
    );
  } else {
    // Select
    selectedProducts.push(product);
  }
  saveSelectedProducts();
  // Only show products for the current category
  if (currentCategory) {
    const filtered = products.filter((p) => p.category === currentCategory);
    displayProducts(filtered);
  }
  displaySelectedProducts();
}

// --- Display selected products in the saved area ---
function displaySelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<div class="empty-selection">No products saved yet</div>';
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product-item">
          <span>${product.name}</span>
          <button class="remove-btn" data-product-id="${product.id}" title="Remove product">×</button>
        </div>
      `
    )
    .join("");
  // Add remove button listeners
  const removeBtns = selectedProductsList.querySelectorAll(".remove-btn");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", handleRemoveProduct);
  });
}

// --- Handle remove from saved area ---
function handleRemoveProduct(event) {
  event.stopPropagation();
  const productId = event.target.dataset.productId;
  selectedProducts = selectedProducts.filter(
    (p) => String(p.id) !== String(productId)
  );
  saveSelectedProducts();
  displaySelectedProducts();
  // Also update product cards if visible
  document
    .querySelectorAll(`.product-card[data-product-id="${productId}"]`)
    .forEach((card) => card.classList.remove("selected"));
}

// --- Filter and display products when category changes ---
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  currentCategory = e.target.value;
  const filtered = products.filter((p) => p.category === currentCategory);
  displayProducts(filtered);
});

// --- Initialize on page load ---
document.addEventListener("DOMContentLoaded", () => {
  loadSelectedProducts();
});

const RELAY_URL = "https://loreal-awareness-bot.ncandreia.workers.dev/";
