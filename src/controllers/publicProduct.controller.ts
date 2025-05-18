import { Request, Response } from "express";
import {prisma } from "../config";
import { formatPlugProductWithDetails } from "../helper/formatProduct";

export const getProductById = async (req: Request, res: Response) => {
     try {
      
       const data = req.body;
        const { plugId, productId} = data;
       const product = await prisma.plugProduct.findUnique({
         where: { id: productId, plugId: plugId },
         include: {
           originalProduct: {
             include: {
               variations: true,
             },
           },
         },
       });

       if (!product) {
         res.status(404).json({ error: "Product not found!" });
         return;
       }
  
       // Format the product with images and variations
       const formattedProduct = formatPlugProductWithDetails(product);
  
      
       res.status(200).json({
         message: "Product fetched successfully!",
         data: formattedProduct,
       });
       return;
     } catch (error) {
       console.error("Error fetching product:", error);
       res.status(500).json({ error: "Internal server error!" });
       return;
     }
   }