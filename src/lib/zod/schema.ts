import { z } from "zod";

export const supplierInfoSchema = z.object({
  businessName: z
    .string()
    .min(1, "Business name is required")
    .max(100, "Business name cannot exceed 100 characters"),
  businessType: z
    .enum(["Warehouse", "Wholesaler", "Importer", "Local Store"])
    .optional(),
  pickupLocation: z
    .string()
    .min(1, "Pickup location is required")
    .max(200, "Pickup location cannot exceed 200 characters"),
  phone: z.string(),
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
      .min(1, "Business name is required")
      .max(100, "Business name cannot exceed 100 characters"),
    phone: z.string().optional(),
    state: STATE_ENUM.optional(),
    aboutBusiness: z
      .string()
      .max(500, "About your business cannot exceed 500 characters")
      .optional(),
  }),
});

export const updatePlugInfoSchema = z.object({
  profile: z.object({
    businessName: z
      .string()
      .min(1, "Business name is required")
      .max(100, "Business name cannot exceed 100 characters"),
    phone: z.string().optional(),
    state: STATE_ENUM.optional(),
    aboutBusiness: z
      .string()
      .max(500, "About your business cannot exceed 500 characters")
      .optional(),
  }),
});

// Zod validation schema for product
export const productSchema = z.object({
  name: z
    .string()
    .min(1, "name is required")
    .max(100, "name cannot exceed 100 characters"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  category: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  stock: z.number().int().nonnegative("Stock must be a non-negative integer"),
  weight: z.number().positive("Weight must be positive").optional(),
  dimensions: z.string().optional(), // JSON string with dimensions
});

export const productVariationSchema = z.object({
  size: z.string().optional(),
  color: z.string().optional(),
  price: z.number().positive("Variation price must be positive"),
  stock: z.number().int().nonnegative("Stock must be a non-negative integer"),
  weight: z.number().positive("Weight must be positive").optional(),
  dimensions: z.string().optional(), // JSON string with dimensions
});

export const productVariationsSchema = z.array(productVariationSchema);
