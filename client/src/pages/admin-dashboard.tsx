import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Users, DollarSign, Clock, TrendingUp, MoreVertical, ExternalLink, Copy, Check, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatTimeLeft } from "@/lib/utils";
import MenuItemForm from "@/components/menu-item-form";
import MenuItemCard from "@/components/menu-item-card";
import type { OrderSession, MenuItem } from "@shared/schema";

export default function AdminDashboard() {
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [isCreateMenuItemOpen, setIsCreateMenuItemOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [copiedSessionId, setCopiedSessionId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<OrderSession[]>({
    queryKey: ["/api/order-sessions"],
  });

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  // Query for orders by date range
  const { data: ordersData = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders/date-range", startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const response = await fetch(`/api/orders/date-range?startDate=${startDate}&endDate=${endDate}`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!startDate && !!endDate,
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: { name: string; restaurant: string }) => {
      const response = await apiRequest("POST", "/api/order-sessions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-sessions"] });
      setIsCreateSessionOpen(false);
      setSessionName("");
      setRestaurant("");
      toast({
        title: "Session Created",
        description: "Order session has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create order session.",
        variant: "destructive",
      });
    },
  });

  const finalizeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest("PUT", `/api/order-sessions/${sessionId}/finalize`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-sessions"] });
      toast({
        title: "Session Finalized",
        description: "Order session has been finalized.",
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

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ orderId, isPaid }: { orderId: number; isPaid: boolean }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}/payment`, { isPaid });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/date-range", startDate, endDate] });
      toast({
        title: "Cập nhật thành công",
        description: "Trạng thái thanh toán đã được cập nhật.",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái thanh toán.",
        variant: "destructive",
      });
    },
  });

  const copySessionLink = async (sessionLink: string, sessionId: number) => {
    const url = `${window.location.origin}/order/${sessionLink}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSessionId(sessionId);
      setTimeout(() => setCopiedSessionId(null), 2000);
      toast({
        title: "Link Copied",
        description: "Order link has been copied to clipboard.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy link.",
        variant: "destructive",
      });
    }
  };

  const activeSessions = sessions.filter(session => session.isActive);
  const totalSessions = sessions.length;
  const totalMenuItems = menuItems.length;

  // Set default date range (current week)
  const getCurrentWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    };
  };

  // Initialize with current week if dates are empty
  if (!startDate && !endDate) {
    const { start, end } = getCurrentWeek();
    setStartDate(start);
    setEndDate(end);
  }

  // Calculate order statistics
  const orderStats = {
    totalOrders: ordersData.length,
    paidOrders: ordersData.filter((order: any) => order.isPaid).length,
    totalAmount: ordersData.reduce((sum: number, order: any) => sum + parseFloat(order.totalPrice || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="text-2xl">🍽️</div>
                <span className="text-xl font-bold text-gray-900">Đặt Cơm Nhóm</span>
              </div>
              <div className="hidden md:flex items-center space-x-1 ml-6">
                <Button variant="ghost" size="sm" className="text-primary bg-orange-50">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Bảng điều khiển
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog open={isCreateSessionOpen} onOpenChange={setIsCreateSessionOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-orange-600">
                    <Plus className="mr-2 h-4 w-4" />
                    Phiên Mới
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tạo Phiên Đặt Cơm</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="sessionName">Tên Phiên</Label>
                      <Input
                        id="sessionName"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="VD: Cơm Trưa Nhóm Thứ Hai"
                      />
                    </div>
                    <div>
                      <Label htmlFor="restaurant">Nhà Hàng</Label>
                      <Input
                        id="restaurant"
                        value={restaurant}
                        onChange={(e) => setRestaurant(e.target.value)}
                        placeholder="VD: Quán Phở Sài Gòn"
                      />
                    </div>
                    <Button
                      onClick={() => createSessionMutation.mutate({ name: sessionName, restaurant })}
                      disabled={!sessionName || !restaurant || createSessionMutation.isPending}
                      className="w-full"
                    >
                      {createSessionMutation.isPending ? "Đang tạo..." : "Tạo Phiên"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tổng Quan Bảng Điều Khiển</h1>
          <p className="text-gray-600">Quản lý đặt cơm nhóm và theo dõi hiệu suất</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="text-accent h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-green-600">Active</Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{activeSessions.length}</h3>
              <p className="text-gray-600 text-sm">Phiên Đang Hoạt Động</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="text-green-600 h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-green-600">+5%</Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{totalSessions}</h3>
              <p className="text-gray-600 text-sm">Tổng Số Phiên</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="text-primary h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-green-600">+18%</Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{totalMenuItems}</h3>
              <p className="text-gray-600 text-sm">Món Ăn</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Clock className="text-secondary h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-yellow-600">2.5min</Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">3.2</h3>
              <p className="text-gray-600 text-sm">Thời Gian Đặt TB (phút)</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sessions">Phiên Đặt Cơm</TabsTrigger>
            <TabsTrigger value="orders">Danh Sách Đặt Cơm</TabsTrigger>
            <TabsTrigger value="menu">Quản Lý Thực Đơn</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Phiên Đặt Cơm Đang Hoạt Động</CardTitle>
                  <Button variant="outline" size="sm">
                    Xem Tất Cả
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="border rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : activeSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Chưa có phiên nào đang hoạt động</p>
                    <Button 
                      onClick={() => setIsCreateSessionOpen(true)} 
                      className="mt-4"
                      variant="outline"
                    >
                      Tạo Phiên Đầu Tiên
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeSessions.map((session) => (
                      <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <img 
                              src="https://images.unsplash.com/photo-1555126634-323283e090fa?ixlib=rb-4.0.3&w=48&h=48&fit=crop" 
                              alt="Restaurant" 
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div>
                              <h3 className="font-medium text-gray-900">{session.name}</h3>
                              <p className="text-sm text-gray-600">{session.restaurant}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem asChild>
                                  <Link href={`/summary/${session.id}`}>View Summary</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => finalizeSessionMutation.mutate(session.id)}>
                                  Finalize Session
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-4">
                            <span className="text-gray-600">
                              Created {formatTimeLeft(session.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copySessionLink(session.sessionLink, session.id)}
                            >
                              {copiedSessionId === session.id ? (
                                <>
                                  <Check className="mr-1 h-3 w-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-1 h-3 w-3" />
                                  Copy Link
                                </>
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-primary hover:bg-orange-600"
                              onClick={() => finalizeSessionMutation.mutate(session.id)}
                              disabled={finalizeSessionMutation.isPending}
                            >
                              Finalize
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Danh Sách Đặt Cơm</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const { start, end } = getCurrentWeek();
                        setStartDate(start);
                        setEndDate(end);
                      }}
                    >
                      <Calendar className="mr-1 h-4 w-4" />
                      Tuần Này
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-gray-900">Khách Hàng</th>
                        <th className="text-left p-3 font-medium text-gray-900">Món Ăn</th>
                        <th className="text-left p-3 font-medium text-gray-900">Số Lượng</th>
                        <th className="text-left p-3 font-medium text-gray-900">Giá</th>
                        <th className="text-left p-3 font-medium text-gray-900">Tổng Tiền</th>
                        <th className="text-left p-3 font-medium text-gray-900">Ngày Đặt</th>
                        <th className="text-left p-3 font-medium text-gray-900">Thanh Toán</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b animate-pulse">
                            <td className="p-3"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                            <td className="p-3"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                            <td className="p-3"><div className="h-4 bg-gray-200 rounded w-8"></div></td>
                            <td className="p-3"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                            <td className="p-3"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                            <td className="p-3"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                            <td className="p-3"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                          </tr>
                        ))
                      ) : ordersData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-500">
                            Không có đơn hàng nào trong khoảng thời gian này
                          </td>
                        </tr>
                      ) : (
                        ordersData.map((order: any) => {
                          const menuItem = menuItems.find(item => item.id === order.menuItemId);
                          return (
                            <tr key={order.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{order.customerName}</td>
                              <td className="p-3">{menuItem?.name || "Món không xác định"}</td>
                              <td className="p-3">{order.quantity}</td>
                              <td className="p-3">{formatCurrency(order.unitPrice)}</td>
                              <td className="p-3 font-semibold">{formatCurrency(order.totalPrice)}</td>
                              <td className="p-3">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                              <td className="p-3">
                                <label className="flex items-center">
                                  <input 
                                    type="checkbox" 
                                    checked={order.isPaid || false}
                                    onChange={(e) => updatePaymentMutation.mutate({
                                      orderId: order.id,
                                      isPaid: e.target.checked
                                    })}
                                    className="mr-2" 
                                  />
                                  <span className="text-sm">Đã thanh toán</span>
                                </label>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Tổng Đơn Hàng</p>
                      <p className="text-2xl font-bold text-gray-900">{orderStats.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Đã Thanh Toán</p>
                      <p className="text-2xl font-bold text-green-600">{orderStats.paidOrders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tổng Tiền</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(orderStats.totalAmount.toFixed(2))}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Menu Management</CardTitle>
                  <Dialog open={isCreateMenuItemOpen} onOpenChange={setIsCreateMenuItemOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary hover:bg-orange-600">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Menu Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Menu Item</DialogTitle>
                      </DialogHeader>
                      <MenuItemForm 
                        onSuccess={() => {
                          setIsCreateMenuItemOpen(false);
                          queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {menuItemsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="border rounded-lg p-4 animate-pulse">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : menuItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No menu items yet</p>
                    <Button 
                      onClick={() => setIsCreateMenuItemOpen(true)} 
                      className="mt-4"
                      variant="outline"
                    >
                      Add Your First Menu Item
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuItems.map((item) => (
                      <MenuItemCard 
                        key={item.id} 
                        item={item} 
                        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] })}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
