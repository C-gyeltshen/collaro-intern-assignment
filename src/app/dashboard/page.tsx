"use client";

import * as React from "react";
import {
  Box,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Chip,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CancelIcon,
} from "@mui/icons-material";

interface OrderItem {
  name: string;
  quantity: number;
  customSize: { chest: number; waist: number; hips: number };
}

interface Order {
  id: string;
  date: string;
  total: number;
  items: OrderItem[];
}

interface Customer {
  name: string;
  email: string;
  status: "active" | "churned" | "prospect";
  revenue: number;
  orderCount: number;
  lastOrderDate: string;
  orders: Order[];
}

// Sample data
const initialCustomers: Customer[] = [
  {
    name: "Alice Johnson",
    email: "alice@example.com",
    status: "active",
    revenue: 1200,
    orderCount: 4,
    lastOrderDate: "2025-07-29",
    orders: [
      {
        id: "ORD001",
        date: "2025-07-28",
        total: 300,
        items: [
          {
            name: "T-shirt",
            quantity: 2,
            customSize: { chest: 38, waist: 32, hips: 40 },
          },
          {
            name: "Shoes",
            quantity: 1,
            customSize: { chest: 0, waist: 0, hips: 0 },
          },
        ],
      },
    ],
  },
  {
    name: "Bob Smith",
    email: "bob@example.com",
    status: "prospect",
    revenue: 0,
    orderCount: 0,
    lastOrderDate: "",
    orders: [],
  },
];

function Row({
  row,
  onStatusUpdate,
}: {
  row: Customer;
  onStatusUpdate: (email: string, newStatus: Customer["status"]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [editingStatus, setEditingStatus] = React.useState(false);
  const [statusDraft, setStatusDraft] = React.useState(row.status);
  const [itemEdits, setItemEdits] = React.useState<
    Record<string, { chest: number; waist: number; hips: number }>
  >({});
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);

  const handleStatusSave = () => {
    onStatusUpdate(row.email, statusDraft);
    setEditingStatus(false);
  };

  const handleItemEdit = (
    orderId: string,
    itemIndex: number,
    item: OrderItem
  ) => {
    setEditingItemId(`${orderId}-${itemIndex}`);
    setItemEdits((prev) => ({
      ...prev,
      [`${orderId}-${itemIndex}`]: { ...item.customSize },
    }));
  };

  const handleItemChange = (
    field: keyof OrderItem["customSize"],
    value: number,
    itemKey: string
  ) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        [field]: value,
      },
    }));
  };

  const handleItemSave = (itemKey: string) => {
    // Normally you'd sync with backend
    setEditingItemId(null);
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{row.name}</TableCell>
        <TableCell>{row.email}</TableCell>
        <TableCell>
          {editingStatus ? (
            <Box display="flex" alignItems="center" gap={1}>
              <Select
                size="small"
                value={statusDraft}
                onChange={(e) =>
                  setStatusDraft(e.target.value as Customer["status"])
                }
              >
                <MenuItem value="active">active</MenuItem>
                <MenuItem value="churned">churned</MenuItem>
                <MenuItem value="prospect">prospect</MenuItem>
              </Select>
              <IconButton size="small" onClick={handleStatusSave}>
                <SaveIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setEditingStatus(false)}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={row.status}
                color={
                  row.status === "active"
                    ? "success"
                    : row.status === "churned"
                    ? "error"
                    : "warning"
                }
                size="small"
              />
              <IconButton size="small" onClick={() => setEditingStatus(true)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </TableCell>
        <TableCell align="right">${row.revenue.toFixed(2)}</TableCell>
        <TableCell align="right">{row.orderCount}</TableCell>
        <TableCell align="right">
          {row.lastOrderDate
            ? new Date(row.lastOrderDate).toLocaleDateString()
            : "-"}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={7} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Order History
              </Typography>
              {row.orders.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Order Date</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Items</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {row.orders.map((order) =>
                      order.items.map((item, index) => {
                        const key = `${order.id}-${index}`;
                        const isEditing = editingItemId === key;
                        const size = isEditing
                          ? itemEdits[key]
                          : item.customSize;

                        return (
                          <TableRow key={key}>
                            {index === 0 && (
                              <>
                                <TableCell rowSpan={order.items.length}>
                                  {order.id}
                                </TableCell>
                                <TableCell rowSpan={order.items.length}>
                                  {new Date(order.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell rowSpan={order.items.length}>
                                  ${order.total.toFixed(2)}
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">
                                  {item.name} × {item.quantity}
                                </Typography>
                                {isEditing ? (
                                  <>
                                    <TextField
                                      size="small"
                                      label="C"
                                      type="number"
                                      value={size?.chest ?? ""}
                                      onChange={(e) =>
                                        handleItemChange(
                                          "chest",
                                          Number(e.target.value),
                                          key
                                        )
                                      }
                                      sx={{ width: 60 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="W"
                                      type="number"
                                      value={size?.waist ?? ""}
                                      onChange={(e) =>
                                        handleItemChange(
                                          "waist",
                                          Number(e.target.value),
                                          key
                                        )
                                      }
                                      sx={{ width: 60 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="H"
                                      type="number"
                                      value={size?.hips ?? ""}
                                      onChange={(e) =>
                                        handleItemChange(
                                          "hips",
                                          Number(e.target.value),
                                          key
                                        )
                                      }
                                      sx={{ width: 60 }}
                                    />
                                    <IconButton
                                      size="small"
                                      onClick={() => handleItemSave(key)}
                                    >
                                      <SaveIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => setEditingItemId(null)}
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                ) : (
                                  <>
                                    <Typography variant="caption">
                                      Size (C/W/H): {item.customSize.chest}/
                                      {item.customSize.waist}/
                                      {item.customSize.hips}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleItemEdit(order.id, index, item)
                                      }
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No orders available.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function CollapsibleCustomerTable() {
  const [customers, setCustomers] = React.useState(initialCustomers);

  const updateCustomerStatus = (
    email: string,
    newStatus: Customer["status"]
  ) => {
    setCustomers((prev) =>
      prev.map((c) => (c.email === email ? { ...c, status: newStatus } : c))
    );
  };

  return (
    <Paper sx={{ width: "100%", overflow: "hidden", p: 2 }}>
      <Typography variant="h5" gutterBottom>
        🧾 Customer Overview
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Revenue</TableCell>
              <TableCell align="right">Orders</TableCell>
              <TableCell align="right">Last Order</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <Row
                key={customer.email}
                row={customer}
                onStatusUpdate={updateCustomerStatus}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
