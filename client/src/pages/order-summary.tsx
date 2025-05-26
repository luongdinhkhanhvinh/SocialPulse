import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, Users, DollarSign, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatTimeLeft } from "@/lib/utils";
import type { OrderSession, Order, MenuItem } from "@shared/schema";

interface OrderWithDetails extends Order {
  menuItemName: string;
}

export default function OrderSummary() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { toast } = useToast();

  const { data: session, isLoading: sessionLoading } = useQuery<OrderSession>({
    queryKey: ["/api/order-sessions", sessionId],
    enabled: !!sessionId,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/order-sessions", sessionId, "orders"],
    enabled: !!sessionId,
    refetchInterval: session?.isActive ? 5000 : false, // Refresh every 5 seconds if active
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: sessionStats } = useQuery({
    queryKey: ["/api/order-sessions", sessionId, "stats"],
    enabled: !!sessionId,
    refetchInterval: session?.isActive ? 5000 : false,
  });

  const finalizeSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/order-sessions/${sessionId}/finalize`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-sessions", sessionId] });
      toast({
        title: "Session Finalized",
        description: "Order session has been finalized successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to finalize session.",
        variant: "destructive",
      });
    },
  });

  const exportToCSV = () => {
    if (orders.length === 0) return;

    const headers = ["Customer Name", "Menu Item", "Quantity", "Unit Price", "Total Price", "Order Time"];
    
    const csvData = orders.map(order => {
      const menuItem = menuItems.find(item => item.id === order.menuItemId);
      return [
        order.customerName,
        menuItem?.name || "Unknown Item",
        order.quantity.toString(),
        formatCurrency(order.unitPrice),
        formatCurrency(order.totalPrice),
        new Date(order.createdAt).toLocaleString()
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${session?.name || "orders"}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: "Order summary has been exported to CSV.",
    });
  };

  // Group orders by customer
  const ordersByCustomer = orders.reduce((acc, order) => {
    if (!acc[order.customerName]) {
      acc[order.customerName] = [];
    }
    acc[order.customerName].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const customerTotals = Object.entries(ordersByCustomer).map(([customerName, customerOrders]) => {
    const total = customerOrders.reduce((sum, order) => sum + parseFloat(order.totalPrice), 0);
    const itemsText = customerOrders.map(order => {
      const menuItem = menuItems.find(item => item.id === order.menuItemId);
      return `${menuItem?.name || "Unknown"} x${order.quantity}`;
    }).join(", ");
    
    return {
      customerName,
      total,
      itemsText,
      orders: customerOrders
    };
  });

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
            <p className="text-gray-600">This order session doesn't exist.</p>
            <Link href="/">
              <Button className="mt-4" variant="outline">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{session.name}</h1>
                <p className="text-sm text-gray-600">{session.restaurant}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={session.isActive ? "default" : "secondary"}
                className={session.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
              >
                {session.isActive ? "Active" : "Finalized"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Status */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                Order Status
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                {session.isActive && (
                  <Button 
                    onClick={() => finalizeSessionMutation.mutate()}
                    disabled={finalizeSessionMutation.isPending}
                    size="sm"
                    className="bg-primary hover:bg-orange-600"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {finalizeSessionMutation.isPending ? "Finalizing..." : "Finalize Order"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-gray-900">Order Created</h3>
                <p className="text-sm text-gray-600">{formatTimeLeft(session.createdAt)}</p>
              </div>
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  orders.length > 0 
                    ? "bg-green-100 text-green-600" 
                    : "bg-gray-300 text-gray-600"
                }`}>
                  <Users className="h-6 w-6" />
                </div>
                <h3 className={`font-medium ${orders.length > 0 ? "text-gray-900" : "text-gray-600"}`}>
                  Collecting Orders
                </h3>
                <p className="text-sm text-gray-600">
                  {sessionStats?.participantCount || 0} participants
                </p>
              </div>
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  !session.isActive 
                    ? "bg-green-100 text-green-600" 
                    : "bg-gray-300 text-gray-600"
                }`}>
                  <Check className="h-6 w-6" />
                </div>
                <h3 className={`font-medium ${!session.isActive ? "text-gray-900" : "text-gray-600"}`}>
                  Finalized
                </h3>
                <p className="text-sm text-gray-600">
                  {session.finalizedAt ? formatTimeLeft(session.finalizedAt) : "Pending"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{sessionStats?.totalOrders || 0}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Participants</p>
                  <p className="text-2xl font-bold text-gray-900">{sessionStats?.participantCount || 0}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(sessionStats?.totalAmount || "0")}
                  </p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Participants */}
        <Card>
          <CardHeader>
            <CardTitle>Team Participants</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : customerTotals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No orders yet</p>
                {session.isActive && (
                  <p className="text-sm text-gray-400 mt-2">
                    Share the order link to start collecting orders
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {customerTotals.map((customer, index) => (
                  <div key={customer.customerName} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-medium">
                      {customer.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{customer.customerName}</h3>
                      <p className="text-sm text-gray-600">{customer.itemsText}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(customer.total.toFixed(2))}
                    </span>
                  </div>
                ))}
                
                <Separator className="my-4" />
                
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Order</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(sessionStats?.totalAmount || "0")}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {sessionStats?.totalOrders || 0} items total
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
