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
  name: z
    .string()
    .min(1)
    .max(100),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string(),
  //variations
  size: z.string().optional(),
  color: z.string().optional(),
  stock: z
    .number()
    .int()
    .nonnegative()
    .optional(),
});

export const productVariationSchema = z.object({
  size: z.string().optional(),
  color: z.string().optional(),
  stock: z.number().int().nonnegative(),
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
  plugPrice: z.number().min(0),
  supplierPrice: z.number().min(0),
  productName: z.string().min(1),
  supplierId: z.string().min(1),
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1),
  productSize: z.string().optional(),
  productColor: z.string().optional(),
  variantSize: z.string().optional(),
  variantColor: z.string().optional(),
});

export const PlaceOrderSchema = z.object({
  buyerName: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().min(1),
  buyerAddress: z.string().min(1),
  buyerState: z.string().min(1),
  buyerLga: z.string().min(1),
  buyerDirections: z.string().optional(),
  buyerLatitude: z.number(),
  buyerLongitude: z.number(),
  buyerInstructions: z.string().optional(),
  platform: z.string().min(1).optional(),
  paymentMethod: z.string().min(1),
  totalAmount: z.number().positive(),
  deliveryFee: z.number().min(0),
  paymentReference: z.string().min(1).optional(),
  plugId: z.string().optional(),
  subdomain: z.string().optional(),
  orderItems: z.array(OrderItemSchema).min(1),
});
