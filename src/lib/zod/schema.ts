
import { z } from "zod";

// Zod validation schema for product
export const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters long"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters long"),
  price: z.number().positive("Price must be positive"),
  // quantity: z.number().int().nonnegative("Quantity must be a non-negative integer"),
  category: z.string().optional(),
});


// Zod validation schema for plug product
export const plugProductSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters long"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters long"),
  price: z.number().positive("Price must be positive"),
  category: z.string().optional(),
});
