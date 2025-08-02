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
  CircularProgress,
  Alert,
  TablePagination,
} from "@mui/material";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CancelIcon,
} from "@mui/icons-material";

// Import your types and service function
import { fetchCustomers } from "../shared/services/customerServices";
import {
  Customer as CustomerType,
  Order as OrderType,
} from "../shared/services/types";

// NOTE: You will need to create the `fetchOrdersByCustomerId` service function
// as a next step. I've included it here for a complete example.
const fetchOrdersByCustomerId = async (
  customerId: string
): Promise<OrderType[]> => {
  const response = await fetch(`/api/customers/${customerId}/orders`);
  if (!response.ok) {
    throw new Error("Failed to fetch orders");
  }
  const data = await response.json();
  return data.data; // Assuming your API returns { data: Order[] }
};

// The Row component will now manage its own state for expanded/collapsed and order data
function Row({
  row,
  onStatusUpdate,
}: {
  row: CustomerType;
  onStatusUpdate: (id: string, newStatus: CustomerType["status"]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [orders, setOrders] = React.useState<OrderType[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = React.useState(false);
  const [errorOrders, setErrorOrders] = React.useState<string | null>(null);

  const [editingStatus, setEditingStatus] = React.useState(false);
  const [statusDraft, setStatusDraft] = React.useState(row.status);
  const [itemEdits, setItemEdits] = React.useState<
    Record<string, { chest: number; waist: number; hips: number }>
  >({});
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);

  const handleStatusSave = () => {
    onStatusUpdate(row.id, statusDraft);
    setEditingStatus(false);
  };

  const handleRowExpand = async () => {
    setOpen(!open);
    // Fetch orders only once when the row is first opened and we don't have the data yet
    if (!open && orders.length === 0 && !isLoadingOrders) {
      setIsLoadingOrders(true);
      setErrorOrders(null);
      try {
        const fetchedOrders = await fetchOrdersByCustomerId(row.id);
        setOrders(fetchedOrders);
      } catch (error) {
        setErrorOrders("Failed to load order history.");
      } finally {
        setIsLoadingOrders(false);
      }
    }
  };

  const handleItemEdit = (orderId: string, itemIndex: number, item: any) => {
    setEditingItemId(`${orderId}-${itemIndex}`);
    setItemEdits((prev) => ({
      ...prev,
      [`${orderId}-${itemIndex}`]: { ...item.customSize },
    }));
  };

  const handleItemChange = (
    field: keyof any,
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
          <IconButton size="small" onClick={handleRowExpand}>
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
                  setStatusDraft(e.target.value as CustomerType["status"])
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
              {isLoadingOrders ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress />
                </Box>
              ) : errorOrders ? (
                <Alert severity="error">{errorOrders}</Alert>
              ) : orders.length > 0 ? (
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
                    {orders.map((order) => (
                      <TableRow key={order.orderId}>
                        <TableCell>{order.orderId}</TableCell>
                        <TableCell>
                          {new Date(order.orderDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          {order.items.map((item, itemIndex) => {
                            const key = `${order.orderId}-${itemIndex}`;
                            const isEditing = editingItemId === key;
                            const size = isEditing
                              ? itemEdits[key]
                              : item.customSize;

                            return (
                              <Box
                                key={key}
                                display="flex"
                                alignItems="center"
                                gap={1}
                                py={0.5}
                              >
                                <Typography variant="body2">
                                  {item.itemName}
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
                                        handleItemEdit(
                                          order.orderId,
                                          itemIndex,
                                          item
                                        )
                                      }
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </Box>
                            );
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
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
  // State for customer data, pagination, loading, and error
  const [customers, setCustomers] = React.useState<CustomerType[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [totalCustomers, setTotalCustomers] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Function to fetch data from your API
  const getCustomers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers({ page: page + 1, limit: rowsPerPage });
      setCustomers(data.data);
      setTotalCustomers(data.pagination.total_items);
    } catch (err) {
      setError("Failed to fetch customers. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage]);

  // Use effect to fetch data on component mount and when pagination changes
  React.useEffect(() => {
    getCustomers();
  }, [getCustomers]);

  const updateCustomerStatus = (
    id: string,
    newStatus: CustomerType["status"]
  ) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    // TODO: Add API call to update status on the backend
    console.log(`Updating customer ${id} status to ${newStatus}`);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page changes
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Alert severity="error">{error}</Alert>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <Row
                  key={customer.id}
                  row={customer}
                  onStatusUpdate={updateCustomerStatus}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCustomers}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
