// src/controllers/customer.controller.ts
import { Request, Response } from "express";
import {
  createCustomer,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  listCustomers,
} from "../services/customer.service";

export const createCustomerHandler = async (req: Request, res: Response) => {
  try {
    const customer = await createCustomer(req.body);
    res.status(201).json({ customer });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getCustomerHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await getCustomer(id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json({ customer });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateCustomerHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await updateCustomer(id, req.body);
    res.json({ customer });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteCustomerHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteCustomer(id);
    res.json({ message: "Customer deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const listCustomersHandler = async (req: Request, res: Response) => {
  try {
    const customers = await listCustomers();
    res.json({ customers });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
