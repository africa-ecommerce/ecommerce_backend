// Helper function to format products with parsed images
export const formatProductWithImages = (product: any) => {
  return {
    ...product,
    images: product.images ? JSON.parse(product.images as string) : [],
  };
};
