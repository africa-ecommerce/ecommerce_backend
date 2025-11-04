// Helper function to format plug products
export const formatPlugProduct = (plugProduct: any) => {
  // Destructure fields we might modify
  const {
    // priceEffectiveAt: rawEffectiveDate,
    // pendingPrice,
    originalProduct,
    ...remainingPlugProduct
  } = plugProduct;

  // Calculate days left formatting if needed
  // let formattedEffectiveDate = null;
  // if (pendingPrice && rawEffectiveDate) {
  //   const now = new Date();
  //   const effectiveDate = new Date(rawEffectiveDate);
  //   const timeDiff = effectiveDate.getTime() - now.getTime();
  //   const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
  //   formattedEffectiveDate = daysLeft;
  // }
  
  // Process variations if they exist
  const variations = originalProduct?.variations || [];
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
    supplierId: originalProduct?.supplier?.id,
    name: originalProduct?.name,
    description: originalProduct?.description,
    category: originalProduct?.category,
    originalPrice: originalProduct?.price,
    minPrice: originalProduct?.minPrice,
    maxPrice: originalProduct?.maxPrice,
    stocks: originalProduct?.stock,
    sold: originalProduct?.sold,
    moq: originalProduct?.moq,
    plugsCount: originalProduct?.plugsCount,
    size: originalProduct?.size,
    colors: originalProduct?.colors,
    images: originalProduct?.images
      ? JSON.parse(originalProduct?.images as string)
      : [],
    variations: formattedVariations,
  };

  // Only add pricing fields if update is pending
  // if (pendingPrice && rawEffectiveDate) {
  //   formattedProduct.pendingPrice = pendingPrice;
  //   formattedProduct.priceEffectiveAt = formattedEffectiveDate;
  // }

  if (originalProduct?.supplier?.pickupLocation) {
    formattedProduct.pickupLocation = originalProduct?.supplier.pickupLocation;
  }

  // Add user review if it exists (early check)
  if (originalProduct?.reviews && originalProduct?.reviews.length > 0) {
    const userReview = originalProduct?.reviews[0]; // Only one review since we filtered by plugId
    formattedProduct.review = {
      rating: userReview.rating,
      review: userReview.review,
      createdAt: userReview.createdAt,
    };
  }

  return formattedProduct;
};
export const formatSupplierProduct = (supplierProduct: any) => {
  // Destructure fields we might modify
  // const {
  //   // priceEffectiveAt: rawEffectiveDate,
  //   // pendingPrice,
  //   originalProduct,
  // } = supplierProduct;

  // Calculate days left formatting if needed
  // let formattedEffectiveDate = null;
  // if (pendingPrice && rawEffectiveDate) {
  //   const now = new Date();
  //   const effectiveDate = new Date(rawEffectiveDate);
  //   const timeDiff = effectiveDate.getTime() - now.getTime();
  //   const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
  //   formattedEffectiveDate = daysLeft;
  // }

  // Process variations if they exist
  const variations = supplierProduct?.variations || [];
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
    // Original product details
    id: supplierProduct?.id,
    supplierId: supplierProduct?.supplier?.id,
    name: supplierProduct?.name,
    description: supplierProduct?.description,
    category: supplierProduct?.category,
    price: supplierProduct?.price,
    minPrice: supplierProduct?.minPrice,
    maxPrice: supplierProduct?.maxPrice,
    stocks: supplierProduct?.stock,
    sold: supplierProduct?.sold,
    moq: supplierProduct?.moq,
    plugsCount: supplierProduct?.plugsCount,
    size: supplierProduct?.size,
    colors: supplierProduct?.colors,
    images: supplierProduct?.images
      ? JSON.parse(supplierProduct?.images as string)
      : [],
    variations: formattedVariations,
  };

  // Only add pricing fields if update is pending
  // if (pendingPrice && rawEffectiveDate) {
  //   formattedProduct.pendingPrice = pendingPrice;
  //   formattedProduct.priceEffectiveAt = formattedEffectiveDate;
  // }

  if (supplierProduct?.supplier?.pickupLocation) {
    formattedProduct.pickupLocation = supplierProduct?.supplier.pickupLocation;
  }

  // Add user review if it exists (early check)
  if (supplierProduct?.reviews && supplierProduct?.reviews.length > 0) {
    const userReview = supplierProduct?.reviews[0]; // Only one review since we filtered by plugId
    formattedProduct.review = {
      rating: userReview.rating,
      review: userReview.review,
      createdAt: userReview.createdAt,
    };
  }

  return formattedProduct;
};

// Helper function to format products
export function formatProduct(product: any) {
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
        pickupLocation: product.supplier.pickupLocation,
        image: product.supplier.avatar,
      }
    : null;

  // Base formatted product
  const formattedProduct = {
    ...product,
    images,
    variations: formattedVariations,
    supplier: supplierDetails,
  };

  // Check if reviews are included and process them
  if (product.reviews) {
    const reviews = product.reviews || [];

    // Format reviews with business names and additional details
    const formattedReviews = reviews.map((review: any) => ({
      rating: review.rating,
      review: review.review,
      businessName: review.plug?.businessName || "",
      createdAt: review.createdAt,
    }));

    // Add reviews and stats to the formatted product
    formattedProduct.reviews = formattedReviews;
  }

  return formattedProduct;
}

export function formatPlugOrders(orders: any[]) {
  return orders.map((order) => ({
    orderId: order.orderNumber,
    id: order.id,
    orderTrackingId: order.deliveryTrackingId || null,
    createdAt: order.createdAt,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    buyerPhone: order.buyerPhone,
    buyerAddress: order.buyerAddress,
    buyerState: order.buyerState,
    buyerLga: order.buyerLga,
    terminalAddress: order.terminalAddress,
    deliveryType: order.deliveryType,
    // plugPrice: order.plugPrice,
    // supplierPrice: order.supplierPrice,
    orderItems: order.orderItems.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      productId: item.productId,
      productName: item.productName,
      productSize: item.productSize || null,
      productColor: item.productColor || null,
      variantId: item.variantId || null,
      variantSize: item.variantSize || null,
      variantColor: item.variantColor || null,
      plugPrice: item.plugPrice,
      supplierPrice: item.supplierPrice,
    })),
  }));
}


export function formatSupplierOrders(orderItems: any[]) {
  // Group items by orderId
  const orders: any = {};

  orderItems.forEach((item) => {
    const orderId = item.order.id;
    if (!orders[orderId]) {
      orders[orderId] = {
        order: item.order,
        items: [],
      };
    }
    orders[orderId].items.push(item);
  });

  // Map over orders
  return Object.values(orders).map((group: any) => {
    const order = group.order;
    const items = group.items;

    return {
      orderId: order.orderNumber,
      id: order.id,
      orderTrackingId: order.deliveryTrackingId || null,
      createdAt: order.createdAt,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      buyerPhone: order.buyerPhone,
      buyerAddress: order.buyerAddress,
      buyerState: order.buyerState,
      buyerLga: order.buyerLga,
      terminalAddress: order.terminalAddress,
      deliveryType: order.deliveryType,
      orderItems: items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        productId: item.productId,
        productName: item.productName,
        productSize: item.productSize || null,
        productColor: item.productColor || null,
        variantId: item.variantId || null,
        variantSize: item.variantSize || null,
        variantColor: item.variantColor || null,
        plugPrice: item.plugPrice,
        supplierPrice: item.supplierPrice,
      })),
    };
  });
}
