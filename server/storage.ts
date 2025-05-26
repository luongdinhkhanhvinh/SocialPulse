import { 
  users, 
  menuItems, 
  orderSessions, 
  orders,
  type User, 
  type InsertUser,
  type MenuItem,
  type InsertMenuItem,
  type OrderSession,
  type InsertOrderSession,
  type Order,
  type InsertOrder
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;

  // Order Sessions
  getOrderSessions(): Promise<OrderSession[]>;
  getOrderSession(id: number): Promise<OrderSession | undefined>;
  getOrderSessionByLink(link: string): Promise<OrderSession | undefined>;
  createOrderSession(session: InsertOrderSession): Promise<OrderSession>;
  updateOrderSession(id: number, session: Partial<OrderSession>): Promise<OrderSession | undefined>;
  finalizeOrderSession(id: number): Promise<OrderSession | undefined>;

  // Orders
  getOrdersBySession(sessionId: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  deleteOrder(id: number): Promise<boolean>;
  updateOrderPaymentStatus(id: number, isPaid: boolean): Promise<Order | undefined>;
  getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;

  // Analytics
  getOrderSessionStats(sessionId: number): Promise<{
    totalOrders: number;
    totalAmount: string;
    participantCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems);
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item || undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [menuItem] = await db
      .insert(menuItems)
      .values(item)
      .returning();
    return menuItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db
      .update(menuItems)
      .set(item)
      .where(eq(menuItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const result = await db.delete(menuItems).where(eq(menuItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Order Sessions
  async getOrderSessions(): Promise<OrderSession[]> {
    return await db.select().from(orderSessions);
  }

  async getOrderSession(id: number): Promise<OrderSession | undefined> {
    const [session] = await db.select().from(orderSessions).where(eq(orderSessions.id, id));
    return session || undefined;
  }

  async getOrderSessionByLink(link: string): Promise<OrderSession | undefined> {
    const [session] = await db.select().from(orderSessions).where(eq(orderSessions.sessionLink, link));
    return session || undefined;
  }

  async createOrderSession(session: InsertOrderSession): Promise<OrderSession> {
    const sessionLink = nanoid();
    const [orderSession] = await db
      .insert(orderSessions)
      .values({
        ...session,
        sessionLink,
        isActive: true,
      })
      .returning();
    return orderSession;
  }

  async updateOrderSession(id: number, session: Partial<OrderSession>): Promise<OrderSession | undefined> {
    const [updated] = await db
      .update(orderSessions)
      .set(session)
      .where(eq(orderSessions.id, id))
      .returning();
    return updated || undefined;
  }

  async finalizeOrderSession(id: number): Promise<OrderSession | undefined> {
    const [updated] = await db
      .update(orderSessions)
      .set({ 
        isActive: false, 
        finalizedAt: new Date() 
      })
      .where(eq(orderSessions.id, id))
      .returning();
    return updated || undefined;
  }

  // Orders
  async getOrdersBySession(sessionId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.sessionId, sessionId));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values({
        ...order,
        isPaid: order.isPaid || false,
      })
      .returning();
    return newOrder;
  }

  async deleteOrder(id: number): Promise<boolean> {
    const result = await db.delete(orders).where(eq(orders.id, id));
    return (result.rowCount || 0) > 0;
  }

  async updateOrderPaymentStatus(id: number, isPaid: boolean): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ isPaid })
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      );
  }

  // Analytics
  async getOrderSessionStats(sessionId: number): Promise<{
    totalOrders: number;
    totalAmount: string;
    participantCount: number;
  }> {
    const sessionOrders = await this.getOrdersBySession(sessionId);
    const totalOrders = sessionOrders.length;
    const totalAmount = sessionOrders.reduce((sum, order) => 
      sum + parseFloat(order.totalPrice), 0
    ).toFixed(2);
    
    const participants = new Set(sessionOrders.map(order => order.customerName));
    const participantCount = participants.size;

    return {
      totalOrders,
      totalAmount,
      participantCount,
    };
  }
}

export const storage = new DatabaseStorage();
