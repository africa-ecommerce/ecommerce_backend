import { PlugProduct } from "@prisma/client";


// // Helper function to format products with parsed images and complete details
// export const formatPlugProductWithDetails = async (plugProduct: PlugProduct, tx?: any) => {
//   // Use the provided transaction or default to prisma
//   const db = tx || prisma;
//   let originalProduct;
  
//   // Destructure fields we might modify
//   const { priceEffectiveAt: rawEffectiveDate, pendingPrice, ...remainingPlugProduct } = plugProduct;

//   try {
//     // Fetch the original product details from the supplier's product
//     originalProduct = await db.product.findUnique({
//       where: { id: plugProduct.originalId },
//       include: {
//         variations: true,
//       },
//     });

//     //CHECK IF SUPPLIER HAS DELETED PRODUCT  // DO THIS AND PUT A DELETE BUTTON THERE SPECIFICALLY  ------->

//     if (!originalProduct) {
//       // Handle invalid product (existing logic)
//       if (tx && plugProduct.status === "ACTIVE") {
//         await tx.plugProduct.update({
//           where: { id: plugProduct.id },
//           data: { status: "INACTIVE" },
//         });
//       }
//       return {
//         ...remainingPlugProduct,
//         description: "This product has been removed by the supplier.",
//         category: "",
//         originalPrice: 0,
//         images: [],
//       };
//     }

//     // Calculate days left formatting if needed
//     let formattedEffectiveDate = null;
//     if (pendingPrice && rawEffectiveDate) {
//       const now = new Date();
//       const effectiveDate = new Date(rawEffectiveDate);
//       const timeDiff = effectiveDate.getTime() - now.getTime();
//       let daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

//       // 1 - 3 days left
//       formattedEffectiveDate = daysLeft
//     }


//      // Process variations if they exist
//   const variations = originalProduct.variations || [];
  
//   // For each variation, parse the dimensions string if it exists
//   const formattedVariations = variations.map((variation: any) => {
//     return {
//       ...variation,
//       dimensions: variation.dimensions
//         ? JSON.parse(variation.dimensions)
//         : null,
//     };
//   });

//     // Construct base response
//     const formattedProduct: any = {
//       ...remainingPlugProduct,
//       // Original product details
//       description: originalProduct.description,
//       category: originalProduct.category,
//       originalPrice: originalProduct.price,
//       stocks:originalProduct.stock,
//       plugsCount:originalProduct.plugsCount,
//     //   currentPrice: remainingPlugProduct.price,
//       images: originalProduct.images
//         ? JSON.parse(originalProduct.images as string)
//         : [],
//       variations: formattedVariations,
//     };


    
//     // Only add pricing fields if update is pending
//     if (pendingPrice && rawEffectiveDate) {
//       formattedProduct.pendingPrice = pendingPrice;
//       formattedProduct.priceEffectiveAt = formattedEffectiveDate;
//     }

//     return formattedProduct;
    
//   } catch (error) {
//     console.error(`Error formatting plug product ${plugProduct.id}:`, error);
//     return {
//       ...plugProduct,
//       images: originalProduct?.images
//         ? JSON.parse(originalProduct.images as string)
//         : [],
//     };
//   }
// };



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
    weight: originalProduct.weight,
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
        // id: product.supplier.id,
        // businessType: product.supplier.businessType,
        businessName:
          product.supplier.businessName || "",
        pickupLocation: product.supplier.pickupLocation || "",
        image: product.supplier.avatar,
        // userId: product.supplier.user?.id,
      }
    : null;

  // Return the product with parsed images, variations, and supplier details
  return {
    ...product,
    images,
    variations: formattedVariations,
    supplier: supplierDetails
  };
}