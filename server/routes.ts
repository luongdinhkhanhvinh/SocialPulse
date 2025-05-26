import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMenuItemSchema, insertOrderSessionSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Menu Items routes
  app.get("/api/menu-items", async (req, res) => {
    try {
      const items = await storage.getMenuItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getMenuItem(id);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu item" });
    }
  });

  app.post("/api/menu-items", async (req, res) => {
    try {
      const validatedData = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid menu item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.put("/api/menu-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      const item = await storage.updateMenuItem(id, validatedData);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid menu item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete("/api/menu-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMenuItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // Order Sessions routes
  app.get("/api/order-sessions", async (req, res) => {
    try {
      const sessions = await storage.getOrderSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order sessions" });
    }
  });

  app.get("/api/order-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getOrderSession(id);
      if (!session) {
        return res.status(404).json({ message: "Order session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order session" });
    }
  });

  app.get("/api/order-sessions/link/:link", async (req, res) => {
    try {
      const link = req.params.link;
      const session = await storage.getOrderSessionByLink(link);
      if (!session) {
        return res.status(404).json({ message: "Order session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order session" });
    }
  });

  app.post("/api/order-sessions", async (req, res) => {
    try {
      const validatedData = insertOrderSessionSchema.parse(req.body);
      const session = await storage.createOrderSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order session" });
    }
  });

  app.put("/api/order-sessions/:id/finalize", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.finalizeOrderSession(id);
      if (!session) {
        return res.status(404).json({ message: "Order session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to finalize order session" });
    }
  });

  // Orders routes
  app.get("/api/order-sessions/:sessionId/orders", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const orders = await storage.getOrdersBySession(sessionId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOrder(id);
      if (!deleted) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  // Analytics routes
  app.get("/api/order-sessions/:sessionId/stats", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const stats = await storage.getOrderSessionStats(sessionId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
