// src/services/order.service.ts
import { prisma } from "../config";

interface OrderItemInput {
  productId: string;
  quantity: number;
  price: number;
}

export const createOrder = async (
  merchantId: string,
  customerName: string,
  customerEmail: string,
  items: OrderItemInput[],
  total: number
) => {
  return await prisma.order.create({
    data: {
      merchantId,
      customerName,
      customerEmail,
      total,
      items: {
        create: items,
      },
    },
    include: { items: true },
  });
};

export const getOrdersByMerchant = async (merchantId: string) => {
  return await prisma.order.findMany({
    where: { merchantId },
    include: { items: true },
  });
};

export const getOrderById = async (orderId: string) => {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  return await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
};
