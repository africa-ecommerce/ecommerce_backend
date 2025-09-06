// Enhanced Color Selection System
class ColorSelectionManager {
  constructor() {
    this.selectedColors = new Map() // productId -> selectedColor
    this.colorRequiredProducts = new Set() // Products that require color selection
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.loadSelectedColors()
  }

  setupEventListeners() {
    // Listen for product renders to add color selection UI
    document.addEventListener("DOMContentLoaded", () => {
      this.enhanceProductCards()
    })

    // Listen for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.enhanceProductCards(node)
            }
          })
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  enhanceProductCards(container = document) {
    const productCards = container.querySelectorAll(".product-card, .product-info")
    productCards.forEach((card) => this.addColorSelectionToCard(card))
  }

  addColorSelectionToCard(card) {
    // Skip if already enhanced
    if (card.querySelector(".color-selection-container")) return

    const productId = this.getProductIdFromCard(card)
    if (!productId) return

    // Get product data to check for colors
    const productData = this.getProductData(productId)
    if (!productData || !productData.colors || !Array.isArray(productData.colors) || productData.colors.length <= 1) {
      return
    }

    // Mark as requiring color selection
    this.colorRequiredProducts.add(productId)

    // Create color selection UI
    const colorContainer = this.createColorSelectionUI(productId, productData.colors)

    // Insert before action buttons
    const actionButtons = card.querySelector(".product-actions, .card-actions")
    if (actionButtons) {
      actionButtons.parentNode.insertBefore(colorContainer, actionButtons)
    } else {
      // Fallback: append to card
      card.appendChild(colorContainer)
    }

    // Update existing buttons to require color selection
    this.updateActionButtons(card, productId)
  }

  createColorSelectionUI(productId, colors) {
    const container = document.createElement("div")
    container.className = "color-selection-container"

    container.innerHTML = `
            <div class="color-selection-wrapper">
                <label class="color-selection-label">
                    <span class="color-label-text">Color:</span>
                    <span class="color-required-indicator">*</span>
                </label>
                <div class="color-options" data-product-id="${productId}">
                    ${colors
                      .map(
                        (color) => `
                        <button type="button" 
                                class="color-option" 
                                data-color="${color}"
                                data-product-id="${productId}"
                                style="background-color: ${this.getColorValue(color)}"
                                title="${color}"
                                aria-label="Select ${color} color">
                            <span class="color-checkmark">✓</span>
                        </button>
                    `,
                      )
                      .join("")}
                </div>
                <div class="selected-color-display" data-product-id="${productId}">
                    <span class="selected-color-text">Please select a color</span>
                </div>
            </div>
        `

    // Add event listeners
    const colorOptions = container.querySelectorAll(".color-option")
    colorOptions.forEach((option) => {
      option.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.selectColor(productId, option.dataset.color)
      })
    })

    return container
  }

  getColorValue(colorName) {
    const colorMap = {
      red: "#ef4444",
      blue: "#3b82f6",
      green: "#10b981",
      yellow: "#f59e0b",
      purple: "#8b5cf6",
      pink: "#ec4899",
      orange: "#f97316",
      black: "#1f2937",
      white: "#f9fafb",
      gray: "#6b7280",
      grey: "#6b7280",
      brown: "#92400e",
      navy: "#1e40af",
      teal: "#14b8a6",
      lime: "#84cc16",
      indigo: "#6366f1",
      cyan: "#06b6d4",
      rose: "#f43f5e",
      emerald: "#059669",
      violet: "#7c3aed",
      fuchsia: "#d946ef",
      sky: "#0ea5e9",
      amber: "#f59e0b",
      slate: "#64748b",
    }

    const normalizedColor = colorName.toLowerCase().trim()
    return colorMap[normalizedColor] || colorName
  }

  selectColor(productId, color) {
    // Update selected color
    this.selectedColors.set(productId, color)
    this.saveSelectedColors()

    // Update UI
    this.updateColorSelectionUI(productId, color)

    // Enable action buttons
    this.enableActionButtons(productId)

    // Trigger custom event
    document.dispatchEvent(
      new CustomEvent("colorSelected", {
        detail: { productId, color },
      }),
    )
  }

  updateColorSelectionUI(productId, selectedColor) {
    const colorOptions = document.querySelectorAll(`.color-option[data-product-id="${productId}"]`)
    const selectedDisplay = document.querySelector(
      `.selected-color-display[data-product-id="${productId}"] .selected-color-text`,
    )

    // Update color options
    colorOptions.forEach((option) => {
      if (option.dataset.color === selectedColor) {
        option.classList.add("selected")
        option.setAttribute("aria-selected", "true")
      } else {
        option.classList.remove("selected")
        option.setAttribute("aria-selected", "false")
      }
    })

    // Update selected color display
    if (selectedDisplay) {
      selectedDisplay.textContent = `Selected: ${selectedColor}`
      selectedDisplay.style.color = this.getColorValue(selectedColor)
    }
  }

  updateActionButtons(card, productId) {
    const buttons = card.querySelectorAll(
      '.btn[onclick*="buyNow"], .btn[onclick*="addToCart"], button[id*="buy"], button[id*="cart"]',
    )

    buttons.forEach((button) => {
      // Store original onclick if exists
      if (button.onclick && !button.dataset.originalOnclick) {
        button.dataset.originalOnclick = button.onclick.toString()
      }

      // Store original href for links
      if (button.href && !button.dataset.originalHref) {
        button.dataset.originalHref = button.href
      }

      // Replace with color validation
      button.onclick = (e) => {
        e.preventDefault()
        this.handleActionButtonClick(productId, button, e)
      }

      // Initially disable if color required
      if (this.colorRequiredProducts.has(productId)) {
        button.classList.add("color-required")
        button.disabled = true
      }
    })
  }

  enableActionButtons(productId) {
    const buttons = document.querySelectorAll(
      `[data-product-id="${productId}"] .btn, .product-card .btn, .product-info .btn`,
    )

    buttons.forEach((button) => {
      if (button.classList.contains("color-required")) {
        button.disabled = false
        button.classList.remove("color-required")
        button.classList.add("color-selected")
      }
    })
  }

  handleActionButtonClick(productId, button, event) {
    // Check if color selection is required
    if (this.colorRequiredProducts.has(productId)) {
      const selectedColor = this.selectedColors.get(productId)

      if (!selectedColor) {
        this.showColorRequiredNotification(productId)
        return false
      }
    }

    // Proceed with original action
    this.executeOriginalAction(button, productId)
  }

  executeOriginalAction(button, productId) {
    const selectedColor = this.selectedColors.get(productId)

    // Handle different button types
    if (button.dataset.originalOnclick) {
      // Restore and execute original onclick
      const originalFunction = new Function(
        "event",
        button.dataset.originalOnclick.replace("function onclick(event)", ""),
      )

      // Modify checkout URLs to include color
      if (button.dataset.originalOnclick.includes("checkout") || button.textContent.toLowerCase().includes("buy")) {
        this.proceedToCheckoutWithColor(productId, selectedColor)
      } else {
        originalFunction.call(button, event)
      }
    } else if (button.dataset.originalHref) {
      // Handle href links
      let href = button.dataset.originalHref
      if (selectedColor && href.includes("checkout")) {
        href = this.addColorToCheckoutUrl(href, selectedColor)
      }
      window.location.href = href
    } else {
      // Handle standard actions
      if (button.textContent.toLowerCase().includes("buy") || button.id.includes("buy")) {
        this.proceedToCheckoutWithColor(productId, selectedColor)
      } else if (button.textContent.toLowerCase().includes("cart") || button.id.includes("cart")) {
        this.addToCartWithColor(productId, selectedColor)
      }
    }
  }

  proceedToCheckoutWithColor(productId, color) {
    // Get existing checkout URL logic
    const pid = encodeURIComponent(productId)
    const colorParam = color ? encodeURIComponent(color) : ""

    // Build checkout URL with both pid and color
    let checkoutUrl = `https://checkout.pluggn.com.ng/?pid=${pid}`
    if (colorParam) {
      checkoutUrl += `&color=${colorParam}`
    }

    window.open(checkoutUrl, "_blank")
  }

  addToCartWithColor(productId, color) {
    // Add to cart with color information
    if (window.cart && typeof window.cart.addItem === "function") {
      const productData = this.getProductData(productId)
      if (productData) {
        productData.selectedColor = color
        window.cart.addItem(productData)
      }
    }

    // Fallback: trigger existing cart functionality
    const addToCartEvent = new CustomEvent("addToCart", {
      detail: { productId, color },
    })
    document.dispatchEvent(addToCartEvent)
  }

  addColorToCheckoutUrl(url, color) {
    const colorParam = encodeURIComponent(color)
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}color=${colorParam}`
  }

  showColorRequiredNotification(productId) {
    // Create notification
    const notification = document.createElement("div")
    notification.className = "color-required-notification"
    notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">⚠️</span>
                <span class="notification-text">Please select a color before proceeding</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `

    // Add to page
    document.body.appendChild(notification)

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 3000)

    // Highlight color selection
    const colorContainer = document.querySelector(`.color-options[data-product-id="${productId}"]`)
    if (colorContainer) {
      colorContainer.classList.add("highlight-required")
      setTimeout(() => {
        colorContainer.classList.remove("highlight-required")
      }, 2000)
    }
  }

  getProductIdFromCard(card) {
    // Try multiple methods to get product ID
    return (
      card.dataset.productId ||
      card.querySelector("[data-product-id]")?.dataset.productId ||
      card.id?.replace("product-", "") ||
      card.querySelector(".product-link")?.href?.match(/\/product\/([^/]+)/)?.[1]
    )
  }

  getProductData(productId) {
    // Try to get product data from various sources
    if (window.EnhancedProductCache) {
      const cached = window.EnhancedProductCache.getFromMemoryCache()
      if (cached && cached.data) {
        return cached.data.find((p) => p.id === productId)
      }
    }

    // Fallback: try global products array
    if (window.products && Array.isArray(window.products)) {
      return window.products.find((p) => p.id === productId)
    }

    return null
  }

  saveSelectedColors() {
    try {
      const colorsObj = Object.fromEntries(this.selectedColors)
      localStorage.setItem("selectedColors", JSON.stringify(colorsObj))
    } catch (error) {
      console.warn("Could not save selected colors:", error)
    }
  }

  loadSelectedColors() {
    try {
      const saved = localStorage.getItem("selectedColors")
      if (saved) {
        const colorsObj = JSON.parse(saved)
        this.selectedColors = new Map(Object.entries(colorsObj))
      }
    } catch (error) {
      console.warn("Could not load selected colors:", error)
    }
  }

  // Public API
  getSelectedColor(productId) {
    return this.selectedColors.get(productId)
  }

  isColorRequired(productId) {
    return this.colorRequiredProducts.has(productId)
  }

  clearSelectedColor(productId) {
    this.selectedColors.delete(productId)
    this.saveSelectedColors()
    this.updateColorSelectionUI(productId, null)
  }

  clearAllSelectedColors() {
    this.selectedColors.clear()
    this.saveSelectedColors()
  }
}

// Initialize color selection manager
window.ColorSelectionManager = new ColorSelectionManager()

// Export for use in other scripts
window.colorSelection = {
  getSelectedColor: (productId) => window.ColorSelectionManager.getSelectedColor(productId),
  isColorRequired: (productId) => window.ColorSelectionManager.isColorRequired(productId),
  selectColor: (productId, color) => window.ColorSelectionManager.selectColor(productId, color),
  clearSelectedColor: (productId) => window.ColorSelectionManager.clearSelectedColor(productId),
}
