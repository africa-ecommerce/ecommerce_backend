import { z } from "zod";


export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[@$!%*?&]/, "Password must contain at least one special character");

  
export const supplierInfoSchema = z.object({
  businessName: z
    .string()
    .min(1)
    .max(100),
  businessType: z
    .enum(["Warehouse", "Wholesaler", "Importer", "Local Store"])
    .optional(),
  phone: z.string(),
});

export const updateSupplierInfoSchema = z.object({
  businessName: z
    .string()
    .min(1)
    .max(100),
  phone: z.string(),
});

export const addressSchema = z.object({
  streetAddress: z.string().min(1),
  lga: z.string().min(1),
  state: z.string().min(1),
  directions: z.string().optional(),
});

const STATE_ENUM = z.enum([
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "FCT",
]);

export const plugInfoSchema = z.object({
  generalMerchant: z.boolean(),
  niches: z.array(z.string()),
  profile: z.object({
    businessName: z
      .string()
      .min(1)
      .max(100),
    phone: z.string().optional(),
    state: STATE_ENUM.optional(),
    aboutBusiness: z
      .string()
      .max(500)
      .optional(),
  }),
});

export const updatePlugInfoSchema = z.object({
  businessName: z
    .string()
    .min(1)
    .max(100)
    .optional(),
  phone: z.string().optional(),
  state: STATE_ENUM.optional(),
});

// Zod validation schema for product
export const productSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  category: z.string(),
  //variations
  size: z.string().optional(),
  colors: z.array(z.string()).optional(),
  stock: z.number().int().nonnegative().optional(),
  moq: z.number().positive().optional(),
});

export const productVariationSchema = z.object({
  size: z.string().optional(),
  colors: z.array(z.string()).optional(),
  stock: z.number().int().nonnegative(),
  moq: z.number().positive().optional(),
});

export const productVariationsSchema = z.array(productVariationSchema);



// For base product stock and price update only
export const updateProductSchema = z.object({
  price: z.number().positive(),
  stock: z.number().int().nonnegative().optional(),
});

// For variation updates (stock only, size/color optional)
export const updateProductVariationSchema = z.object({
  size: z.string().optional(),
  color: z.string().optional(),
  stock: z.number().int().nonnegative(),
});

export const updateProductVariationsSchema = z.array(updateProductVariationSchema);


// Zod schema for validating subdomain
export const subdomainSchema = z
  .string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);

export const BuyerInfoSchema = z.object({
  buyerName: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().min(10),
});

const OrderItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().positive(),
  productSize: z.string().optional(),
  productColor: z.string().optional(),
  variantSize: z.string().optional(),
  variantColor: z.string().optional(),
  supplierId: z.string(),
  plugId: z.string().optional(),
  deliveryFee: z.number().positive(),
  paymentMethod:  z.string()
});


export const StageOrderSchema = z
  .object({
    buyerName: z.string().min(1),
    buyerEmail: z.string().email(),
    buyerPhone: z.string().min(1),
    buyerAddress: z.string().optional(),
    buyerState: z.string().min(1),
    buyerLga: z.string().optional(),
    buyerDirections: z.string().optional(),
    buyerInstructions: z.string().optional(),
    platform: z.string().min(1).optional(),
    plugId: z.string().optional(),
    supplierId: z.string().optional(),
    subdomain: z.string().optional(),
    orderItems: z.array(OrderItemSchema).min(1),
  })
  .refine((data) => data.plugId || data.subdomain || data.supplierId, {
    message: "Either plugId, subdomain, or supplierId must be provided",
  });

export const ConfirmOrderSchema = z.object({
  reference: z.string().min(1),
});

export const approveProductSchema = z.object({
  minPrice: z.number().positive(),
  maxPrice: z.number().positive(),
});