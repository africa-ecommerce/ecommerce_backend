// Enhanced checkout functionality with color support
class EnhancedCheckout {
  constructor() {
    this.init()
  }

  init() {
    this.enhanceExistingButtons()
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Listen for dynamically added buttons
    document.addEventListener("click", (e) => {
      if (this.isCheckoutButton(e.target)) {
        e.preventDefault()
        this.handleCheckoutClick(e.target)
      }
    })

    // Listen for color selection changes
    document.addEventListener("colorSelected", (e) => {
      const { productId } = e.detail
      this.updateCheckoutButtons(productId)
    })
  }

  enhanceExistingButtons() {
    // Find all existing checkout/buy buttons
    const buttons = document.querySelectorAll(`
            button[id*="buy"],
            button[onclick*="buyNow"],
            .btn[onclick*="checkout"],
            a[href*="checkout"],
            .checkout-btn,
            .buy-now-btn
        `)

    buttons.forEach((button) => this.enhanceButton(button))
  }

  enhanceButton(button) {
    if (button.dataset.enhanced) return

    button.dataset.enhanced = "true"

    // Store original action
    if (button.onclick) {
      button.dataset.originalOnclick = button.onclick.toString()
      button.onclick = null
    }

    if (button.href) {
      button.dataset.originalHref = button.href
      button.removeAttribute("href")
    }

    // Add click handler
    button.addEventListener("click", (e) => {
      e.preventDefault()
      this.handleCheckoutClick(button)
    })
  }

  isCheckoutButton(element) {
    const text = element.textContent.toLowerCase()
    const id = element.id.toLowerCase()
    const className = element.className.toLowerCase()

    return (
      text.includes("buy") ||
      text.includes("checkout") ||
      id.includes("buy") ||
      id.includes("checkout") ||
      className.includes("buy") ||
      className.includes("checkout")
    )
  }

  handleCheckoutClick(button) {
    const productId = this.getProductIdFromButton(button)

    if (!productId) {
      console.warn("Could not determine product ID for checkout")
      this.fallbackCheckout(button)
      return
    }

    // Check if color selection is required
    if (window.colorSelection && window.colorSelection.isColorRequired(productId)) {
      const selectedColor = window.colorSelection.getSelectedColor(productId)

      if (!selectedColor) {
        this.showColorSelectionRequired(productId)
        return
      }

      this.proceedToCheckout(productId, selectedColor)
    } else {
      this.proceedToCheckout(productId)
    }
  }

  getProductIdFromButton(button) {
    // Try multiple methods to get product ID
    const productCard = button.closest(".product-card, .product-info, .product-details")

    if (productCard) {
      return (
        productCard.dataset.productId ||
        productCard.id?.replace("product-", "") ||
        productCard.querySelector("[data-product-id]")?.dataset.productId
      )
    }

    // Try to extract from URL parameters or global state
    const urlParams = new URLSearchParams(window.location.search)
    const pidFromUrl = urlParams.get("pid") || urlParams.get("id")

    if (pidFromUrl) return pidFromUrl

    // Try global product state
    if (window.currentProduct && window.currentProduct.id) {
      return window.currentProduct.id
    }

    return null
  }

  proceedToCheckout(productId, selectedColor = null) {
    const pid = encodeURIComponent(productId)
    let checkoutUrl = `https://checkout.pluggn.com.ng/?pid=${pid}`

    if (selectedColor) {
      const colorParam = encodeURIComponent(selectedColor)
      checkoutUrl += `&color=${colorParam}`
    }

    // Add any additional parameters that might be needed
    const additionalParams = this.getAdditionalCheckoutParams()
    if (additionalParams) {
      checkoutUrl += `&${additionalParams}`
    }

    console.log("[v0] Proceeding to checkout:", checkoutUrl)
    window.open(checkoutUrl, "_blank")
  }

  getAdditionalCheckoutParams() {
    // Get any additional parameters that should be included in checkout
    const params = new URLSearchParams()

    // Add quantity if available
    const quantityInput = document.querySelector('input[name="quantity"], #quantity')
    if (quantityInput && quantityInput.value) {
      params.append("qty", quantityInput.value)
    }

    // Add any other relevant parameters
    const urlParams = new URLSearchParams(window.location.search)
    ;["variant", "size", "ref", "utm_source", "utm_medium", "utm_campaign"].forEach((param) => {
      if (urlParams.has(param)) {
        params.append(param, urlParams.get(param))
      }
    })

    return params.toString()
  }

  showColorSelectionRequired(productId) {
    // Scroll to color selection if not visible
    const colorContainer = document.querySelector(`.color-options[data-product-id="${productId}"]`)
    if (colorContainer) {
      colorContainer.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })

      // Highlight the color selection
      colorContainer.classList.add("highlight-required")
      setTimeout(() => {
        colorContainer.classList.remove("highlight-required")
      }, 2000)
    }

    // Show notification
    this.showNotification("Please select a color before proceeding to checkout", "warning")
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `checkout-notification checkout-notification-${type}`

    notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `

    document.body.appendChild(notification)

    // Auto remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 4000)
  }

  getNotificationIcon(type) {
    const icons = {
      info: "ℹ️",
      warning: "⚠️",
      error: "❌",
      success: "✅",
    }
    return icons[type] || icons.info
  }

  fallbackCheckout(button) {
    // Fallback to original functionality if available
    if (button.dataset.originalOnclick) {
      try {
        const originalFunction = new Function(
          "event",
          button.dataset.originalOnclick.replace("function onclick(event)", ""),
        )
        originalFunction.call(button, event)
      } catch (error) {
        console.error("Error executing original checkout function:", error)
      }
    } else if (button.dataset.originalHref) {
      window.open(button.dataset.originalHref, "_blank")
    } else {
      console.warn("No fallback checkout method available")
    }
  }

  updateCheckoutButtons(productId) {
    // Enable checkout buttons when color is selected
    const productContainer =
      document.querySelector(`[data-product-id="${productId}"]`) ||
      document.querySelector(".product-card, .product-info, .product-details")

    if (productContainer) {
      const buttons = productContainer.querySelectorAll(".btn[disabled], button[disabled]")
      buttons.forEach((button) => {
        if (this.isCheckoutButton(button)) {
          button.disabled = false
          button.classList.remove("color-required")
          button.classList.add("color-selected")
        }
      })
    }
  }
}

// Initialize enhanced checkout
document.addEventListener("DOMContentLoaded", () => {
  window.EnhancedCheckout = new EnhancedCheckout()
})

// CSS for checkout notifications
const checkoutStyles = `
.checkout-notification {
    position: fixed;
    top: 2rem;
    right: 2rem;
    z-index: 10001;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    animation: slideInRight 0.3s ease-out;
    max-width: 350px;
    min-width: 300px;
}

.checkout-notification-info {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
}

.checkout-notification-warning {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
}

.checkout-notification-error {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
}

.checkout-notification-success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
}

@media (max-width: 768px) {
    .checkout-notification {
        top: 1rem;
        right: 1rem;
        left: 1rem;
        max-width: none;
        min-width: auto;
    }
}
`

// Inject styles
const styleSheet = document.createElement("style")
styleSheet.textContent = checkoutStyles
document.head.appendChild(styleSheet)
