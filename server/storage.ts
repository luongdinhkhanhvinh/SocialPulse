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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private menuItems: Map<number, MenuItem>;
  private orderSessions: Map<number, OrderSession>;
  private orders: Map<number, Order>;
  private currentUserId: number;
  private currentMenuItemId: number;
  private currentOrderSessionId: number;
  private currentOrderId: number;

  constructor() {
    this.users = new Map();
    this.menuItems = new Map();
    this.orderSessions = new Map();
    this.orders = new Map();
    this.currentUserId = 1;
    this.currentMenuItemId = 1;
    this.currentOrderSessionId = 1;
    this.currentOrderId = 1;

    // Initialize with some sample menu items
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleItems: InsertMenuItem[] = [
      {
        name: "Pho Bo Tai",
        description: "Traditional beef pho with rare beef slices, fresh herbs, and lime",
        price: "13.90",
        category: "Main Course",
        imageUrl: "https://images.unsplash.com/photo-1555126634-323283e090fa?ixlib=rb-4.0.3&w=400&h=400&fit=crop",
        isAvailable: true,
      },
      {
        name: "Fresh Spring Rolls",
        description: "Rice paper rolls with shrimp, herbs, and peanut dipping sauce",
        price: "8.50",
        category: "Appetizer",
        imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?ixlib=rb-4.0.3&w=400&h=400&fit=crop",
        isAvailable: true,
      },
      {
        name: "Vietnamese Iced Coffee",
        description: "Strong Vietnamese coffee with sweetened condensed milk",
        price: "4.90",
        category: "Beverage",
        imageUrl: "https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?ixlib=rb-4.0.3&w=400&h=400&fit=crop",
        isAvailable: true,
      },
      {
        name: "Crispy Spring Rolls",
        description: "Fresh vegetables wrapped in crispy pastry",
        price: "8.50",
        category: "Appetizer",
        imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?ixlib=rb-4.0.3&w=400&h=400&fit=crop",
        isAvailable: true,
      },
      {
        name: "Tonkotsu Ramen",
        description: "Rich pork bone broth with noodles and egg",
        price: "14.90",
        category: "Main Course",
        imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?ixlib=rb-4.0.3&w=400&h=400&fit=crop",
        isAvailable: true,
      },
      {
        name: "Thai Iced Tea",
        description: "Sweet and creamy traditional Thai beverage",
        price: "4.50",
        category: "Beverage",
        imageUrl: "https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?ixlib=rb-4.0.3&w=400&h=400&fit=crop",
        isAvailable: true,
      },
    ];

    sampleItems.forEach(item => {
      this.createMenuItem(item);
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const id = this.currentMenuItemId++;
    const menuItem: MenuItem = { ...item, id };
    this.menuItems.set(id, menuItem);
    return menuItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existing = this.menuItems.get(id);
    if (!existing) return undefined;
    
    const updated: MenuItem = { ...existing, ...item };
    this.menuItems.set(id, updated);
    return updated;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  // Order Sessions
  async getOrderSessions(): Promise<OrderSession[]> {
    return Array.from(this.orderSessions.values());
  }

  async getOrderSession(id: number): Promise<OrderSession | undefined> {
    return this.orderSessions.get(id);
  }

  async getOrderSessionByLink(link: string): Promise<OrderSession | undefined> {
    return Array.from(this.orderSessions.values()).find(session => session.sessionLink === link);
  }

  async createOrderSession(session: InsertOrderSession): Promise<OrderSession> {
    const id = this.currentOrderSessionId++;
    const sessionLink = nanoid();
    const orderSession: OrderSession = { 
      ...session, 
      id, 
      sessionLink,
      createdAt: new Date(),
      finalizedAt: null
    };
    this.orderSessions.set(id, orderSession);
    return orderSession;
  }

  async updateOrderSession(id: number, session: Partial<OrderSession>): Promise<OrderSession | undefined> {
    const existing = this.orderSessions.get(id);
    if (!existing) return undefined;
    
    const updated: OrderSession = { ...existing, ...session };
    this.orderSessions.set(id, updated);
    return updated;
  }

  async finalizeOrderSession(id: number): Promise<OrderSession | undefined> {
    const existing = this.orderSessions.get(id);
    if (!existing) return undefined;
    
    const updated: OrderSession = { 
      ...existing, 
      isActive: false, 
      finalizedAt: new Date() 
    };
    this.orderSessions.set(id, updated);
    return updated;
  }

  // Orders
  async getOrdersBySession(sessionId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.sessionId === sessionId);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const newOrder: Order = { 
      ...order, 
      id, 
      isPaid: order.isPaid || false,
      createdAt: new Date() 
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async deleteOrder(id: number): Promise<boolean> {
    return this.orders.delete(id);
  }

  async updateOrderPaymentStatus(id: number, isPaid: boolean): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;
    
    const updated: Order = { ...existing, isPaid };
    this.orders.set(id, updated);
    return updated;
  }

  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
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

export const storage = new MemStorage();
