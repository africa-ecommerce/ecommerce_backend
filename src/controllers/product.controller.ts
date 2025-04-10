// src/controllers/product.controller.ts
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { BUCKET_NAME, minioClient } from '../config/minio';
import { prisma } from "../config";
import { AuthRequest } from '../types';




 //Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'image/jpg',
    'image/svg+xml', // allow SVG files
    'image/gif'      // allow GIF files (if desired)
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: JPEG, PNG, JPG, WebP, SVG, and GIF.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter
});

// Zod validation schema for product
const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters long"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  price: z.number().positive("Price must be positive"),
  quantity: z.number().int().nonnegative("Quantity must be a non-negative integer"),
  category: z.string().optional(),
});

// Upload images to MinIO and return URLs
const uploadToMinio = async (files: Express.Multer.File[]): Promise<string[]> => {
  const imageUrls: string[] = [];
  
  for (const file of files) {
    const objectName = `products/${Date.now()}-${path.basename(file.path)}`;
    
    await minioClient.fPutObject(
      BUCKET_NAME,
      objectName,
      file.path,
      { 'Content-Type': file.mimetype }
    );
    
    // Generate URL to the uploaded file
    const imageUrl = `${process.env.MINIO_BASE_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`}/${BUCKET_NAME}/${objectName}`;
    imageUrls.push(imageUrl);
    
    // Remove the temporary file
    fs.unlinkSync(file.path);
  }
  
  return imageUrls;
};

// Controller methods
export const productController = {
  // Create a new product
  createProduct: [
    upload.array("images", 10), // Allow up to 10 images
    async (req: AuthRequest, res: Response) => {
      try {
        // Check if supplier exists and is authorized
        const supplierId = req.body.supplierId;
        const supplier = await prisma.supplier.findUnique({
          where: { id: supplierId },
          include: { user: true },
        });

        if (!supplier) {
           res.status(404).json({
            error: "Supplier not found!",
          });
          return;
        }

        // Ensure the logged-in user owns this supplier account
        // This assumes you have user authentication middleware that adds userId to the request
        const userId = req.user?.id;
        if (supplier.userId !== userId) {
           res.status(403).json({
             error: "Unauthorized to add products for this supplier!",
           });
          return;
        }

        // Validate request body
        const validatedData = productSchema.safeParse({
          name: req.body.name,
          description: req.body.description,
          price: parseFloat(req.body.price),
          quantity: parseInt(req.body.quantity),
          category: req.body.category,
        });

        if (!validatedData.success) {
           res.status(400).json({
            error: "Validation failed!"
          });
          return;
        }

        // Upload images to MinIO
        const files = req.files as Express.Multer.File[];
        const imageUrls =
          files && files.length > 0 ? await uploadToMinio(files) : [];

        // Create product in database
        const product = await prisma.product.create({
          data: {
            name: validatedData.data.name,
            description: validatedData.data.description,
            price: validatedData.data.price,
            quantity: validatedData.data.quantity,
            category: validatedData.data.category,
            images: JSON.stringify(imageUrls), // Store URLs as JSON string
            supplierId: supplierId,
          },
        });

         res.status(201).json({
          message: "Product created successfully",
          data: {
            ...product,
            images: imageUrls, // Return as array
          },
        });
        return;
      } catch (error) {
        console.error("Error creating product:", error);
         res.status(500).json({
           error: "Internal server error"
         });
        return;
      }
    },
  ],

  // Get all products for a supplier
  getSupplierProducts: async (req: Request, res: Response) => {
    try {
      const supplierId = req.params.supplierId;

      // Ensure supplier exists
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
      });

      if (!supplier) {
         res.status(404).json({
          error: "Supplier not found",
        });
        return;
      }

      // Get all products
      const products = await prisma.product.findMany({
        where: { supplierId },
        orderBy: { createdAt: "desc" },
      });

      // Parse the images JSON for each product
      const formattedProducts = products.map((product) => ({
        ...product,
        images: product.images ? JSON.parse(product.images as string) : [],
      }));

       res.status(200).json({
         message: "Products fetched successfully",
         data: formattedProducts,
       });
      return;
    } catch (error) {
      console.error("Error fetching supplier products:", error);
       res.status(500).json({
         error: "Internal server error"
       });
      return;
    }
  },

  // Get product by ID
  getProductById: async (req: Request, res: Response) => {
    try {
      const productId = req.params.id;

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
         res.status(404).json({
          error: "Product not found",
        });
        return;
      }

      // Parse the images JSON
      const formattedProduct = {
        ...product,
        images: product.images ? JSON.parse(product.images as string) : [],
      };

       res.status(200).json({
         message: "Product fetched successfully",
         data: formattedProduct,
       });
      return;
    } catch (error) {
      console.error("Error fetching product:", error);
       res.status(500).json({
        error: "Internal server error",
      });
      return;
    }
  },



// Get all products on the platform
getAllProducts: async (req: Request, res: Response) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const order = (req.query.order as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const category = req.query.category as string;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const search = req.query.search as string;

    // Calculate pagination values
    const skip = (page - 1) * limit;
    
    // Build where conditions for filtering
    const whereConditions: any = {};
    
    // Add category filter if provided
    if (category) {
      whereConditions.category = category;
    }
    
    // Add price range filter if provided
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereConditions.price = {};
      if (minPrice !== undefined) {
        whereConditions.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        whereConditions.price.lte = maxPrice;
      }
    }
    
    // Add search filter if provided
    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Get total count for pagination
    const totalCount = await prisma.product.count({
      where: whereConditions
    });
    
    // Get products with filtering, sorting and pagination
    const products = await prisma.product.findMany({
      where: whereConditions,
      orderBy: {
        [sortBy]: order
      },
      skip,
      take: limit,
      include: {
        supplier: {
          select: {
            id: true,
            businessType: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    // Parse the images JSON for each product
    const formattedProducts = products.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images as string) : [],
      supplier: {
        ...product.supplier,
        businessName: product.supplier.user.name
      }
    }));
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
     res.status(200).json({
      message: "Products fetched successfully!",
      data: formattedProducts,
      meta: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    });
    return;
  } catch (error) {
    console.error('Error fetching all products:', error);
     res.status(500).json({
      error: "Internal server error!"
    });
    return;
  }
},

  // Update product
  updateProduct: [
    upload.array("images", 10),
    async (req: AuthRequest, res: Response) => {
      try {
        const productId = req.params.id;

        // Check if product exists
        const existingProduct = await prisma.product.findUnique({
          where: { id: productId },
          include: { supplier: true },
        });

        if (!existingProduct) {
           res.status(404).json({
            error: "Product not found",
          });
          return;
        }

        // Ensure the logged-in user owns this product
        const userId = req.user?.id;


        if (existingProduct.supplier.userId !== userId) {
          res.status(403).json({
            error: "Unauthorized to update this product",
          });
          return;
        }

        // Validate request data
        const validatedData = productSchema.safeParse({
          name: req.body.name,
          description: req.body.description,
          price: parseFloat(req.body.price),
          quantity: parseInt(req.body.quantity),
          category: req.body.category,
          shippingRegions: req.body.shippingRegions,
        });

        if (!validatedData.success) {
           res.status(400).json({
            error: "Validation failed",            
          });
          return;
        }

        // Handle image updates
        let updatedImageUrls: string[] = [];

        // Get existing images
        const existingImages = existingProduct.images
          ? JSON.parse(existingProduct.images as string)
          : [];

        // Handle new images if provided
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
          const newImageUrls = await uploadToMinio(files);
          updatedImageUrls = [...existingImages, ...newImageUrls];
        } else {
          // Keep existing images unless specifically requested to remove
          updatedImageUrls = existingImages;
        }

        // Handle image removal if specific indices are provided
        if (
          req.body.removeImages &&
          Array.isArray(JSON.parse(req.body.removeImages))
        ) {
          const indicesToRemove = JSON.parse(req.body.removeImages);
          updatedImageUrls = existingImages.filter(
            (_:any, index:any) => !indicesToRemove.includes(index)
          );
        }

        // Update product in database
        const updatedProduct = await prisma.product.update({
          where: { id: productId },
          data: {
            name: validatedData.data.name,
            description: validatedData.data.description,
            price: validatedData.data.price,
            quantity: validatedData.data.quantity,
            category: validatedData.data.category,
            images: JSON.stringify(updatedImageUrls),
            updatedAt: new Date(),
          },
        });

         res.status(200).json({
          message: "Product updated successfully",
          data: {
            ...updatedProduct,
            images: updatedImageUrls,
          },
        });
        return;
      } catch (error) {
        console.error("Error updating product:", error);
         res.status(500).json({
          error: "Internal server error",
        });
        return;
      }
    },
  ],

  // Delete product
  deleteProduct: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.id;

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
        include: { supplier: true },
      });

      if (!existingProduct) {
        res.status(404).json({
          error: "Product not found",
        });
        return;
      }

      // Ensure the logged-in user owns this product
      const userId = req.user?.id;
      if (existingProduct.supplier.userId !== userId) {
        res.status(403).json({
          error: "Unauthorized to delete this product",
        });
        return;
      }

      // Get existing images to potentially clean up in MinIO
      const existingImages = existingProduct.images
        ? JSON.parse(existingProduct.images as string)
        : [];

      // Delete product from database
      await prisma.product.delete({
        where: { id: productId },
      });

      // Optional: Clean up images from MinIO
      // This can be implemented as a background job to not delay the response
      // For simplicity, we're not implementing the cleanup here

      res.status(200).json({
        message: "Product deleted successfully",
      });
      return;
    } catch (error) {
      console.error("Error deleting product:", error);
       res.status(500).json({
         error: "Internal server error"
       });
      return;
    }
  },
};