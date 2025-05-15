
// Helper function to format plug products with complete details
export const formatPlugProductWithDetails = (plugProduct: any) => {
  // Destructure fields we might modify
  const {
    priceEffectiveAt: rawEffectiveDate,
    pendingPrice,
    originalProduct,
    ...remainingPlugProduct
  } = plugProduct;

  // Calculate days left formatting if needed
  let formattedEffectiveDate = null;
  if (pendingPrice && rawEffectiveDate) {
    const now = new Date();
    const effectiveDate = new Date(rawEffectiveDate);
    const timeDiff = effectiveDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    formattedEffectiveDate = daysLeft;
  }

  // Process variations if they exist
  const variations = originalProduct.variations || [];

  // For each variation, parse the dimensions string if it exists
  const formattedVariations = variations.map((variation: any) => {
    return {
      ...variation,
      dimensions: variation.dimensions
        ? JSON.parse(variation.dimensions)
        : null,
      stocks: variation.stock,
    };
  });

  // Construct base response
  const formattedProduct: any = {
    ...remainingPlugProduct,
    // Original product details
    name: originalProduct.name,
    description: originalProduct.description,
    category: originalProduct.category,
    originalPrice: originalProduct.price,
    stocks: originalProduct.stock,
    plugsCount: originalProduct.plugsCount,
    size: originalProduct.size,
    color: originalProduct.color,
    dimensions: originalProduct.dimensions
      ? JSON.parse(originalProduct.dimensions)
      : null,
    images: originalProduct.images
      ? JSON.parse(originalProduct.images as string)
      : [],
    variations: formattedVariations,
  };

  // Only add pricing fields if update is pending
  if (pendingPrice && rawEffectiveDate) {
    formattedProduct.pendingPrice = pendingPrice;
    formattedProduct.priceEffectiveAt = formattedEffectiveDate;
  }

  return formattedProduct;
};

// Helper function to format products with images, variations, and supplier details
export function formatProductWithImagesAndVariations(product: any) {
  // Parse images from JSON string to array
  const images = product.images ? JSON.parse(product.images) : [];

  // Process variations if they exist
  const variations = product.variations || [];

  // For each variation, parse the dimensions string if it exists
  const formattedVariations = variations.map((variation: any) => {
    return {
      ...variation,
      dimensions: variation.dimensions
        ? JSON.parse(variation.dimensions)
        : null,
    };
  });

  // Extract supplier details if available
  const supplierDetails = product.supplier
    ? {
        businessName: product.supplier.businessName || "",
        pickupLocation: product.supplier.pickupLocation || "",
        image: product.supplier.avatar,
      }
    : null;

  // Return the product with parsed images, variations, and supplier details
  return {
    ...product,
    images,
    variations: formattedVariations,
    supplier: supplierDetails,
  };
}
