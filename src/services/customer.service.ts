// src/services/customer.service.ts
import { prisma } from "../config";

export const createCustomer = async (data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}) => {
  return await prisma.customer.create({ data });
};

export const getCustomer = async (id: string) => {
  return await prisma.customer.findUnique({
    where: { id },
    include: { orders: true },
  });
};

export const updateCustomer = async (
  id: string,
  data: { name?: string; email?: string; phone?: string; address?: string }
) => {
  return await prisma.customer.update({ where: { id }, data });
};

export const deleteCustomer = async (id: string) => {
  return await prisma.customer.delete({ where: { id } });
};

export const listCustomers = async () => {
  return await prisma.customer.findMany();
};
