class ColorSelectionManager {
  constructor() {
    this.selectedColors = new Map() // productId -> selectedColor
    this.init()
  }

  init() {
    this.addEventListeners()
    this.enhanceProductCards()
  }

  addEventListeners() {
    document.addEventListener("click", (e) => {
      // Handle color option selection
      if (e.target.classList.contains("color-option")) {
        this.handleColorSelection(e.target)
      }

      // Handle add to cart with color validation
      if (e.target.classList.contains("add-to-cart-btn")) {
        const productId = e.target.getAttribute("data-product-id")
        if (!this.validateColorSelection(productId, e.target)) {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
      }

      // Handle buy now with color validation
      if (e.target.classList.contains("buy-now-btn")) {
        const productId = e.target.getAttribute("data-product-id")
        if (!this.validateColorSelection(productId, e.target)) {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
      }
    })
  }

  enhanceProductCards() {
    // Wait for products to load, then enhance them
    const checkForProducts = () => {
      const productCards = document.querySelectorAll(".product-card")
      if (productCards.length > 0) {
        productCards.forEach((card) => this.enhanceProductCard(card))
      } else {
        setTimeout(checkForProducts, 500)
      }
    }
    checkForProducts()
  }

  enhanceProductCard(card) {
    const productId = this.getProductIdFromCard(card)
    if (!productId) return

    // Get product data
    const product = this.getProductData(productId)
    if (!product || !product.colors || !Array.isArray(product.colors) || product.colors.length <= 1) {
      return // No color selection needed
    }

    // Add color selector to the card
    this.addColorSelectorToCard(card, product)
  }

  getProductIdFromCard(card) {
    const addToCartBtn = card.querySelector(".add-to-cart-btn")
    const buyNowBtn = card.querySelector(".buy-now-btn")
    return addToCartBtn?.getAttribute("data-product-id") || buyNowBtn?.getAttribute("data-product-id")
  }

  getProductData(productId) {
    // Try to get product from cache
    if (window.EnhancedProductCache) {
      const cached = window.EnhancedProductCache.getFromMemoryCache()
      if (cached && cached.data) {
        return cached.data.find((p) => p.id == productId)
      }
    }
    return null
  }

  addColorSelectorToCard(card, product) {
    const productInfo = card.querySelector(".product-info")
    if (!productInfo) return

    // Check if color selector already exists
    if (productInfo.querySelector(".color-selector")) return

    // Create color selector
    const colorSelector = document.createElement("div")
    colorSelector.className = "color-selector"
    colorSelector.innerHTML = `
      <label class="color-selector-label">Choose Color:</label>
      <div class="color-options" data-product-id="${product.id}">
        ${product.colors
          .map(
            (color, index) => `
          <div class="color-option" 
               data-color="${color}" 
               data-product-id="${product.id}"
               style="background-color: ${this.getColorValue(color)}"
               title="${this.formatColorName(color)}"
               ${index === 0 ? 'data-selected="true"' : ""}>
          </div>
        `,
          )
          .join("")}
      </div>
    `

    // Insert before product actions
    const productActions = productInfo.querySelector(".product-actions")
    if (productActions) {
      productInfo.insertBefore(colorSelector, productActions)
    } else {
      productInfo.appendChild(colorSelector)
    }

    // Set default selection
    if (product.colors.length > 0) {
      this.selectedColors.set(product.id, product.colors[0])
      const firstOption = colorSelector.querySelector(".color-option")
      if (firstOption) {
        firstOption.classList.add("selected")
      }
    }
  }

  handleColorSelection(colorOption) {
    const productId = colorOption.getAttribute("data-product-id")
    const color = colorOption.getAttribute("data-color")

    // Remove selection from siblings
    const colorOptions = colorOption.parentElement
    colorOptions.querySelectorAll(".color-option").forEach((option) => {
      option.classList.remove("selected")
      option.removeAttribute("data-selected")
    })

    // Add selection to clicked option
    colorOption.classList.add("selected")
    colorOption.setAttribute("data-selected", "true")

    // Store selection
    this.selectedColors.set(productId, color)

    // Show selection feedback
    this.showColorSelectionFeedback(colorOption, color)
  }

  showColorSelectionFeedback(colorOption, color) {
    // Create temporary feedback element
    const feedback = document.createElement("div")
    feedback.className = "color-selection-feedback"
    feedback.textContent = `Selected: ${this.formatColorName(color)}`
    feedback.style.cssText = `
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-text);
      color: white;
      padding: 4px 8px;
      border-radius: var(--radius-md);
      font-size: var(--font-size-xs);
      font-weight: 500;
      white-space: nowrap;
      z-index: 100;
      opacity: 0;
      animation: fadeInOut 2s ease-in-out;
    `

    // Add animation styles if not already added
    if (!document.querySelector("#color-feedback-styles")) {
      const style = document.createElement("style")
      style.id = "color-feedback-styles"
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `
      document.head.appendChild(style)
    }

    // Position relative to color option
    colorOption.style.position = "relative"
    colorOption.appendChild(feedback)

    // Remove after animation
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.remove()
      }
    }, 2000)
  }

  validateColorSelection(productId, button) {
    const product = this.getProductData(productId)

    // If product doesn't have multiple colors, no validation needed
    if (!product || !product.colors || !Array.isArray(product.colors) || product.colors.length <= 1) {
      return true
    }

    // Check if color is selected
    const selectedColor = this.selectedColors.get(productId)
    if (!selectedColor) {
      this.showColorSelectionError(button, "Please select a color before proceeding")
      return false
    }

    return true
  }

  showColorSelectionError(button, message) {
    // Create error notification
    const notification = document.createElement("div")
    notification.className = "color-selection-error"
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--color-error);
      color: white;
      padding: var(--spacing-4) var(--spacing-6);
      border-radius: var(--radius-lg);
      font-weight: 500;
      z-index: 1000;
      box-shadow: var(--shadow-lg);
      animation: errorPulse 3s ease-in-out;
    `

    // Add animation styles
    if (!document.querySelector("#color-error-styles")) {
      const style = document.createElement("style")
      style.id = "color-error-styles"
      style.textContent = `
        @keyframes errorPulse {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          10%, 90% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(notification)

    // Highlight color selector
    const productCard = button.closest(".product-card")
    const colorSelector = productCard?.querySelector(".color-selector")
    if (colorSelector) {
      colorSelector.style.animation = "shake 0.5s ease-in-out"
      setTimeout(() => {
        colorSelector.style.animation = ""
      }, 500)
    }

    // Add shake animation if not exists
    if (!document.querySelector("#shake-animation")) {
      const style = document.createElement("style")
      style.id = "shake-animation"
      style.textContent = `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `
      document.head.appendChild(style)
    }

    // Remove notification
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 3000)
  }

  getColorValue(colorName) {
    // Convert color names to actual color values
    const colorMap = {
      red: "#ef4444",
      blue: "#3b82f6",
      green: "#10b981",
      yellow: "#f59e0b",
      purple: "#8b5cf6",
      pink: "#ec4899",
      orange: "#f97316",
      gray: "#6b7280",
      grey: "#6b7280",
      black: "#1f2937",
      white: "#ffffff",
      brown: "#92400e",
      navy: "#1e3a8a",
      teal: "#14b8a6",
      cyan: "#06b6d4",
      lime: "#84cc16",
      emerald: "#10b981",
      rose: "#f43f5e",
      violet: "#8b5cf6",
      indigo: "#6366f1",
      slate: "#64748b",
      zinc: "#71717a",
      neutral: "#737373",
      stone: "#78716c",
      amber: "#f59e0b",
      sky: "#0ea5e9",
      fuchsia: "#d946ef",
    }

    const normalizedColor = colorName.toLowerCase().trim()

    // Check if it's already a hex color
    if (normalizedColor.startsWith("#")) {
      return normalizedColor
    }

    // Check if it's an RGB color
    if (normalizedColor.startsWith("rgb")) {
      return normalizedColor
    }

    // Return mapped color or default
    return colorMap[normalizedColor] || colorMap["gray"]
  }

  formatColorName(color) {
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()
  }

  getSelectedColor(productId) {
    return this.selectedColors.get(productId)
  }

  // Method to get color for checkout URL
  getColorForCheckout(productId) {
    const selectedColor = this.getSelectedColor(productId)
    return selectedColor ? encodeURIComponent(selectedColor) : null
  }
}

// Initialize color selection manager
const colorSelectionManager = new ColorSelectionManager()

// Export for use in other files
window.colorSelectionManager = colorSelectionManager
