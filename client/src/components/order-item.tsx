import { formatCurrency } from "@/lib/utils";
import type { Order, MenuItem } from "@shared/schema";

interface OrderItemProps {
  order: Order;
  menuItem?: MenuItem;
}

export default function OrderItem({ order, menuItem }: OrderItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <div className="flex items-center space-x-3">
        {menuItem?.imageUrl && (
          <img 
            src={menuItem.imageUrl}
            alt={menuItem.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
        )}
        <div>
          <p className="font-medium text-gray-900">{order.customerName}</p>
          <p className="text-sm text-gray-600">
            {menuItem?.name || "Unknown Item"} x{order.quantity}
          </p>
        </div>
      </div>
      <span className="font-semibold text-gray-900">
        {formatCurrency(order.totalPrice)}
      </span>
    </div>
  );
}
