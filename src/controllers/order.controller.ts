// // src/types/order.types.ts

// // import { OrderStatus, PaymentStatus } from "@prisma/client";

// export interface CreateOrderInput {
//   buyerName: string;
//   buyerEmail: string;
//   buyerPhone: string;
//   deliveryAddress: string;
//   orderNote?: string;
//   paymentMethod: string;
//   items: OrderItemInput[];
//   supplierId: string;
// }

// export interface OrderItemInput {
//   productId: string;
//   variantId?: string;
//   quantity: number;
// }

// export interface OrderResponse {
//   id: string;
//   orderNumber: string;
//   buyerName: string;
//   buyerEmail: string;
//   buyerPhone: string;
//   totalAmount: number;
//   deliveryFee: number;
//   deliveryAddress: string;
//   orderNote?: string;
//   status: OrderStatus;
//   paymentStatus: PaymentStatus;
//   paymentMethod: string;
//   estimatedDeliveryDate?: Date;
//   actualDeliveryDate?: Date;
//   items: OrderItemResponse[];
//   supplier: {
//     id: string;
//     businessName: string;
//     pickupLocation: string;
//     phone: string;
//     avatar?: string;
//   };
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface OrderItemResponse {
//   id: string;
//   productId: string;
//   productName: string;
//   productImage?: string;
//   variantId?: string;
//   variant?: {
//     size?: string;
//     color?: string;
//   };
//   quantity: number;
//   unitPrice: number;
//   totalPrice: number;
// }

// export interface UpdateOrderStatusInput {
//   status: OrderStatus;
//   estimatedDeliveryDate?: Date;
// }

// export interface OrderFilterOptions {
//   status?: OrderStatus;
//   startDate?: Date;
//   endDate?: Date;
//   supplierId?: string;
//   buyerEmail?: string;
//   page?: number;
//   limit?: number;
// }




// // src/controllers/order.controller.ts

// import { Response } from 'express';
// import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
// import { AuthRequest } from '../middleware/auth.middleware';
// import { 
//   CreateOrderInput, 
//   OrderFilterOptions, 
//   UpdateOrderStatusInput 
// } from '../types/order.types';
// import { formatProductWithImagesAndVariations } from '../utils/product.utils'; // Assuming this utility exists

// const prisma = new PrismaClient();

// // Generate a unique order number
// const generateOrderNumber = (): string => {
//   const timestamp = Date.now().toString().slice(-6);
//   const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//   return `ORD-${timestamp}${random}`;
// };

// // Format order response to include all relevant information
// const formatOrderResponse = async (order: any) => {
//   // Get product details for each order item
//   const orderItemsWithProducts = await Promise.all(
//     order.orderItems.map(async (item: any) => {
//       const product = await prisma.product.findUnique({
//         where: { id: item.productId },
//       });

//       let variant = null;
//       if (item.variantId) {
//         variant = await prisma.productVariation.findUnique({
//           where: { id: item.variantId },
//         });
//       }

//       // Parse product images if they exist
//       let productImage = null;
//       if (product?.images) {
//         try {
//           const images = JSON.parse(product.images);
//           productImage = images.length > 0 ? images[0] : null;
//         } catch (e) {
//           // If not valid JSON, it might be a string
//           productImage = product.images;
//         }
//       }

//       return {
//         id: item.id,
//         productId: item.productId,
//         productName: product?.name || 'Unknown Product',
//         productImage,
//         variantId: item.variantId || null,
//         variant: variant ? {
//           size: variant.size || null,
//           color: variant.color || null,
//         } : null,
//         quantity: item.quantity,
//         unitPrice: item.unitPrice,
//         totalPrice: item.totalPrice,
//       };
//     })
//   );

//   return {
//     id: order.id,
//     orderNumber: order.orderNumber,
//     buyerName: order.buyerName,
//     buyerEmail: order.buyerEmail,
//     buyerPhone: order.buyerPhone,
//     totalAmount: order.totalAmount,
//     deliveryFee: order.deliveryFee,
//     deliveryAddress: order.deliveryAddress,
//     orderNote: order.orderNote,
//     status: order.status,
//     paymentStatus: order.paymentStatus,
//     paymentMethod: order.paymentMethod,
//     estimatedDeliveryDate: order.estimatedDeliveryDate,
//     actualDeliveryDate: order.actualDeliveryDate,
//     items: orderItemsWithProducts,
//     supplier: order.supplier,
//     createdAt: order.createdAt,
//     updatedAt: order.updatedAt,
//   };
// };

// export const orderController = {
//   // Create a new order
//   createOrder: async (req: AuthRequest, res: Response) => {
//     try {
//       const orderData: CreateOrderInput = req.body;

//       // Validate input data
//       if (!orderData.items || orderData.items.length === 0) {
//         return res.status(400).json({ error: 'Order must contain at least one item!' });
//       }

//       // Check if supplier exists
//       const supplier = await prisma.supplier.findUnique({
//         where: { id: orderData.supplierId },
//         select: {
//           id: true,
//           businessName: true,
//           pickupLocation: true,
//           phone: true,
//           avatar: true,
//         },
//       });

//       if (!supplier) {
//         return res.status(404).json({ error: 'Supplier not found!' });
//       }

//       // Calculate order totals and get product data
//       let totalAmount = 0;
//       const orderItems = [];

//       for (const item of orderData.items) {
//         // Get product information
//         const product = await prisma.product.findUnique({
//           where: { id: item.productId },
//         });

//         if (!product) {
//           return res.status(404).json({ error: `Product with ID ${item.productId} not found!` });
//         }

//         let unitPrice = product.price;
//         let variantInfo = null;

//         // If a variant is specified, check and use that
//         if (item.variantId) {
//           const variant = await prisma.productVariation.findFirst({
//             where: {
//               id: item.variantId,
//               productId: item.productId,
//             },
//           });

//           if (!variant) {
//             return res.status(404).json({ error: `Variant with ID ${item.variantId} not found for product!` });
//           }

//           // Check if variant has enough stock
//           if (variant.stock < item.quantity) {
//             return res.status(400).json({ 
//               error: `Not enough stock for variant ${variant.size || ''} ${variant.color || ''}. Available: ${variant.stock}` 
//             });
//           }

//           variantInfo = variant;
//         } else {
//           // Check if main product has enough stock
//           if (product.stock < item.quantity) {
//             return res.status(400).json({ 
//               error: `Not enough stock for product ${product.name}. Available: ${product.stock}` 
//             });
//           }
//         }

//         const itemTotalPrice = unitPrice * item.quantity;
//         totalAmount += itemTotalPrice;

//         orderItems.push({
//           productId: item.productId,
//           variantId: item.variantId || null,
//           quantity: item.quantity,
//           unitPrice,
//           totalPrice: itemTotalPrice,
//         });
//       }

//       // Calculate delivery fee (placeholder for now)
//       const deliveryFee = 0; // This would be calculated based on distance, weight, etc.

//       // Create the order
//       const order = await prisma.order.create({
//         data: {
//           orderNumber: generateOrderNumber(),
//           buyerName: orderData.buyerName,
//           buyerEmail: orderData.buyerEmail,
//           buyerPhone: orderData.buyerPhone,
//           deliveryAddress: orderData.deliveryAddress,
//           orderNote: orderData.orderNote,
//           paymentMethod: orderData.paymentMethod,
//           supplierId: orderData.supplierId,
//           totalAmount,
//           deliveryFee,
//           orderItems: {
//             create: orderItems,
//           },
//           status: OrderStatus.PENDING,
//           paymentStatus: PaymentStatus.PENDING, // Will be updated by payment integration
//         },
//         include: {
//           orderItems: true,
//           supplier: {
//             select: {
//               id: true,
//               businessName: true,
//               pickupLocation: true,
//               phone: true,
//               avatar: true,
//             },
//           },
//         },
//       });

//       // Update stock levels for products and variants
//       for (const item of orderData.items) {
//         if (item.variantId) {
//           await prisma.productVariation.update({
//             where: { id: item.variantId },
//             data: { stock: { decrement: item.quantity } },
//           });
//         } else {
//           await prisma.product.update({
//             where: { id: item.productId },
//             data: { stock: { decrement: item.quantity } },
//           });
//         }
//       }

//       // Format the response
//       const formattedOrder = await formatOrderResponse(order);

//       // TODO: Implement payment integration here
//       // const paymentResult = await processPayment(orderData.paymentMethod, totalAmount, orderData.buyerEmail);
//       // if (paymentResult.success) {
//       //   await prisma.order.update({
//       //     where: { id: order.id },
//       //     data: { paymentStatus: PaymentStatus.PAID },
//       //   });
//       // }

//       // TODO: Event notification system
//       // await notifySupplier(order.id);
//       // await notifyBuyer(order.id);

//       res.status(201).json({
//         message: 'Order created successfully!',
//         data: formattedOrder,
//       });
//     } catch (error) {
//       console.error('Error creating order:', error);
//       res.status(500).json({ error: 'Internal server error!' });
//     }
//   },

//   // Get a specific order by ID
//   getOrder: async (req: AuthRequest, res: Response) => {
//     try {
//       const { id } = req.params;

//       const order = await prisma.order.findUnique({
//         where: { id },
//         include: {
//           orderItems: true,
//           supplier: {
//             select: {
//               id: true,
//               businessName: true,
//               pickupLocation: true,
//               phone: true,
//               avatar: true,
//             },
//           },
//         },
//       });

//       if (!order) {
//         return res.status(404).json({ error: 'Order not found!' });
//       }

//       // Check authorization (only the supplier of the order or admin can view it)
//       if (req.user?.userType === 'SUPPLIER' && order.supplierId !== req.supplier?.id) {
//         return res.status(403).json({ error: 'Not authorized to view this order!' });
//       }

//       const formattedOrder = await formatOrderResponse(order);

//       res.status(200).json({
//         message: 'Order fetched successfully!',
//         data: formattedOrder,
//       });
//     } catch (error) {
//       console.error('Error fetching order:', error);
//       res.status(500).json({ error: 'Internal server error!' });
//     }
//   },

//   // Get all orders for a buyer
//   getBuyerOrders: async (req: AuthRequest, res: Response) => {
//     try {
//       const { email } = req.query;
//       const page = parseInt(req.query.page as string) || 1;
//       const limit = parseInt(req.query.limit as string) || 10;
//       const skip = (page - 1) * limit;

//       // Validate the email parameter
//       if (!email) {
//         return res.status(400).json({ error: 'Email parameter is required!' });
//       }

//       // Get all orders for the buyer
//       const orders = await prisma.order.findMany({
//         where: { buyerEmail: email as string },
//         orderBy: { createdAt: 'desc' },
//         include: {
//           orderItems: true,
//           supplier: {
//             select: {
//               id: true,
//               businessName: true,
//               pickupLocation: true,
//               phone: true,
//               avatar: true,
//             },
//           },
//         },
//         skip,
//         take: limit,
//       });

//       // Format orders
//       const formattedOrders = await Promise.all(orders.map(formatOrderResponse));

//       // Get total count for pagination
//       const totalCount = await prisma.order.count({
//         where: { buyerEmail: email as string },
//       });

//       res.status(200).json({
//         message: 'Orders fetched successfully!',
//         data: formattedOrders,
//         pagination: {
//           total: totalCount,
//           page,
//           limit,
//           pages: Math.ceil(totalCount / limit),
//         },
//       });
//     } catch (error) {
//       console.error('Error fetching buyer orders:', error);
//       res.status(500).json({ error: 'Internal server error!' });
//     }
//   },

//   // Get all orders for a supplier
//   getSupplierOrders: async (req: AuthRequest, res: Response) => {
//     try {
//       const supplier = req.supplier!;
//       const page = parseInt(req.query.page as string) || 1;
//       const limit = parseInt(req.query.limit as string) || 10;
//       const skip = (page - 1) * limit;

//       // Parse filter options
//       const filterOptions: OrderFilterOptions = {
//         status: req.query.status as OrderStatus | undefined,
//         startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
//         endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
//       };

//       // Build the where clause
//       const where: any = { supplierId: supplier.id };
      
//       if (filterOptions.status) {
//         where.status = filterOptions.status;
//       }
      
//       if (filterOptions.startDate && filterOptions.endDate) {
//         where.createdAt = {
//           gte: filterOptions.startDate,
//           lte: filterOptions.endDate,
//         };
//       } else if (filterOptions.startDate) {
//         where.createdAt = {
//           gte: filterOptions.startDate,
//         };
//       } else if (filterOptions.endDate) {
//         where.createdAt = {
//           lte: filterOptions.endDate,
//         };
//       }

//       // Get orders with pagination
//       const orders = await prisma.order.findMany({
//         where,
//         orderBy: { createdAt: 'desc' },
//         include: {
//           orderItems: true,
//           supplier: {
//             select: {
//               id: true,
//               businessName: true,
//               pickupLocation: true,
//               phone: true,
//               avatar: true,
//             },
//           },
//         },
//         skip,
//         take: limit,
//       });

//       // Format orders
//       const formattedOrders = await Promise.all(orders.map(formatOrderResponse));

//       // Get total count for pagination
//       const totalCount = await prisma.order.count({ where });

//       res.status(200).json({
//         message: 'Orders fetched successfully!',
//         data: formattedOrders,
//         pagination: {
//           total: totalCount,
//           page,
//           limit,
//           pages: Math.ceil(totalCount / limit),
//         },
//       });
//     } catch (error) {
//       console.error('Error fetching supplier orders:', error);
//       res.status(500).json({ error: 'Internal server error!' });
//     }
//   },

//   // Update order status (supplier only)
//   updateOrderStatus: async (req: AuthRequest, res: Response) => {
//     try {
//       const { id } = req.params;
//       const supplier = req.supplier!;
//       const updateData: UpdateOrderStatusInput = req.body;

//       // Find the order
//       const order = await prisma.order.findUnique({
//         where: { id },
//       });

//       if (!order) {
//         return res.status(404).json({ error: 'Order not found!' });
//       }

//       // Check if this supplier owns the order
//       if (order.supplierId !== supplier.id) {
//         return res.status(403).json({ error: 'Not authorized to update this order!' });
//       }

//       // Update order status
//       const updatedOrder = await prisma.order.update({
//         where: { id },
//         data: {
//           status: updateData.status,
//           estimatedDeliveryDate: updateData.estimatedDeliveryDate,
//           // If status is SHIPPED, set the actual delivery date
//           ...(updateData.status === OrderStatus.DELIVERED ? { actualDeliveryDate: new Date() } : {}),
//         },
//         include: {
//           orderItems: true,
//           supplier: {
//             select: {
//               id: true,
//               businessName: true,
//               pickupLocation: true,
//               phone: true,
//               avatar: true,
//             },
//           },
//         },
//       });

//       // TODO: Implement logistics integration for CONFIRMED orders
//       // if (updateData.status === OrderStatus.CONFIRMED) {
//       //   await requestLogisticsPickup(updatedOrder);
//       // }

//       // TODO: Send notification to buyer about status change
//       // await notifyBuyerOfStatusChange(updatedOrder);

//       const formattedOrder = await formatOrderResponse(updatedOrder);

//       res.status(200).json({
//         message: 'Order status updated successfully!',
//         data: formattedOrder,
//       });
//     } catch (error) {
//       console.error('Error updating order status:', error);
//       res.status(500).json({ error: 'Internal server error!' });
//     }
//   },

//   // Get order statistics for supplier
//   getSupplierOrderStats: async (req: AuthRequest, res: Response) => {
//     try {
//       const supplier = req.supplier!;
      
//       // Get counts for different order statuses
//       const pendingCount = await prisma.order.count({
//         where: { supplierId: supplier.id, status: OrderStatus.PENDING },
//       });
      
//       const confirmedCount = await prisma.order.count({
//         where: { supplierId: supplier.id, status: OrderStatus.CONFIRMED },
//       });
      
//       const processingCount = await prisma.order.count({
//         where: { supplierId: supplier.id, status: OrderStatus.PROCESSING },
//       });
      
//       const shippedCount = await prisma.order.count({
//         where: { supplierId: supplier.id, status: OrderStatus.SHIPPED },
//       });
      
//       const deliveredCount = await prisma.order.count({
//         where: { supplierId: supplier.id, status: OrderStatus.DELIVERED },
//       });
      
//       const cancelledCount = await prisma.order.count({
//         where: { supplierId: supplier.id, status: OrderStatus.CANCELLED },
//       });

//       // Get total revenue from completed orders
//       const completedOrders = await prisma.order.findMany({
//         where: { 
//           supplierId: supplier.id, 
//           status: OrderStatus.DELIVERED,
//           paymentStatus: PaymentStatus.PAID
//         },
//         select: { totalAmount: true },
//       });
      
//       const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

//       // Get recent orders
//       const recentOrders = await prisma.order.findMany({
//         where: { supplierId: supplier.id },
//         orderBy: { createdAt: 'desc' },
//         take: 5,
//         include: {
//           orderItems: true,
//           supplier: {
//             select: {
//               id: true,
//               businessName: true,
//               pickupLocation: true,
//               phone: true,
//               avatar: true,
//             },
//           },
//         },
//       });

//       const formattedRecentOrders = await Promise.all(recentOrders.map(formatOrderResponse));

//       res.status(200).json({
//         message: 'Order statistics fetched successfully!',
//         data: {
//           counts: {
//             pending: pendingCount,
//             confirmed: confirmedCount,
//             processing: processingCount,
//             shipped: shippedCount,
//             delivered: deliveredCount,
//             cancelled: cancelledCount,
//             total: pendingCount + confirmedCount + processingCount + shippedCount + deliveredCount + cancelledCount,
//           },
//           revenue: {
//             total: totalRevenue,
//             // Other revenue metrics can be added here
//           },
//           recentOrders: formattedRecentOrders,
//         },
//       });
//     } catch (error) {
//       console.error('Error fetching order statistics:', error);
//       res.status(500).json({ error: 'Internal server error!' });
//     }
//   },

//   // Cancel an order (can be done by supplier only)
//   cancelOrder: async (req: AuthRequest, res: Response) => {
//     try {
//       const { id } = req.params;
//       const supplier = req.supplier!;
//       const { cancellationReason } = req.body;

//       // Find the order
//       const order = await prisma.order.findUnique({
//         where: { id },
//         include: { orderItems: true },
//       });

//       if (!order) {
//         return res.status(404).json({ error: 'Order not found!' });
//       }

//       // Check if this supplier owns the order
//       if (order.supplierId !== supplier.id) {
//         return res.status(403).json({ error: 'Not authorized to cancel this order!' });
//       }

//       // Check if order can be cancelled (only PENDING or CONFIRMED orders)
//       if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
//         return res.status(400).json({ 
//           error: `Cannot cancel order in ${order.status} status. Only PENDING or CONFIRMED orders can be cancelled.` 
//         });
//       }

//       // Update order status to CANCELLED
//       const updatedOrder = await prisma.order.update({
//         where: { id },
//         data: {
//           status: OrderStatus.CANCELLED,
//           orderNote: order.orderNote 
//             ? `${order.orderNote}\n\nCancellation reason: ${cancellationReason}` 
//             : `Cancellation reason: ${cancellationReason}`,
//         },
//         include: {
//           orderItems: true,
//           supplier: {
//             select: {
//               id: true,
//               businessName: true,
//               pickupLocation: true,
//               phone: true,
//               avatar: true,
//             },
//           },
//         },
//       });

//       // Return items to inventory
//       for (const item of order.orderItems) {
//         if (item.variantId) {
//           await prisma.productVariation.update({
//             where: { id: item.variantId },
//             data: { stock: { increment: item.quantity } },
//           });
//         } else {
//           await prisma.product.update({
//             where: { id: item.productId },
//             data: { stock: { increment: item.quantity } },
//           });
//         }
//       }

//       // TODO: If payment was processed, initiate refund
//       // if (order.paymentStatus === PaymentStatus.PAID) {
//       //   await processRefund(order.id);
//       // }

//       // TODO: Notify buyer of cancellation
//       // await notifyBuyerOfCancellation(updatedOrder, cancellationReason);

//       const formattedOrder = await formatOrderResponse(updatedOrder);

//       res.status(200).json({
//         message: 'Order cancelled successfully!',
//         data: formattedOrder,
//       });
//     } catch (error) {
//       console.error('Error cancelling order:', error);
//       res.status(500).json({ error: 'Internal server error!' });
//     }
//   },

//   // Delay an order (can be done by supplier only)
//   delayOrder: async (req: AuthRequest, res: Response) => {
//     try {
//       const { id } = req.params;
//       const supplier = req.supplier!;
//       const { delayReason, newEstimatedDeliveryDate } = req.body;

//       // Validate new delivery date
//       if (!newEstimatedDeliveryDate) {
//         return res.status(400).json({ error: 'New estimated delivery date is required!' });
//       }

//       const newDate = new Date(newEstimatedDeliveryDate);
//       if (isNaN(newDate.getTime()) || newDate <= new Date()) {
//         return res.status(400).json({ error: 'Invalid delivery date. Must be a future date.' });
//       }

//       // Find the order
//       const order = await prisma.order.findUnique({
//         where: { id },
//       });

//       if (!order) {
//         return res.status(404).json({ error: 'Order not found!' });
//       }

//       // Check if this supplier owns the order
//       if (order.supplierId !== supplier.id) {
//         return res.status(403).json({ error: 'Not authorized to update this order!' });
//       }

//       // Check if order can be delayed (not CANCELLED, DELIVERED, etc.)
//       if ([OrderStatus.CANCELLED, OrderStatus.DELIVERED].includes(order.status)) {
//         return res.status(400).json({ 
//           error: `Cannot delay order in ${order.status} status.` 
//         });
//       }

//       // Update order status to DELAYED with new estimated delivery date
//       const updatedOrder = await prisma.order.update({
//         where: { id },
//         data: {
//           status: OrderStatus.DELAYED,
//           estimatedDeliveryDate: newDate,
//           orderNote: order.orderNote 
//             ? `${order.orderNote}\n\nDelay reason: ${delayReason}` 
//             : `Delay reason: ${delayReason}`,
//         },
//         include: {
//           orderItems: true,
//           supplier: {
//             select: {
//               id: true,
//               businessName: true,
//               pickupLocation: true,
//               phone: true,
//               avatar: true,
//             },
//           },
//         },
//       });

//       // TODO: Notify buyer of delay
//       // await notifyBuyerOfDelay(updatedOrder, delayReason, newDate);

//       const formattedOrder = await formatOrderResponse(updatedOrder);

//       res.status(200).json({
//         message: 'Order delayed successfully!',
//         data: formattedOrder,
//       });
//     } catch (error) {
//       console.error('Error delaying order:', error);
//       res.status(500).json({ error: 'Internal server error!' });
//     }
//   },

//   // Track an order (publicly accessible, just requires order number and email)
//   trackOrder: async (req: Request, res: Response) => {
//     try {
//       const { orderNumber, email } = req.body;

//       if (!orderNumber || !email) {
//         return res.status(400).json({ error: 'Order number and email are required!' });
//       }

//       // Find the order
//       const order = await prisma.order.findFirst({
//         where: { 
//           orderNumber,
//           buyerEmail: email
//         },
//         include: {
//           orderItems: true,
//           supplier: {
//             select: {
//               id: true,
//               businessName: true,
//               pickupLocation: true,
//               phone: true,
//               avatar: true,
//             },
//           },
//         },
//       });

//       if (!order) {
//         return res.status(404).json({ error: 'Order not found! Please check your order number and email.' });
//       }

//       const formattedOrder = await formatOrderResponse(order);

//       // Create a simplified tracking response
//       const trackingResponse = {
//         orderNumber: formattedOrder.orderNumber,
//         status: formattedOrder.status,
//         createdAt: formattedOrder.createdAt,
//         estimatedDeliveryDate: formattedOrder.estimatedDeliveryDate,
//         actualDeliveryDate: formattedOrder.actualDeliveryDate,
//         supplier: {
//           businessName: formattedOrder.supplier.businessName,
//         },
//         items: formattedOrder.items.map(item => ({
//           productName: item.productName,
//           quantity: item.quantity,
//           variant: item.variant,
//         })),
//         // TODO: Add logistics tracking info when integrated
//         // trackingInfo: {
//         //   carrier: "LogisticsPartner",
//         //   trackingNumber: "12345678",
//         //   trackingUrl: "https://logistics-partner.com/track/12345678"
//         // }
//       };

//       res.status(200).json({
//         message: 'Order tracking info fetched successfully!',
//         data: trackingResponse,
//       });
//     } catch (error) {
//       console.error('Error tracking order:', error);
//       res.status(500).json({ error: 'Internal server error!' });
//     }
//   }
// };