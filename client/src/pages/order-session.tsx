import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, Users, DollarSign, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import type { OrderSession, MenuItem } from "@shared/schema";

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export default function OrderSession() {
  const { sessionLink } = useParams<{ sessionLink: string }>();
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { toast } = useToast();

  const { data: session, isLoading: sessionLoading } = useQuery<OrderSession>({
    queryKey: ["/api/order-sessions/link", sessionLink],
    queryFn: async () => {
      const response = await fetch(`/api/order-sessions/link/${sessionLink}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Session not found");
      }
      return response.json();
    },
    enabled: !!sessionLink,
  });

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: sessionStats } = useQuery({
    queryKey: ["/api/order-sessions", session?.id, "stats"],
    queryFn: async () => {
      const response = await fetch(`/api/order-sessions/${session?.id}/stats`, {
        credentials: "include",
      });
      return response.json();
    },
    enabled: !!session?.id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (orders: Array<{ menuItemId: number; quantity: number; unitPrice: string; totalPrice: string }>) => {
      const promises = orders.map(order =>
        apiRequest("POST", "/api/orders", {
          sessionId: session?.id,
          customerName,
          ...order,
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      setCart([]);
      setCustomerName("");
      queryClient.invalidateQueries({ queryKey: ["/api/order-sessions", session?.id, "stats"] });
      toast({
        title: "Order Placed",
        description: "Your order has been placed successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateQuantity = (menuItem: MenuItem, newQuantity: number) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.menuItem.id === menuItem.id);
      
      if (newQuantity === 0) {
        return prevCart.filter(item => item.menuItem.id !== menuItem.id);
      }
      
      if (existingItemIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = { ...newCart[existingItemIndex], quantity: newQuantity };
        return newCart;
      } else {
        return [...prevCart, { menuItem, quantity: newQuantity }];
      }
    });
  };

  const getItemQuantity = (menuItemId: number) => {
    const item = cart.find(item => item.menuItem.id === menuItemId);
    return item?.quantity || 0;
  };

  const cartTotal = cart.reduce((sum, item) => 
    sum + (parseFloat(item.menuItem.price) * item.quantity), 0
  );

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categories = ["All", ...new Set(menuItems.map(item => item.category))];
  const filteredItems = selectedCategory === "All" 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const handlePlaceOrder = () => {
    if (!customerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name before placing an order.",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before placing an order.",
        variant: "destructive",
      });
      return;
    }

    const orders = cart.map(item => ({
      menuItemId: item.menuItem.id,
      quantity: item.quantity,
      unitPrice: item.menuItem.price,
      totalPrice: (parseFloat(item.menuItem.price) * item.quantity).toFixed(2),
    }));

    placeOrderMutation.mutate(orders);
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Session Not Found</h1>
            <p className="text-gray-600">This order session doesn't exist or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Session Closed</h1>
            <p className="text-gray-600">This order session has been finalized and is no longer accepting orders.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{session.name}</h1>
              <p className="text-sm text-gray-600">{session.restaurant}</p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Order Progress */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center">
            <Users className="mr-1 h-4 w-4" />
            {sessionStats?.participantCount || 0} people ordered
          </span>
          <span className="text-primary font-medium flex items-center">
            <DollarSign className="mr-1 h-4 w-4" />
            Total: {formatCurrency(sessionStats?.totalAmount || "0")}
          </span>
        </div>
      </div>

      {/* User Info Form */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div>
          <Label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </Label>
          <Input
            id="customerName"
            type="text"
            placeholder="Enter your name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Menu Categories */}
      <div className="px-4 py-4">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={`flex-shrink-0 ${
                selectedCategory === category 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 pb-24">
        {menuItemsLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="flex space-x-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const quantity = getItemQuantity(item.id);
              return (
                <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex space-x-4">
                    <img 
                      src={item.imageUrl || "https://images.unsplash.com/photo-1555126634-323283e090fa?ixlib=rb-4.0.3&w=80&h=80&fit=crop"} 
                      alt={item.name}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(item.price)}
                        </span>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item, Math.max(0, quantity - 1))}
                              className="p-2 h-8 w-8"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="px-3 py-2 text-sm font-medium min-w-[2rem] text-center">
                              {quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item, quantity + 1)}
                              className="p-2 h-8 w-8"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Bottom Order Summary */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-600">Your Order</p>
              <p className="font-semibold text-gray-900">
                {cartItemCount} items • {formatCurrency(cartTotal.toFixed(2))}
              </p>
            </div>
            <Button 
              onClick={handlePlaceOrder}
              disabled={placeOrderMutation.isPending}
              className="bg-primary hover:bg-orange-600 px-6 py-3"
            >
              {placeOrderMutation.isPending ? "Placing..." : "Place Order"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
