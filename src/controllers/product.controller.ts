// src/controllers/product.controller.ts
import { Request, Response } from "express";
import {
  createProduct,
  getProductsByMerchant,
  updateProduct,
  deleteProduct,
} from "../services/product.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const addProduct = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const { title, description, price, inventory } = req.body;
    // Validate local units
    const product = await createProduct(
      merchantId,
      title,
      description,
      price,
      inventory
    );
    res.status(201).json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};


// export const bulkImport = async (req: Request, res: Response) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No CSV file uploaded" });
//     }

//     const products = await parseCSV(req.file.buffer.toString());
//     const createdProducts = await prisma.$transaction(
//       products.map((product) =>
//         prisma.product.create({
//           data: {
//             ...product,
//             merchantId: req.merchant!.id,
//             searchString: `${product.name} ${
//               product.localUnit || ""
//             }`.toLowerCase(),
//           },
//         })
//       )
//     );

//     res.status(201).json({ count: createdProducts.length });
//   } catch (error) {
//     console.error("[Bulk Import Error]", error);
//     res.status(500).json({ error: "CSV import failed" });
//   }
// };




export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const products = await getProductsByMerchant(merchantId);
    res.json({ products });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const modifyProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const product = await updateProduct(id, data);
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const removeProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteProduct(id);
    res.json({ message: "Product deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
